create or replace function public.reorder_budget_categories(
  p_category_ids uuid[]
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_active_ids uuid[];
  v_confirmed_at timestamptz := clock_timestamp();
begin
  if v_user_id is null then
    raise exception 'Sign in to reorder Money categories.' using errcode = '42501';
  end if;

  if coalesce(cardinality(p_category_ids), 0) = 0
    or exists (select 1 from unnest(p_category_ids) as input(category_id) where input.category_id is null)
    or (select count(distinct input.category_id) from unnest(p_category_ids) as input(category_id)) <> cardinality(p_category_ids)
  then
    raise exception 'category_order_must_contain_each_category_once' using errcode = '22023';
  end if;

  perform 1
  from public.budget_categories
  where user_id = v_user_id
    and status = 'active'
  order by id
  for update;

  select coalesce(array_agg(id order by sort_order, id), '{}'::uuid[])
  into v_active_ids
  from public.budget_categories
  where user_id = v_user_id
    and status = 'active';

  if cardinality(v_active_ids) <> cardinality(p_category_ids)
    or exists (
      select input.category_id from unnest(p_category_ids) as input(category_id)
      except
      select active.category_id from unnest(v_active_ids) as active(category_id)
    )
  then
    raise exception 'category_order_must_match_active_categories' using errcode = '22023';
  end if;

  if v_active_ids = p_category_ids then
    return jsonb_build_object(
      'category_ids', to_jsonb(p_category_ids),
      'updated_at', v_confirmed_at
    );
  end if;

  update public.budget_categories as category
  set sort_order = (ordered.ordinality - 1)::integer
  from unnest(p_category_ids) with ordinality as ordered(category_id, ordinality)
  where category.id = ordered.category_id
    and category.user_id = v_user_id
    and category.status = 'active';

  return jsonb_build_object(
    'category_ids', to_jsonb(p_category_ids),
    'updated_at', v_confirmed_at
  );
end;
$$;

revoke execute on function public.reorder_budget_categories(uuid[]) from public, anon;
grant execute on function public.reorder_budget_categories(uuid[]) to authenticated;
