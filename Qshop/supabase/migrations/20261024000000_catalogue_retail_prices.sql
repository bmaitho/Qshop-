-- THE HIVE catalogue at retail prices (applied 15 Oct 2026) until partner
-- discounts are agreed. Drinks: Carrefour Kenya listings; food: Harrison's.
update public.event_products p set price = v.price
from (values ('Shawarma', 400), ('Hotdog', 150), ('Red Bull', 233), ('Smirnoff Ice Black', 202),
             ('Smirnoff Ice Double Black Guarana', 209), ('Smirnoff Ice Pineapple Punch', 209)) as v(name, price)
where p.name = v.name and p.event_id = (select id from events where slug = 'the-hive-no-going-home');
