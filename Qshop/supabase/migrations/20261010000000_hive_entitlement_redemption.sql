-- THE HIVE: entitlement redemption at the event
--
-- Mirrors admit_ticket exactly (same staff/admin gate, same FOR UPDATE
-- row lock, same idempotent "already redeemed" short-circuit), but
-- operates on event_entitlements (products/wallet-credit items bought as
-- part of a package) instead of event_tickets (admission). This is
-- deliberately a separate RPC/table from ticket admission — entitlement
-- redemption is a vendor fulfilling a purchased item, not entry control.

create or replace function public.redeem_entitlement(p_qr_token uuid)
returns event_entitlements
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_caller_id uuid;
  v_is_staff boolean;
  v_entitlement event_entitlements%rowtype;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select (is_staff or is_admin) into v_is_staff
  from profiles where id = v_caller_id;

  if not coalesce(v_is_staff, false) then
    raise exception 'Not authorised — staff only' using errcode = '42501';
  end if;

  select * into v_entitlement
  from event_entitlements
  where qr_token = p_qr_token
  for update;

  if not found then
    raise exception 'Entitlement not found' using errcode = 'P0002';
  end if;

  if v_entitlement.status = 'redeemed' then
    -- Idempotent: scanning an already-redeemed item twice is a no-op,
    -- not an error — the UI can show "already redeemed at <time>".
    return v_entitlement;
  end if;

  update event_entitlements
  set status = 'redeemed', redeemed_at = now(), redeemed_by = v_caller_id
  where id = v_entitlement.id
  returning * into v_entitlement;

  return v_entitlement;
end;
$function$;
