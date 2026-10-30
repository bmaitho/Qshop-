-- Booking prices were calculated in the browser and saved as sent, and the
-- backend charged whatever amount the browser asked for. Prices are now
-- recalculated here from the catalogue on every new booking (same rules as
-- ServicePage / UserServiceBookingModal), and the backend charges the stored
-- amount.

begin;

-- Trip packages: total = sum of the chosen active components of this service;
-- 5% commission; a deposit only where the service allows it and no
-- "SGR Transport" component is chosen.
create or replace function public.price_service_booking()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_service public.services%rowtype;
  v_ids uuid[];
  v_comps jsonb;
  v_total numeric;
  v_has_sgr boolean;
  v_deposit numeric;
begin
  select * into v_service from public.services where id = new.service_id and status = 'active';
  if not found then raise exception 'This service is not available' using errcode = '22023'; end if;

  select coalesce(array_agg(distinct (c ->> 'component_id')::uuid), '{}')
    into v_ids
    from jsonb_array_elements(coalesce(new.selected_components, '[]')) c
   where c ->> 'component_id' ~* '^[0-9a-f-]{36}$';
  if cardinality(v_ids) = 0 then raise exception 'Choose at least one option' using errcode = '22023'; end if;

  select jsonb_agg(jsonb_build_object('component_id', sc.id, 'name', sc.name, 'price', sc.price,
                                      'category_id', sc.category_id) order by sc.display_order),
         sum(sc.price),
         bool_or(cat.name = 'SGR Transport')
    into v_comps, v_total, v_has_sgr
    from public.service_components sc
    left join public.service_component_categories cat on cat.id = sc.category_id
   where sc.id = any (v_ids) and sc.service_id = new.service_id and sc.is_active;
  if v_comps is null or jsonb_array_length(v_comps) <> cardinality(v_ids) then
    raise exception 'One of the chosen options is no longer available' using errcode = '22023';
  end if;

  new.selected_components := v_comps;
  new.subtotal := v_total;
  new.commission_rate := 5.00;
  new.commission_amount := ceil(v_total * 5.00 / 100);
  new.platform_profit := new.commission_amount;
  new.payout_amount := v_total - new.commission_amount;

  if new.payment_type = 'deposit' and v_service.allows_deposit and not coalesce(v_has_sgr, false) then
    v_deposit := ceil(v_total * coalesce(v_service.deposit_percentage, 53.3) / 100);
    new.deposit_percentage := coalesce(v_service.deposit_percentage, 53.3);
    new.amount_due := v_deposit;
    new.amount_remaining := v_total - v_deposit;
  else
    new.payment_type := 'full';
    new.deposit_percentage := null;
    new.amount_due := v_total;
    new.amount_remaining := 0;
  end if;
  return new;
end;
$$;

drop trigger if exists price_service_booking on public.service_bookings;
create trigger price_service_booking
  before insert on public.service_bookings
  for each row execute function public.price_service_booking();

-- Student services: the listed price of an approved, active service.
create or replace function public.price_user_service_booking()
returns trigger language plpgsql set search_path = '' as $$
declare v public.user_services%rowtype;
begin
  select * into v from public.user_services
   where id = new.service_id and is_active and approval_status = 'approved';
  if not found then raise exception 'This service is not available' using errcode = '22023'; end if;
  if v.price is null or v.price <= 0 then raise exception 'This service has no price set' using errcode = '22023'; end if;
  if v.user_id = new.buyer_id then raise exception 'You cannot book your own service' using errcode = '22023'; end if;

  new.seller_id := v.user_id;
  new.amount := v.price;
  new.commission_rate := coalesce(v.commission_rate, 5.00);
  new.commission_amount := ceil(v.price * new.commission_rate / 100);
  new.payout_amount := v.price - new.commission_amount;
  return new;
end;
$$;

drop trigger if exists price_user_service_booking on public.user_service_bookings;
create trigger price_user_service_booking
  before insert on public.user_service_bookings
  for each row execute function public.price_user_service_booking();

commit;
