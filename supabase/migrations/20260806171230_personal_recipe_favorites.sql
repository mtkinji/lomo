-- A favorite is private to one person and points at either a local starter
-- recipe ref or a durable private Recipe UUID. It is deliberately not a
-- household preference or Meal Plan choice.
create table public.kwilt_recipe_favorites (
  person_id uuid not null references public.kwilt_people(id) on delete cascade,
  recipe_ref text not null check (char_length(btrim(recipe_ref)) between 1 and 200),
  created_at timestamptz not null default now(),
  primary key (person_id, recipe_ref)
);

alter table public.kwilt_recipe_favorites enable row level security;

create policy kwilt_recipe_favorites_person_read
  on public.kwilt_recipe_favorites
  for select
  to authenticated
  using (person_id = (select public.kwilt_current_person_id()));

grant select on table public.kwilt_recipe_favorites to authenticated;
revoke all on table public.kwilt_recipe_favorites from anon;

create or replace function public.set_kwilt_recipe_favorite(
  p_recipe_ref text,
  p_favorite boolean
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
  if p_favorite is null or char_length(v_recipe_ref) not between 1 and 200 then
    raise exception 'invalid_recipe_favorite';
  end if;

  select binding.person_id into v_person_id
  from public.kwilt_person_auth_bindings binding
  where binding.user_id = v_user_id
    and binding.status = 'active';

  if v_person_id is null then
    raise exception 'person_binding_required';
  end if;

  if p_favorite then
    insert into public.kwilt_recipe_favorites(person_id, recipe_ref)
    values (v_person_id, v_recipe_ref)
    on conflict (person_id, recipe_ref) do nothing;
  else
    delete from public.kwilt_recipe_favorites favorite
    where favorite.person_id = v_person_id
      and favorite.recipe_ref = v_recipe_ref;
  end if;

  return p_favorite;
end;
$$;

revoke all on function public.set_kwilt_recipe_favorite(text, boolean) from public;
revoke all on function public.set_kwilt_recipe_favorite(text, boolean) from anon;
grant execute on function public.set_kwilt_recipe_favorite(text, boolean) to authenticated;
