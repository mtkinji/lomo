import { create } from 'zustand';
import { randomUUID } from 'expo-crypto';
import { navigateWhenReady } from '../../navigation/rootNavigationRef';
import type { HomeAttachment } from './sharedLifeTypes';
export const useHomeShareRequest = create<{
  request: { id: string; userId: string; attachment: HomeAttachment } | null;
  clear: () => void;
}>((set) => ({ request: null, clear: () => set({ request: null }) }));
export function shareMomentInHome(userId: string, attachment: HomeAttachment) {
  useHomeShareRequest.setState({
    request: { id: randomUUID(), userId, attachment },
  });
  navigateWhenReady('SharedHome', { source: 'manual' });
}
