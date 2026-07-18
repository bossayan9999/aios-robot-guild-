begin;

create extension if not exists pgcrypto;

create type public.workspace_kind as enum ('personal', 'organization');
create type public.workspace_role as enum ('owner', 'admin', 'manager', 'member', 'viewer');
create type public.mission_status as enum ('draft', 'queued', 'running', 'review', 'completed', 'failed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'),
  kind public.workspace_kind not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.workspace_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.missions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  description text not null default '',
  status public.mission_status not null default 'draft',
  created_by uuid not null references public.profiles(id),
  assigned_to uuid references public.profiles(id),
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index workspace_members_user_idx on public.workspace_members(user_id, workspace_id);
create index missions_workspace_created_idx on public.missions(workspace_id, created_at desc);
create index audit_workspace_created_idx on public.audit_events(workspace_id, created_at desc);

create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.workspace_members m where m.workspace_id = target_workspace and m.user_id = auth.uid()) $$;

create or replace function public.has_workspace_role(target_workspace uuid, allowed public.workspace_role[])
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.workspace_members m where m.workspace_id = target_workspace and m.user_id = auth.uid() and m.role = any(allowed)) $$;

revoke all on function public.is_workspace_member(uuid) from public;
revoke all on function public.has_workspace_role(uuid, public.workspace_role[]) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.has_workspace_role(uuid, public.workspace_role[]) to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare new_workspace uuid;
begin
  insert into public.profiles(id, display_name) values(new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  insert into public.workspaces(name, slug, kind, created_by)
    values('Personal Workspace', 'personal-' || substr(replace(new.id::text, '-', ''), 1, 12), 'personal', new.id)
    returning id into new_workspace;
  insert into public.workspace_members(workspace_id, user_id, role) values(new_workspace, new.id, 'owner');
  insert into public.audit_events(workspace_id, actor_id, action, entity_type, entity_id)
    values(new_workspace, new.id, 'workspace.created', 'workspace', new_workspace::text);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.create_organization(org_name text, org_slug text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare new_workspace uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  insert into public.workspaces(name, slug, kind, created_by) values(org_name, lower(org_slug), 'organization', auth.uid()) returning id into new_workspace;
  insert into public.workspace_members(workspace_id, user_id, role) values(new_workspace, auth.uid(), 'owner');
  insert into public.audit_events(workspace_id, actor_id, action, entity_type, entity_id) values(new_workspace, auth.uid(), 'workspace.created', 'workspace', new_workspace::text);
  return new_workspace;
end $$;
revoke all on function public.create_organization(text, text) from public;
grant execute on function public.create_organization(text, text) to authenticated;

create or replace function public.audit_mission_change()
returns trigger language plpgsql security definer set search_path = public
as $$ begin
  insert into public.audit_events(workspace_id, actor_id, action, entity_type, entity_id, metadata)
  values(new.workspace_id, auth.uid(), case when tg_op='INSERT' then 'mission.created' else 'mission.updated' end, 'mission', new.id::text, jsonb_build_object('status', new.status));
  return new;
end $$;
create trigger missions_audit after insert or update on public.missions for each row execute procedure public.audit_mission_change();

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.missions enable row level security;
alter table public.audit_events enable row level security;

create policy profiles_read_members on public.profiles for select to authenticated using (
  id = auth.uid() or exists(select 1 from public.workspace_members mine join public.workspace_members theirs using(workspace_id) where mine.user_id=auth.uid() and theirs.user_id=profiles.id)
);
create policy profiles_update_self on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy workspaces_read_member on public.workspaces for select to authenticated using(public.is_workspace_member(id));
create policy memberships_read_member on public.workspace_members for select to authenticated using(public.is_workspace_member(workspace_id));
create policy memberships_manage_admin on public.workspace_members for all to authenticated
  using(public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]))
  with check(public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]));
create policy missions_read_member on public.missions for select to authenticated using(public.is_workspace_member(workspace_id));
create policy missions_insert_contributor on public.missions for insert to authenticated
  with check(created_by=auth.uid() and public.has_workspace_role(workspace_id, array['owner','admin','manager','member']::public.workspace_role[]));
create policy missions_update_contributor on public.missions for update to authenticated
  using(public.has_workspace_role(workspace_id, array['owner','admin','manager','member']::public.workspace_role[]))
  with check(public.has_workspace_role(workspace_id, array['owner','admin','manager','member']::public.workspace_role[]));
create policy missions_delete_manager on public.missions for delete to authenticated
  using(public.has_workspace_role(workspace_id, array['owner','admin','manager']::public.workspace_role[]));
create policy audit_read_member on public.audit_events for select to authenticated using(public.is_workspace_member(workspace_id));

grant select, update on public.profiles to authenticated;
grant select on public.workspaces to authenticated;
grant select, insert, update, delete on public.workspace_members to authenticated;
grant select, insert, update, delete on public.missions to authenticated;
grant select on public.audit_events to authenticated;

commit;
