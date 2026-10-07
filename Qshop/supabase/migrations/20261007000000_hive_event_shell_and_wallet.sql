-- =====================================================================
-- 1. THE HIVE event shell — title/date/venue only, NO ticket_tiers yet.
--    Deliberately not inventing prices. Run the UPDATE at the bottom
--    once real HIVE Edition tier names/prices are confirmed.
-- =====================================================================
insert into public.events (title, description, event_date, event_time, venue, status, slug)
values (
  'THE HIVE: NO GOING HOME',
  'Halloween Edition. 18+ only. Tickets also available via Little Events.',
  '2026-10-30',
  '18:00:00',
  'Sarakasi Dome, Nairobi',
  'upcoming',
  'the-hive-no-going-home'
)
on conflict (slug) do nothing;

-- =====================================================================
-- 2. Wallet ledger — event-scoped spending balance, never a bare
--    editable number. balance is derived from confirmed ledger rows,
--    not stored/trusted as a column the client can write.
-- =====================================================================
create table if not exists public.event_wallets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id),
  user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.event_wallets(id),
  type text not null check (type in ('topup', 'purchase', 'refund', 'reversal')),
  amount numeric not null check (amount > 0),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'failed', 'reversed')),
  mpesa_checkout_request_id text,
  order_reference text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create index if not exists wallet_transactions_wallet_id_idx on public.wallet_transactions (wallet_id);
create unique index if not exists wallet_transactions_checkout_id_idx
  on public.wallet_transactions (mpesa_checkout_request_id)
  where mpesa_checkout_request_id is not null;

alter table public.event_wallets enable row level security;
alter table public.wallet_transactions enable row level security;

drop policy if exists "owner reads own wallet" on public.event_wallets;
create policy "owner reads own wallet" on public.event_wallets
  for select using (auth.uid() = user_id);

drop policy if exists "owner reads own wallet transactions" on public.wallet_transactions;
create policy "owner reads own wallet transactions" on public.wallet_transactions
  for select using (
    wallet_id in (select id from public.event_wallets where user_id = auth.uid())
  );
-- No client INSERT/UPDATE/DELETE policies on either table, anywhere.
-- All writes go through the SECURITY DEFINER functions below. This is
-- deliberate: a balance that can be edited by any direct table write is
-- not a safe wallet.

-- =====================================================================
-- 3. Balance view — derived, never stored.
-- =====================================================================
create or replace view public.event_wallet_balances as
select
  w.id as wallet_id,
  w.event_id,
  w.user_id,
  coalesce(sum(case
    when t.status = 'confirmed' and t.type in ('topup', 'refund') then t.amount
    when t.status = 'confirmed' and t.type in ('purchase', 'reversal') then -t.amount
    else 0
  end), 0) as balance
from public.event_wallets w
left join public.wallet_transactions t on t.wallet_id = w.id
group by w.id, w.event_id, w.user_id;

-- =====================================================================
-- 4. Idempotent top-up confirmation.
--    THE non-negotiable part: check status BEFORE crediting, so a
--    duplicate M-Pesa callback for the same checkout_request_id is a
--    no-op, not a double credit. This is the exact bug class already
--    found elsewhere in this codebase (event-ticket counters
--    double-incrementing on callback retry) — not repeating it here.
-- =====================================================================
create or replace function public.wallet_topup_confirm(
  p_checkout_request_id text,
  p_mpesa_receipt text default null
)
returns wallet_transactions
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_txn wallet_transactions%rowtype;
begin
  select * into v_txn
  from wallet_transactions
  where mpesa_checkout_request_id = p_checkout_request_id
  for update;

  if not found then
    raise exception 'No pending top-up found for that checkout request' using errcode = 'P0002';
  end if;

  -- Already confirmed: return as-is, do NOT credit again. This is the
  -- idempotency guard — a retried callback hits this branch and exits
  -- having changed nothing.
  if v_txn.status = 'confirmed' then
    return v_txn;
  end if;

  if v_txn.status <> 'pending' then
    raise exception 'Top-up is in status %, cannot confirm', v_txn.status using errcode = '22023';
  end if;

  update wallet_transactions
  set status = 'confirmed', confirmed_at = now()
  where id = v_txn.id
  returning * into v_txn;

  return v_txn;
end;
$function$;

-- =====================================================================
-- 5. Entitlements — what a wallet purchase actually buys.
-- =====================================================================
create table if not exists public.event_entitlements (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id),
  user_id uuid not null references auth.users(id),
  vendor_id uuid references auth.users(id),
  product_name text not null,
  quantity integer not null default 1 check (quantity > 0),
  qr_token uuid not null default gen_random_uuid() unique,
  status text not null default 'unused' check (status in ('unused', 'redeeming', 'redeemed')),
  wallet_transaction_id uuid references public.wallet_transactions(id),
  created_at timestamptz not null default now(),
  redeemed_at timestamptz,
  redeemed_by uuid references auth.users(id)
);

alter table public.event_entitlements enable row level security;

drop policy if exists "owner reads own entitlements" on public.event_entitlements;
create policy "owner reads own entitlements" on public.event_entitlements
  for select using (auth.uid() = user_id);

-- =====================================================================
-- 6. Debit RPC — locks the wallet's confirmed balance, checks it,
--    writes the purchase transaction and the entitlement atomically.
--    Never a client read-then-write.
-- =====================================================================
create or replace function public.wallet_debit_for_purchase(
  p_wallet_id uuid,
  p_product_name text,
  p_amount numeric,
  p_quantity integer default 1,
  p_vendor_id uuid default null
)
returns event_entitlements
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_caller_id uuid;
  v_wallet event_wallets%rowtype;
  v_balance numeric;
  v_txn wallet_transactions;
  v_entitlement event_entitlements;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select * into v_wallet from event_wallets where id = p_wallet_id for update;
  if not found or v_wallet.user_id <> v_caller_id then
    raise exception 'Wallet not found' using errcode = 'P0002';
  end if;

  select coalesce(sum(case
    when status = 'confirmed' and type in ('topup', 'refund') then amount
    when status = 'confirmed' and type in ('purchase', 'reversal') then -amount
    else 0
  end), 0) into v_balance
  from wallet_transactions
  where wallet_id = p_wallet_id;

  if v_balance < p_amount then
    raise exception 'Insufficient wallet balance: have %, need %', v_balance, p_amount using errcode = '22023';
  end if;

  insert into wallet_transactions (wallet_id, type, amount, status, confirmed_at)
  values (p_wallet_id, 'purchase', p_amount, 'confirmed', now())
  returning * into v_txn;

  insert into event_entitlements (event_id, user_id, vendor_id, product_name, quantity, wallet_transaction_id)
  values (v_wallet.event_id, v_caller_id, p_vendor_id, p_product_name, p_quantity, v_txn.id)
  returning * into v_entitlement;

  return v_entitlement;
end;
$function$;
