import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseClient } from '../../services/backend/supabaseClient';
import { parseSharedHomeRow } from './sharedHomePresentation';
import type { SharedHomeDelivery } from './sharedHomeTypes';

const TABLE = 'kwilt_shared_deliveries';
const COLUMNS = [
  'id',
  'event_kind',
  'source_capability',
  'source_entity_type',
  'source_entity_id',
  'actor_display_name',
  'title',
  'body',
  'destination',
  'state',
  'settled_reason',
  'created_at',
  'updated_at',
  'settled_at',
  'expires_at',
  'retain_until',
].join(', ');

export function createSharedHomeRepository(client: SupabaseClient) {
  return {
    async list(now = new Date()): Promise<SharedHomeDelivery[]> {
      const { data, error } = await client
        .from(TABLE)
        .select(COLUMNS)
        .gt('retain_until', now.toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw new Error(error.message || 'Unable to load shared activity.');
      return (data ?? [])
        .map((value) => parseSharedHomeRow(value, now))
        .filter((value): value is SharedHomeDelivery => value != null);
    },

    subscribe(userId: string, onInvalidate: () => void): () => Promise<unknown> {
      const channel = client
        .channel(`shared_home:${userId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: TABLE,
          filter: `recipient_user_id=eq.${userId}`,
        }, onInvalidate)
        .subscribe();
      return () => client.removeChannel(channel);
    },
  };
}

export type SharedHomeRepository = ReturnType<typeof createSharedHomeRepository>;

export function getSharedHomeRepository(): SharedHomeRepository {
  return createSharedHomeRepository(getSupabaseClient());
}
