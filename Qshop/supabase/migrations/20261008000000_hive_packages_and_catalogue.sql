-- =====================================================================
-- THE HIVE Edition packages + event catalogue.
--
-- Commercial rule this schema exists to make enforceable, not just
-- documented: UniHive must never undercut Little Events on the same
-- standalone admission product. Little currently lists Regular 1,000 /
-- VIP 2,000 / Group of 4 3,500 (apps.little.africa). Every package below
-- either matches Little's face value exactly for pure admission, or adds
-- a clearly differentiated layer on top — never a bare discount on the
-- same product. This is a process rule the admin UI should surface
-- (e.g. warn if a new package's base_price < sum of its ticket-tier
-- components' Little-equivalent value), not something enforceable as a
-- hard DB constraint, since Little's prices aren't in this database.
--
-- Config-driven by design: nothing here hardcodes a price into the
-- frontend. Admin can add/retire packages and products without a
-- deploy, same principle as the billboard/content system discussed
-- earlier for THE HIVE.
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- 1. Event catalogue — standalone purchasable items (drinks, merch,
--    experiences). Scoped to events specifically, not the general
--    marketplace `products` table — these are redeemed via QR at the
--    event, not shipped/collected like a normal order.
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.event_products (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id),
  name text not null,
  description text,
  category text, -- 'cocktail' | 'energy' | 'merch' | 'food' | 'experience' | ...
  price numeric not null check (price >= 0),
  seller_id uuid references auth.users(id), -- vendor fulfilling it; null until assigned
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.event_products enable row level security;

drop policy if exists "anyone reads active event products" on public.event_products;
create policy "anyone reads active event products" on public.event_products
  for select using (active = true);
-- No client write policy — admin-managed via service role only, same
-- posture as events/ticket_tiers.

-- ─────────────────────────────────────────────────────────────────────
-- 2. Packages — "HIVE Editions". A package has a single admin-set
--    base_price; what it contains is described by event_package_items
--    below, not inferred by summing component prices at checkout time.
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.event_packages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id),
  name text not null,
  slug text not null,
  description text,
  base_price numeric not null check (base_price >= 0),
  status text not null default 'active' check (status in ('active', 'inactive', 'sold_out')),
  inventory integer, -- null = unlimited
  sale_start timestamptz,
  sale_end timestamptz,
  featured boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (event_id, slug)
);

alter table public.event_packages enable row level security;

drop policy if exists "anyone reads active packages" on public.event_packages;
create policy "anyone reads active packages" on public.event_packages
  for select using (status = 'active');

-- ─────────────────────────────────────────────────────────────────────
-- 3. Package contents. item_type discriminates what quantity/product_id
--    mean: a 'ticket_tier' row consumes `tier` (matching event_tickets'
--    tier naming — "Regular"/"VIP"), a 'product' row references
--    event_products, a 'wallet_credit' row sets wallet_credit_amount.
--    The checkout engine that turns a purchased package into real
--    entitlements + ticket rows + a wallet credit is a separate, later
--    piece — this table only describes what a package IS, not the
--    fulfilment logic.
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.event_package_items (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.event_packages(id) on delete cascade,
  item_type text not null check (item_type in ('ticket_tier', 'product', 'wallet_credit')),
  tier text,                                      -- when item_type = 'ticket_tier'
  product_id uuid references public.event_products(id), -- when item_type = 'product'
  wallet_credit_amount numeric,                   -- when item_type = 'wallet_credit'
  quantity integer not null default 1 check (quantity > 0),
  seller_id uuid references auth.users(id),       -- per-item vendor override
  fulfilment_type text,                           -- 'digital_qr' | 'wallet_topup' | 'entry' | ...
  check (
    (item_type = 'ticket_tier' and tier is not null) or
    (item_type = 'product' and product_id is not null) or
    (item_type = 'wallet_credit' and wallet_credit_amount is not null)
  )
);

alter table public.event_package_items enable row level security;

drop policy if exists "anyone reads package items" on public.event_package_items;
create policy "anyone reads package items" on public.event_package_items
  for select using (true);

-- =====================================================================
-- 4. Seed: THE HIVE : NO GOING HOME — native packages and catalogue.
--
-- Only the set explicitly agreed as safe to seed for testing. Plain VIP
-- is deliberately NOT sold natively — Little already lists it at 2,000;
-- UniHive sends VIP buyers to "claim your HIVE" instead of competing on
-- the same product. HIVE TABLE is seeded as price-only shells (three
-- waves) with no components yet, since inclusions depend on sponsor/
-- venue arrangements not yet confirmed — do not publish quantities
-- before they're real. HIVE CREW is seeded WITHOUT the sponsor-
-- conditional Red Bull x6, same reasoning.
-- =====================================================================
do $$
declare
  v_event_id uuid;
  v_pkg_id uuid;
  v_cocktail_id uuid;
  v_redbull_id uuid;
begin
  select id into v_event_id from public.events where slug = 'the-hive-no-going-home';
  if v_event_id is null then
    raise notice 'THE HIVE event row not found (expected slug the-hive-no-going-home) — skipping seed. Run the earlier event-shell migration first.';
    return;
  end if;

  -- ── Catalogue items ──────────────────────────────────────────────
  insert into public.event_products (event_id, name, description, category, price, display_order)
  values
    (v_event_id, 'Liquid Courage', 'Signature cocktail', 'cocktail', 500, 1),
    (v_event_id, 'Second Wind', 'Red Bull / energy drink', 'energy', 250, 2),
    (v_event_id, 'Midnight Fuel', 'Guarana energy drink', 'energy', 200, 3),
    (v_event_id, 'The Hive Cup', 'Branded event cup', 'merch', 700, 4),
    (v_event_id, 'After Dark Tee', 'Event t-shirt', 'merch', 1500, 5),
    (v_event_id, 'Face/Body Paint', 'Halloween face or body paint', 'experience', 300, 6)
  on conflict do nothing;

  select id into v_cocktail_id from public.event_products where event_id = v_event_id and name = 'Liquid Courage';
  select id into v_redbull_id from public.event_products where event_id = v_event_id and name = 'Second Wind';

  -- ── THE HIVE ENTRY — 1,000 (matches Little's Regular exactly) ─────
  insert into public.event_packages (event_id, name, slug, description, base_price, featured, display_order)
  values (v_event_id, 'THE HIVE ENTRY', 'the-hive-entry',
    'Admission bought directly through UniHive — same price as buying Regular elsewhere, with the full digital layer on top.',
    1000, false, 1)
  on conflict (event_id, slug) do nothing
  returning id into v_pkg_id;
  if v_pkg_id is not null then
    insert into public.event_package_items (package_id, item_type, tier, quantity, fulfilment_type)
    values (v_pkg_id, 'ticket_tier', 'Regular', 1, 'entry');
  end if;

  -- ── THE HIVE FOUR — 3,500 (matches Little's Group of 4 exactly) ───
  insert into public.event_packages (event_id, name, slug, description, base_price, display_order)
  values (v_event_id, 'THE HIVE FOUR', 'the-hive-four',
    'Four admissions through UniHive, same price as Little''s Group of 4, with group HIVE wallet and My HIVE access.',
    3500, 2)
  on conflict (event_id, slug) do nothing
  returning id into v_pkg_id;
  if v_pkg_id is not null then
    insert into public.event_package_items (package_id, item_type, tier, quantity, fulfilment_type)
    values (v_pkg_id, 'ticket_tier', 'Regular', 4, 'entry');
  end if;

  -- ── HIVE AFTER DARK — 2,500 ────────────────────────────────────────
  insert into public.event_packages (event_id, name, slug, description, base_price, featured, display_order)
  values (v_event_id, 'HIVE AFTER DARK', 'hive-after-dark',
    'Entry, your first drink, and your energy — no separate transactions.',
    2500, true, 3)
  on conflict (event_id, slug) do nothing
  returning id into v_pkg_id;
  if v_pkg_id is not null then
    insert into public.event_package_items (package_id, item_type, tier, product_id, quantity, wallet_credit_amount, fulfilment_type)
    values
      (v_pkg_id, 'ticket_tier', 'Regular', null, 1, null, 'entry'),
      (v_pkg_id, 'product', null, v_cocktail_id, 1, null, 'digital_qr'),
      (v_pkg_id, 'product', null, v_redbull_id, 1, null, 'digital_qr'),
      (v_pkg_id, 'wallet_credit', null, null, 1, 750, 'wallet_topup');
  end if;

  -- ── HIVE DATE — 3,500 ───────────────────────────────────────────────
  insert into public.event_packages (event_id, name, slug, description, base_price, featured, display_order)
  values (v_event_id, 'HIVE DATE', 'hive-date',
    'Two tickets. Two drinks. One very questionable decision.',
    3500, true, 4)
  on conflict (event_id, slug) do nothing
  returning id into v_pkg_id;
  if v_pkg_id is not null then
    insert into public.event_package_items (package_id, item_type, tier, product_id, quantity, fulfilment_type)
    values
      (v_pkg_id, 'ticket_tier', 'Regular', null, 2, 'entry'),
      (v_pkg_id, 'product', null, v_cocktail_id, 2, 'digital_qr'),
      (v_pkg_id, 'product', null, v_redbull_id, 2, 'digital_qr');
  end if;

  -- ── HIVE CREW — 7,500 (no sponsor-conditional items yet) ───────────
  insert into public.event_packages (event_id, name, slug, description, base_price, display_order)
  values (v_event_id, 'HIVE CREW', 'hive-crew',
    'Six entries, shared wallet credit, priority collection. Sponsor-funded extras (energy drinks etc.) get added once secured, not before.',
    7500, 5)
  on conflict (event_id, slug) do nothing
  returning id into v_pkg_id;
  if v_pkg_id is not null then
    insert into public.event_package_items (package_id, item_type, tier, quantity, wallet_credit_amount, fulfilment_type)
    values
      (v_pkg_id, 'ticket_tier', 'Regular', 6, null, 'entry'),
      (v_pkg_id, 'wallet_credit', null, 1, 1000, 'wallet_topup');
  end if;

  -- ── VIP AFTER DARK — 3,000 (VIP upgrade, not a competing plain VIP) ─
  insert into public.event_packages (event_id, name, slug, description, base_price, display_order)
  values (v_event_id, 'VIP AFTER DARK', 'vip-after-dark',
    'VIP entry plus the After Dark layer. Buy plain VIP on Little and claim your HIVE instead if you don''t want the extras.',
    3000, 6)
  on conflict (event_id, slug) do nothing
  returning id into v_pkg_id;
  if v_pkg_id is not null then
    insert into public.event_package_items (package_id, item_type, tier, product_id, quantity, wallet_credit_amount, fulfilment_type)
    values
      (v_pkg_id, 'ticket_tier', 'VIP', null, 1, null, 'entry'),
      (v_pkg_id, 'product', null, v_cocktail_id, 1, null, 'digital_qr'),
      (v_pkg_id, 'product', null, v_redbull_id, 1, null, 'digital_qr'),
      (v_pkg_id, 'wallet_credit', null, null, 1, 250, 'wallet_topup');
  end if;

  -- ── HIVE TABLE — price shells only, waves, no components yet ───────
  insert into public.event_packages (event_id, name, slug, description, base_price, display_order, sale_start, sale_end)
  values
    (v_event_id, 'THE HIVE TABLE — Wave 1', 'hive-table-wave-1',
     '6-person hospitality table. Inclusions to be configured once venue/sponsor arrangements are confirmed — do not assume contents from the price alone.',
     18000, 7, now(), '2026-10-16 23:59:59+03'),
    (v_event_id, 'THE HIVE TABLE — Wave 2', 'hive-table-wave-2',
     '6-person hospitality table. Inclusions to be configured once venue/sponsor arrangements are confirmed.',
     20000, 8, '2026-10-17 00:00:00+03', '2026-10-24 23:59:59+03'),
    (v_event_id, 'THE HIVE TABLE — Final', 'hive-table-final',
     '6-person hospitality table. Inclusions to be configured once venue/sponsor arrangements are confirmed.',
     22000, 9, '2026-10-25 00:00:00+03', null)
  on conflict (event_id, slug) do nothing;

end $$;
