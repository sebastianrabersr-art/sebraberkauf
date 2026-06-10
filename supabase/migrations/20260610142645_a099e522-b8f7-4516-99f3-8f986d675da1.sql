CREATE TABLE public.calc_email_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  consent boolean NOT NULL DEFAULT true,
  calc_type text,
  calc_payload jsonb,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.calc_email_leads TO service_role;
ALTER TABLE public.calc_email_leads ENABLE ROW LEVEL SECURITY;
-- No policies: writes only via server function using service_role.