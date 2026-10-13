-- The Buzz: periodic UniHive emails to registered users.
-- Opt-out per user; campaigns and per-recipient sends are server-only
-- (RLS on, no policies — the backend uses the service role).

alter table public.profiles add column if not exists marketing_opt_out boolean not null default false;

create table if not exists public.buzz_campaigns (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'draft' check (status in ('draft', 'approved', 'sending', 'sent', 'discarded')),
  subject text not null,
  preheader text,
  content jsonb not null,          -- the written issue (sections, links)
  data jsonb,                      -- the facts it was written from
  written_by text,                 -- 'claude' or 'template'
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  sent_count int not null default 0,
  finished_at timestamptz
);
alter table public.buzz_campaigns enable row level security;

create table if not exists public.buzz_sends (
  campaign_id uuid not null references public.buzz_campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  sent_at timestamptz not null default now(),
  status text not null default 'sent',
  primary key (campaign_id, user_id)
);
alter table public.buzz_sends enable row level security;
