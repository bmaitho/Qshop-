-- Record which version of the Terms & Privacy Policy each user accepted.
alter table public.profiles add column if not exists terms_version text;
alter table public.profiles add column if not exists terms_accepted_at timestamptz;

-- Data minimisation: stand and door staff see only first name + initial.
create or replace function public.lookup_entitlement(p_qr_token uuid)
returns table(id uuid, product_name text, quantity integer, status text, redeemed_at timestamptz, partner_name text, buyer_name text, image_url text)
language plpgsql stable security definer set search_path to 'public' as $$
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
           (select ep.image_url from event_products ep where ep.event_id = v.event_id and ep.name = v.product_name limit 1);
end;
$$;
