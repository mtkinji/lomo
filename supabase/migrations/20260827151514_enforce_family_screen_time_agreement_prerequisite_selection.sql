-- Agreements may refer to a prerequisite saved selection inside their JSON rule.
-- Keep that reference inside the same child subject and reject revoked selections
-- at the authoritative table boundary, regardless of which RPC performs the write.

create or replace function public.validate_kwilt_family_screen_time_agreement_prerequisite()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prerequisite_id_text text;
  v_prerequisite_id uuid;
begin
  if new.active and new.rule ? 'prerequisiteActivity' then
    if jsonb_typeof(new.rule -> 'prerequisiteActivity') <> 'object' then
      raise exception 'invalid_family_screen_time_prerequisite_selection';
    end if;

    v_prerequisite_id_text := nullif(trim(new.rule #>> '{prerequisiteActivity,selectionId}'), '');
    if v_prerequisite_id_text is null
      or v_prerequisite_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then
      raise exception 'invalid_family_screen_time_prerequisite_selection';
    end if;
    v_prerequisite_id := v_prerequisite_id_text::uuid;

    if v_prerequisite_id = new.selection_id then
      raise exception 'prerequisite_selection_matches_target';
    end if;

    if not exists (
      select 1
      from public.kwilt_family_screen_time_selections prerequisite
      where prerequisite.id = v_prerequisite_id
        and prerequisite.subject_id = new.subject_id
        and prerequisite.status = 'active'
    ) then
      raise exception 'prerequisite_selection_subject_mismatch';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists validate_kwilt_family_screen_time_agreement_prerequisite
  on public.kwilt_family_screen_time_agreements;
create trigger validate_kwilt_family_screen_time_agreement_prerequisite
before insert or update of subject_id, rule, active
on public.kwilt_family_screen_time_agreements
for each row execute function public.validate_kwilt_family_screen_time_agreement_prerequisite();

revoke all on function public.validate_kwilt_family_screen_time_agreement_prerequisite() from public, anon, authenticated;
