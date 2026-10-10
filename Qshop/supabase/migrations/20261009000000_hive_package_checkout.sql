-- THE HIVE: package checkout engine
--
-- Turns a purchased event_package into the real rows that make it usable:
-- event_tickets for ticket_tier items, event_entitlements for product
-- items, and a confirmed wallet_transactions topup for wallet_credit
-- items. Depends on both prior HIVE migrations (event shell/wallet, and
-- packages/catalogue) already being applied.
--
-- Pattern mirrors wallet_topup_confirm exactly: a single SECURITY DEFINER
-- RPC, FOR UPDATE row lock on the purchase, idempotent on 'confirmed'
-- status so a duplicate M-Pesa callback is a safe no-op, never a raw
-- UPDATE on the money-bearing tables.

create table if not exists public.event_package_purchases (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id),
  package_id uuid not null references public.event_packages(id),
  user_id uuid not null references auth.users(id),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'failed')),
  amount numeric not null check (amount >= 0),
  phone_number text,
  mpesa_checkout_request_id text,
  mpesa_receipt text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create index if not exists event_package_purchases_user_id_idx
  on public.event_package_purchases (user_id);

create unique index if not exists event_package_purchases_checkout_id_idx
  on public.event_package_purchases (mpesa_checkout_request_id)
  where mpesa_checkout_request_id is not null;

alter table public.event_package_purchases enable row level security;

create policy "Users can view their own package purchases"
  on public.event_package_purchases
  for select
  using (auth.uid() = user_id);

-- No client insert/update/delete policies — writes only happen via the
-- backend (service role, for initiate + STK linking) and the RPC below.

create or replace function public.fulfil_package_purchase(p_purchase_id uuid)
returns event_package_purchases
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_purchase event_package_purchases%rowtype;
  v_item event_package_items%rowtype;
  v_product event_products%rowtype;
  v_wallet_id uuid;
begin
  select * into v_purchase
  from event_package_purchases
  where id = p_purchase_id
  for update;

  if not found then
    raise exception 'Purchase not found' using errcode = 'P0002';
  end if;

  -- Idempotency guard: a duplicate M-Pesa callback for the same purchase
  -- lands here and is a safe no-op, never a double-fulfilment.
  if v_purchase.status = 'confirmed' then
    return v_purchase;
  end if;

  if v_purchase.status <> 'pending' then
    raise exception 'Purchase is not pending (status=%)', v_purchase.status using errcode = '22023';
  end if;

  for v_item in
    select * from event_package_items where package_id = v_purchase.package_id
  loop
    if v_item.item_type = 'ticket_tier' then
      insert into event_tickets (
        event_id, user_id, tier, quantity, admits_count, admits_used,
        payment_status, amount_paid, source_platform, guest_purchase
      ) values (
        v_purchase.event_id, v_purchase.user_id, v_item.tier,
        v_item.quantity, v_item.quantity, 0,
        'completed', 0, 'unihive', false
      );

    elsif v_item.item_type = 'product' then
      select * into v_product from event_products where id = v_item.product_id;

      insert into event_entitlements (
        event_id, user_id, vendor_id, product_name, quantity, wallet_transaction_id
      ) values (
        v_purchase.event_id, v_purchase.user_id,
        coalesce(v_item.seller_id, v_product.seller_id),
        v_product.name, v_item.quantity, null
      );

    elsif v_item.item_type = 'wallet_credit' then
      insert into event_wallets (event_id, user_id)
      values (v_purchase.event_id, v_purchase.user_id)
      on conflict (event_id, user_id) do update set event_id = excluded.event_id
      returning id into v_wallet_id;

      insert into wallet_transactions (wallet_id, type, amount, status, order_reference, confirmed_at)
      values (
        v_wallet_id, 'topup', v_item.wallet_credit_amount * v_item.quantity,
        'confirmed', p_purchase_id::text, now()
      );
    end if;
  end loop;

  update event_package_purchases
  set status = 'confirmed', confirmed_at = now()
  where id = p_purchase_id
  returning * into v_purchase;

  return v_purchase;
end;
$function$;
