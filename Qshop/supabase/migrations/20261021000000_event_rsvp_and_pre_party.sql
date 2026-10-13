-- Free-event RSVP passes + minimal door lookup, reusable for any future
-- free activation. Paid admission stays on Little (rsvp_enabled is never
-- set on paid events).

-- 1) Events opt in to free RSVP. max_capacity (existing, nullable) is the
--    optional cap: null means no cap.
alter table public.events add column if not exists rsvp_enabled boolean not null default false;

-- 2) One RSVP pass per person per event.
create unique index if not exists event_tickets_one_rsvp_per_user
  on public.event_tickets (event_id, user_id)
  where source_platform = 'unihive_rsvp';

-- 3) RSVP: server-side, idempotent, capacity-aware. Returns the caller's pass.
create or replace function public.rsvp_event(p_event_id uuid)
returns public.event_tickets
language plpgsql security definer set search_path to 'public' as $$
declare
  v_uid uuid := auth.uid();
  v_event events%rowtype;
  v_ticket event_tickets%rowtype;
  v_taken int;
begin
  if v_uid is null then raise exception 'Sign in to RSVP' using errcode = '42501'; end if;

  select * into v_event from events where id = p_event_id for update;
  if not found or not coalesce(v_event.rsvp_enabled, false) then
    raise exception 'RSVP is not open for this event' using errcode = '22023';
  end if;
  if v_event.status not in ('upcoming', 'live') or v_event.event_date < (now() at time zone 'Africa/Nairobi')::date then
    raise exception 'RSVP has closed for this event' using errcode = '22023';
  end if;

  select * into v_ticket from event_tickets
   where event_id = p_event_id and user_id = v_uid and source_platform = 'unihive_rsvp';
  if found then return v_ticket; end if;

  if v_event.max_capacity is not null then
    select count(*) into v_taken from event_tickets
     where event_id = p_event_id and source_platform = 'unihive_rsvp';
    if v_taken >= v_event.max_capacity then
      raise exception 'RSVPs are full' using errcode = '22023';
    end if;
  end if;

  insert into event_tickets (event_id, user_id, tier, quantity, admits_count, admits_used,
                             payment_status, amount_paid, source_platform, guest_purchase)
  values (p_event_id, v_uid, 'RSVP', 1, 1, 0, 'completed', 0, 'unihive_rsvp', false)
  returning * into v_ticket;

  update events set tickets_sold = coalesce(tickets_sold, 0) + 1 where id = p_event_id;
  return v_ticket;
end;
$$;
revoke all on function public.rsvp_event(uuid) from public, anon;
grant execute on function public.rsvp_event(uuid) to authenticated;

-- 4) Door lookup for staff: only what is needed to admit someone.
create or replace function public.lookup_event_ticket(p_token uuid)
returns table (id uuid, event_title text, event_image text, event_date date, tier text,
               admits_count int, admits_used int, scanned_at timestamptz, holder text)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  if not coalesce((select is_staff or is_admin from profiles where profiles.id = auth.uid()), false) then
    raise exception 'Not authorised — staff only' using errcode = '42501';
  end if;
  return query
    select t.id, e.title, e.image_url, e.event_date, t.tier,
           coalesce(t.admits_count, 1), coalesce(t.admits_used, 0), t.scanned_at,
           nullif(trim(split_part(trim(coalesce(p.full_name, t.guest_name, '')), ' ', 1)
             || coalesce(' ' || nullif(left(split_part(trim(coalesce(p.full_name, t.guest_name, '')), ' ', 2), 1), '') || '.', '')), '')
      from event_tickets t
      join events e on e.id = t.event_id
      left join profiles p on p.id = t.user_id
     where t.ticket_token = p_token and t.payment_status = 'completed';
end;
$$;
revoke all on function public.lookup_event_ticket(uuid) from public, anon;
grant execute on function public.lookup_event_ticket(uuid) to authenticated;

-- 5) Passes are only created server-side now (rsvp_event, package checkout,
--    Little claims, backend). Remove any client INSERT policy on tickets so
--    nobody can mint a "completed" ticket from the browser.
do $$
declare r record;
begin
  for r in select policyname from pg_policies
            where schemaname = 'public' and tablename = 'event_tickets' and cmd = 'INSERT'
  loop
    execute format('drop policy %I on public.event_tickets', r.policyname);
    raise notice 'dropped client insert policy on event_tickets: %', r.policyname;
  end loop;
end $$;

-- 6) THE HIVE PRE-PARTY.
insert into public.events (title, description, event_date, event_time, venue, status, slug, price, rsvp_enabled, image_url)
values (
  'THE HIVE PRE-PARTY',
  'Good vibes. New connections. Big energy. A free day out at Paradise Lost, Kiambu — 12PM to 8PM. 18+. RSVP free on UniHive.',
  '2026-10-16', '12:00:00', 'Paradise Lost, Kiambu', 'upcoming', 'the-hive-pre-party', 0, true,
  '/experiences/the-hive-pre-party/poster.webp'
)
on conflict (slug) do update set
  rsvp_enabled = true, price = 0, event_date = excluded.event_date, event_time = excluded.event_time,
  venue = excluded.venue, description = excluded.description, status = 'upcoming';
