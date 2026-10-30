-- Tickets were readable by anyone ("Public can verify tickets by token" used
-- `true`), exposing every ticket's entry token, phone, email and M-Pesa
-- receipt. /verify-ticket now looks up a single ticket by its token through
-- get_ticket_by_token; staff use lookup_event_ticket / admit_ticket; owners
-- keep "Users can view own tickets" and "claimers read their claimed tickets".
--
-- Run step 1, deploy the website, then run step 2. Running step 2 first
-- makes the old /verify-ticket page show "Invalid ticket".

-- Step 1
create or replace function public.get_ticket_by_token(p_token uuid)
returns table (
  id uuid, event_id uuid, ticket_token uuid, tier text,
  admits_count integer, admits_used integer, scanned boolean,
  scanned_at timestamptz, holder_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, t.event_id, t.ticket_token, t.tier,
         coalesce(t.admits_count, 1), coalesce(t.admits_used, 0),
         coalesce(t.scanned, false), t.scanned_at,
         coalesce(nullif(trim(p.full_name), ''), t.guest_name)
    from public.event_tickets t
    left join public.profiles p on p.id = t.user_id
   where t.ticket_token = p_token and t.payment_status = 'completed';
$$;
revoke execute on function public.get_ticket_by_token(uuid) from public;
grant execute on function public.get_ticket_by_token(uuid) to anon, authenticated;

-- Step 2
drop policy if exists "Public can verify tickets by token" on public.event_tickets;
