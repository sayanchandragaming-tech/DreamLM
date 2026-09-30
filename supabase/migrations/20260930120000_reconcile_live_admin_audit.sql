create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role' = 'admin', false)
    or coalesce((auth.jwt() -> 'app_metadata' -> 'roles') @> '["admin"]'::jsonb, false);
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create table if not exists public.beta_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  username text not null check (length(trim(username)) > 0),
  email text,
  status text not null default 'Active'
    check (status in ('Pending', 'Active', 'Banned')),
  directory_role text not null default 'Researcher'
    check (directory_role in ('Researcher', 'Administrator')),
  notes text,
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  banned boolean generated always as (status = 'Banned') stored,
  ban_reason text,
  banned_at timestamptz,
  banned_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint beta_users_ban_timestamp_matches_status
    check ((status = 'Banned') = (banned_at is not null))
);

comment on column public.beta_users.status is
  'Beta access status; it does not revoke Supabase Auth sessions or protect the DreamLM API.';
comment on column public.beta_users.directory_role is
  'Directory display role only; authorization comes from the trusted JWT app_metadata claim.';

create index if not exists beta_users_email_lower_idx
  on public.beta_users (lower(email)) where email is not null;
create index if not exists beta_users_status_idx
  on public.beta_users (status);

alter table public.beta_users enable row level security;
revoke all on table public.beta_users from public, anon, authenticated;
grant select, insert, update, delete on table public.beta_users to authenticated;

drop policy if exists "Admins can read beta users" on public.beta_users;
drop policy if exists "Admins can add beta users" on public.beta_users;
drop policy if exists "Admins can update beta users" on public.beta_users;
drop policy if exists "Admins can delete beta users" on public.beta_users;

create policy "Admins can read beta users"
  on public.beta_users for select to authenticated
  using (public.is_admin());

create policy "Admins can add beta users"
  on public.beta_users for insert to authenticated
  with check (public.is_admin());

create policy "Admins can update beta users"
  on public.beta_users for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete beta users"
  on public.beta_users for delete to authenticated
  using (public.is_admin());

create or replace function public.set_beta_user_system_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();

  if tg_op = 'INSERT' then
    if new.status = 'Banned' then
      new.banned_at := now();
      new.banned_by := auth.uid();
    end if;
  elsif new.status = 'Banned' and old.status <> 'Banned' then
    new.banned_at := now();
    new.banned_by := auth.uid();
  elsif new.status = 'Banned' then
    new.banned_at := old.banned_at;
    new.banned_by := old.banned_by;
  elsif new.status <> 'Banned' then
    new.ban_reason := null;
    new.banned_at := null;
    new.banned_by := null;
  end if;

  return new;
end;
$$;

drop trigger if exists beta_users_set_system_fields on public.beta_users;
create trigger beta_users_set_system_fields
  before insert or update on public.beta_users
  for each row execute function public.set_beta_user_system_fields();

create or replace function public.audit_beta_user_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_action text;
  target_id uuid;
  event_metadata jsonb;
  actor_id_type text;
  event_type_type text;
  target_id_type text;
  details_type text;
  created_at_type text;
begin
  if not public.is_admin() then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE'
    and (to_jsonb(old) - 'last_active_at' - 'updated_at')
      = (to_jsonb(new) - 'last_active_at' - 'updated_at') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    event_action := 'BETA_USER_CREATED';
    target_id := new.id;
    event_metadata := jsonb_build_object('new', to_jsonb(new));
  elsif tg_op = 'UPDATE' then
    event_action := 'BETA_USER_UPDATED';
    target_id := new.id;
    event_metadata := jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new));
  else
    event_action := 'BETA_USER_DELETED';
    target_id := old.id;
    event_metadata := jsonb_build_object('old', to_jsonb(old));
  end if;

  select pg_catalog.format_type(attribute.atttypid, attribute.atttypmod)
  into actor_id_type
  from pg_catalog.pg_attribute as attribute
  where attribute.attrelid = 'public.admin_audit_events'::regclass
    and attribute.attname = 'actor_id'
    and attribute.attnum > 0
    and not attribute.attisdropped;

  select pg_catalog.format_type(attribute.atttypid, attribute.atttypmod)
  into event_type_type
  from pg_catalog.pg_attribute as attribute
  where attribute.attrelid = 'public.admin_audit_events'::regclass
    and attribute.attname = 'event_type'
    and attribute.attnum > 0
    and not attribute.attisdropped;

  select pg_catalog.format_type(attribute.atttypid, attribute.atttypmod)
  into target_id_type
  from pg_catalog.pg_attribute as attribute
  where attribute.attrelid = 'public.admin_audit_events'::regclass
    and attribute.attname = 'target_user_id'
    and attribute.attnum > 0
    and not attribute.attisdropped;

  select pg_catalog.format_type(attribute.atttypid, attribute.atttypmod)
  into details_type
  from pg_catalog.pg_attribute as attribute
  where attribute.attrelid = 'public.admin_audit_events'::regclass
    and attribute.attname = 'details'
    and attribute.attnum > 0
    and not attribute.attisdropped;

  select pg_catalog.format_type(attribute.atttypid, attribute.atttypmod)
  into created_at_type
  from pg_catalog.pg_attribute as attribute
  where attribute.attrelid = 'public.admin_audit_events'::regclass
    and attribute.attname = 'created_at'
    and attribute.attnum > 0
    and not attribute.attisdropped;

  if actor_id_type is null or event_type_type is null
    or target_id_type is null or details_type is null or created_at_type is null then
    raise exception 'public.admin_audit_events does not have the expected actor_id, event_type, target_user_id, details, and created_at columns';
  end if;

  execute pg_catalog.format(
    'insert into public.admin_audit_events (actor_id, event_type, target_user_id, details, created_at) values (($1)::%s, ($2)::%s, ($3)::%s, ($4)::%s, ($5)::%s)',
    actor_id_type,
    event_type_type,
    target_id_type,
    details_type,
    created_at_type
  ) using auth.uid()::text, event_action, target_id::text, event_metadata::text, now()::text;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists beta_users_audit_changes on public.beta_users;
create trigger beta_users_audit_changes
  after insert or update or delete on public.beta_users
  for each row execute function public.audit_beta_user_changes();

alter table public.admin_audit_events enable row level security;
revoke all on table public.admin_audit_events from public, anon, authenticated;
grant select on table public.admin_audit_events to authenticated;

do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select policyname
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'admin_audit_events'
  loop
    execute pg_catalog.format(
      'drop policy %I on public.admin_audit_events',
      existing_policy.policyname
    );
  end loop;
end;
$$;

create policy "Admins can read admin audit events"
  on public.admin_audit_events for select to authenticated
  using (public.is_admin());

create index if not exists admin_audit_events_created_at_idx
  on public.admin_audit_events (created_at desc);

create or replace function public.ensure_current_beta_user()
returns public.beta_users
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text := auth.jwt() ->> 'email';
  display_name text := coalesce(nullif(auth.jwt() ->> 'email', ''), auth.uid()::text);
  beta_user public.beta_users;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  insert into public.beta_users (auth_user_id, username, email)
  values (current_user_id, display_name, current_email)
  on conflict (auth_user_id) do update
    set email = coalesce(excluded.email, public.beta_users.email),
        last_active_at = now()
  returning * into beta_user;

  return beta_user;
end;
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
revoke all on function public.set_beta_user_system_fields() from public, anon, authenticated;
revoke all on function public.audit_beta_user_changes() from public, anon, authenticated;
revoke all on function public.ensure_current_beta_user() from public, anon;
grant execute on function public.ensure_current_beta_user() to authenticated;