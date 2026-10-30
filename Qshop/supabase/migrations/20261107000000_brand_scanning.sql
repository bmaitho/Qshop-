-- Brand dashboards (Smirnoff, Red Bull, Charge24, ...):
--   * Charge24 is added as a THE HIVE partner.
--   * Brand staff can scan door passes for their own event (UniHive passes
--     and imported Little tickets), alongside UniHive staff.
--   * The door scanner also accepts a Little ticket's reference (Payment Key):
--     anything that is not an imported, paid ticket is rejected.
--   * Brand owners can void/restore and undo redemptions of their own
--     brand's coupons; voiding door passes stays admin-only.
-- Safe to run before the website deploy: existing pages keep working.

begin;

insert into public.event_partners (event_id, slug, name)
select e.id, 'charge24', 'Charge24' from public.events e where e.slug = 'the-hive-no-going-home'
on conflict (event_id, slug) do nothing;

-- Staff/admins, or a member of any brand at this event.
create or replace function public.can_scan_event(p_event_id uuid)
returns boolean language sql stable security definer set search_path = 'public' as $$
  select public.is_unihive_staff()
      or exists (select 1 from event_partner_members m join event_partners p on p.id = m.partner_id
                  where m.user_id = auth.uid() and p.event_id = p_event_id);
$$;

create or replace function public.is_partner_owner(p_partner_id uuid)
returns boolean language sql stable security definer set search_path = 'public' as $$
  select public.is_unihive_admin()
      or exists (select 1 from event_partner_members
                  where partner_id = p_partner_id and user_id = auth.uid() and role = 'owner');
$$;

-- Door lookup by scanned code: a UniHive pass token (uuid) or a Little
-- ticket reference. Returns nothing for unknown, unpaid or other-event codes.
create or replace function public.lookup_event_pass(p_code text)
returns table(id uuid, event_title text, event_image text, event_date date, tier text,
              admits_count integer, admits_used integer, scanned_at timestamptz, holder text,
              voided_at timestamptz, void_reason text, source text)
language plpgsql stable security definer set search_path = 'public' as $$
declare
  v_code text := nullif(trim(p_code), '');
  v_ticket event_tickets%rowtype;
begin
  if auth.uid() is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  if v_code is null then return; end if;

  if v_code ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    select * into v_ticket from event_tickets t
     where t.ticket_token = v_code::uuid and t.payment_status = 'completed';
  end if;
  if v_ticket.id is null then
    -- Little: exact reference, or a scanned text that contains it. Prefer a
    -- ticket that still has entries left.
    select * into v_ticket from event_tickets t
     where t.source_platform = 'little' and t.payment_status = 'completed'
       and t.external_reference is not null
       and (t.external_reference = v_code
            or (length(t.external_reference) >= 6 and position(t.external_reference in v_code) > 0))
     order by (coalesce(t.admits_used, 0) >= coalesce(t.admits_count, 1)), t.created_at
     limit 1;
  end if;
  if v_ticket.id is null then return; end if;

  if not public.can_scan_event(v_ticket.event_id) then
    raise exception 'This pass is for an event you are not scanning' using errcode = '42501';
  end if;

  return query
    select v_ticket.id, e.title, e.image_url, e.event_date, v_ticket.tier,
           coalesce(v_ticket.admits_count, 1), coalesce(v_ticket.admits_used, 0), v_ticket.scanned_at,
           nullif(trim(split_part(trim(coalesce(p.full_name, v_ticket.guest_name, '')), ' ', 1)
             || coalesce(' ' || nullif(left(split_part(trim(coalesce(p.full_name, v_ticket.guest_name, '')), ' ', 2), 1), '') || '.', '')), ''),
           v_ticket.voided_at, v_ticket.void_reason,
           coalesce(v_ticket.source_platform, 'unihive')
      from events e
      left join profiles p on p.id = v_ticket.user_id
     where e.id = v_ticket.event_id;
end;
$$;
revoke execute on function public.lookup_event_pass(text) from public, anon;
grant execute on function public.lookup_event_pass(text) to authenticated;

-- Admit / undo: brand staff of the ticket's event may now admit as well.
create or replace function public.admit_ticket(p_ticket_id uuid, p_admits_to_use integer default 1)
returns event_tickets language plpgsql security definer set search_path = 'public' as $$
declare
  v_ticket event_tickets%rowtype;
  v_admits_count integer;
  v_admits_used integer;
  v_new integer;
begin
  if auth.uid() is null then raise exception 'Not authenticated' using errcode = '42501'; end if;

  select * into v_ticket from event_tickets
   where id = p_ticket_id and payment_status = 'completed' for update;
  if not found then raise exception 'Ticket not found' using errcode = 'P0002'; end if;
  if not public.can_scan_event(v_ticket.event_id) then
    raise exception 'Not authorised to scan this event' using errcode = '42501';
  end if;
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

create or replace function public.undo_admit(p_ticket_id uuid)
returns event_tickets language plpgsql security definer set search_path = 'public' as $$
declare v event_tickets%rowtype;
begin
  select * into v from event_tickets where id = p_ticket_id and payment_status = 'completed' for update;
  if not found then raise exception 'Ticket not found' using errcode = 'P0002'; end if;
  if not public.can_scan_event(v.event_id) then raise exception 'Not authorised to scan this event' using errcode = '42501'; end if;
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

-- Coupons: brand owners manage their own brand's items.
create or replace function public.undo_redeem(p_qr_token uuid)
returns event_entitlements language plpgsql security definer set search_path = 'public' as $$
declare v event_entitlements%rowtype;
begin
  if auth.uid() is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  select * into v from event_entitlements where qr_token = p_qr_token for update;
  if not found then raise exception 'Entitlement not found' using errcode = 'P0002'; end if;
  if v.status <> 'redeemed' then raise exception 'This item has not been redeemed'; end if;
  if not public.is_partner_owner(v.partner_id)
     and not (v.redeemed_by = auth.uid() and v.redeemed_at > now() - interval '15 minutes') then
    raise exception 'Only the person who redeemed it can undo, within 15 minutes - ask the brand owner';
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
  select * into v from event_entitlements where qr_token = p_qr_token for update;
  if not found then raise exception 'Entitlement not found' using errcode = 'P0002'; end if;
  if not public.is_partner_owner(v.partner_id) then
    raise exception 'Only admins and the brand owner can void or restore items' using errcode = '42501';
  end if;
  update event_entitlements set
    voided_at = case when p_void then now() end,
    voided_by = case when p_void then auth.uid() end,
    void_reason = case when p_void then nullif(trim(p_reason), '') end
  where id = v.id returning * into v;
  return v;
end;
$$;

revoke execute on function public.can_scan_event(uuid), public.is_partner_owner(uuid) from public, anon;
grant execute on function public.can_scan_event(uuid), public.is_partner_owner(uuid) to authenticated;

commit;
