-- Project defaults may grant SELECT to anon on new public tables. RLS already
-- denies anon rows, but the capability contract also removes the table grant.
revoke all on table public.kwilt_meal_candidate_reactions from public, anon;
grant select on table public.kwilt_meal_candidate_reactions to authenticated;
