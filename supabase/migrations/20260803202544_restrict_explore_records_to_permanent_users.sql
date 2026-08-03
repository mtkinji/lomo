create policy "Explore history requires a permanent user"
on public.explore_records
as restrictive for all
to authenticated
using (((select (auth.jwt()->>'is_anonymous')::boolean) is false))
with check (((select (auth.jwt()->>'is_anonymous')::boolean) is false));
