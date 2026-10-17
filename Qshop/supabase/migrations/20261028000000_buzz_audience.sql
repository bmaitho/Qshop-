-- Buzz campaigns can target a specific audience (e.g. an event's RSVPs).
alter table public.buzz_campaigns add column if not exists audience jsonb;
