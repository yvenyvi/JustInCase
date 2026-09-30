-- Let authenticated users persist their own terms acceptance without granting
-- general UPDATE access to rows in public.users.
CREATE OR REPLACE FUNCTION public.accept_terms()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  acceptance_time timestamptz := pg_catalog.now();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.users
  SET terms_accepted_at = acceptance_time
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN acceptance_time;
END;
$function$;

REVOKE ALL ON FUNCTION public.accept_terms() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_terms() TO authenticated;
