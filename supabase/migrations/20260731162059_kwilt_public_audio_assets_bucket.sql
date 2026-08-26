-- Kwilt: public, immutable audio assets.
--
-- This bucket contains only product-owned generated music and effects. It has
-- no user data and no client write policies. Public reads allow native players
-- to use stable CDN URLs without shipping credentials or expiring signatures.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'audio_assets',
  'audio_assets',
  true,
  10485760,
  array['audio/mpeg']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
