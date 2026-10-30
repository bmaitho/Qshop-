-- Imported Little tickets have no UniHive account until the buyer claims
-- them (/claim/:eventId); user_id was NOT NULL, so every Little import
-- failed. Only Little tickets may have an empty user_id.
-- (Applied 2026-10-30 from the SQL editor together with the first import.)

begin;
alter table public.event_tickets alter column user_id drop not null;
alter table public.event_tickets drop constraint if exists event_tickets_account_unless_little;
alter table public.event_tickets add constraint event_tickets_account_unless_little
  check (user_id is not null or source_platform = 'little');
commit;
