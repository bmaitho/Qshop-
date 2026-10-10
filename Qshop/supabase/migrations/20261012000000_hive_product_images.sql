-- THE HIVE: product images
--
-- Adds image_url so each catalogue item (Red Bull, Smirnoff & Guarana,
-- Shawarma, Hotdog, etc.) can show its own product photo as an
-- individual card, instead of a text-only line item. Nullable — falls
-- back to a plain card until a real photo is set.

alter table public.event_products add column if not exists image_url text;
