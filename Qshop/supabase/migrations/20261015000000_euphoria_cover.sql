-- THE HIVE: EUPHORIA — replace the stock cover with the event's own photography.
update public.events
set image_url = '/hive/booth/euph025.webp'
where title ilike '%euphoria%';
