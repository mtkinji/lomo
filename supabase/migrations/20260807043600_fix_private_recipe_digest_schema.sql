-- pgcrypto is installed in Supabase's extensions schema. The original
-- security-definer function used an empty search path, so its unqualified
-- digest call could not resolve in deployed projects.
alter function public.save_kwilt_recipe(uuid, integer, text, jsonb)
  set search_path = pg_catalog, extensions;
