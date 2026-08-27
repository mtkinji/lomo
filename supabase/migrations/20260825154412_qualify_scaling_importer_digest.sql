-- The importer has an empty search_path, so pgcrypto functions must be schema-qualified.
do $$
declare
  v_definition text;
  v_corrected text;
begin
  select pg_catalog.pg_get_functiondef(
    'public.import_kwilt_recipe_catalog_source(uuid,jsonb)'::regprocedure
  ) into v_definition;
  if position('extensions.digest(' in v_definition) = 0 then
    v_corrected := replace(v_definition, 'encode(digest(', 'encode(extensions.digest(');
    if v_corrected = v_definition then
      raise exception 'scaling_importer_digest_call_not_found';
    end if;
    execute v_corrected;
  end if;
end;
$$;
