-- Sell THE HIVE: NO GOING HOME tickets on UniHive (alongside Little).
--   * events.sell_tickets_on_unihive switches the native checkout on per event
--     (off everywhere else, so other events still point to Little).
--   * THE HIVE gets its ticket tiers at the discounted prices shown on the page.
--   * Every UniHive-sold ticket gets a short code (HV-XXXXXX) for the email and
--     for typing at the door; the door scanner accepts it.
-- Safe to run before the website/server deploy.

begin;

alter table public.events add column if not exists sell_tickets_on_unihive boolean not null default false;

update public.events
   set sell_tickets_on_unihive = true,
       ticket_tiers = '[
         {"name": "Single Hive Regular", "price": 1125, "admits": 1, "no_promo": true, "sold": 0},
         {"name": "Hive of 4 Regular",   "price": 3600, "admits": 4, "no_promo": true, "sold": 0},
         {"name": "Hive of 6 Regular",   "price": 3750, "admits": 6, "no_promo": true, "sold": 0},
         {"name": "VIP Hive Single",     "price": 2000, "admits": 1, "no_promo": true, "sold": 0, "description": "Complimentary Red Bull"},
         {"name": "VIP Hive Duo",        "price": 3600, "admits": 2, "no_promo": true, "sold": 0, "description": "Complimentary Red Bull + Smirnoff cans"},
         {"name": "Hive of 6 VIP",       "price": 6400, "admits": 6, "no_promo": true, "sold": 0, "description": "Complimentary Smirnoff & Red Bull cans for the whole crew"}
       ]'::jsonb
 where slug = 'the-hive-no-going-home';

-- Short, unambiguous ticket codes for UniHive-sold tickets.
create or replace function public.assign_ticket_code()
returns trigger language plpgsql set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
begin
  if coalesce(new.source_platform, 'unihive') <> 'unihive' or new.external_reference is not null then
    return new;
  end if;
  loop
    v_code := 'HV-';
    for i in 1..6 loop
      v_code := v_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.event_tickets where external_reference = v_code);
  end loop;
  new.external_reference := v_code;
  return new;
end;
$$;

drop trigger if exists assign_ticket_code on public.event_tickets;
create trigger assign_ticket_code
  before insert on public.event_tickets
  for each row execute function public.assign_ticket_code();

-- Door lookup: also accept a typed UniHive ticket code (HV-XXXXXX).
create or replace function public.lookup_event_pass(p_code text)
returns table(id uuid, event_title text, event_image text, event_date date, tier text,
              admits_count integer, admits_used integer, scanned_at timestamptz, holder text,
              voided_at timestamptz, void_reason text, source text)
language plpgsql stable security definer set search_path = 'public' as $$
declare
  v_code text := nullif(trim(p_code), '');
  v_ticket event_tickets%rowtype;
begin
  if auth.uid() is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  if v_code is null then return; end if;

  if v_code ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    select * into v_ticket from event_tickets t
     where t.ticket_token = v_code::uuid and t.payment_status = 'completed';
  end if;
  if v_ticket.id is null then
    select * into v_ticket from event_tickets t
     where t.source_platform in ('unihive_comp', 'unihive') and t.payment_status = 'completed'
       and upper(t.external_reference) = upper(v_code)
     limit 1;
  end if;
  if v_ticket.id is null then
    select * into v_ticket from event_tickets t
     where t.source_platform = 'little' and t.payment_status = 'completed'
       and t.external_reference is not null
       and (t.external_reference = v_code
            or (length(t.external_reference) >= 6 and position(t.external_reference in v_code) > 0))
     order by (coalesce(t.admits_used, 0) >= coalesce(t.admits_count, 1)), t.created_at
     limit 1;
  end if;
  if v_ticket.id is null then return; end if;

  if not public.can_scan_event(v_ticket.event_id) then
    raise exception 'This pass is for an event you are not scanning' using errcode = '42501';
  end if;

  return query
    select v_ticket.id, e.title, e.image_url, e.event_date, v_ticket.tier,
           coalesce(v_ticket.admits_count, 1), coalesce(v_ticket.admits_used, 0), v_ticket.scanned_at,
           nullif(trim(split_part(trim(coalesce(p.full_name, v_ticket.guest_name, '')), ' ', 1)
             || coalesce(' ' || nullif(left(split_part(trim(coalesce(p.full_name, v_ticket.guest_name, '')), ' ', 2), 1), '') || '.', '')), ''),
           v_ticket.voided_at, v_ticket.void_reason,
           coalesce(v_ticket.source_platform, 'unihive')
      from events e
      left join profiles p on p.id = v_ticket.user_id
     where e.id = v_ticket.event_id;
end;
$$;

commit;

select slug, sell_tickets_on_unihive, jsonb_array_length(ticket_tiers) as tiers
  from public.events where slug = 'the-hive-no-going-home';
