alter table public.kwilt_household_devices
  drop constraint personal_child_requires_child;

alter table public.kwilt_household_devices
  add constraint personal_child_requires_child check (
    device_kind <> 'personal_child'
    or (
      child_membership_id is not null
      and assigned_caregiver_membership_id is null
      and (
        (status = 'revoked' and credential_hash is null)
        or (status <> 'revoked' and credential_hash is not null)
      )
    )
  );
