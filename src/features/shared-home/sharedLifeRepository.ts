import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../services/backend/supabaseClient';
import type {
  HomeBootstrap,
  HomeConnection,
  HomeConversation,
  HomeFeedFilter,
  HomePost,
} from './sharedLifeTypes';

export function createSharedLifeRepository(client: SupabaseClient) {
  async function command<T>(op: string, args: object = {}): Promise<T> {
    const { data, error } = await client.rpc('kwilt_home_command', {
      op,
      args,
    });
    if (error) throw new Error(error.message);
    return data as T;
  }
  return {
    command,
    async cleanupMedia() {
      const paths = await command<string[]>('cleanup');
      for (let i = 0; i < paths.length; i += 100) {
        const result = await client.storage
          .from('home-moments')
          .remove(paths.slice(i, i + 100));
        if (result.error) throw result.error;
      }
    },
    bootstrap: () => command<HomeBootstrap>('bootstrap'),
    list: (filter: HomeFeedFilter = {}) =>
      command<{ posts: HomePost[] }>(filter.library ? 'library' : 'feed', filter),
    conversation: (id: string) =>
      command<HomeConversation>('conversation', { id }),
    connections: () => command<HomeConnection[]>('connections'),
  };
}
export const getSharedLifeRepository = () =>
  createSharedLifeRepository(getSupabaseClient());
export type SharedLifeRepository = ReturnType<
  typeof createSharedLifeRepository
>;
