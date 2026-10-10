-- THE HIVE: real menu names + food items
--
-- Renames the three placeholder drink products seeded in
-- 20261008000000 to the actual menu as confirmed directly, and adds the
-- two food items (shawarma, hotdog) that were missing from the first
-- pass. UPDATE by name + event_id, not a reseed — event_package_items
-- reference product_id, not name, so this cannot break any existing
-- package's contents.

update public.event_products
set name = 'Smirnoff & Guarana', description = 'Smirnoff vodka mixed with guarana energy drink'
where name = 'Liquid Courage'
  and event_id = (select id from public.events where slug = 'the-hive-no-going-home');

update public.event_products
set name = 'Red Bull Vodka', description = 'Vodka mixed with Red Bull'
where name = 'Second Wind'
  and event_id = (select id from public.events where slug = 'the-hive-no-going-home');

update public.event_products
set name = 'Red Bull', description = 'Red Bull energy drink'
where name = 'Midnight Fuel'
  and event_id = (select id from public.events where slug = 'the-hive-no-going-home');

insert into public.event_products (event_id, name, description, category, price, display_order)
select id, 'Shawarma', 'Grilled chicken or beef shawarma wrap', 'food', 350, 7
from public.events where slug = 'the-hive-no-going-home'
on conflict do nothing;

insert into public.event_products (event_id, name, description, category, price, display_order)
select id, 'Hotdog', 'Classic hotdog', 'food', 250, 8
from public.events where slug = 'the-hive-no-going-home'
on conflict do nothing;
