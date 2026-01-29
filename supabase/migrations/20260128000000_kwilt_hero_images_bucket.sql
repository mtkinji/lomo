-- Kwilt: Hero images storage bucket (private).
--
-- Notes:
-- - This bucket is used for Arc/Goal/Activity hero images that originate from user uploads.
-- - Objects are accessed via signed URLs brokered by Edge Functions (no direct client policies).

-- Storage buckets are represented in `storage.buckets`.
-- `public = false` => private bucket (requires signed URLs / policies).
insert into storage.buckets (id, name, public)
values ('hero_images', 'hero_images', false)
on conflict (id) do nothing;


