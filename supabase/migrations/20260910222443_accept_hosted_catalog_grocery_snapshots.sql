-- Hosted catalog projections use SHA-256 content hashes; bundled snapshots
-- retain their kwilt:<roster>:v<version> identifiers. Preserve both formats in
-- the remaining SQL persistence checks, along with all existing ownership,
-- version, ingredient-provenance, and idempotency checks and function grants.
do $migration$
declare
  target record;
  definition text;
begin
  for target in select * from (values
    (
      'public.compile_kwilt_grocery_list(uuid,integer,text,jsonb,uuid,integer)',
      $old$entry.recipe_snapshot->>'contentHash' like 'kwilt:%:v%'$old$,
      $new$(entry.recipe_snapshot->>'contentHash' like 'kwilt:%:v%' or entry.recipe_snapshot->>'contentHash' ~ '^sha256:[0-9a-f]{64}$')$new$
    ),
    (
      'public.compile_kwilt_recipe_grocery_list(jsonb,text,jsonb)',
      $old$p_recipe_source->>'contentHash' !~ '^kwilt:[A-Z0-9-]+:v[0-9]+$'$old$,
      $new$p_recipe_source->>'contentHash' !~ '^(kwilt:[A-Z0-9-]+:v[0-9]+|sha256:[0-9a-f]{64})$'$new$
    )
  ) as replacements(signature, old_check, new_check)
  loop
    definition := pg_get_functiondef(target.signature::regprocedure);
    if position(target.old_check in definition) = 0 then
      raise exception 'Grocery catalog validation changed in %; review before applying', target.signature;
    end if;
    execute replace(definition, target.old_check, target.new_check);
  end loop;
end;
$migration$;
