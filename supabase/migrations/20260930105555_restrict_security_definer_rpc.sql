-- Restrict SECURITY DEFINER entry points to the roles and callers that need them.

-- These helpers are used by authenticated-user RLS policies. They are not
-- callable by anonymous users, and PUBLIC must not inherit execution rights.
REVOKE ALL ON FUNCTION public.get_my_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
REVOKE ALL ON FUNCTION public.is_case_participant(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_case_participant(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.is_thread_participant(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_thread_participant(uuid) TO authenticated;

-- Trigger-only helpers do not need direct RPC execution grants.
REVOKE ALL ON FUNCTION public.handle_auth_user_insert() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.trigger_notify_on_case_status() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.trigger_notify_on_message() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.trigger_notify_on_pro_bono_log() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.update_thread_updated_at() FROM PUBLIC, anon, authenticated, service_role;

-- This maintenance function is reserved for trusted server-side scheduling.
REVOKE ALL ON FUNCTION public.escalate_timed_out_cases() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.escalate_timed_out_cases() TO service_role;

-- Profile mutation RPCs are authenticated-only.
REVOKE ALL ON FUNCTION public.users_set_own_profile_photo(text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.users_set_own_profile_photo(text) TO authenticated;
REVOKE ALL ON FUNCTION public.users_update_own_profile_details(jsonb) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.users_update_own_profile_details(jsonb) TO authenticated;

-- Replace the broad profile setter (which also accepted identity/selfie fields)
-- with the narrow attorney-expertise operation that the mobile app requires.
REVOKE ALL ON FUNCTION public.users_update_own_profile(
  text, text, text, text, date, text, text, text, text, text, text, text, text, text[]
) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.users_update_own_expertise(p_expertise text[])
RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_user public.users;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'Volunteer Attorney'
  ) THEN
    RAISE EXCEPTION 'Only attorney accounts can update legal expertise';
  END IF;
  IF p_expertise IS NULL OR cardinality(p_expertise) = 0 THEN
    RAISE EXCEPTION 'Select at least one area of expertise';
  END IF;

  UPDATE public.users
  SET expertise = p_expertise, updated_at = now()
  WHERE id = auth.uid()
  RETURNING * INTO updated_user;
  RETURN updated_user;
END;
$$;
REVOKE ALL ON FUNCTION public.users_update_own_expertise(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.users_update_own_expertise(text[]) TO authenticated;
