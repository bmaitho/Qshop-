-- Halloween "in the webs" product shots for the remaining Smirnoff Ice flavours (applied 16 Oct 2026).
update event_products set image_url = case name
  when 'Smirnoff Ice Original' then '/hive/products/smirnoff-ice-original-webs.webp'
  when 'Smirnoff Ice Green Apple' then '/hive/products/smirnoff-ice-green-apple-webs.webp'
  when 'Smirnoff Ice Orange' then '/hive/products/smirnoff-ice-orange-webs.webp'
  when 'Smirnoff Ice Pink' then '/hive/products/smirnoff-ice-pink-webs.webp' end
where name in ('Smirnoff Ice Original','Smirnoff Ice Green Apple','Smirnoff Ice Orange','Smirnoff Ice Pink')
  and event_id = (select id from events where slug='the-hive-no-going-home');
