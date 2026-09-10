-- Storage combines every applicable bucket policy. The old Chores INSERT
-- expression called a revoked internal actor helper as the client role, which
-- rejected Home uploads before the bucket predicate could isolate the check.
-- Keep the same Chores membership/assignment rules behind a bucket-scoped API.
create function kwilt_home_private.chore_storage_access(bucket text, object_name text, writing boolean)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare occurrence_id uuid;
begin
  if bucket <> 'chore_evidence' or auth.uid() is null then return false; end if;
  begin
    occurrence_id := split_part(object_name,'/',1)::uuid;
  exception when invalid_text_representation then return false;
  end;
  return exists (
    select 1 from public.kwilt_chore_occurrences o
    join public.kwilt_chore_profiles p on p.id=o.profile_id
    where o.id=occurrence_id
      and public.kwilt_is_active_household_member(p.household_id)
      and (not writing or
        (public.kwilt_agent_household_actor(auth.uid())).role in ('owner','caregiver')
        or o.assigned_membership_id=(public.kwilt_agent_household_actor(auth.uid())).id)
  );
end;
$$;
revoke all on function kwilt_home_private.chore_storage_access(text,text,boolean) from public,anon;
grant execute on function kwilt_home_private.chore_storage_access(text,text,boolean) to authenticated;
drop policy kwilt_chore_evidence_storage_insert on storage.objects;
create policy kwilt_chore_evidence_storage_insert on storage.objects for insert to authenticated
  with check (kwilt_home_private.chore_storage_access(bucket_id,name,true));
drop policy kwilt_chore_evidence_storage_read on storage.objects;
create policy kwilt_chore_evidence_storage_read on storage.objects for select to authenticated
  using (kwilt_home_private.chore_storage_access(bucket_id,name,false));
