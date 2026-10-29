-- THE HIVE: take both Hive Cup designs off sale (event page only lists active products).
update event_products set active = false
where name in ('The Hive Cup — Grin', 'The Hive Cup — Fang')
  and event_id = (select id from events where slug = 'the-hive-no-going-home');

-- The UniHive partner logo was the cup photo; use the event poster instead.
update event_partners set logo_url = '/hive/media/master-poster.webp'
where slug = 'unihive'
  and logo_url = '/hive/products/hive-cup-fang.webp'
  and event_id = (select id from events where slug = 'the-hive-no-going-home');
