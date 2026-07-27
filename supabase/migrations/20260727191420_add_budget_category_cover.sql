alter table public.budget_categories
  add column if not exists cover_image jsonb;

alter table public.budget_categories
  drop constraint if exists budget_categories_cover_image_check;
alter table public.budget_categories
  add constraint budget_categories_cover_image_check
  check (
    cover_image is null
    or (
      jsonb_typeof(cover_image) = 'object'
      and cover_image ?& array[
        'source', 'photoId', 'imageUrl', 'photographerName',
        'photographerUrl', 'sourceUrl', 'color'
      ]
      and cover_image - 'source' - 'photoId' - 'imageUrl' - 'photographerName'
        - 'photographerUrl' - 'sourceUrl' - 'color' = '{}'::jsonb
      and cover_image ->> 'source' = 'unsplash'
      and jsonb_typeof(cover_image -> 'photoId') = 'string'
      and length(trim(cover_image ->> 'photoId')) > 0
      and jsonb_typeof(cover_image -> 'imageUrl') = 'string'
      and jsonb_typeof(cover_image -> 'photographerName') = 'string'
      and length(trim(cover_image ->> 'photographerName')) > 0
      and jsonb_typeof(cover_image -> 'photographerUrl') = 'string'
      and jsonb_typeof(cover_image -> 'sourceUrl') = 'string'
      and (
        jsonb_typeof(cover_image -> 'color') = 'null'
        or jsonb_typeof(cover_image -> 'color') = 'string'
      )
      and octet_length(cover_image::text) <= 4096
    )
  );

create or replace function public.set_budget_category_cover(
  p_category_id uuid,
  p_cover jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_confirmed_category_id uuid;
  v_confirmed_at timestamptz := clock_timestamp();
begin
  if v_user_id is null then
    raise exception 'Sign in to update a Money category cover.' using errcode = '42501';
  end if;

  update public.budget_categories
  set cover_image = p_cover
  where id = p_category_id
    and user_id = v_user_id
    and status = 'active'
  returning id into v_confirmed_category_id;

  if v_confirmed_category_id is null then
    raise exception 'The Money category cover could not be updated.' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'category_id', v_confirmed_category_id,
    'cover', p_cover,
    'updated_at', v_confirmed_at
  );
end;
$$;

revoke execute on function public.set_budget_category_cover(uuid, jsonb) from public, anon;
grant execute on function public.set_budget_category_cover(uuid, jsonb) to authenticated;
