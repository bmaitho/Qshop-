-- THE HIVE: brand partner accounts (Smirnoff, Red Bull, Harrison's Pearl
-- Gerar, …). A partner is a brand; members are UniHive users who run it.
-- Members get a dashboard of their own sales/redemptions and can scan and
-- redeem only their own brand's items. Staff/admins can scan everything.

create table if not exists public.event_partners (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  slug text not null,
  name text not null,
  logo_url text,
  created_at timestamptz not null default now(),
  unique (event_id, slug)
);

create table if not exists public.event_partner_members (
  partner_id uuid not null references public.event_partners(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'staff' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now(),
  primary key (partner_id, user_id)
);

alter table public.event_products add column if not exists partner_id uuid references public.event_partners(id);
alter table public.event_entitlements add column if not exists partner_id uuid references public.event_partners(id);
create index if not exists event_entitlements_partner_idx on public.event_entitlements (partner_id, status);

create or replace function public.is_partner_member(p_partner_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from event_partner_members where partner_id = p_partner_id and user_id = auth.uid());
$$;

alter table public.event_partners enable row level security;
alter table public.event_partner_members enable row level security;

drop policy if exists "partners readable" on public.event_partners;
create policy "partners readable" on public.event_partners for select using (true);

drop policy if exists "members see own memberships" on public.event_partner_members;
create policy "members see own memberships" on public.event_partner_members for select using (user_id = auth.uid());

drop policy if exists "partner members read their products" on public.event_products;
create policy "partner members read their products" on public.event_products for select using (partner_id is not null and public.is_partner_member(partner_id));

drop policy if exists "partner members read their entitlements" on public.event_entitlements;
create policy "partner members read their entitlements" on public.event_entitlements for select using (partner_id is not null and public.is_partner_member(partner_id));

-- Tag every new entitlement with its product's partner.
create or replace function public.tag_entitlement_partner()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if new.partner_id is null then
    select partner_id into new.partner_id
    from event_products
    where event_id = new.event_id and name = new.product_name
    limit 1;
  end if;
  return new;
end;
$$;
drop trigger if exists tag_entitlement_partner on public.event_entitlements;
create trigger tag_entitlement_partner before insert on public.event_entitlements
for each row execute function public.tag_entitlement_partner();

-- Who may scan a given entitlement: staff/admin, or a member of its partner.
create or replace function public.can_scan_entitlement(p_partner_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select coalesce((select is_staff or is_admin from profiles where id = auth.uid()), false)
      or (p_partner_id is not null and public.is_partner_member(p_partner_id));
$$;

-- Scanner lookup (RLS hides other people's entitlements, so this runs server-side).
create or replace function public.lookup_entitlement(p_qr_token uuid)
returns table (id uuid, product_name text, quantity int, status text, redeemed_at timestamptz, partner_name text, buyer_name text, image_url text)
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
           (select full_name from profiles where profiles.id = v.user_id),
           (select ep.image_url from event_products ep where ep.event_id = v.event_id and ep.name = v.product_name limit 1);
end;
$$;

create or replace function public.redeem_entitlement(p_qr_token uuid)
returns event_entitlements language plpgsql security definer set search_path to 'public' as $$
declare v event_entitlements%rowtype;
begin
  if auth.uid() is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  select * into v from event_entitlements where qr_token = p_qr_token for update;
  if not found then raise exception 'Entitlement not found' using errcode = 'P0002'; end if;
  if not public.can_scan_entitlement(v.partner_id) then
    raise exception 'This item belongs to another partner' using errcode = '42501';
  end if;
  if v.status = 'redeemed' then return v; end if;
  update event_entitlements set status = 'redeemed', redeemed_at = now(), redeemed_by = auth.uid()
  where id = v.id returning * into v;
  return v;
end;
$$;

-- Members can mark their own items in or out of stock.
create or replace function public.partner_set_product_active(p_product_id uuid, p_active boolean)
returns event_products language plpgsql security definer set search_path to 'public' as $$
declare v event_products%rowtype;
begin
  select * into v from event_products where id = p_product_id for update;
  if not found or v.partner_id is null or not public.is_partner_member(v.partner_id) then
    raise exception 'Not your product' using errcode = '42501';
  end if;
  update event_products set active = p_active where id = p_product_id returning * into v;
  return v;
end;
$$;

grant execute on function public.lookup_entitlement(uuid) to authenticated;
grant execute on function public.redeem_entitlement(uuid) to authenticated;
grant execute on function public.partner_set_product_active(uuid, boolean) to authenticated;

-- Seed THE HIVE partners and assign products.
insert into public.event_partners (event_id, slug, name, logo_url)
select e.id, v.slug, v.name, v.logo
from public.events e,
  (values ('smirnoff', 'Smirnoff', '/hive/products/smirnoff-vodka.png'),
          ('redbull', 'Red Bull', '/hive/products/redbull-webs.webp'),
          ('harrisons', 'Harrison''s Pearl Gerar', '/hive/products/shawarma.png'),
          ('unihive', 'THE HIVE (UniHive)', '/hive/products/hive-cup-fang.webp')) as v(slug, name, logo)
where e.slug = 'the-hive-no-going-home'
on conflict (event_id, slug) do nothing;

with ev as (select id from public.events where slug = 'the-hive-no-going-home'),
     p as (select ep.slug, ep.id from public.event_partners ep join ev on ep.event_id = ev.id)
update public.event_products prod
set partner_id = case
    when prod.name ilike 'red bull vodka%' then (select id from p where slug = 'smirnoff')
    when prod.name ilike '%smirnoff%' then (select id from p where slug = 'smirnoff')
    when prod.name ilike '%red bull%' then (select id from p where slug = 'redbull')
    when prod.name ilike any (array['%shawarma%', '%hotdog%', '%hot dog%']) then (select id from p where slug = 'harrisons')
    else (select id from p where slug = 'unihive')
  end
where prod.event_id = (select id from ev);

update public.event_entitlements ent
set partner_id = prod.partner_id
from public.event_products prod
where ent.partner_id is null and prod.event_id = ent.event_id and prod.name = ent.product_name;

-- Distinct Red Bull visuals (no duplicate product images).
update public.event_products set image_url = '/hive/products/redbull-webs.webp'
where name = 'Red Bull' and event_id = (select id from public.events where slug = 'the-hive-no-going-home');
update public.event_products set image_url = '/hive/products/redbull-vodka-webs.webp'
where name = 'Red Bull Vodka' and event_id = (select id from public.events where slug = 'the-hive-no-going-home');

-- Claimed Little Events tickets belong to the claimer too.
drop policy if exists "claimers read their claimed tickets" on public.event_tickets;
create policy "claimers read their claimed tickets" on public.event_tickets for select using (hive_claimed_by = auth.uid());
