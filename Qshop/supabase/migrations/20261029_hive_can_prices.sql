-- UniHive sells Smirnoff Ice cans at KSh 250 (applied 20 Oct 2026).
update event_products set price = 250
where name like 'Smirnoff Ice %'
  and event_id = (select id from events where slug = 'the-hive-no-going-home');
