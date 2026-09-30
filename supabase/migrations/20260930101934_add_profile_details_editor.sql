-- Let an authenticated user edit ordinary profile details without exposing
-- identity-document or verification fields to the mobile client.
CREATE OR REPLACE FUNCTION public.users_update_own_profile_details(p_details jsonb)
RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_user public.users;
  allowed_keys text[] := ARRAY[
    'first_name', 'middle_name', 'last_name', 'suffix', 'date_of_birth',
    'phone_number', 'region', 'province', 'city_municipality', 'barangay',
    'street_address', 'firm_name'
  ];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_details IS NULL OR jsonb_typeof(p_details) <> 'object' THEN
    RAISE EXCEPTION 'Profile details must be an object';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(p_details) AS keys(field) WHERE field <> ALL(allowed_keys)) THEN
    RAISE EXCEPTION 'One or more profile fields cannot be edited here';
  END IF;
  IF p_details ? 'first_name' AND length(btrim(coalesce(p_details->>'first_name', ''))) = 0 THEN
    RAISE EXCEPTION 'First name is required';
  END IF;
  IF p_details ? 'last_name' AND length(btrim(coalesce(p_details->>'last_name', ''))) = 0 THEN
    RAISE EXCEPTION 'Last name is required';
  END IF;
  IF p_details ? 'firm_name' AND NOT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Volunteer Attorney'
  ) THEN
    RAISE EXCEPTION 'Law firm details are only editable for attorney accounts';
  END IF;
  IF p_details ? 'date_of_birth' AND nullif(btrim(p_details->>'date_of_birth'), '') IS NOT NULL
     AND (p_details->>'date_of_birth')::date > CURRENT_DATE THEN
    RAISE EXCEPTION 'Date of birth cannot be in the future';
  END IF;

  UPDATE public.users
  SET first_name = CASE WHEN p_details ? 'first_name' THEN btrim(p_details->>'first_name') ELSE first_name END,
      middle_name = CASE WHEN p_details ? 'middle_name' THEN nullif(btrim(p_details->>'middle_name'), '') ELSE middle_name END,
      last_name = CASE WHEN p_details ? 'last_name' THEN btrim(p_details->>'last_name') ELSE last_name END,
      suffix = CASE WHEN p_details ? 'suffix' THEN nullif(btrim(p_details->>'suffix'), '') ELSE suffix END,
      date_of_birth = CASE WHEN p_details ? 'date_of_birth' THEN nullif(btrim(p_details->>'date_of_birth'), '')::date ELSE date_of_birth END,
      phone_number = CASE WHEN p_details ? 'phone_number' THEN nullif(btrim(p_details->>'phone_number'), '') ELSE phone_number END,
      region = CASE WHEN p_details ? 'region' THEN nullif(btrim(p_details->>'region'), '') ELSE region END,
      province = CASE WHEN p_details ? 'province' THEN nullif(btrim(p_details->>'province'), '') ELSE province END,
      city_municipality = CASE WHEN p_details ? 'city_municipality' THEN nullif(btrim(p_details->>'city_municipality'), '') ELSE city_municipality END,
      barangay = CASE WHEN p_details ? 'barangay' THEN nullif(btrim(p_details->>'barangay'), '') ELSE barangay END,
      street_address = CASE WHEN p_details ? 'street_address' THEN nullif(btrim(p_details->>'street_address'), '') ELSE street_address END,
      firm_name = CASE WHEN p_details ? 'firm_name' THEN nullif(btrim(p_details->>'firm_name'), '') ELSE firm_name END,
      updated_at = now()
  WHERE id = auth.uid()
  RETURNING * INTO updated_user;

  IF updated_user.id IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;
  RETURN updated_user;
END;
$$;

REVOKE ALL ON FUNCTION public.users_update_own_profile_details(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.users_update_own_profile_details(jsonb) TO authenticated;
