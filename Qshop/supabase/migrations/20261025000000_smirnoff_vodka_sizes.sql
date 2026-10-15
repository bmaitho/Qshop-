-- Smirnoff Red Vodka by bottle size at Carrefour Kenya prices (applied 15 Oct 2026).
with base as (
  select * from event_products where name = 'Smirnoff Vodka' and event_id = (select id from events where slug='the-hive-no-going-home')
), upd as (
  update event_products p set name = 'Smirnoff Red Vodka 250ml', description = 'Smirnoff No.21 Red Vodka — 250ml bottle', price = 518
  from base where p.id = base.id returning p.id
)
insert into event_products (event_id, name, description, category, price, seller_id, active, display_order, image_url, partner_id)
select b.event_id, v.name, v.descr, b.category, v.price, b.seller_id, true, b.display_order + v.o, b.image_url, b.partner_id
from base b, (values ('Smirnoff Red Vodka 350ml', 'Smirnoff No.21 Red Vodka — 350ml bottle', 718, 1),
                     ('Smirnoff Red Vodka 750ml', 'Smirnoff No.21 Red Vodka — 750ml bottle', 1348, 2),
                     ('Smirnoff Red Vodka 1L', 'Smirnoff No.21 Red Vodka — 1 litre bottle', 1948, 3)) v(name, descr, price, o)
where not exists (select 1 from event_products e where e.event_id = b.event_id and e.name = v.name);
