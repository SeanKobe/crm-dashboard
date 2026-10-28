-- =====================================================================================================================
-- Pivora CRM, migration 4: saved view settings, and app-supplied "last changed" times.
-- Run after 20251028000001_tasks_policy.sql.
--
-- 1. user_prefs: one row per person and setting (filters, views, sort, recent searches...), so they follow you to another browser.
--    Each person can read and write only their own rows.
-- 2. set_updated_at(): when the app sends its own updated_at the database keeps it (the app works on a fixed demo clock, so "last
--    edited" must be the app's time, not the server's). When nothing is sent, updated_at is set to now() as before.
-- =====================================================================================================================

create table public.user_prefs (
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  key         text not null check (length(key) between 1 and 60),
  value       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, key)
);
create trigger user_prefs_set_updated_at before update on public.user_prefs for each row execute function public.set_updated_at();

alter table public.user_prefs enable row level security;
revoke all on public.user_prefs from anon;
grant select, insert, update on public.user_prefs to authenticated;

-- Each person reads only their own settings.
create policy user_prefs_select on public.user_prefs for select to authenticated
  using (user_id = (select auth.uid()));

-- Each person saves settings only for themselves.
create policy user_prefs_insert on public.user_prefs for insert to authenticated
  with check (user_id = (select auth.uid()));

-- Each person updates only their own settings (and cannot move a row to someone else).
create policy user_prefs_update on public.user_prefs for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- (No delete policy: settings are overwritten, not removed.)

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  if new.updated_at is not distinct from old.updated_at then
    new.updated_at := now();
  end if;
  return new;
end;
$$;
