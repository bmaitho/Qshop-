-- Buyers (and, for user_service_bookings, sellers) could update any column
-- of their bookings from the browser, e.g. set payment_status = 'completed'
-- or change payout amounts without paying. Only the backend (service role)
-- may now change money and status fields; browsers can only set the
-- M-Pesa checkout id and scheduling details. New bookings always start
-- unpaid.

begin;

create or replace function public.protect_booking_payments()
returns trigger language plpgsql set search_path = '' as $$
declare
  editable constant text[] := array['checkout_request_id', 'notes', 'scheduled_date',
                                    'scheduled_start_time', 'phone_number', 'updated_at'];
  forced jsonb := '{"payment_status": "pending", "payout_status": "pending", "booking_status": "pending",
                    "amount_paid": 0, "mpesa_receipt": null, "payment_date": null,
                    "payout_reference": null, "payout_date": null}';
  k text;
begin
  if current_user not in ('anon', 'authenticated')
     or coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false) then
    return new;
  end if;
  if tg_op = 'INSERT' then
    -- Only reset columns this table actually has.
    select coalesce(jsonb_object_agg(key, value), '{}') into forced
      from jsonb_each(forced) where to_jsonb(new) ? key;
    return jsonb_populate_record(new, forced);
  end if;
  for k in select jsonb_object_keys(to_jsonb(new)) loop
    if not (k = any (editable)) and (to_jsonb(new) -> k) is distinct from (to_jsonb(old) -> k) then
      raise exception 'Bookings can only be changed by UniHive (%).', k using errcode = '42501';
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists protect_booking_payments on public.service_bookings;
create trigger protect_booking_payments
  before insert or update on public.service_bookings
  for each row execute function public.protect_booking_payments();

drop trigger if exists protect_booking_payments on public.user_service_bookings;
create trigger protect_booking_payments
  before insert or update on public.user_service_bookings
  for each row execute function public.protect_booking_payments();

-- Payment rows are written only by the M-Pesa callback (service role).
drop policy if exists "Users can insert own booking payments" on public.service_booking_payments;

commit;
