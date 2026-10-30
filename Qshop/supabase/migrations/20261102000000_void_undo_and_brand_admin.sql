-- 1. Void / restore (admins) and undo a mistaken scan (staff) for door
--    tickets and Bar & Bites coupons (event_entitlements).
-- 2. Brand admin: private brand contact details, and admins can create
--    brands and add/remove brand staff by email.
-- Safe to run before the website deploy: existing pages ignore the new
-- columns, and voided passes are refused everywhere.

begin;

-- ── 1. Void / undo ──────────────────────────────────────────────────────

alter table public.event_tickets
  add column if not exists voided_at timestamptz,
  add column if not exists voided_by uuid,
  add column if not exists void_reason text;

alter table public.event_entitlements
  add column if not exists voided_at timestamptz,
  add column if not exists voided_by uuid,
  add column if not exists void_reason text;

create or replace function public.is_unihive_admin()
returns boolean language sql stable security definer set search_path = 'public' as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

create or replace function public.is_unihive_staff()
returns boolean language sql stable security definer set search_path = 'public' as $$
  select coalesce((select is_staff or is_admin from profiles where id = auth.uid()), false);
$$;

-- Door lookup (staff): now also reports voids.
drop function if exists public.lookup_event_ticket(uuid);
create function public.lookup_event_ticket(p_token uuid)
returns table(id uuid, event_title text, event_image text, event_date date, tier text,
              admits_count integer, admits_used integer, scanned_at timestamptz, holder text,
              voided_at timestamptz, void_reason text)
language plpgsql stable security definer set search_path = 'public' as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  if not public.is_unihive_staff() then raise exception 'Not authorised - staff only' using errcode = '42501'; end if;
  return query
    select t.id, e.title, e.image_url, e.event_date, t.tier,
           coalesce(t.admits_count, 1), coalesce(t.admits_used, 0), t.scanned_at,
           nullif(trim(split_part(trim(coalesce(p.full_name, t.guest_name, '')), ' ', 1)
             || coalesce(' ' || nullif(left(split_part(trim(coalesce(p.full_name, t.guest_name, '')), ' ', 2), 1), '') || '.', '')), ''),
           t.voided_at, t.void_reason
      from event_tickets t
      join events e on e.id = t.event_id
      left join profiles p on p.id = t.user_id
     where t.ticket_token = p_token and t.payment_status = 'completed';
end;
$$;
revoke execute on function public.lookup_event_ticket(uuid) from public, anon;
grant execute on function public.lookup_event_ticket(uuid) to authenticated;

-- Holder's ticket page: now also reports voids.
drop function if exists public.get_ticket_by_token(uuid);
create function public.get_ticket_by_token(p_token uuid)
returns table (id uuid, event_id uuid, ticket_token uuid, tier text,
               admits_count integer, admits_used integer, scanned boolean,
               scanned_at timestamptz, holder_name text, voided boolean)
language sql stable security definer set search_path = '' as $$
  select t.id, t.event_id, t.ticket_token, t.tier,
         coalesce(t.admits_count, 1), coalesce(t.admits_used, 0),
         coalesce(t.scanned, false), t.scanned_at,
         coalesce(nullif(trim(p.full_name), ''), t.guest_name),
         t.voided_at is not null
    from public.event_tickets t
    left join public.profiles p on p.id = t.user_id
   where t.ticket_token = p_token and t.payment_status = 'completed';
$$;
revoke execute on function public.get_ticket_by_token(uuid) from public;
grant execute on function public.get_ticket_by_token(uuid) to anon, authenticated;

-- Admit: refuse voided passes (otherwise unchanged).
create or replace function public.admit_ticket(p_ticket_id uuid, p_admits_to_use integer default 1)
returns event_tickets language plpgsql security definer set search_path = 'public' as $$
declare
  v_ticket event_tickets%rowtype;
  v_admits_count integer;
  v_admits_used integer;
  v_new integer;
begin
  if auth.uid() is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  if not public.is_unihive_staff() then raise exception 'Not authorised - staff only' using errcode = '42501'; end if;

  select * into v_ticket from event_tickets
   where id = p_ticket_id and payment_status = 'completed' for update;
  if not found then raise exception 'Ticket not found' using errcode = 'P0002'; end if;
  if v_ticket.voided_at is not null then raise exception 'This pass has been voided' using errcode = '42501'; end if;

  v_admits_count := coalesce(v_ticket.admits_count, 1);
  v_admits_used := coalesce(v_ticket.admits_used, 0);
  if v_admits_used >= v_admits_count then return v_ticket; end if;

  if p_admits_to_use < 1 then p_admits_to_use := 1; end if;
  v_new := least(v_admits_used + p_admits_to_use, v_admits_count);

  update event_tickets set
    admits_used = v_new,
    scanned = (v_new >= v_admits_count),
    scanned_at = case when v_new >= v_admits_count and scanned_at is null then now() else scanned_at end,
    scanned_by = case when v_new >= v_admits_count and scanned_by is null then auth.uid() else scanned_by end
  where id = p_ticket_id
  returning * into v_ticket;
  return v_ticket;
end;
$$;

-- Undo one admit. Staff within 15 minutes of the pass being completed;
-- admins any time.
create or replace function public.undo_admit(p_ticket_id uuid)
returns event_tickets language plpgsql security definer set search_path = 'public' as $$
declare v event_tickets%rowtype;
begin
  if not public.is_unihive_staff() then raise exception 'Not authorised - staff only' using errcode = '42501'; end if;
  select * into v from event_tickets where id = p_ticket_id and payment_status = 'completed' for update;
  if not found then raise exception 'Ticket not found' using errcode = 'P0002'; end if;
  if coalesce(v.admits_used, 0) = 0 then raise exception 'Nothing to undo on this pass'; end if;
  if not public.is_unihive_admin() and v.scanned_at is not null and v.scanned_at < now() - interval '15 minutes' then
    raise exception 'Too late to undo - ask an admin';
  end if;
  update event_tickets set
    admits_used = v.admits_used - 1, scanned = false, scanned_at = null, scanned_by = null
  where id = v.id returning * into v;
  return v;
end;
$$;

create or replace function public.set_ticket_void(p_ticket_id uuid, p_void boolean, p_reason text default null)
returns event_tickets language plpgsql security definer set search_path = 'public' as $$
declare v event_tickets%rowtype;
begin
  if not public.is_unihive_admin() then raise exception 'Only admins can void or restore passes' using errcode = '42501'; end if;
  update event_tickets set
    voided_at = case when p_void then now() end,
    voided_by = case when p_void then auth.uid() end,
    void_reason = case when p_void then nullif(trim(p_reason), '') end
  where id = p_ticket_id returning * into v;
  if not found then raise exception 'Ticket not found' using errcode = 'P0002'; end if;
  return v;
end;
$$;

-- Coupon lookup: now also reports voids.
drop function if exists public.lookup_entitlement(uuid);
create function public.lookup_entitlement(p_qr_token uuid)
returns table(id uuid, product_name text, quantity integer, status text, redeemed_at timestamptz,
              partner_name text, buyer_name text, image_url text, voided_at timestamptz, void_reason text)
language plpgsql stable security definer set search_path = 'public' as $$
declare v event_entitlements%rowtype;
begin
  if auth.uid() is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  select * into v from event_entitlements e where e.qr_token = p_qr_token;
  if not found then return; end if;
  if not public.can_scan_entitlement(v.partner_id) then
    raise exception 'This item belongs to another partner' using errcode = '42501';
  end if;
  return query
    select v.id, v.product_name, v.quantity, v.status, v.redeemed_at,
           (select name from event_partners where event_partners.id = v.partner_id),
           (select nullif(trim(split_part(trim(p.full_name), ' ', 1)
                    || coalesce(' ' || nullif(left(split_part(trim(p.full_name), ' ', 2), 1), '') || '.', '')), '')
              from profiles p where p.id = v.user_id),
           (select ep.image_url from event_products ep where ep.event_id = v.event_id and ep.name = v.product_name limit 1),
           v.voided_at, v.void_reason;
end;
$$;
revoke execute on function public.lookup_entitlement(uuid) from public, anon;
grant execute on function public.lookup_entitlement(uuid) to authenticated;

-- Redeem: refuse voided coupons (otherwise unchanged).
create or replace function public.redeem_entitlement(p_qr_token uuid)
returns event_entitlements language plpgsql security definer set search_path = 'public' as $$
declare v event_entitlements%rowtype;
begin
  if auth.uid() is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  select * into v from event_entitlements where qr_token = p_qr_token for update;
  if not found then raise exception 'Entitlement not found' using errcode = 'P0002'; end if;
  if not public.can_scan_entitlement(v.partner_id) then
    raise exception 'This item belongs to another partner' using errcode = '42501';
  end if;
  if v.voided_at is not null then raise exception 'This item has been voided' using errcode = '42501'; end if;
  if v.status = 'redeemed' then return v; end if;
  update event_entitlements set status = 'redeemed', redeemed_at = now(), redeemed_by = auth.uid()
  where id = v.id returning * into v;
  return v;
end;
$$;

-- Undo a redemption: the person who redeemed it within 15 minutes, or an admin.
create or replace function public.undo_redeem(p_qr_token uuid)
returns event_entitlements language plpgsql security definer set search_path = 'public' as $$
declare v event_entitlements%rowtype;
begin
  if auth.uid() is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  select * into v from event_entitlements where qr_token = p_qr_token for update;
  if not found then raise exception 'Entitlement not found' using errcode = 'P0002'; end if;
  if v.status <> 'redeemed' then raise exception 'This item has not been redeemed'; end if;
  if not public.is_unihive_admin()
     and not (v.redeemed_by = auth.uid() and v.redeemed_at > now() - interval '15 minutes') then
    raise exception 'Only the person who redeemed it can undo, within 15 minutes - ask an admin';
  end if;
  update event_entitlements set status = 'unused', redeemed_at = null, redeemed_by = null
  where id = v.id returning * into v;
  return v;
end;
$$;

create or replace function public.set_entitlement_void(p_qr_token uuid, p_void boolean, p_reason text default null)
returns event_entitlements language plpgsql security definer set search_path = 'public' as $$
declare v event_entitlements%rowtype;
begin
  if not public.is_unihive_admin() then raise exception 'Only admins can void or restore items' using errcode = '42501'; end if;
  update event_entitlements set
    voided_at = case when p_void then now() end,
    voided_by = case when p_void then auth.uid() end,
    void_reason = case when p_void then nullif(trim(p_reason), '') end
  where qr_token = p_qr_token returning * into v;
  if not found then raise exception 'Entitlement not found' using errcode = 'P0002'; end if;
  return v;
end;
$$;

revoke execute on function public.undo_admit(uuid), public.set_ticket_void(uuid, boolean, text),
  public.undo_redeem(uuid), public.set_entitlement_void(uuid, boolean, text) from public, anon;
grant execute on function public.undo_admit(uuid), public.set_ticket_void(uuid, boolean, text),
  public.undo_redeem(uuid), public.set_entitlement_void(uuid, boolean, text) to authenticated;

-- ── 2. Brand admin ──────────────────────────────────────────────────────

-- Contacts are private (event_partners itself is public for the logos).
create table if not exists public.event_partner_contacts (
  partner_id uuid primary key references public.event_partners(id) on delete cascade,
  contact_name text,
  contact_email text,
  contact_phone text,
  notes text,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
alter table public.event_partner_contacts enable row level security;
drop policy if exists "admins manage partner contacts" on public.event_partner_contacts;
create policy "admins manage partner contacts" on public.event_partner_contacts
  for all to authenticated using (public.is_unihive_admin()) with check (public.is_unihive_admin());

drop policy if exists "admins manage partners" on public.event_partners;
create policy "admins manage partners" on public.event_partners
  for all to authenticated using (public.is_unihive_admin()) with check (public.is_unihive_admin());

create or replace function public.admin_partner_members(p_partner_id uuid)
returns table(user_id uuid, full_name text, email text, role text, created_at timestamptz)
language plpgsql stable security definer set search_path = 'public' as $$
begin
  if not public.is_unihive_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  return query
    select m.user_id, p.full_name, coalesce(p.email, u.email::text), m.role, m.created_at
      from event_partner_members m
      left join profiles p on p.id = m.user_id
      left join auth.users u on u.id = m.user_id
     where m.partner_id = p_partner_id
     order by m.created_at;
end;
$$;

create or replace function public.admin_add_partner_member(p_partner_id uuid, p_email text, p_role text default 'staff')
returns uuid language plpgsql security definer set search_path = 'public' as $$
declare v_user uuid;
begin
  if not public.is_unihive_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  if p_role not in ('owner', 'staff') then raise exception 'Role must be owner or staff'; end if;
  select id into v_user from auth.users where lower(email) = lower(trim(p_email)) and deleted_at is null limit 1;
  if v_user is null then
    raise exception 'No UniHive account uses %. Ask them to sign up at unihive.shop first.', trim(p_email);
  end if;
  insert into event_partner_members (partner_id, user_id, role) values (p_partner_id, v_user, p_role)
  on conflict (partner_id, user_id) do update set role = excluded.role;
  return v_user;
end;
$$;

create or replace function public.admin_remove_partner_member(p_partner_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = 'public' as $$
begin
  if not public.is_unihive_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  delete from event_partner_members where partner_id = p_partner_id and user_id = p_user_id;
end;
$$;

revoke execute on function public.admin_partner_members(uuid), public.admin_add_partner_member(uuid, text, text),
  public.admin_remove_partner_member(uuid, uuid) from public, anon;
grant execute on function public.admin_partner_members(uuid), public.admin_add_partner_member(uuid, text, text),
  public.admin_remove_partner_member(uuid, uuid) to authenticated;

commit;
