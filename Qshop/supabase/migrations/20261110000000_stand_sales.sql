-- Stand sales: vendors log each sale made at their stand (cash or M-Pesa
-- straight to the vendor), so the partner dashboard shows real totals, not
-- only UniHive wallet pre-orders.
--   * Logged only through log_stand_sale (price taken from the menu).
--   * Undo: the seller within 15 minutes, the brand owner or an admin any time.
--   * Each brand sees its own sales; admins see every brand.

begin;

create table if not exists public.event_stand_sales (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  partner_id uuid not null references public.event_partners(id) on delete cascade,
  product_id uuid references public.event_products(id) on delete set null,
  product_name text not null,
  unit_price numeric not null check (unit_price >= 0),
  quantity integer not null check (quantity between 1 and 100),
  amount numeric generated always as (unit_price * quantity) stored,
  payment_method text not null check (payment_method in ('cash', 'mpesa')),
  sold_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  voided_by uuid references auth.users(id)
);
create index if not exists event_stand_sales_partner_idx on public.event_stand_sales (partner_id, created_at desc);

alter table public.event_stand_sales enable row level security;
drop policy if exists "brand members read their stand sales" on public.event_stand_sales;
create policy "brand members read their stand sales" on public.event_stand_sales
  for select to authenticated using (public.is_partner_member(partner_id));
-- No insert/update/delete policies: writes go through the functions below.

create or replace function public.log_stand_sale(p_product_id uuid, p_quantity integer, p_payment_method text)
returns public.event_stand_sales language plpgsql security definer set search_path = 'public' as $$
declare
  v_product event_products%rowtype;
  v_sale event_stand_sales%rowtype;
begin
  if auth.uid() is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  if p_payment_method not in ('cash', 'mpesa') then raise exception 'Choose cash or M-Pesa'; end if;
  if p_quantity is null or p_quantity < 1 or p_quantity > 100 then raise exception 'Quantity must be 1 to 100'; end if;
  select * into v_product from event_products where id = p_product_id;
  if not found or v_product.partner_id is null then raise exception 'Product not found' using errcode = 'P0002'; end if;
  if not public.is_partner_member(v_product.partner_id) then
    raise exception 'You can only log sales for your own brand' using errcode = '42501';
  end if;
  insert into event_stand_sales (event_id, partner_id, product_id, product_name, unit_price, quantity, payment_method, sold_by)
  values (v_product.event_id, v_product.partner_id, v_product.id, v_product.name, v_product.price, p_quantity, p_payment_method, auth.uid())
  returning * into v_sale;
  return v_sale;
end;
$$;

create or replace function public.undo_stand_sale(p_sale_id uuid)
returns public.event_stand_sales language plpgsql security definer set search_path = 'public' as $$
declare v_sale event_stand_sales%rowtype;
begin
  if auth.uid() is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  select * into v_sale from event_stand_sales where id = p_sale_id for update;
  if not found then raise exception 'Sale not found' using errcode = 'P0002'; end if;
  if v_sale.voided_at is not null then return v_sale; end if;
  if not public.is_partner_owner(v_sale.partner_id)
     and not (v_sale.sold_by = auth.uid() and v_sale.created_at > now() - interval '15 minutes') then
    raise exception 'Only the person who logged it can undo, within 15 minutes - ask the brand owner';
  end if;
  update event_stand_sales set voided_at = now(), voided_by = auth.uid() where id = v_sale.id returning * into v_sale;
  return v_sale;
end;
$$;

revoke execute on function public.log_stand_sale(uuid, integer, text), public.undo_stand_sale(uuid) from public, anon;
grant execute on function public.log_stand_sale(uuid, integer, text), public.undo_stand_sale(uuid) to authenticated;

commit;

select count(*) as stand_sales_table_ready from public.event_stand_sales;
