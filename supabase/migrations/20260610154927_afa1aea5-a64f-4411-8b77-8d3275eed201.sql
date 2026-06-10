-- Remove privilege escalation: users must not modify their own subscription plan/limits.
-- Subscription writes happen only via the Stripe webhook using service_role (which bypasses RLS).
DROP POLICY IF EXISTS "Users update own subscription" ON public.subscriptions;

-- calc_email_leads is written exclusively by a server function using the service role.
-- Lock down Data API access for anon/authenticated so the table cannot be reached from clients,
-- regardless of any future RLS policy mistakes. service_role keeps full access.
REVOKE ALL ON public.calc_email_leads FROM anon, authenticated;
GRANT ALL ON public.calc_email_leads TO service_role;