-- Immobilien-Limit pro Plan serverseitig durchsetzen.
-- Der Client prüft bereits vor dem Anlegen (usePropertyLimit); dieser Trigger verhindert,
-- dass das Limit über andere Wege (z. B. direkte API-Aufrufe) umgangen wird.
--
-- Regeln:
--  * Updates bestehender Zeilen sind immer erlaubt (cloud-sync nutzt upsert, BEFORE INSERT feuert
--    dabei auch für bereits vorhandene IDs). Auch nach einem Downgrade bleibt Bearbeiten möglich.
--  * Demo-Objekte zählen nicht gegen das Limit, sind aber auf 3 pro Konto begrenzt
--    (so viele legt die App als Beispiel an).
--  * property_limit NULL = unbegrenzt. Fehlt die Abo-Zeile, gilt das Free-Limit 1.

CREATE OR REPLACE FUNCTION public.enforce_property_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lim integer;
  cnt integer;
BEGIN
  IF EXISTS (SELECT 1 FROM public.properties WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  IF NEW.is_demo THEN
    SELECT count(*) INTO cnt FROM public.properties WHERE user_id = NEW.user_id AND is_demo;
    IF cnt >= 3 THEN
      RAISE EXCEPTION 'property_limit_reached' USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;

  SELECT property_limit INTO lim FROM public.subscriptions WHERE user_id = NEW.user_id;
  IF NOT FOUND THEN
    lim := 1;
  ELSIF lim IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO cnt FROM public.properties WHERE user_id = NEW.user_id AND NOT is_demo;
  IF cnt >= lim THEN
    RAISE EXCEPTION 'property_limit_reached' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_property_limit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_properties_enforce_limit ON public.properties;
CREATE TRIGGER trg_properties_enforce_limit
  BEFORE INSERT ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.enforce_property_limit();
