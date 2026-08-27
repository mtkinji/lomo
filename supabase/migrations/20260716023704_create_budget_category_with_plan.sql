create or replace function public.create_budget_category_with_plan(
  p_name text,
  p_budget_cents integer,
  p_icon_key text default 'custom',
  p_description text default null,
  p_accent_color text default '#315545'
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_category_id uuid;
  v_budget_id text;
  v_slug_base text;
begin
  if auth.uid() is null then
    raise exception 'Sign in before creating a category.';
  end if;
  if length(trim(coalesce(p_name, ''))) = 0 then
    raise exception 'Category name is required.';
  end if;
  if p_budget_cents is null or p_budget_cents < 0 then
    raise exception 'Budget amount must be zero or greater.';
  end if;

  v_slug_base := trim(both '-' from regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g'));
  if v_slug_base = '' then
    v_slug_base := 'category';
  end if;
  v_budget_id := v_slug_base || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

  insert into public.budget_categories (
    user_id, slug, legacy_budget_id, name, icon_key, description, accent_color, status
  ) values (
    auth.uid(), v_budget_id, v_budget_id, trim(p_name), nullif(trim(p_icon_key), ''),
    nullif(trim(p_description), ''), nullif(trim(p_accent_color), ''), 'active'
  )
  returning id into v_category_id;

  insert into public.budget_plans (
    category_id, user_id, cadence, base_budget_cents, forecast_mode, status
  ) values (
    v_category_id, auth.uid(), 'monthly', p_budget_cents, 'paced', 'active'
  );

  return v_budget_id;
end;
$$;

revoke all on function public.create_budget_category_with_plan(text, integer, text, text, text) from public, anon;
grant execute on function public.create_budget_category_with_plan(text, integer, text, text, text) to authenticated;;
