-- THE HIVE: official tickets are sold only on Little Events.
-- Switch off every HIVE package that includes entry (a ticket_tier item).
update public.event_packages p
set status = 'inactive'
where p.event_id = (select id from public.events where slug = 'the-hive-no-going-home')
  and p.status <> 'inactive'
  and exists (
    select 1 from public.event_package_items i
    where i.package_id = p.id and i.item_type = 'ticket_tier'
  );
