type CatalogClient = { rpc?: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> };
function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
/** Read the hosted, published catalog under the actor's authority, never bundled/offline recipes. */
export async function readServerFoodCatalog(client: CatalogClient): Promise<Record<string, unknown>[]> {
  if (!client.rpc) throw new Error('catalog_provider_unavailable');
  const recipes: Record<string, unknown>[] = [];
  let cursor: string | null = null;
  const seen = new Set<string>();
  for (let page = 0; page < 20; page++) {
    const { data, error } = await client.rpc('list_kwilt_recipe_catalog_v2', { p_after_roster_id: cursor, p_limit: 500 });
    if (error || !Array.isArray(data)) throw new Error('catalog_read_unavailable');
    for (const value of data) {
      const projection = record(record(value)?.projection);
      const recipe = record(projection?.recipe); const version = record(projection?.currentVersion);
      const provenance = record(recipe?.provenance); const catalog = record(projection?.catalog);
      const rosterId = catalog?.rosterId;
      if (!recipe || !version || typeof recipe.id !== 'string' || typeof version.id !== 'string'
        || typeof version.title !== 'string' || !Array.isArray(version.ingredients) || !Array.isArray(version.instructions)
        || provenance?.method !== 'catalog' || provenance.rightsBasis !== 'kwilt_authored'
        || typeof rosterId !== 'string' || !/^[A-Z]{2}[0-9]{3}$/.test(rosterId) || seen.has(rosterId)) {
        throw new Error('catalog_projection_invalid');
      }
      seen.add(rosterId);
      recipes.push({ ...recipe, recipeId: recipe.id, version, catalog, ownershipKind: 'catalog' });
      cursor = rosterId;
    }
    if (data.length < 500) return recipes;
  }
  throw new Error('catalog_page_limit_exceeded');
}
