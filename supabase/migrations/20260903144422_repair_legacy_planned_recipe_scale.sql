-- Before candidate-level scale intent was persisted, a sent Recipe with a
-- physical yield (for example, slices) was compiled as one recipe batch.
-- Preserve that historic choice explicitly so later Plan edits can safely
-- recompile the full Grocery list.
update public.kwilt_meal_plan_candidates
set recipe_snapshot=jsonb_set(recipe_snapshot,'{recipeScaleMultiplier}',to_jsonb(1),true)
where lifecycle_state='sent'
  and recipe_snapshot ? 'selectedServings'
  and not (recipe_snapshot ? 'recipeScaleMultiplier')
  and coalesce(recipe_snapshot->>'yieldUnit','')<>'servings';
