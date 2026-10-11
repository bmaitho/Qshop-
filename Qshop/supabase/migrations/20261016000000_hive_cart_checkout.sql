-- THE HIVE: event cart checkout from the HIVE Wallet.
--
-- Prices come from event_products on the server — the client only sends
-- product ids and quantities. The whole cart is charged in one
-- transaction: either every line is paid and gets its redeemable
-- entitlement, or nothing is charged.
--
-- Also retires client-side access to wallet_debit_for_purchase, which
-- trusted a client-supplied amount (a tampered request could underpay).

create or replace function public.wallet_checkout_cart(p_event_id uuid, p_items jsonb)
returns setof event_entitlements
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_caller_id uuid;
  v_wallet event_wallets%rowtype;
  v_balance numeric;
  v_total numeric := 0;
  v_line record;
  v_txn wallet_transactions;
  v_ent event_entitlements;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'Too many cart lines' using errcode = '22023';
  end if;

  select * into v_wallet from event_wallets
  where event_id = p_event_id and user_id = v_caller_id
  for update;
  if not found then
    raise exception 'No HIVE Wallet for this event yet — top up first' using errcode = 'P0002';
  end if;

  create temporary table _cart on commit drop as
  select p.id as product_id, p.name, p.price, p.seller_id, sum(i.quantity)::int as quantity
  from jsonb_to_recordset(p_items) as i(product_id uuid, quantity int)
  join event_products p on p.id = i.product_id and p.event_id = p_event_id and p.active = true
  where i.quantity between 1 and 20
  group by p.id, p.name, p.price, p.seller_id;

  if (select count(*) from _cart) <> (select count(distinct (e->>'product_id')) from jsonb_array_elements(p_items) e) then
    raise exception 'Some items are unavailable or invalid' using errcode = '22023';
  end if;

  select coalesce(sum(price * quantity), 0) into v_total from _cart;

  select coalesce(sum(case
    when status = 'confirmed' and type in ('topup', 'refund') then amount
    when status = 'confirmed' and type in ('purchase', 'reversal') then -amount
    else 0
  end), 0) into v_balance
  from wallet_transactions
  where wallet_id = v_wallet.id;

  if v_balance < v_total then
    raise exception 'Insufficient wallet balance: have %, need %', v_balance, v_total using errcode = '22023';
  end if;

  for v_line in select * from _cart loop
    insert into wallet_transactions (wallet_id, type, amount, status, order_reference, confirmed_at)
    values (v_wallet.id, 'purchase', v_line.price * v_line.quantity, 'confirmed', 'cart:' || v_line.product_id, now())
    returning * into v_txn;

    insert into event_entitlements (event_id, user_id, vendor_id, product_name, quantity, wallet_transaction_id)
    values (p_event_id, v_caller_id, v_line.seller_id, v_line.name, v_line.quantity, v_txn.id)
    returning * into v_ent;

    return next v_ent;
  end loop;
end;
$function$;

revoke all on function public.wallet_checkout_cart(uuid, jsonb) from public;
grant execute on function public.wallet_checkout_cart(uuid, jsonb) to authenticated;

revoke execute on function public.wallet_debit_for_purchase(uuid, text, numeric, integer, uuid) from public, anon, authenticated;
