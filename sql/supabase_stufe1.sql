-- Revierbuch – Mehrbenutzer, Stufe 1 (Version 2: Einträge hängen am Los, Gäste sehen gerundete Positionen)
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
-- Ein Los darf nur die zuerst eintragende Gruppe nutzen; weitere Gruppen müssen freigegeben werden
alter table public.group_lots add column if not exists approved boolean not null default false;
alter table public.group_lots add column if not exists requested_at timestamptz not null default now();

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

-- Geteilte Einträge (ab Stufe 2): ein Eintrag hängt an einem Los und einer Kategorie
do $$ begin  -- alte Struktur (Version 1, an Gruppe statt Los) entfernen; leer, solange nichts geteilt wurde
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'shared_items' and column_name = 'group_id') then
    drop table public.shared_items cascade;
  end if;
end $$;
create table if not exists public.shared_items (
  id uuid primary key default gen_random_uuid(),
  lot_id text not null check (char_length(lot_id) between 1 and 40),
  category text not null check (category in
    ('installations','kills','sightings','reservations','hunts','tracks','parcels','damages','plan','photos')),
  owner_id uuid not null default auth.uid() references auth.users(id),
  lat double precision check (lat between -90 and 90),
  lon double precision check (lon between -180 and 180),
  data jsonb not null default '{}'::jsonb,
  deleted boolean not null default false,
  updated_at timestamptz not null default now()
);
create index if not exists shared_items_lot_cat_idx on public.shared_items(lot_id, category, updated_at);
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

-- Rechte-Stufe: 0 nichts, 1 nur ungefähre Position, 2 lesen, 3 schreiben (Admins immer 3).
-- Gilt pro Los: es zählen alle freigegebenen Gruppen, die dieses Los haben.
drop function if exists private.can(uuid, text, boolean);
create or replace function private.perm_level(p text)
returns int language sql immutable set search_path = '' as $$
  select case p when 'write' then 3 when 'read' then 2 when 'approx' then 1 else 0 end;
$$;

create or replace function private.lot_level(lot text, cat text)
returns int language sql stable security definer set search_path = '' as $$
  select coalesce(max(case when m.is_admin then 3 else private.perm_level(r.perms ->> cat) end), 0)
  from public.group_members m
  join public.group_lots gl on gl.group_id = m.group_id and gl.lot_id = lot and gl.approved
  left join public.group_roles r on r.id = m.role_id
  where private.has_consent() and m.user_id = (select auth.uid());
$$;

-- Administrator einer Gruppe, die das Los freigegeben hat
create or replace function private.is_lot_admin(lot text)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_consent() and exists (
    select 1 from public.group_members m
    join public.group_lots gl on gl.group_id = m.group_id and gl.lot_id = lot and gl.approved
    where m.user_id = (select auth.uid()) and m.is_admin);
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
  values (new.id, coalesce(nullif(trim(left(new.raw_user_meta_data ->> 'display_name', 60)), ''), left(split_part(new.email, '@', 1), 60), ''))
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ============ Funktionen, die die App aufruft (RPC) ============

-- Ein Los ist sofort aktiv, wenn es noch keine freigegebene Gruppe hat; sonst wartet es auf Freigabe
create or replace function private.claim_lot(gid uuid, lot text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtext(lot));
  insert into public.group_lots (group_id, lot_id, approved)
  values (gid, lot, not exists (select 1 from public.group_lots x where x.lot_id = lot and x.approved))
  on conflict (group_id, lot_id) do nothing;
end $$;

revoke execute on function private.claim_lot(uuid, text) from public, anon, authenticated;

create or replace function public.create_group(p_name text, p_lots text[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  gid uuid;
  lot text;
begin
  if uid is null or not private.has_consent() then
    raise exception 'Datenschutzerklärung nicht akzeptiert';
  end if;
  if coalesce(array_length(p_lots, 1), 0) = 0 then
    raise exception 'Mindestens ein Los nötig';
  end if;
  insert into public.groups (name, created_by) values (trim(p_name), uid) returning id into gid;
  insert into public.group_roles (group_id, name, perms) values
    (gid, 'Jäger', '{"installations":"read","kills":"write","sightings":"write","reservations":"write","hunts":"read","tracks":"read","parcels":"read","damages":"read","plan":"read","photos":"write"}'),
    (gid, 'Gast',  '{"sightings":"approx","kills":"approx"}');
  insert into public.group_members (group_id, user_id, is_admin) values (gid, uid, true);
  for lot in select distinct trim(x) from unnest(p_lots) x where trim(x) <> '' loop
    perform private.claim_lot(gid, lot);
  end loop;
  return gid;
end $$;

create or replace function public.add_lot(p_group uuid, p_lot text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin(p_group) then raise exception 'Nur Administratoren'; end if;
  perform private.claim_lot(p_group, trim(p_lot));
end $$;

-- Administrator einer bereits freigegebenen Gruppe gibt ein weiteres Gesuch für dasselbe Los frei
create or replace function public.approve_lot(p_group uuid, p_lot text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_lot_admin(p_lot) then raise exception 'Keine Berechtigung'; end if;
  update public.group_lots set approved = true where group_id = p_group and lot_id = p_lot;
end $$;

-- Einträge lesen: Gäste ("approx") bekommen die Position auf ein Raster von ca. 100 m gerundet,
-- ohne genaue Koordinaten in den Zusatzdaten. Mit p_since nur Änderungen seit einem Zeitpunkt.
create or replace function public.list_items(p_lot text default null, p_since timestamptz default null)
returns table (id uuid, lot_id text, category text, owner_id uuid, lat double precision,
               lon double precision, approx boolean, data jsonb, deleted boolean, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select i.id, i.lot_id, i.category, i.owner_id,
         case when lv.l >= 2 then i.lat else round(i.lat / 0.001) * 0.001 end,
         case when lv.l >= 2 then i.lon else round(i.lon / 0.0015) * 0.0015 end,
         lv.l < 2,
         case when lv.l >= 2 then i.data else i.data - 'lat' - 'lon' end,
         i.deleted, i.updated_at
  from public.shared_items i
  cross join lateral (select private.lot_level(i.lot_id, i.category) as l) lv
  where lv.l >= 1
    and (p_lot is null or i.lot_id = p_lot)
    and (p_since is null or i.updated_at > p_since)
  order by i.updated_at;
$$;

-- Offene Anfragen anderer Gruppen auf Lose, die ich als Administrator verwalte
create or replace function public.lot_requests()
returns table (group_id uuid, group_name text, lot_id text, requested_at timestamptz, requested_by text)
language sql stable security definer set search_path = '' as $$
  select gl.group_id, g.name, gl.lot_id, gl.requested_at, coalesce(p.display_name, '')
  from public.group_lots gl
  join public.groups g on g.id = gl.group_id
  left join public.profiles p on p.id = g.created_by
  where not gl.approved and private.is_lot_admin(gl.lot_id);
$$;
revoke execute on function public.lot_requests() from public, anon;
grant execute on function public.lot_requests() to authenticated;

create or replace function private.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
revoke execute on function private.touch_updated_at() from public, anon, authenticated;
drop trigger if exists shared_items_touch on public.shared_items;
create trigger shared_items_touch before insert or update on public.shared_items
  for each row execute function private.touch_updated_at();

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
revoke execute on function public.add_lot(uuid, text) from public, anon;
revoke execute on function public.approve_lot(uuid, text) from public, anon;
revoke execute on function public.list_items(text, timestamptz) from public, anon;
grant execute on function public.create_group(text, text[]) to authenticated;
grant execute on function public.accept_invite(text) to authenticated;
grant execute on function public.add_lot(uuid, text) to authenticated;
grant execute on function public.approve_lot(uuid, text) to authenticated;
grant execute on function public.list_items(text, timestamptz) to authenticated;

-- ============ Zugriffsregeln (Row Level Security) ============

alter table public.profiles      enable row level security;
alter table public.consents      enable row level security;
alter table public.groups        enable row level security;
alter table public.group_lots    enable row level security;
alter table public.group_roles   enable row level security;
alter table public.group_members enable row level security;
alter table public.group_invites enable row level security;

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

-- group_lots (Einträge nur über create_group / add_lot / approve_lot)
drop policy if exists group_lots_select on public.group_lots;
create policy group_lots_select on public.group_lots for select to authenticated
  using (private.is_member(group_id) or private.is_lot_admin(lot_id));
drop policy if exists group_lots_insert on public.group_lots;
drop policy if exists group_lots_delete on public.group_lots;
create policy group_lots_delete on public.group_lots for delete to authenticated
  using (private.is_admin(group_id) or private.is_lot_admin(lot_id));

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

-- shared_items: direkter Zugriff nur mit genauer Position (Stufe >= 2); Gäste lesen über list_items()
alter table public.shared_items enable row level security;
drop policy if exists shared_items_select on public.shared_items;
create policy shared_items_select on public.shared_items for select to authenticated
  using (private.lot_level(lot_id, category) >= 2);
drop policy if exists shared_items_insert on public.shared_items;
create policy shared_items_insert on public.shared_items for insert to authenticated
  with check (private.lot_level(lot_id, category) >= 3 and owner_id = (select auth.uid()));
drop policy if exists shared_items_update on public.shared_items;
create policy shared_items_update on public.shared_items for update to authenticated
  using (private.lot_level(lot_id, category) >= 3
         and (owner_id = (select auth.uid()) or private.is_lot_admin(lot_id)))
  with check (private.lot_level(lot_id, category) >= 3
         and (owner_id = (select auth.uid()) or private.is_lot_admin(lot_id)));
drop policy if exists shared_items_delete on public.shared_items;
create policy shared_items_delete on public.shared_items for delete to authenticated
  using (private.lot_level(lot_id, category) >= 3
         and (owner_id = (select auth.uid()) or private.is_lot_admin(lot_id)));

-- ============ Zugriff über die API ausdrücklich erlauben ============
-- (anon = nicht angemeldet: bekommt nichts)
revoke all on public.profiles, public.consents, public.groups, public.group_lots,
  public.group_roles, public.group_members, public.group_invites, public.shared_items
  from anon;
grant select, update on public.profiles to authenticated;
grant select, insert on public.consents to authenticated;
grant select, update, delete on public.groups to authenticated;
grant select, delete on public.group_lots to authenticated;
grant select, insert, update, delete on public.group_roles to authenticated;
grant select, update, delete on public.group_members to authenticated;
grant select, insert, delete on public.group_invites to authenticated;
grant select, insert, update, delete on public.shared_items to authenticated;


-- ====================================================================
-- Korrekturen (Test der Gruppenfunktion, November 2026)
-- Dieser Abschnitt steht absichtlich am Ende dieser Datei: die ganze Datei ist mehrfach ausführbar.
--  * Mitglieder, Rollen, Einladungen: Spaltenrechte, Rolle muss zur Gruppe gehören, mindestens ein Administrator
--  * Lose: Format, Limits, Abgabe mit Auswahl der zu löschenden Einträge (release_lot), kein automatisches Nachrücken
--  * Einträge gehören dem Los: sie bleiben, wenn ein Mitglied die Gruppe verlässt oder sein Konto löscht
--  * Gäste ("ungefähr"): nur Abschüsse und Sichtungen, nur erlaubte Felder, keine Besitzer
--  * Konto löschen und Einwilligung widerrufen
-- ====================================================================

-- ============ Spaltenrechte ============
revoke update on public.group_members from authenticated;
grant update (role_id, is_admin) on public.group_members to authenticated;
revoke update on public.groups from authenticated;
grant update (name) on public.groups to authenticated;
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;
revoke update on public.group_roles from authenticated;
grant update (name, perms) on public.group_roles to authenticated;
revoke update on public.group_invites from authenticated;
revoke insert on public.group_invites from authenticated;
grant insert (group_id, role_id, max_uses) on public.group_invites to authenticated;
revoke insert on public.consents from authenticated;
grant insert (user_id, doc_version) on public.consents to authenticated;
revoke truncate, references, trigger on all tables in schema public from authenticated, anon;

-- ============ Rolle gehört zur Gruppe ============
create or replace function private.check_role_group()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.role_id is not null and not exists (
       select 1 from public.group_roles r where r.id = new.role_id and r.group_id = new.group_id) then
    raise exception 'Diese Rolle gehört nicht zur Gruppe';
  end if;
  return new;
end $$;
revoke execute on function private.check_role_group() from public, anon, authenticated;
drop trigger if exists group_members_role_check on public.group_members;
create trigger group_members_role_check before insert or update of role_id, group_id on public.group_members
  for each row execute function private.check_role_group();
drop trigger if exists group_invites_role_check on public.group_invites;
create trigger group_invites_role_check before insert or update of role_id, group_id on public.group_invites
  for each row execute function private.check_role_group();

-- ============ Rollen: Name und Rechte prüfen ============
create or replace function private.check_role()
returns trigger language plpgsql set search_path = '' as $$
declare k text; v jsonb;
begin
  new.name := btrim(new.name);
  if new.name = '' then raise exception 'Bitte einen Namen eingeben'; end if;
  if jsonb_typeof(new.perms) <> 'object' or pg_column_size(new.perms) > 2000 then
    raise exception 'Ungültige Rechte';
  end if;
  for k, v in select * from jsonb_each(new.perms) loop
    if k not in ('installations','kills','sightings','reservations','hunts','tracks','parcels','damages','plan','photos')
       or jsonb_typeof(v) <> 'string' or (v #>> '{}') not in ('read','write','approx')
       or ((v #>> '{}') = 'approx' and k not in ('kills','sightings')) then
      raise exception 'Ungültige Rechte';
    end if;
  end loop;
  return new;
end $$;
revoke execute on function private.check_role() from public, anon, authenticated;
drop trigger if exists group_roles_check on public.group_roles;
create trigger group_roles_check before insert or update of name, perms on public.group_roles
  for each row execute function private.check_role();
do $$ begin
  create unique index if not exists group_roles_name_ci on public.group_roles (group_id, lower(btrim(name)));
exception when others then null; end $$;

-- ============ Mindestens ein Administrator (mit Sperre gegen gleichzeitige Änderungen) ============
-- Beim Löschen der ganzen Gruppe läuft die Kaskade tiefer als eine Ebene und wird nicht geprüft.
create or replace function private.keep_admin()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if pg_trigger_depth() > 1 then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  perform 1 from public.groups where id = old.group_id for update;
  if old.is_admin and (tg_op = 'DELETE' or not new.is_admin)
     and not exists (select 1 from public.group_members m
                     where m.group_id = old.group_id and m.user_id <> old.user_id and m.is_admin)
     and exists (select 1 from public.group_members m
                 where m.group_id = old.group_id and m.user_id <> old.user_id) then
    raise exception 'Es braucht mindestens einen Administrator';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
revoke execute on function private.keep_admin() from public, anon, authenticated;
drop trigger if exists group_members_keep_admin on public.group_members;
create trigger group_members_keep_admin before update of is_admin or delete on public.group_members
  for each row execute function private.keep_admin();

-- Gruppe ohne Mitglieder wird gelöscht (ihre Lose werden frei; Einträge bleiben am Los)
create or replace function private.drop_empty_group()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.group_members m where m.group_id = old.group_id) then
    delete from public.groups where id = old.group_id;
  end if;
  return old;
end $$;
revoke execute on function private.drop_empty_group() from public, anon, authenticated;
drop trigger if exists group_members_drop_empty on public.group_members;
create trigger group_members_drop_empty after delete on public.group_members
  for each row execute function private.drop_empty_group();

-- ============ Einladung einlösen ============
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
  if exists (select 1 from public.group_members where group_id = inv.group_id and user_id = uid) then
    return inv.group_id;  -- schon Mitglied: Rolle und Zähler bleiben unverändert
  end if;
  insert into public.group_members (group_id, user_id, role_id) values (inv.group_id, uid, inv.role_id);
  update public.group_invites set uses = uses + 1 where code = inv.code;
  return inv.group_id;
end $$;

-- ============ Lose ============
-- Ein Los wird sofort aktiv, wenn keine freigegebene Gruppe es hat; sonst wartet es auf Freigabe.
create or replace function private.claim_lot(gid uuid, lot text)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  lot := btrim(lot);
  if lot !~ '^[1-9][0-9]{0,5}$' then raise exception 'Ungültige Losnummer'; end if;
  perform pg_advisory_xact_lock(hashtext('g' || gid::text));
  if exists (select 1 from public.group_lots x where x.group_id = gid and x.lot_id = lot) then return; end if;
  if (select count(*) from public.group_lots x where x.group_id = gid) >= 50 then
    raise exception 'Höchstens 50 Lose pro Gruppe';
  end if;
  if (select count(*) from public.group_lots x join public.group_members m on m.group_id = x.group_id
      where m.user_id = uid and m.is_admin) >= 100 then
    raise exception 'Höchstens 100 Lose pro Person';
  end if;
  perform pg_advisory_xact_lock(hashtext(lot));
  insert into public.group_lots (group_id, lot_id, approved)
  values (gid, lot, not exists (select 1 from public.group_lots x where x.lot_id = lot and x.approved))
  on conflict (group_id, lot_id) do nothing;
end $$;
revoke execute on function private.claim_lot(uuid, text) from public, anon, authenticated;

create or replace function public.create_group(p_name text, p_lots text[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  gid uuid;
  lot text;
  lots text[];
begin
  if uid is null or not private.has_consent() then
    raise exception 'Datenschutzerklärung nicht akzeptiert';
  end if;
  select coalesce(array_agg(distinct btrim(x)), '{}') into lots from unnest(p_lots) x where btrim(x) <> '';
  if coalesce(array_length(lots, 1), 0) = 0 then
    raise exception 'Mindestens ein Los nötig';
  end if;
  if btrim(coalesce(p_name, '')) = '' then raise exception 'Bitte einen Namen eingeben'; end if;
  if (select count(*) from public.groups g where g.created_by = uid) >= 10 then
    raise exception 'Höchstens 10 Gruppen pro Person';
  end if;
  insert into public.groups (name, created_by) values (btrim(p_name), uid) returning id into gid;
  insert into public.group_roles (group_id, name, perms) values
    (gid, 'Jäger', '{"installations":"read","kills":"write","sightings":"write","reservations":"write","hunts":"read","tracks":"read","parcels":"read","damages":"read","plan":"read","photos":"write"}'),
    (gid, 'Gast',  '{"sightings":"approx","kills":"approx"}');
  insert into public.group_members (group_id, user_id, is_admin) values (gid, uid, true);
  foreach lot in array lots loop
    perform private.claim_lot(gid, lot);
  end loop;
  return gid;
end $$;

-- kein automatisches Nachrücken: ein Los wechselt nur durch release_lot oder approve_lot
drop trigger if exists group_lots_promote on public.group_lots;
drop function if exists private.promote_lot();

drop policy if exists group_lots_delete on public.group_lots;
create policy group_lots_delete on public.group_lots for delete to authenticated
  using (private.is_admin(group_id) or (not approved and private.is_lot_admin(lot_id)));

-- Los abgeben: der Administrator wählt, welche Einträge gelöscht werden (ganze Kategorien und/oder einzelne
-- Einträge); die übrigen bleiben am Los. Optional geht das Los gleich an eine wartende Gruppe.
-- Gelöschte Einträge verlieren Inhalt und Position (Löschvermerk bleibt für die Synchronisation).
create or replace function public.release_lot(p_group uuid, p_lot text,
    p_delete_categories text[] default '{}', p_delete_ids uuid[] default '{}', p_to_group uuid default null)
returns int language plpgsql security definer set search_path = '' as $$
declare n int := 0;
begin
  if not private.is_admin(p_group) then raise exception 'Nur Administratoren'; end if;
  perform pg_advisory_xact_lock(hashtext(p_lot));
  if not exists (select 1 from public.group_lots where group_id = p_group and lot_id = p_lot) then
    raise exception 'Dieses Los gehört nicht zur Gruppe';
  end if;
  if exists (select 1 from public.group_lots where group_id = p_group and lot_id = p_lot and approved) then
    update public.shared_items
       set deleted = true, data = '{}'::jsonb, lat = null, lon = null
     where lot_id = p_lot and not deleted
       and (category = any(coalesce(p_delete_categories, '{}')) or id = any(coalesce(p_delete_ids, '{}')));
    get diagnostics n = row_count;
  end if;
  delete from public.group_lots where group_id = p_group and lot_id = p_lot;
  if p_to_group is not null then
    update public.group_lots set approved = true
     where group_id = p_to_group and lot_id = p_lot and not approved
       and not exists (select 1 from public.group_lots x where x.lot_id = p_lot and x.approved);
  end if;
  return n;
end $$;
revoke execute on function public.release_lot(uuid, text, text[], uuid[], uuid) from public, anon;
grant execute on function public.release_lot(uuid, text, text[], uuid[], uuid) to authenticated;

-- Anfragen anderer Gruppen auf Lose, die ich verwalte (ohne Namen der Ersteller)
create or replace function public.lot_requests()
returns table (group_id uuid, group_name text, lot_id text, requested_at timestamptz, requested_by text)
language sql stable security definer set search_path = '' as $$
  select gl.group_id, g.name, gl.lot_id, gl.requested_at, ''::text
  from public.group_lots gl
  join public.groups g on g.id = gl.group_id
  where not gl.approved and private.is_lot_admin(gl.lot_id);
$$;
revoke execute on function public.lot_requests() from public, anon;
grant execute on function public.lot_requests() to authenticated;

-- ============ Profile und Einwilligung ============
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(trim(left(new.raw_user_meta_data ->> 'display_name', 60)), ''), 'Mitglied'))
  on conflict do nothing;
  return new;
end $$;
revoke execute on function private.handle_new_user() from public, anon, authenticated;

create or replace function private.shares_group(uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_consent() and exists (
    select 1 from public.group_members a
    join public.group_members b on b.group_id = a.group_id
    where a.user_id = (select auth.uid()) and b.user_id = uid);
$$;

do $$ begin
  alter table public.consents add constraint consents_version_chk check (doc_version ~ '^[0-9]{1,3}$') not valid;
exception when duplicate_object then null; end $$;

-- ============ Rechte pro Los: "ungefähr" gilt nur für Abschüsse und Sichtungen ============
create or replace function private.lot_level(lot text, cat text)
returns int language sql stable security definer set search_path = '' as $$
  select coalesce(max(case when m.is_admin then 3
                           when r.perms ->> cat = 'approx' and cat not in ('kills','sightings') then 0
                           else private.perm_level(r.perms ->> cat) end), 0)
  from public.group_members m
  join public.group_lots gl on gl.group_id = m.group_id and gl.lot_id = lot and gl.approved
  left join public.group_roles r on r.id = m.role_id
  where private.has_consent() and m.user_id = (select auth.uid());
$$;

-- ============ Geteilte Einträge ============
do $$ begin
  alter table public.shared_items add constraint shared_items_data_chk
    check (jsonb_typeof(data) = 'object' and pg_column_size(data) <= 16384) not valid;
exception when duplicate_object then null; end $$;

create or replace function private.lock_item_keys()
returns trigger language plpgsql set search_path = '' as $$
begin
  if pg_trigger_depth() > 1 then return new; end if;  -- Besitzer leeren beim Löschen eines Kontos
  if new.id <> old.id or new.lot_id <> old.lot_id or new.category <> old.category or new.owner_id is distinct from old.owner_id then
    raise exception 'Los, Kategorie und Besitzer eines Eintrags lassen sich nicht ändern';
  end if;
  return new;
end $$;
revoke execute on function private.lock_item_keys() from public, anon, authenticated;
drop trigger if exists shared_items_lock on public.shared_items;
create trigger shared_items_lock before update on public.shared_items
  for each row execute function private.lock_item_keys();

-- Gäste bekommen nur skalare Werte aus einer festen Liste von Feldern
create or replace function private.guest_data(d jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb)
  from jsonb_each(d) e
  where e.key in ('species','sex','age','count','cm','cf','cu','ts','weight','cls')
    and jsonb_typeof(e.value) in ('string','number','boolean')
    and (jsonb_typeof(e.value) <> 'string' or (e.value #>> '{}') !~ '[0-9]+[.,][0-9]{3,}');
$$;

drop function if exists public.list_items(text, timestamptz);
create or replace function public.list_items(p_lot text default null, p_since timestamptz default null, p_limit int default 2000)
returns table (id uuid, lot_id text, category text, owner_id uuid, lat double precision,
               lon double precision, approx boolean, data jsonb, deleted boolean, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select i.id, i.lot_id, i.category,
         case when lv.l >= 2 then i.owner_id end,
         case when i.deleted then null when lv.l >= 2 then i.lat
              when abs(i.lat) < 80 then round(i.lat / 0.001) * 0.001 end,
         case when i.deleted then null when lv.l >= 2 then i.lon
              when abs(i.lat) < 80 then round(i.lon / 0.0015) * 0.0015 end,
         lv.l < 2,
         case when i.deleted then '{}'::jsonb when lv.l >= 2 then i.data else private.guest_data(i.data) end,
         i.deleted, i.updated_at
  from public.shared_items i
  cross join lateral (select private.lot_level(i.lot_id, i.category) as l) lv
  where lv.l >= 1
    and (p_lot is null or i.lot_id = p_lot)
    and (p_since is null or i.updated_at > p_since)
  order by i.updated_at
  limit least(coalesce(p_limit, 2000), 5000);
$$;
revoke execute on function public.list_items(text, timestamptz, int) from public, anon;
grant execute on function public.list_items(text, timestamptz, int) to authenticated;

-- ============ Konto löschen, Einwilligung widerrufen ============
-- Fremdschlüssel so, dass das Löschen eines Nutzers nicht blockiert; geteilte Einträge gehören dem Los
-- und bleiben (nur der Besitzer wird geleert).
do $$ begin
  alter table public.groups alter column created_by drop not null;
  alter table public.groups drop constraint if exists groups_created_by_fkey;
  alter table public.groups add constraint groups_created_by_fkey
    foreign key (created_by) references auth.users(id) on delete set null;
  alter table public.group_invites drop constraint if exists group_invites_created_by_fkey;
  alter table public.group_invites add constraint group_invites_created_by_fkey
    foreign key (created_by) references auth.users(id) on delete cascade;
  alter table public.shared_items alter column owner_id drop not null;
  alter table public.shared_items drop constraint if exists shared_items_owner_id_fkey;
  alter table public.shared_items add constraint shared_items_owner_id_fkey
    foreign key (owner_id) references auth.users(id) on delete set null;
end $$;

create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  g uuid;
begin
  if uid is null then raise exception 'Nicht angemeldet'; end if;
  -- alle Gruppen des Nutzers in fester Reihenfolge sperren (verhindert Wettlauf zweier Administratoren)
  perform 1 from public.groups gg
    where gg.id in (select m.group_id from public.group_members m where m.user_id = uid)
    order by gg.id for update;
  if exists (select 1 from public.group_members m
             where m.user_id = uid and m.is_admin
               and not exists (select 1 from public.group_members a
                               where a.group_id = m.group_id and a.user_id <> uid and a.is_admin)
               and exists (select 1 from public.group_members o
                           where o.group_id = m.group_id and o.user_id <> uid)) then
    raise exception 'Du bist der einzige Administrator einer Gruppe mit weiteren Mitgliedern. Bestimme zuerst einen weiteren Administrator.';
  end if;
  for g in select m.group_id from public.group_members m
           where m.user_id = uid
             and not exists (select 1 from public.group_members o where o.group_id = m.group_id and o.user_id <> uid) loop
    delete from public.groups where id = g;
  end loop;
  delete from auth.users where id = uid;  -- Profil, Zustimmung, Mitgliedschaften, Einladungen: Kaskade; Einträge bleiben am Los
end $$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

create or replace function public.revoke_consent()
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.consents where user_id = (select auth.uid());
end $$;
revoke execute on function public.revoke_consent() from public, anon;
grant execute on function public.revoke_consent() to authenticated;
