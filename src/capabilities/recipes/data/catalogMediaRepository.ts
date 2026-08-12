import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import { parseHostedCatalogMediaRows, type HostedCatalogMedia } from './catalogMediaOverlay';

export type CatalogMediaRepository = { list(): Promise<HostedCatalogMedia[]> };

export function createCatalogMediaRepository(client: SupabaseClient = getSupabaseClient()): CatalogMediaRepository {
  return {
    async list() {
      const { data, error } = await client.rpc('list_kwilt_recipe_catalog', { p_after_roster_id: null, p_limit: 500 });
      if (error) throw new Error(error.message || 'Hosted Recipe artwork unavailable');
      return parseHostedCatalogMediaRows(data ?? []);
    },
  };
}
