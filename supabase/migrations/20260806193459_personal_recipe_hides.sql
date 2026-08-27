-- A hide is a private, reversible presentation preference for one person.
-- It may point at a bundled catalog ref or a durable Recipe UUID and does not
-- remove, archive, or change the underlying Recipe for anyone else.
create table public.kwilt_hidden_recipes (
  person_id uuid not null references public.kwilt_people(id) on delete cascade,
  recipe_ref text not null check (char_length(btrim(recipe_ref)) between 1 and 200),
  created_at timestamptz not null default now(),
  primary key (person_id, recipe_ref)
);

alter table public.kwilt_hidden_recipes enable row level security;

create policy kwilt_hidden_recipes_person_read
  on public.kwilt_hidden_recipes
  for select
  to authenticated
  using (person_id = (select public.kwilt_current_person_id()));

grant select on table public.kwilt_hidden_recipes to authenticated;
revoke all on table public.kwilt_hidden_recipes from anon;

create or replace function public.set_kwilt_recipe_hidden(
  p_recipe_ref text,
  p_hidden boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.kwilt_require_permanent_user();
  v_person_id uuid;
  v_recipe_ref text := btrim(p_recipe_ref);
begin
  if p_hidden is null or v_recipe_ref is null or char_length(v_recipe_ref) not between 1 and 200 then
    raise exception 'invalid_hidden_recipe';
  end if;

  select binding.person_id into v_person_id
  from public.kwilt_person_auth_bindings binding
  where binding.user_id = v_user_id
    and binding.status = 'active';

  if v_person_id is null then
    raise exception 'person_binding_required';
  end if;

  if p_hidden then
    insert into public.kwilt_hidden_recipes(person_id, recipe_ref)
    values (v_person_id, v_recipe_ref)
    on conflict (person_id, recipe_ref) do nothing;
  else
    delete from public.kwilt_hidden_recipes hidden
    where hidden.person_id = v_person_id
      and hidden.recipe_ref = v_recipe_ref;
  end if;

  return p_hidden;
end;
$$;

revoke all on function public.set_kwilt_recipe_hidden(text, boolean) from public;
revoke all on function public.set_kwilt_recipe_hidden(text, boolean) from anon;
grant execute on function public.set_kwilt_recipe_hidden(text, boolean) to authenticated;
