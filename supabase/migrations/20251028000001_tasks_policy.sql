-- =====================================================================================================================
-- Pivora CRM, migration 3: tasks assigned to a sales rep.
-- Run this in the Supabase SQL Editor after the first two migrations (it does not change those files).
--
-- The gap: tasks were visible and editable only by the person who owns the row, which in the seed is the project owner. A sales rep
-- who is ASSIGNED a task in somebody else's project could not see or update it. After this migration, a sales rep can see and update:
--   * the tasks they own,
--   * the tasks assigned to them (assignee_id),
--   * every task of a project they own,
-- and can read (not edit) a project that has a task assigned to them, because the task cannot be shown without it.
-- Managers and admins are unchanged (everything). Hard delete is still admin only.
--
-- Safe to run once. (Running it again fails with "already exists", which means it already worked.)
-- =====================================================================================================================

-- ---- helpers (security definer, so the policies below never recurse into each other) --------------------------------------------
-- True when the signed-in user owns the project.
create function public.owns_project(p_project uuid) returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.projects where id = p_project and owner_id = auth.uid()) $$;

-- True when the signed-in user has a live task assigned to them in the project.
create function public.has_task_in_project(p_project uuid) returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.tasks where project_id = p_project and assignee_id = auth.uid() and deleted_at is null) $$;

revoke all on function public.owns_project(uuid), public.has_task_in_project(uuid) from public, anon;
grant execute on function public.owns_project(uuid), public.has_task_in_project(uuid) to authenticated;

-- ---- tasks: select and update --------------------------------------------------------------------------------------------------
drop policy tasks_select on public.tasks;
drop policy tasks_update on public.tasks;

-- Managers and admins see every task. A sales rep sees the tasks they own, the tasks assigned to them, and every task of a project they own.
create policy tasks_select on public.tasks for select to authenticated
  using ((select public.is_manager_or_admin()) or owner_id = (select auth.uid()) or assignee_id = (select auth.uid()) or (select public.owns_project(project_id)));

-- Same people can edit (tick off, retitle, reschedule, soft delete). The new row must still be one of theirs, so an assignee cannot hand a
-- task to a third person; moving a task to another owner or project is limited further by the trigger below.
create policy tasks_update on public.tasks for update to authenticated
  using ((select public.is_manager_or_admin()) or owner_id = (select auth.uid()) or assignee_id = (select auth.uid()) or (select public.owns_project(project_id)))
  with check ((select public.is_manager_or_admin()) or owner_id = (select auth.uid()) or assignee_id = (select auth.uid()) or (select public.owns_project(project_id)));

-- (tasks_insert and tasks_delete stay as they were: reps create tasks they own, only an admin hard-deletes.)

-- ---- an assignee can work on a task but cannot re-own it or move it to another project ---------------------------------------------
create function public.protect_task_changes() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or public.is_manager_or_admin() then
    return new;   -- the SQL Editor and managers / admins are not restricted
  end if;
  if (new.owner_id is distinct from old.owner_id or new.project_id is distinct from old.project_id)
     and not (old.owner_id = auth.uid() or public.owns_project(old.project_id)) then
    raise exception 'Only the owner of the task or of its project can move it or give it to someone else.' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger tasks_protect_changes before update on public.tasks for each row execute function public.protect_task_changes();

-- ---- projects: a project is readable by someone who has a task in it --------------------------------------------------------------
drop policy projects_select on public.projects;

-- Managers and admins see every project; a sales rep sees the projects they own and the projects where a task is assigned to them
-- (read only: projects_update is unchanged, so they still cannot edit the project itself).
create policy projects_select on public.projects for select to authenticated
  using ((select public.is_manager_or_admin()) or owner_id = (select auth.uid()) or (select public.has_task_in_project(id)));

-- ---- timeline entries and links of tasks and projects follow the same rule -------------------------------------------------------------
-- (replaces the function from migration 2; same name, same arguments, so every policy that uses it picks this up)
create or replace function public.can_access_entity(p_type public.entity_type, p_id uuid) returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_manager_or_admin() or coalesce(case p_type
    when 'deal'    then exists (select 1 from public.deals    where id = p_id and owner_id = auth.uid())
    when 'contact' then exists (select 1 from public.contacts where id = p_id and owner_id = auth.uid())
    when 'note'    then exists (select 1 from public.notes    where id = p_id and owner_id = auth.uid())
    when 'event'   then exists (select 1 from public.events   where id = p_id and owner_id = auth.uid())
    when 'project' then exists (select 1 from public.projects where id = p_id and owner_id = auth.uid()) or public.has_task_in_project(p_id)
    when 'task'    then exists (select 1 from public.tasks    where id = p_id and (owner_id = auth.uid() or assignee_id = auth.uid() or public.owns_project(project_id)))
  end, false)
$$;
