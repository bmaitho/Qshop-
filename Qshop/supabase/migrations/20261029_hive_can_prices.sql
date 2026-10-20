-- UniHive sells Smirnoff Ice cans at KSh 250 (applied 20 Oct 2026).
update event_products set price = 250
where name like 'Smirnoff Ice %'
  and event_id = (select id from events where slug = 'the-hive-no-going-home');

-- Bottles: one size, 750ml at KSh 1,500; other sizes hidden. Red Bull can at KSh 250.
update event_products set price = 1500, active = true
where name = 'Smirnoff Red Vodka 750ml'
  and event_id = (select id from events where slug = 'the-hive-no-going-home');
update event_products set active = false
where name in ('Smirnoff Red Vodka 250ml', 'Smirnoff Red Vodka 350ml', 'Smirnoff Red Vodka 1L')
  and event_id = (select id from events where slug = 'the-hive-no-going-home');
update event_products set price = 250
where name = 'Red Bull'
  and event_id = (select id from events where slug = 'the-hive-no-going-home');
