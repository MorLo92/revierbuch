-- Revierbuch – Mehrbenutzer, Stufe 1
-- Im Supabase-Dashboard unter "SQL Editor" einfügen und auf "Run" klicken.
-- Kann gefahrlos mehrfach ausgeführt werden.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- ============ Tabellen ============

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 60),
  created_at timestamptz not null default now()
);

-- Datenschutz-Zustimmung (eine Zeile pro Nutzer und Textversion)
create table if not exists public.consents (
  user_id uuid not null references auth.users(id) on delete cascade,
  doc_version text not null,
  accepted_at timestamptz not null default now(),
  primary key (user_id, doc_version)
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

-- Lose einer Gruppe (lot_id = Losnummer aus der App)
create table if not exists public.group_lots (
  group_id uuid not null references public.groups(id) on delete cascade,
  lot_id text not null check (char_length(lot_id) between 1 and 40),
  primary key (group_id, lot_id)
);

-- Rollen je Gruppe; perms = {"kategorie": "read" | "write"}
create table if not exists public.group_roles (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  perms jsonb not null default '{}'::jsonb,
  unique (group_id, name)
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid references public.group_roles(id) on delete set null,
  is_admin boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index if not exists group_members_user_idx on public.group_members(user_id);
create index if not exists group_members_role_idx on public.group_members(role_id);

create table if not exists public.group_invites (
  code text primary key default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  group_id uuid not null references public.groups(id) on delete cascade,
  role_id uuid not null references public.group_roles(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id),
  expires_at timestamptz not null default now() + interval '7 days',
  max_uses int not null default 1 check (max_uses between 1 and 50),
  uses int not null default 0
);
create index if not exists group_invites_group_idx on public.group_invites(group_id);
create index if not exists group_invites_role_idx on public.group_invites(role_id);

-- Geteilte Einträge (ab Stufe 2): ein Eintrag gehört einer Gruppe und einer Kategorie
create table if not exists public.shared_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  category text not null check (category in
    ('installations','kills','sightings','reservations','hunts','tracks','parcels','damages','plan','photos')),
  owner_id uuid not null default auth.uid() references auth.users(id),
  data jsonb not null default '{}'::jsonb,
  deleted boolean not null default false,
  updated_at timestamptz not null default now()
);
create index if not exists shared_items_group_cat_idx on public.shared_items(group_id, category, updated_at);
create index if not exists shared_items_owner_idx on public.shared_items(owner_id);

-- ============ Hilfsfunktionen für die Zugriffsregeln ============
-- (im nicht öffentlichen Schema "private", damit sie nicht als API erreichbar sind)

-- Datenschutztext Version 1 akzeptiert?
create or replace function private.has_consent()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.consents c
                 where c.user_id = (select auth.uid()) and c.doc_version = '1');
$$;

create or replace function private.is_member(gid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_consent() and exists (
    select 1 from public.group_members m
    where m.group_id = gid and m.user_id = (select auth.uid()));
$$;

create or replace function private.is_admin(gid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_consent() and exists (
    select 1 from public.group_members m
    where m.group_id = gid and m.user_id = (select auth.uid()) and m.is_admin);
$$;

-- need_write=false: Lesen genügt; true: Schreibrecht nötig. Admins dürfen alles.
create or replace function private.can(gid uuid, cat text, need_write boolean)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_consent() and exists (
    select 1 from public.group_members m
    left join public.group_roles r on r.id = m.role_id
    where m.group_id = gid and m.user_id = (select auth.uid())
      and (m.is_admin
           or (need_write and r.perms ->> cat = 'write')
           or (not need_write and r.perms ->> cat in ('read','write'))));
$$;

create or replace function private.shares_group(uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.group_members a
    join public.group_members b on b.group_id = a.group_id
    where a.user_id = (select auth.uid()) and b.user_id = uid);
$$;

revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

-- Profil automatisch beim ersten Login anlegen
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(left(split_part(new.email, '@', 1), 60), ''))
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ============ Funktionen, die die App aufruft (RPC) ============

-- Gruppe samt Losen anlegen; Ersteller wird Administrator
create or replace function public.create_group(p_name text, p_lots text[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  gid uuid;
begin
  if uid is null or not private.has_consent() then
    raise exception 'Datenschutzerklärung nicht akzeptiert';
  end if;
  if coalesce(array_length(p_lots, 1), 0) = 0 then
    raise exception 'Mindestens ein Los nötig';
  end if;
  insert into public.groups (name, created_by) values (trim(p_name), uid) returning id into gid;
  insert into public.group_lots (group_id, lot_id)
    select gid, distinct_lot from (select distinct trim(x) as distinct_lot from unnest(p_lots) x) s
    where distinct_lot <> '';
  insert into public.group_roles (group_id, name, perms) values
    (gid, 'Jäger', '{"installations":"read","kills":"write","sightings":"write","reservations":"write","hunts":"read","tracks":"read","parcels":"read","damages":"read","plan":"read","photos":"write"}'),
    (gid, 'Gast',  '{"installations":"read","sightings":"read","hunts":"read"}');
  insert into public.group_members (group_id, user_id, is_admin) values (gid, uid, true);
  return gid;
end $$;

-- Einladungscode einlösen
create or replace function public.accept_invite(p_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  inv public.group_invites%rowtype;
begin
  if uid is null or not private.has_consent() then
    raise exception 'Datenschutzerklärung nicht akzeptiert';
  end if;
  select * into inv from public.group_invites
    where code = lower(trim(p_code)) and expires_at > now() and uses < max_uses
    for update;
  if not found then
    raise exception 'Einladung ungültig oder abgelaufen';
  end if;
  insert into public.group_members (group_id, user_id, role_id)
    values (inv.group_id, uid, inv.role_id)
    on conflict (group_id, user_id) do nothing;
  update public.group_invites set uses = uses + 1 where code = inv.code;
  return inv.group_id;
end $$;

revoke execute on function public.create_group(text, text[]) from public, anon;
revoke execute on function public.accept_invite(text) from public, anon;
grant execute on function public.create_group(text, text[]) to authenticated;
grant execute on function public.accept_invite(text) to authenticated;

-- ============ Zugriffsregeln (Row Level Security) ============

alter table public.profiles      enable row level security;
alter table public.consents      enable row level security;
alter table public.groups        enable row level security;
alter table public.group_lots    enable row level security;
alter table public.group_roles   enable row level security;
alter table public.group_members enable row level security;
alter table public.group_invites enable row level security;
alter table public.shared_items  enable row level security;

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or private.shares_group(id));
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- consents: nur eigene lesen und anlegen
drop policy if exists consents_select on public.consents;
create policy consents_select on public.consents for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists consents_insert on public.consents;
create policy consents_insert on public.consents for insert to authenticated
  with check (user_id = (select auth.uid()));

-- groups
drop policy if exists groups_select on public.groups;
create policy groups_select on public.groups for select to authenticated
  using (private.is_member(id));
drop policy if exists groups_update on public.groups;
create policy groups_update on public.groups for update to authenticated
  using (private.is_admin(id)) with check (private.is_admin(id));
drop policy if exists groups_delete on public.groups;
create policy groups_delete on public.groups for delete to authenticated
  using (private.is_admin(id));

-- group_lots
drop policy if exists group_lots_select on public.group_lots;
create policy group_lots_select on public.group_lots for select to authenticated
  using (private.is_member(group_id));
drop policy if exists group_lots_insert on public.group_lots;
create policy group_lots_insert on public.group_lots for insert to authenticated
  with check (private.is_admin(group_id));
drop policy if exists group_lots_delete on public.group_lots;
create policy group_lots_delete on public.group_lots for delete to authenticated
  using (private.is_admin(group_id));

-- group_roles
drop policy if exists group_roles_select on public.group_roles;
create policy group_roles_select on public.group_roles for select to authenticated
  using (private.is_member(group_id));
drop policy if exists group_roles_insert on public.group_roles;
create policy group_roles_insert on public.group_roles for insert to authenticated
  with check (private.is_admin(group_id));
drop policy if exists group_roles_update on public.group_roles;
create policy group_roles_update on public.group_roles for update to authenticated
  using (private.is_admin(group_id)) with check (private.is_admin(group_id));
drop policy if exists group_roles_delete on public.group_roles;
create policy group_roles_delete on public.group_roles for delete to authenticated
  using (private.is_admin(group_id));

-- group_members (Beitritt nur über accept_invite / create_group)
drop policy if exists group_members_select on public.group_members;
create policy group_members_select on public.group_members for select to authenticated
  using (private.is_member(group_id));
drop policy if exists group_members_update on public.group_members;
create policy group_members_update on public.group_members for update to authenticated
  using (private.is_admin(group_id)) with check (private.is_admin(group_id));
drop policy if exists group_members_delete on public.group_members;
create policy group_members_delete on public.group_members for delete to authenticated
  using (private.is_admin(group_id) or user_id = (select auth.uid()));

-- group_invites
drop policy if exists group_invites_select on public.group_invites;
create policy group_invites_select on public.group_invites for select to authenticated
  using (private.is_admin(group_id));
drop policy if exists group_invites_insert on public.group_invites;
create policy group_invites_insert on public.group_invites for insert to authenticated
  with check (private.is_admin(group_id) and created_by = (select auth.uid()));
drop policy if exists group_invites_delete on public.group_invites;
create policy group_invites_delete on public.group_invites for delete to authenticated
  using (private.is_admin(group_id));

-- shared_items
drop policy if exists shared_items_select on public.shared_items;
create policy shared_items_select on public.shared_items for select to authenticated
  using (private.can(group_id, category, false));
drop policy if exists shared_items_insert on public.shared_items;
create policy shared_items_insert on public.shared_items for insert to authenticated
  with check (private.can(group_id, category, true) and owner_id = (select auth.uid()));
drop policy if exists shared_items_update on public.shared_items;
create policy shared_items_update on public.shared_items for update to authenticated
  using (private.can(group_id, category, true)
         and (owner_id = (select auth.uid()) or private.is_admin(group_id)))
  with check (private.can(group_id, category, true)
         and (owner_id = (select auth.uid()) or private.is_admin(group_id)));
drop policy if exists shared_items_delete on public.shared_items;
create policy shared_items_delete on public.shared_items for delete to authenticated
  using (private.can(group_id, category, true)
         and (owner_id = (select auth.uid()) or private.is_admin(group_id)));

-- ============ Zugriff über die API ausdrücklich erlauben ============
-- (anon = nicht angemeldet: bekommt nichts)
revoke all on public.profiles, public.consents, public.groups, public.group_lots,
  public.group_roles, public.group_members, public.group_invites, public.shared_items
  from anon;
grant select, update on public.profiles to authenticated;
grant select, insert on public.consents to authenticated;
grant select, update, delete on public.groups to authenticated;
grant select, insert, delete on public.group_lots to authenticated;
grant select, insert, update, delete on public.group_roles to authenticated;
grant select, update, delete on public.group_members to authenticated;
grant select, insert, delete on public.group_invites to authenticated;
grant select, insert, update, delete on public.shared_items to authenticated;
