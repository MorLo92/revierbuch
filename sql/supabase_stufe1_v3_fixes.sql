-- Revierbuch: Korrekturen an den Zugriffsregeln (nach supabase_stufe1_v2.sql ausführen)
-- Mehrfach ausführbar. Behebt die Befunde aus dem Test der Gruppenfunktion:
--  1. Admin konnte per user_id-Update fremde Nutzer ohne Einladung zu Mitgliedern machen
--  2. Rollen fremder Gruppen konnten Mitgliedern/Einladungen zugewiesen werden
--  3. Einladungen mit eigenem Code, Ablauf oder Zähler (uses = -1000000)
--  4. letzter Administrator konnte gehen oder sich herabstufen -> verwaiste Gruppe
--  5. Bestehendes Mitglied verbrauchte beim Einlösen einer Einladung einen Platz
--  6. Los-Squatting (1000 Lose in einem Aufruf), Lose mit beliebigem Text
--  7. Administratoren konnten freigegebene Lose anderer Gruppen löschen;
--     wird ein freigegebenes Los entfernt, rückt die älteste Anfrage nach
--  8. groups.created_by und profiles.id konnten verändert werden
--  9. Gäste ("ungefähr") bekamen in data die Rohposition (pos, kanzelId ...)
-- 10. geteilte Einträge: lot_id, category, owner_id waren nachträglich änderbar
-- 11. Konto löschen und Einwilligung widerrufen (delete_my_account, revoke_consent)

-- ============ 1 + 8: Spaltenrechte ============
revoke update on public.group_members from authenticated;
grant update (role_id, is_admin) on public.group_members to authenticated;
revoke update on public.groups from authenticated;
grant update (name) on public.groups to authenticated;
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

-- ============ 3: Einladungen nur mit Gruppe, Rolle, Personenzahl ============
revoke insert on public.group_invites from authenticated;
grant insert (group_id, role_id, max_uses) on public.group_invites to authenticated;

-- ============ 2: Rolle muss zur selben Gruppe gehören ============
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

-- ============ 4: Mindestens ein Administrator, solange es weitere Mitglieder gibt ============
-- (beim Löschen der ganzen Gruppe läuft die Kaskade tiefer als eine Ebene und wird nicht geprüft)
create or replace function private.keep_admin()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if pg_trigger_depth() > 1 then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
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

-- ============ 5: Einladung einlösen ============
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

-- ============ 6: Lose prüfen und begrenzen ============
create or replace function private.claim_lot(gid uuid, lot text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if lot !~ '^[0-9]{1,6}$' then raise exception 'Ungültige Losnummer'; end if;
  if (select count(*) from public.group_lots x where x.group_id = gid) >= 50 then
    raise exception 'Höchstens 50 Lose pro Gruppe';
  end if;
  perform pg_advisory_xact_lock(hashtext(lot));
  insert into public.group_lots (group_id, lot_id, approved)
  values (gid, lot, not exists (select 1 from public.group_lots x where x.lot_id = lot and x.approved))
  on conflict (group_id, lot_id) do nothing;
end $$;
revoke execute on function private.claim_lot(uuid, text) from public, anon, authenticated;

-- ============ 7: Lose löschen und nachrücken ============
drop policy if exists group_lots_delete on public.group_lots;
create policy group_lots_delete on public.group_lots for delete to authenticated
  using (private.is_admin(group_id) or (not approved and private.is_lot_admin(lot_id)));

create or replace function private.promote_lot()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.approved and not exists (select 1 from public.group_lots x where x.lot_id = old.lot_id and x.approved) then
    update public.group_lots set approved = true
    where (group_id, lot_id) = (select x.group_id, x.lot_id from public.group_lots x
                                where x.lot_id = old.lot_id order by x.requested_at limit 1);
  end if;
  return old;
end $$;
revoke execute on function private.promote_lot() from public, anon, authenticated;
drop trigger if exists group_lots_promote on public.group_lots;
create trigger group_lots_promote after delete on public.group_lots
  for each row execute function private.promote_lot();

-- ============ 9: Gäste sehen keine Positionshinweise in den Zusatzdaten ============
create or replace function public.list_items(p_lot text default null, p_since timestamptz default null)
returns table (id uuid, lot_id text, category text, owner_id uuid, lat double precision,
               lon double precision, approx boolean, data jsonb, deleted boolean, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select i.id, i.lot_id, i.category, i.owner_id,
         case when lv.l >= 2 then i.lat else round(i.lat / 0.001) * 0.001 end,
         case when lv.l >= 2 then i.lon else round(i.lon / 0.0015) * 0.0015 end,
         lv.l < 2,
         case when lv.l >= 2 then i.data
              else i.data - 'lat' - 'lon' - 'pos' - 'kanzelId' - 'kanzel' - 'place' - 'ort' - 'note' - 'photo' end,
         i.deleted, i.updated_at
  from public.shared_items i
  cross join lateral (select private.lot_level(i.lot_id, i.category) as l) lv
  where lv.l >= 1
    and (p_lot is null or i.lot_id = p_lot)
    and (p_since is null or i.updated_at > p_since)
  order by i.updated_at;
$$;

-- ============ 10: Zuordnung geteilter Einträge nicht nachträglich ändern ============
create or replace function private.lock_item_keys()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.id <> old.id or new.lot_id <> old.lot_id or new.category <> old.category or new.owner_id <> old.owner_id then
    raise exception 'Los, Kategorie und Besitzer eines Eintrags lassen sich nicht ändern';
  end if;
  return new;
end $$;
revoke execute on function private.lock_item_keys() from public, anon, authenticated;
drop trigger if exists shared_items_lock on public.shared_items;
create trigger shared_items_lock before update on public.shared_items
  for each row execute function private.lock_item_keys();

-- ============ 11: Konto löschen, Einwilligung widerrufen ============
-- Fremdschlüssel so ändern, dass das Löschen eines Nutzers nicht blockiert
do $$ begin
  alter table public.groups alter column created_by drop not null;
  alter table public.groups drop constraint if exists groups_created_by_fkey;
  alter table public.groups add constraint groups_created_by_fkey
    foreign key (created_by) references auth.users(id) on delete set null;
  alter table public.group_invites drop constraint if exists group_invites_created_by_fkey;
  alter table public.group_invites add constraint group_invites_created_by_fkey
    foreign key (created_by) references auth.users(id) on delete cascade;
  alter table public.shared_items drop constraint if exists shared_items_owner_id_fkey;
  alter table public.shared_items add constraint shared_items_owner_id_fkey
    foreign key (owner_id) references auth.users(id) on delete cascade;
end $$;

create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  g uuid;
begin
  if uid is null then raise exception 'Nicht angemeldet'; end if;
  -- einziger Administrator einer Gruppe mit weiteren Mitgliedern: erst Nachfolger bestimmen
  if exists (select 1 from public.group_members m
             where m.user_id = uid and m.is_admin
               and not exists (select 1 from public.group_members a
                               where a.group_id = m.group_id and a.user_id <> uid and a.is_admin)
               and exists (select 1 from public.group_members o
                           where o.group_id = m.group_id and o.user_id <> uid)) then
    raise exception 'Du bist der einzige Administrator einer Gruppe mit weiteren Mitgliedern. Bestimme zuerst einen weiteren Administrator.';
  end if;
  -- Gruppen, in denen nur ich Mitglied bin, werden mit gelöscht
  for g in select m.group_id from public.group_members m
           where m.user_id = uid
             and not exists (select 1 from public.group_members o where o.group_id = m.group_id and o.user_id <> uid) loop
    delete from public.groups where id = g;
  end loop;
  delete from auth.users where id = uid;  -- Profil, Zustimmung, Mitgliedschaften, Einladungen, Einträge: Kaskade
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
