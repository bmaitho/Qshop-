-- Admins (profiles.is_admin) see and operate every partner dashboard:
-- sales, redemptions, stock switches and scanning for any brand.
create or replace function public.is_partner_member(p_partner_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from event_partner_members where partner_id = p_partner_id and user_id = auth.uid())
      or coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

-- Master account(s).
update public.profiles set is_admin = true
where id in (select id from auth.users where lower(email) in ('bmaitho@gmail.com'));
