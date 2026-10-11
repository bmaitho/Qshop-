-- THE HIVE: face paint tiers, both Hive Cup designs, event poster.

update public.event_products
set name = 'Face Paint — Basic', description = 'Classic Halloween face design', price = 300,
    category = 'experience', image_url = '/hive/products/facepaint-basic.webp'
where name = 'Face/Body Paint'
  and event_id = (select id from public.events where slug = 'the-hive-no-going-home');

insert into public.event_products (event_id, name, description, category, price, image_url, display_order)
select e.id, v.name, v.description, 'experience', v.price, v.image_url, v.display_order
from public.events e,
  (values
    ('Face & Body Paint', 'Full face plus body design', 500, '/hive/products/facepaint-face-body.webp', 16),
    ('Luminous Face Paint', 'Premium UV-reactive design that glows under the lights', 650, '/hive/products/facepaint-luminous.webp', 17)
  ) as v(name, description, price, image_url, display_order)
where e.slug = 'the-hive-no-going-home'
  and not exists (
    select 1 from public.event_products p where p.event_id = e.id and p.name = v.name
  );

update public.event_products
set name = 'The Hive Cup — Grin', description = 'Branded event cup, grinning jack-o''-lantern design',
    image_url = '/hive/products/hive-cup-grin.webp'
where name = 'The Hive Cup'
  and event_id = (select id from public.events where slug = 'the-hive-no-going-home');

insert into public.event_products (event_id, name, description, category, price, image_url, display_order)
select e.id, 'The Hive Cup — Fang', 'Branded event cup, fanged jack-o''-lantern design', 'merch', 700, '/hive/products/hive-cup-fang.webp', 5
from public.events e
where e.slug = 'the-hive-no-going-home'
  and not exists (
    select 1 from public.event_products p where p.event_id = e.id and p.name = 'The Hive Cup — Fang'
  );

update public.events
set image_url = '/hive/media/blood-moon.webp'
where slug = 'the-hive-no-going-home' and (image_url is null or image_url = '');
