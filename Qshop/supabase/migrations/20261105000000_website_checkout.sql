-- Website checkout has been broken since orders/order_items stopped
-- accepting writes from the browser (the cart inserted them directly, with
-- browser-calculated prices). The cart now calls create_my_order, which
-- prices every item from the products table for the signed-in buyer.
-- Delivery and the final total are set by the backend
-- (POST /api/buyer-orders/checkout/:orderId/delivery).

begin;

create or replace function public.create_my_order(p_items jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_item jsonb;
  v_product public.products%rowtype;
  v_quantity integer;
  v_order_id uuid := gen_random_uuid();
  v_total numeric := 0;
begin
  if v_user is null then raise exception 'Please log in to check out' using errcode = '42501'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) not between 1 and 50 then
    raise exception 'Your cart is empty or too large' using errcode = '22023';
  end if;

  -- Validate and price every line first.
  for v_item in select value from jsonb_array_elements(p_items) loop
    if (v_item ->> 'quantity') !~ '^[0-9]+$' or (v_item ->> 'productId') !~* '^[0-9a-f-]{36}$' then
      raise exception 'Invalid cart item' using errcode = '22023';
    end if;
    v_quantity := (v_item ->> 'quantity')::integer;
    if v_quantity not between 1 and 99 then raise exception 'Invalid quantity' using errcode = '22023'; end if;

    select * into v_product from public.products
     where id = (v_item ->> 'productId')::uuid and status::text = 'active';
    if not found then
      raise exception 'An item in your cart is no longer available' using errcode = '22023';
    end if;
    if v_product.seller_id = v_user then
      raise exception 'You cannot buy your own product' using errcode = '22023';
    end if;
    if v_product.price is null or v_product.price <= 0 then
      raise exception 'An item in your cart has no price' using errcode = '22023';
    end if;
    v_total := v_total + v_product.price * v_quantity;
  end loop;

  -- Abandon this buyer's earlier unpaid orders.
  update public.orders set payment_status = 'cancelled'
   where user_id = v_user and payment_status = 'pending' and checkout_request_id is null;

  insert into public.orders (id, user_id, amount, payment_status, order_status,
                             delivery_method, delivery_option, delivery_fee, payment_method)
  values (v_order_id, v_user, v_total, 'pending', 'pending_payment',
          'campus_pickup', 'campus_pickup', 0, 'mpesa');

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_quantity := (v_item ->> 'quantity')::integer;
    select * into v_product from public.products where id = (v_item ->> 'productId')::uuid;
    insert into public.order_items (order_id, product_id, seller_id, buyer_user_id, quantity,
                                    price_per_unit, subtotal, status, payment_status)
    values (v_order_id, v_product.id, v_product.seller_id, v_user, v_quantity,
            v_product.price, v_product.price * v_quantity, 'pending_payment', 'pending');
  end loop;

  return v_order_id;
end;
$$;

revoke execute on function public.create_my_order(jsonb) from public, anon;
grant execute on function public.create_my_order(jsonb) to authenticated;

commit;
