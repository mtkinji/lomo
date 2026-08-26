-- The HEART aggregate reads auth.users, which is intentionally unavailable to
-- ordinary Data API roles. Run it with the function owner's privileges while
-- keeping EXECUTE restricted to service_role (revocations live in the prior
-- migration) and retaining the empty search_path defense.

alter function public.kwilt_heart_report(uuid[], text[], timestamptz)
  security definer;
