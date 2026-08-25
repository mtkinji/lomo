-- User-created categories start as flexible unless they later choose
-- Protected in category settings. Persist that choice in the same transaction
-- as the category and plan so name-based mapping cannot silently change it.
create or replace function public.create_budget_category_with_plan(
  p_name text,
  p_budget_cents integer,
  p_icon_key text default 'custom'::text,
  p_description text default null::text,
  p_accent_color text default '#315545'::text
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
    category_id, user_id, cadence, base_budget_cents, forecast_mode, plan_role, status
  ) values (
    v_category_id, auth.uid(), 'monthly', p_budget_cents, 'paced', 'flexible', 'active'
  );

  return v_budget_id;
end;
$$;

-- The RPC's generated ids end in eight hexadecimal characters and are stored
-- in both slug columns. Limit the repair to that shape and never replace an
-- explicit customer selection.
update public.budget_plans plan
set plan_role = 'flexible'
from public.budget_categories category
where plan.category_id = category.id
  and plan.user_id = category.user_id
  and plan.status = 'active'
  and plan.plan_role is null
  and category.status = 'active'
  and category.creation_provenance = 'legacy'
  and category.slug = category.legacy_budget_id
  and category.slug ~ '-[0-9a-f]{8}$';
