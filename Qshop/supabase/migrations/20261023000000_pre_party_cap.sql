-- THE HIVE PRE-PARTY: RSVP capped at 75 people (enforced in rsvp_event).
update public.events set max_capacity = 75 where slug = 'the-hive-pre-party';
