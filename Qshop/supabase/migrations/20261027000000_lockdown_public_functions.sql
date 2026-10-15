-- Security lockdown (applied 15 Oct 2026 after the Supabase security advisor):
-- wallet balances were readable by anyone, and money/count functions were
-- callable without signing in.
alter view public.event_wallet_balances set (security_invoker = true);
revoke all on public.event_wallet_balances from anon;
revoke insert, update, delete, truncate, references, trigger on public.event_wallet_balances from authenticated;

-- Backend-only (service role).
revoke execute on function public.wallet_topup_confirm(text, text) from public, anon, authenticated;
revoke execute on function public.fulfil_package_purchase(uuid) from public, anon, authenticated;
revoke execute on function public.increment_promo_code_usage(uuid) from public, anon, authenticated;
revoke execute on function public.increment_tickets_sold(uuid) from public, anon, authenticated;
revoke execute on function public.custom_signup_with_email(text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.tag_entitlement_partner() from public, anon, authenticated;
grant execute on function public.wallet_topup_confirm(text, text), public.fulfil_package_purchase(uuid),
  public.increment_promo_code_usage(uuid), public.increment_tickets_sold(uuid) to service_role;

-- Signed-in only.
revoke execute on function public.wallet_checkout_cart(uuid, jsonb) from public, anon;
revoke execute on function public.redeem_entitlement(uuid) from public, anon;
revoke execute on function public.lookup_entitlement(uuid) from public, anon;
revoke execute on function public.partner_set_product_active(uuid, boolean) from public, anon;
revoke execute on function public.claim_external_ticket(text, text, text) from public, anon;
grant execute on function public.wallet_checkout_cart(uuid, jsonb), public.redeem_entitlement(uuid), public.lookup_entitlement(uuid),
  public.partner_set_product_active(uuid, boolean), public.claim_external_ticket(text, text, text) to authenticated;
-- is_partner_member / can_scan_entitlement stay callable by anon: RLS policies
-- on event_products and event_entitlements use them.
