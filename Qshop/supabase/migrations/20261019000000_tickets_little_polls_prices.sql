-- 1) Per-event Little Events ticket link (all paid ticketing lives on Little).
alter table public.events add column if not exists ticket_url text;
update public.events set ticket_url = 'https://apps.little.africa/events/the-hive-no-going-home-'
where slug = 'the-hive-no-going-home';

-- 2) Red Bull Vodka doesn't exist yet: take it off sale.
update public.event_products set active = false where name = 'Red Bull Vodka';

-- 3) Smirnoff Ice prices from current online retail listings (per 330ml can).
update public.event_products set price = 230 where name = 'Smirnoff Ice Black';
update public.event_products set price = 230 where name = 'Smirnoff Ice Double Black Guarana';
update public.event_products set price = 210 where name = 'Smirnoff Ice Pineapple Punch';

-- 4) Audience polls ("Y'all want Red Bull to release a vodka?"). One vote per account.
create table if not exists public.hive_poll_votes (
  poll text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  choice text not null check (choice in ('yes', 'no')),
  created_at timestamptz not null default now(),
  primary key (poll, user_id)
);
alter table public.hive_poll_votes enable row level security;
drop policy if exists "vote as yourself" on public.hive_poll_votes;
create policy "vote as yourself" on public.hive_poll_votes
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "change your vote" on public.hive_poll_votes;
create policy "change your vote" on public.hive_poll_votes
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "see your vote" on public.hive_poll_votes;
create policy "see your vote" on public.hive_poll_votes
  for select to authenticated using (user_id = auth.uid());

create or replace function public.hive_poll_counts(p_poll text)
returns table (yes bigint, no bigint)
language sql stable security definer set search_path to 'public' as $$
  select count(*) filter (where choice = 'yes'), count(*) filter (where choice = 'no')
  from hive_poll_votes where poll = p_poll;
$$;
grant execute on function public.hive_poll_counts(text) to anon, authenticated;
