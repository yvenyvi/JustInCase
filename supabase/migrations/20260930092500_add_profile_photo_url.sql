ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

-- Preserve existing avatars while keeping the verification selfie field intact.
UPDATE public.users
SET profile_photo_url = selfie_url
WHERE profile_photo_url IS NULL
  AND selfie_url IS NOT NULL;

CREATE OR REPLACE FUNCTION public.users_set_own_profile_photo(
  p_profile_photo_url TEXT
)
RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_user public.users;
BEGIN
  UPDATE public.users
  SET profile_photo_url = p_profile_photo_url,
      updated_at = now()
  WHERE id = auth.uid()
  RETURNING * INTO updated_user;

  RETURN updated_user;
END;
$$;

REVOKE ALL ON FUNCTION public.users_set_own_profile_photo(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.users_set_own_profile_photo(TEXT) TO authenticated;
