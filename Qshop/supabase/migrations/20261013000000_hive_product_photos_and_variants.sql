-- THE HIVE: real product photos + individual Smirnoff variants
--
-- Sets image_url on the existing catalogue items and splits "Smirnoff &
-- Guarana" out into the actual individual products/flavors supplied,
-- so each one gets its own purchasable card instead of one generic
-- cocktail line. Images are served from /hive/products/* (public/ —
-- stable paths, not Vite-bundled imports) per the photos actually
-- supplied for this event.

update public.event_products
set image_url = '/hive/products/redbull.png'
where name = 'Red Bull'
  and event_id = (select id from public.events where slug = 'the-hive-no-going-home');

update public.event_products
set image_url = '/hive/products/redbull.png'
where name = 'Red Bull Vodka'
  and event_id = (select id from public.events where slug = 'the-hive-no-going-home');

update public.event_products
set image_url = '/hive/products/shawarma.png'
where name = 'Shawarma'
  and event_id = (select id from public.events where slug = 'the-hive-no-going-home');

update public.event_products
set image_url = '/hive/products/hotdog.png'
where name = 'Hotdog'
  and event_id = (select id from public.events where slug = 'the-hive-no-going-home');

-- "Smirnoff & Guarana" (the old generic placeholder) becomes the plain
-- Smirnoff Vodka bottle — the base spirit, not a specific flavor.
update public.event_products
set name = 'Smirnoff Vodka', description = 'Smirnoff No.21 Vodka', image_url = '/hive/products/smirnoff-vodka.png'
where name = 'Smirnoff & Guarana'
  and event_id = (select id from public.events where slug = 'the-hive-no-going-home');

insert into public.event_products (event_id, name, description, category, price, image_url, display_order)
select id, v.name, v.description, 'cocktail', v.price, v.image_url, v.display_order
from public.events,
  (values
    ('Smirnoff Ice Original', 'Smirnoff Ice — Crisp Citrus flavor', 350, '/hive/products/smirnoff-ice-citrus.png', 9),
    ('Smirnoff Ice Pink', 'Smirnoff Ice — Sweet Lemon flavor', 350, '/hive/products/smirnoff-ice-lemon.png', 10),
    ('Smirnoff Ice Green Apple', 'Smirnoff Ice — Tart Apple flavor', 350, '/hive/products/smirnoff-ice-apple.png', 11),
    ('Smirnoff Ice Orange', 'Smirnoff Ice — Zesty Orange flavor', 350, '/hive/products/smirnoff-ice-orange.png', 12),
    ('Smirnoff Ice Black', 'Smirnoff Ice Black', 400, '/hive/products/smirnoff-ice-black.png', 13),
    ('Smirnoff Ice Double Black Guarana', 'Smirnoff Ice Double Black with Guarana', 450, '/hive/products/smirnoff-ice-guarana.png', 14),
    ('Smirnoff Ice Pineapple Punch', 'Smirnoff Ice — Pineapple Punch flavor', 350, '/hive/products/smirnoff-ice-pineapple.png', 15)
  ) as v(name, description, price, image_url, display_order)
where events.slug = 'the-hive-no-going-home'
on conflict do nothing;
