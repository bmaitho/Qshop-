-- Every profile's phone and email were readable by anyone ("Users can view
-- basic profile info of others" uses true), including ~290 people who are
-- not sellers. Now:
--   * sellers' phone/email stay public as business contacts, through the
--     generated columns public_phone / public_email;
--   * your own full profile comes from the my_profile view;
--   * anyone else's phone/email come from profile_contacts(), which only
--     reveals them to the person themselves, staff/admins, buyer<->seller
--     on a shared order or booking, or people who have messaged you.
-- Run STEP 1, deploy the website release that reads these, then run STEP 2.
-- NOTE: new profiles columns must be added to the column grant in step 2.

-- ── STEP 1 (safe any time: only adds things) ───────────────────────────
begin;

alter table public.profiles
  add column if not exists public_phone text generated always as (case when is_seller then phone end) stored,
  add column if not exists public_email text generated always as (case when is_seller then email end) stored;

-- Your own row, every column.
create or replace view public.my_profile with (security_invoker = false) as
  select * from public.profiles where id = auth.uid();
revoke all on public.my_profile from public, anon, authenticated;
grant select on public.my_profile to authenticated;

create or replace function public.profile_contacts(p_ids uuid[])
returns table (id uuid, full_name text, email text, phone text, campus_location text, is_seller boolean)
language sql stable security definer set search_path = '' as $$
  select p.id, p.full_name,
         case when ok.allowed then p.email end,
         case when ok.allowed then p.phone end,
         p.campus_location, p.is_seller
    from public.profiles p
    cross join lateral (
      select (
        p.id = auth.uid()
        or coalesce(p.is_seller, false)
        or coalesce((select me.is_admin or me.is_staff from public.profiles me where me.id = auth.uid()), false)
        or exists (select 1 from public.order_items oi
                    where (oi.buyer_user_id = auth.uid() and oi.seller_id = p.id)
                       or (oi.seller_id = auth.uid() and oi.buyer_user_id = p.id))
        or exists (select 1 from public.user_service_bookings b
                    where (b.buyer_id = auth.uid() and b.seller_id = p.id)
                       or (b.seller_id = auth.uid() and b.buyer_id = p.id))
        or exists (select 1 from public.messages m
                    where m.sender_id = p.id and m.recipient_id = auth.uid())
      ) as allowed
    ) ok
   where auth.uid() is not null and p.id = any (p_ids) and cardinality(p_ids) <= 200;
$$;
revoke execute on function public.profile_contacts(uuid[]) from public, anon;
grant execute on function public.profile_contacts(uuid[]) to authenticated;

commit;

-- ── STEP 2 (after the website release is live): hide phone/email ──────
begin;

revoke select on public.profiles from anon, authenticated;
grant select (id, full_name, campus_location, is_seller, created_at, updated_at, campus_location_id,
              seller_type, is_admin, tutorial_completed, tutorial_progress, has_physical_shop,
              shop_and_campus, is_staff, terms_version, terms_accepted_at, marketing_opt_out,
              public_phone, public_email)
  on public.profiles to anon, authenticated;

commit;
