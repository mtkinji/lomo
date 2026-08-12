-- Kwilt: public, immutable Focus-environment video assets.
--
-- This bucket contains only product-owned scenic video. It has no user data
-- and no client write policies. Public reads allow Expo Video to use stable
-- CDN URLs without shipping credentials or expiring signatures.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'focus_environment_assets',
  'focus_environment_assets',
  true,
  26214400,
  array['video/mp4']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
