-- =====================================================================================================================
-- Pivora CRM, migration 2 of 2: row level security. Run after 20251020000001_schema.sql.
--
-- Who can do what
--   sales_rep : sees, creates and edits only the rows they own (owner_id = their id). Deleting is a soft delete (an update that
--               sets deleted_at), which is allowed on their own rows. They can never hard-delete anything.
--   manager   : sees and edits every row, can reassign owners, cannot hard-delete anything and cannot manage users.
--   admin     : everything, including hard delete and changing other people's roles.
--   profiles  : every signed-in user can read all profiles (owner names and avatars), update only their own name and avatar, and
--               only an admin can change a role (nobody can change their own).
--
-- Policies call small security definer helpers (current_user_role, is_admin, is_manager_or_admin, can_access_entity) instead of
-- reading profiles directly, so a policy on one table never triggers a policy on another (no recursion).
-- The function is named current_user_role() because current_role is a reserved SQL keyword.
--
-- Running these statements in the Supabase SQL Editor uses the postgres role, which bypasses RLS, so setting roles and
-- loading the seed there works. The app itself always runs as the signed-in user ("authenticated").
-- =====================================================================================================================

-- ---- helper functions ---------------------------------------------------------------------------------------------------
-- The signed-in user's role, or null when nobody is signed in. security definer + fixed search_path so it can read profiles
-- without going through profiles' own policies.
create function public.current_user_role() returns public.user_role
language sql stable security definer set search_path = public
as $$ select p.role from public.profiles p where p.id = auth.uid() $$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce(public.current_user_role() = 'admin', false) $$;

create function public.is_manager_or_admin() returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce(public.current_user_role() in ('manager', 'admin'), false) $$;

-- True when the signed-in user may see the record a timeline entry or a link belongs to: managers and admins always, a sales rep
-- only when they own that record. Used by the activity and links policies so they follow the record's own ownership.
create function public.can_access_entity(p_type public.entity_type, p_id uuid) returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_manager_or_admin() or coalesce(case p_type
    when 'deal'    then exists (select 1 from public.deals    where id = p_id and owner_id = auth.uid())
    when 'contact' then exists (select 1 from public.contacts where id = p_id and owner_id = auth.uid())
    when 'note'    then exists (select 1 from public.notes    where id = p_id and owner_id = auth.uid())
    when 'event'   then exists (select 1 from public.events   where id = p_id and owner_id = auth.uid())
    when 'project' then exists (select 1 from public.projects where id = p_id and owner_id = auth.uid())
    when 'task'    then exists (select 1 from public.tasks    where id = p_id and owner_id = auth.uid())
  end, false)
$$;

-- Only signed-in users may call the helpers.
revoke all on function public.current_user_role(), public.is_admin(), public.is_manager_or_admin(), public.can_access_entity(public.entity_type, uuid) from public, anon;
grant execute on function public.current_user_role(), public.is_admin(), public.is_manager_or_admin(), public.can_access_entity(public.entity_type, uuid) to authenticated;

-- ---- profile protection (a trigger, because policies cannot compare old and new values) ---------------------------------------------
-- Signed-in people may change their own full_name and avatar_color and nothing else. Role changes: only an admin, and never on
-- their own profile. Statements run from the SQL Editor or with the service role (no signed-in user) are not restricted, which is how
-- the first admin is created.
create function public.protect_profile_changes() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.id is distinct from old.id then
    raise exception 'A profile id cannot be changed.' using errcode = '42501';
  end if;
  if new.role is distinct from old.role then
    if auth.uid() = old.id then
      raise exception 'You cannot change your own role.' using errcode = '42501';
    end if;
    if not public.is_admin() then
      raise exception 'Only an admin can change roles.' using errcode = '42501';
    end if;
  end if;
  if not public.is_admin() and new.email is distinct from old.email then
    raise exception 'Only an admin can change an email address here.' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger profiles_protect_changes before update on public.profiles for each row execute function public.protect_profile_changes();

-- ---- privileges: nothing for anonymous visitors, table access for signed-in users (RLS then decides which rows) ----------------------
revoke all on all tables in schema public from anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

alter table public.profiles enable row level security;
alter table public.contacts enable row level security;
alter table public.deals    enable row level security;
alter table public.notes    enable row level security;
alter table public.events   enable row level security;
alter table public.projects enable row level security;
alter table public.tasks    enable row level security;
alter table public.activity enable row level security;
alter table public.links    enable row level security;

-- ---- profiles -------------------------------------------------------------------------------------------------------------------
-- Everyone signed in can read every profile: the app needs owner names and avatars next to every deal, contact, note and event.
create policy profiles_select on public.profiles for select to authenticated
  using (true);

-- A person can update their own profile; an admin can update anyone's. The protect_profile_changes trigger limits what may change
-- (name and avatar for everyone, the role only by an admin and never their own).
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

-- Only an admin can delete a profile by hand (deleting the auth user removes it anyway). There is no insert policy: profiles are
-- created by the sign-up trigger, never by the app.
create policy profiles_delete on public.profiles for delete to authenticated
  using ((select public.is_admin()));


-- ---- contacts -------------------------------------------------------------------------------------------------------------------------
-- Managers and admins see every contact; a sales rep sees only the ones they own (so reps never see each other's work).
create policy contacts_select on public.contacts for select to authenticated
  using ((select public.is_manager_or_admin()) or owner_id = (select auth.uid()));

-- A sales rep can create rows only for themselves (owner_id must be their own id); managers and admins can create rows for anyone.
create policy contacts_insert on public.contacts for insert to authenticated
  with check ((select public.is_manager_or_admin()) or owner_id = (select auth.uid()));

-- A sales rep can edit their own rows, including soft delete (setting deleted_at), but cannot hand a row to someone else because the new
-- owner_id must still be theirs. Managers and admins can edit any row and reassign owners.
create policy contacts_update on public.contacts for update to authenticated
  using ((select public.is_manager_or_admin()) or owner_id = (select auth.uid()))
  with check ((select public.is_manager_or_admin()) or owner_id = (select auth.uid()));

-- Only an admin can hard-delete. Sales reps and managers delete by update (deleted_at), so nothing is lost by accident.
create policy contacts_delete on public.contacts for delete to authenticated
  using ((select public.is_admin()));


-- ---- deals -------------------------------------------------------------------------------------------------------------------------
-- Managers and admins see every contact; a sales rep sees only the ones they own (so reps never see each other's work).
create policy deals_select on public.deals for select to authenticated
  using ((select public.is_manager_or_admin()) or owner_id = (select auth.uid()));

-- A sales rep can create rows only for themselves (owner_id must be their own id); managers and admins can create rows for anyone.
create policy deals_insert on public.deals for insert to authenticated
  with check ((select public.is_manager_or_admin()) or owner_id = (select auth.uid()));

-- A sales rep can edit their own rows, including soft delete (setting deleted_at), but cannot hand a row to someone else because the new
-- owner_id must still be theirs. Managers and admins can edit any row and reassign owners.
create policy deals_update on public.deals for update to authenticated
  using ((select public.is_manager_or_admin()) or owner_id = (select auth.uid()))
  with check ((select public.is_manager_or_admin()) or owner_id = (select auth.uid()));

-- Only an admin can hard-delete. Sales reps and managers delete by update (deleted_at), so nothing is lost by accident.
create policy deals_delete on public.deals for delete to authenticated
  using ((select public.is_admin()));


-- ---- notes -------------------------------------------------------------------------------------------------------------------------
-- Managers and admins see every contact; a sales rep sees only the ones they own (so reps never see each other's work).
create policy notes_select on public.notes for select to authenticated
  using ((select public.is_manager_or_admin()) or owner_id = (select auth.uid()));

-- A sales rep can create rows only for themselves (owner_id must be their own id); managers and admins can create rows for anyone.
create policy notes_insert on public.notes for insert to authenticated
  with check ((select public.is_manager_or_admin()) or owner_id = (select auth.uid()));

-- A sales rep can edit their own rows, including soft delete (setting deleted_at), but cannot hand a row to someone else because the new
-- owner_id must still be theirs. Managers and admins can edit any row and reassign owners.
create policy notes_update on public.notes for update to authenticated
  using ((select public.is_manager_or_admin()) or owner_id = (select auth.uid()))
  with check ((select public.is_manager_or_admin()) or owner_id = (select auth.uid()));

-- Only an admin can hard-delete. Sales reps and managers delete by update (deleted_at), so nothing is lost by accident.
create policy notes_delete on public.notes for delete to authenticated
  using ((select public.is_admin()));


-- ---- events -------------------------------------------------------------------------------------------------------------------------
-- Managers and admins see every contact; a sales rep sees only the ones they own (so reps never see each other's work).
create policy events_select on public.events for select to authenticated
  using ((select public.is_manager_or_admin()) or owner_id = (select auth.uid()));

-- A sales rep can create rows only for themselves (owner_id must be their own id); managers and admins can create rows for anyone.
create policy events_insert on public.events for insert to authenticated
  with check ((select public.is_manager_or_admin()) or owner_id = (select auth.uid()));

-- A sales rep can edit their own rows, including soft delete (setting deleted_at), but cannot hand a row to someone else because the new
-- owner_id must still be theirs. Managers and admins can edit any row and reassign owners.
create policy events_update on public.events for update to authenticated
  using ((select public.is_manager_or_admin()) or owner_id = (select auth.uid()))
  with check ((select public.is_manager_or_admin()) or owner_id = (select auth.uid()));

-- Only an admin can hard-delete. Sales reps and managers delete by update (deleted_at), so nothing is lost by accident.
create policy events_delete on public.events for delete to authenticated
  using ((select public.is_admin()));


-- ---- projects -------------------------------------------------------------------------------------------------------------------------
-- Managers and admins see every contact; a sales rep sees only the ones they own (so reps never see each other's work).
create policy projects_select on public.projects for select to authenticated
  using ((select public.is_manager_or_admin()) or owner_id = (select auth.uid()));

-- A sales rep can create rows only for themselves (owner_id must be their own id); managers and admins can create rows for anyone.
create policy projects_insert on public.projects for insert to authenticated
  with check ((select public.is_manager_or_admin()) or owner_id = (select auth.uid()));

-- A sales rep can edit their own rows, including soft delete (setting deleted_at), but cannot hand a row to someone else because the new
-- owner_id must still be theirs. Managers and admins can edit any row and reassign owners.
create policy projects_update on public.projects for update to authenticated
  using ((select public.is_manager_or_admin()) or owner_id = (select auth.uid()))
  with check ((select public.is_manager_or_admin()) or owner_id = (select auth.uid()));

-- Only an admin can hard-delete. Sales reps and managers delete by update (deleted_at), so nothing is lost by accident.
create policy projects_delete on public.projects for delete to authenticated
  using ((select public.is_admin()));


-- ---- tasks -------------------------------------------------------------------------------------------------------------------------
-- Managers and admins see every contact; a sales rep sees only the ones they own (so reps never see each other's work).
create policy tasks_select on public.tasks for select to authenticated
  using ((select public.is_manager_or_admin()) or owner_id = (select auth.uid()));

-- A sales rep can create rows only for themselves (owner_id must be their own id); managers and admins can create rows for anyone.
create policy tasks_insert on public.tasks for insert to authenticated
  with check ((select public.is_manager_or_admin()) or owner_id = (select auth.uid()));

-- A sales rep can edit their own rows, including soft delete (setting deleted_at), but cannot hand a row to someone else because the new
-- owner_id must still be theirs. Managers and admins can edit any row and reassign owners.
create policy tasks_update on public.tasks for update to authenticated
  using ((select public.is_manager_or_admin()) or owner_id = (select auth.uid()))
  with check ((select public.is_manager_or_admin()) or owner_id = (select auth.uid()));

-- Only an admin can hard-delete. Sales reps and managers delete by update (deleted_at), so nothing is lost by accident.
create policy tasks_delete on public.tasks for delete to authenticated
  using ((select public.is_admin()));



-- ---- activity (the shared timeline) --------------------------------------------------------------------------------------------
-- Timeline entries follow the record they belong to: managers and admins see all, a sales rep sees the entries of records they own.
create policy activity_select on public.activity for select to authenticated
  using ((select public.can_access_entity(entity_type, entity_id)));

-- Anyone who can see a record can add to its timeline, as themselves (actor_id must be their own id, or empty for system entries).
create policy activity_insert on public.activity for insert to authenticated
  with check ((select public.can_access_entity(entity_type, entity_id)) and (actor_id is null or actor_id = (select auth.uid()) or (select public.is_manager_or_admin())));

-- The timeline is a record of what happened, so only an admin can correct an entry.
create policy activity_update on public.activity for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Only an admin can hard-delete timeline entries.
create policy activity_delete on public.activity for delete to authenticated
  using ((select public.is_admin()));

-- ---- links ----------------------------------------------------------------------------------------------------------------------
-- Links follow the record that holds them (the source): managers and admins see all, a sales rep sees the links of records they own.
create policy links_select on public.links for select to authenticated
  using ((select public.can_access_entity(source_type, source_id)));

-- You can add a link to a record you can edit.
create policy links_insert on public.links for insert to authenticated
  with check ((select public.can_access_entity(source_type, source_id)));

-- You can change or soft-delete (deleted_at) a link on a record you can edit, but not move it to a record you cannot edit.
create policy links_update on public.links for update to authenticated
  using ((select public.can_access_entity(source_type, source_id)))
  with check ((select public.can_access_entity(source_type, source_id)));

-- Only an admin can hard-delete links.
create policy links_delete on public.links for delete to authenticated
  using ((select public.is_admin()));
