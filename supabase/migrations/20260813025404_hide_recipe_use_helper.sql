-- This helper exists only for capability-owned SECURITY DEFINER functions.
-- It is not part of the authenticated Data API.
revoke all on function public.kwilt_can_use_recipe_version(uuid, uuid)
  from public, anon, authenticated;
