-- =====================================================================================================================
-- Pivora CRM, migration 1 of 2: schema.
-- Run this file first in the Supabase SQL Editor, then 20251020000002_rls.sql.
--
-- The tables mirror what the app already stores in the browser (src/types): deals, contacts, notes, calendar events,
-- projects with tasks, a shared activity timeline and the { type, id } links between records. Every table has a uuid
-- primary key, created_at / updated_at (kept current by a trigger) and, where the app can delete and restore a row,
-- deleted_at (soft delete). Owner ids point at profiles, which mirror auth.users.
--
-- Time columns: the app has no time zones (every date and time is a wall-clock value relative to a fixed demo "today"),
-- so times the pages show or filter on are `timestamp` / `date`. Only created_at / updated_at are `timestamptz`.
-- =====================================================================================================================

-- ---- enums ----------------------------------------------------------------------------------------------------------
create type public.user_role      as enum ('admin', 'manager', 'sales_rep');
create type public.deal_stage     as enum ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost');
create type public.priority_level as enum ('high', 'medium', 'low');
create type public.lost_reason    as enum ('Price', 'Timing', 'Competitor', 'No response', 'Other');
create type public.lead_status    as enum ('New', 'Contacted', 'Qualified', 'Unqualified', 'Customer');
create type public.lead_source    as enum ('Website', 'Referral', 'LinkedIn', 'Event', 'Cold outreach');
create type public.event_type     as enum ('Meeting', 'Call', 'Task', 'Follow-up');
create type public.event_platform as enum ('Google Meet', 'Zoom', 'Slack', 'In person', 'Phone');
create type public.event_status   as enum ('Scheduled', 'Completed', 'Cancelled');
create type public.project_status as enum ('Planned', 'Active', 'On hold', 'Completed');
-- what a timeline entry or a link can belong to
create type public.entity_type    as enum ('deal', 'contact', 'note', 'event', 'project', 'task');
-- what a link can point at (companies have no table: they are identified by a slug such as co-acme-corp)
create type public.record_type    as enum ('deal', 'contact', 'company', 'note', 'project');
create type public.activity_kind  as enum (
  'call', 'email', 'meeting', 'note', 'stage', 'won', 'status', 'deal',
  'created', 'task-added', 'task-done', 'task-reopened', 'task-removed', 'archived', 'restored', 'renamed', 'linked'
);

-- ---- shared trigger: keep updated_at current -------------------------------------------------------------------------
create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---- profiles (one per auth user) -------------------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  full_name    text not null default '',
  email        text not null,
  role         public.user_role not null default 'sales_rep',
  -- the avatar tint the app already uses (see Avatar tones)
  avatar_color text not null default 'purple' check (avatar_color in ('purple', 'green', 'orange', 'amber', 'red')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index profiles_email_key on public.profiles (lower(email));
create index profiles_role_idx on public.profiles (role);

-- ---- contacts -----------------------------------------------------------------------------------------------------------
create table public.contacts (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null check (length(btrim(name)) > 0),
  email              text not null check (length(btrim(email)) > 0),
  phone              text not null default '',
  company            text not null default '',
  job_title          text not null default '',
  status             public.lead_status not null default 'New',
  source             public.lead_source not null default 'Website',
  owner_id           uuid not null default auth.uid() references public.profiles (id),
  tags               text[] not null default '{}',
  -- null = never contacted
  last_contacted_at  timestamp,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz
);
-- two live contacts cannot share an email (the Contacts page enforces the same rule)
create unique index contacts_email_live_key on public.contacts (lower(email)) where deleted_at is null;
create index contacts_owner_id_idx          on public.contacts (owner_id);
create index contacts_status_idx            on public.contacts (status);
create index contacts_source_idx            on public.contacts (source);
create index contacts_created_at_idx        on public.contacts (created_at);
create index contacts_last_contacted_at_idx on public.contacts (last_contacted_at);
create index contacts_deleted_at_idx        on public.contacts (deleted_at);

-- ---- deals --------------------------------------------------------------------------------------------------------------
create table public.deals (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (length(btrim(title)) > 0),
  company       text not null default '',
  -- the contact as typed, kept for deals whose contact is not in Contacts
  contact_name  text not null default '',
  contact_id    uuid references public.contacts (id) on delete set null,
  -- whole US dollars
  value         integer not null default 0 check (value >= 0),
  stage         public.deal_stage not null default 'new',
  priority      public.priority_level not null default 'medium',
  owner_id      uuid not null default auth.uid() references public.profiles (id),
  close_date    date,
  -- when the deal entered its current stage
  stage_since   timestamp not null default (now() at time zone 'utc'),
  next_step     text not null default '',
  notes         text not null default '',
  lost_reason   public.lost_reason,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  constraint deals_lost_reason_only_when_lost check (lost_reason is null or stage = 'lost')
);
create index deals_owner_id_idx    on public.deals (owner_id);
create index deals_stage_idx       on public.deals (stage);
create index deals_close_date_idx  on public.deals (close_date);
create index deals_stage_since_idx on public.deals (stage_since);
create index deals_contact_id_idx  on public.deals (contact_id);
create index deals_deleted_at_idx  on public.deals (deleted_at);

-- ---- notes --------------------------------------------------------------------------------------------------------------
create table public.notes (
  id          uuid primary key default gen_random_uuid(),
  title       text not null default '',
  -- rich text as HTML (the editor's native format)
  body        text not null default '',
  tags        text[] not null default '{}',
  pinned      boolean not null default false,
  owner_id    uuid not null default auth.uid() references public.profiles (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index notes_owner_id_idx   on public.notes (owner_id);
create index notes_updated_at_idx on public.notes (updated_at);
create index notes_pinned_idx     on public.notes (pinned) where pinned;
create index notes_deleted_at_idx on public.notes (deleted_at);

-- ---- calendar events ----------------------------------------------------------------------------------------------------
create table public.events (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (length(btrim(title)) > 0),
  type         public.event_type not null default 'Meeting',
  -- wall-clock start and end; all-day events cover whole days (end is the last day)
  start_at     timestamp not null,
  end_at       timestamp not null,
  all_day      boolean not null default false,
  platform     public.event_platform,
  location     text not null default '',
  -- [{ "kind": "owner" | "contact", "id": "<profiles.id or contacts.id>" }]
  attendees    jsonb not null default '[]' check (jsonb_typeof(attendees) = 'array'),
  description  text not null default '',
  status       public.event_status not null default 'Scheduled',
  owner_id     uuid not null default auth.uid() references public.profiles (id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  constraint events_end_after_start check (end_at >= start_at)
);
create index events_owner_id_idx   on public.events (owner_id);
create index events_start_at_idx   on public.events (start_at);
create index events_end_at_idx     on public.events (end_at);
create index events_status_idx     on public.events (status);
create index events_type_idx       on public.events (type);
create index events_deleted_at_idx on public.events (deleted_at);

-- ---- projects and their tasks ---------------------------------------------------------------------------------------------
create table public.projects (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (length(btrim(name)) > 0),
  description  text not null default '',
  status       public.project_status not null default 'Planned',
  owner_id     uuid not null default auth.uid() references public.profiles (id),
  -- the other people working on it (the owner is not repeated here)
  member_ids   uuid[] not null default '{}',
  due_date     date,
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
-- two live projects cannot share a name (the Projects page enforces the same rule)
create unique index projects_name_live_key on public.projects (lower(name)) where deleted_at is null;
create index projects_owner_id_idx    on public.projects (owner_id);
create index projects_status_idx      on public.projects (status);
create index projects_due_date_idx    on public.projects (due_date);
create index projects_archived_at_idx on public.projects (archived_at);
create index projects_deleted_at_idx  on public.projects (deleted_at);

create table public.tasks (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects (id) on delete cascade,
  title         text not null check (length(btrim(title)) > 0),
  done          boolean not null default false,
  -- who the task is assigned to; owner_id is who owns the row (the project owner unless it was created by someone else)
  assignee_id   uuid references public.profiles (id) on delete set null,
  owner_id      uuid not null default auth.uid() references public.profiles (id),
  due_date      date,
  priority      public.priority_level not null default 'medium',
  completed_at  timestamp,
  -- the order the tasks are shown in (0 = first)
  position      integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index tasks_project_id_idx  on public.tasks (project_id, position);
create index tasks_owner_id_idx    on public.tasks (owner_id);
create index tasks_assignee_id_idx on public.tasks (assignee_id);
create index tasks_due_date_idx    on public.tasks (due_date);
create index tasks_done_idx        on public.tasks (done);
create index tasks_deleted_at_idx  on public.tasks (deleted_at);

-- ---- activity: one timeline table for every kind of record --------------------------------------------------------------------
create table public.activity (
  id           uuid primary key default gen_random_uuid(),
  entity_type  public.entity_type not null,
  -- the id of the deal / contact / note / event / project / task this entry belongs to (checked by the app, not by a foreign key,
  -- because one column cannot reference several tables)
  entity_id    uuid not null,
  kind         public.activity_kind not null,
  title        text not null default '',
  description  text not null default '',
  -- who did it
  actor_id     uuid default auth.uid() references public.profiles (id) on delete set null,
  occurred_at  timestamp not null default (now() at time zone 'utc'),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index activity_entity_idx      on public.activity (entity_type, entity_id, occurred_at desc);
create index activity_actor_id_idx    on public.activity (actor_id);
create index activity_occurred_at_idx on public.activity (occurred_at);

-- ---- links: the { type, id } pairs that tie records together ----------------------------------------------------------------------
create table public.links (
  id           uuid primary key default gen_random_uuid(),
  -- the record that holds the link (a note, an event, a project, a contact...)
  source_type  public.entity_type not null,
  source_id    uuid not null,
  -- the record it points at. Companies have no table, so they use target_key (a slug) instead of target_id.
  target_type  public.record_type not null,
  target_id    uuid,
  target_key   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  constraint links_target_shape check (
    (target_type = 'company' and target_key is not null and target_id is null)
    or (target_type <> 'company' and target_id is not null and target_key is null)
  )
);
-- the same record cannot be linked twice from the same source
create unique index links_unique_live_key on public.links (source_type, source_id, target_type, (coalesce(target_id::text, target_key))) where deleted_at is null;
create index links_source_idx     on public.links (source_type, source_id);
create index links_target_idx     on public.links (target_type, target_id);
create index links_deleted_at_idx on public.links (deleted_at);

-- ---- updated_at triggers -------------------------------------------------------------------------------------------------------
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger contacts_set_updated_at before update on public.contacts for each row execute function public.set_updated_at();
create trigger deals_set_updated_at    before update on public.deals    for each row execute function public.set_updated_at();
create trigger notes_set_updated_at    before update on public.notes    for each row execute function public.set_updated_at();
create trigger events_set_updated_at   before update on public.events   for each row execute function public.set_updated_at();
create trigger projects_set_updated_at before update on public.projects for each row execute function public.set_updated_at();
create trigger tasks_set_updated_at    before update on public.tasks    for each row execute function public.set_updated_at();
create trigger activity_set_updated_at before update on public.activity for each row execute function public.set_updated_at();
create trigger links_set_updated_at    before update on public.links    for each row execute function public.set_updated_at();

-- ---- sign-up: create the profile, always as sales_rep ----------------------------------------------------------------------------
-- Runs as the table owner (security definer) because the new user cannot insert into profiles yet. The role is never read from the
-- sign-up data, so nobody can make themselves an admin by passing metadata.
create function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tones text[] := array['purple', 'green', 'orange', 'amber', 'red'];
begin
  insert into public.profiles (id, full_name, email, role, avatar_color)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    new.email,
    'sales_rep',
    tones[1 + (abs(hashtext(new.id::text)) % array_length(tones, 1))]
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- people who signed up before this migration was run
insert into public.profiles (id, full_name, email, role, avatar_color)
select u.id,
       coalesce(nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''), split_part(u.email, '@', 1)),
       u.email,
       'sales_rep',
       (array['purple', 'green', 'orange', 'amber', 'red'])[1 + (abs(hashtext(u.id::text)) % 5)]
from auth.users u
on conflict (id) do nothing;
