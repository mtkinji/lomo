-- Kwilt: backfill install ↔ identity history from current install associations.
--
-- This is best-effort and only captures the latest mapping (whatever is currently stored
-- on `kwilt_installs`). Going forward, `/pro-codes/ping` will accumulate history.

insert into public.kwilt_install_identities (
  install_id,
  identity_key,
  user_id,
  user_email,
  first_seen_at,
  last_seen_at
)
select
  i.install_id,
  case
    when i.user_id is not null then 'user:' || i.user_id::text
    when i.user_email is not null then 'email:' || lower(i.user_email)
    else null
  end as identity_key,
  i.user_id,
  i.user_email,
  i.created_at,
  i.last_seen_at
from public.kwilt_installs i
where (i.user_id is not null or i.user_email is not null)
  and i.install_id is not null
on conflict (install_id, identity_key) do update
set
  user_id = excluded.user_id,
  user_email = excluded.user_email,
  last_seen_at = greatest(public.kwilt_install_identities.last_seen_at, excluded.last_seen_at);


