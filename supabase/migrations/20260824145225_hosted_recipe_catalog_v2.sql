-- Complete hosted Recipe catalog projection for clients that treat the database
-- as authoritative while retaining their bundled catalog as an offline fallback.

create or replace function public.list_kwilt_recipe_catalog_v2(
  p_after_roster_id text default null,
  p_limit integer default 500
)
returns table(projection jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_set(
    catalog_row.projection,
    '{currentVersion,equipmentRequirements}',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', equipment.concept_id,
          'label', equipment.label,
          'searchQuery', equipment.search_query,
          'necessity', equipment.necessity,
          'confidence', equipment.confidence,
          'evidenceText', equipment.evidence_text,
          'substitute', equipment.substitute
        )
        order by equipment.position
      )
      from public.kwilt_recipe_equipment_requirements equipment
      where equipment.recipe_version_id =
        (catalog_row.projection #>> '{currentVersion,id}')::uuid
    ), '[]'::jsonb),
    true
  ) as projection
  from public.list_kwilt_recipe_catalog(p_after_roster_id, p_limit) catalog_row;
$$;

revoke all on function public.list_kwilt_recipe_catalog_v2(text, integer) from public, anon;
grant execute on function public.list_kwilt_recipe_catalog_v2(text, integer) to authenticated;
