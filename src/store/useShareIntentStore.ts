import { create } from 'zustand';
import type { KwiltSharePayloadV1 } from '../services/appleEcosystem/shareExtension';

export type ShareIntentState = {
  payload: KwiltSharePayloadV1 | null;
  receivedAtMs: number | null;
  setPayload: (payload: KwiltSharePayloadV1 | null) => void;
  clear: () => void;
};

export function recipeSourceFromSharePayload(payload: KwiltSharePayloadV1 | null):
  | { mode: 'url' | 'text'; value: string }
  | null {
  if (!payload?.items?.length) return null;
  const item = payload.items.find((candidate) => candidate.type === 'url' && /^https:\/\//i.test(candidate.value.trim()))
    ?? payload.items.find((candidate) => candidate.type === 'text' && candidate.value.trim());
  if (!item) return null;
  return { mode: item.type === 'url' ? 'url' : 'text', value: item.value.trim() };
}

export const useShareIntentStore = create<ShareIntentState>((set) => ({
  payload: null,
  receivedAtMs: null,
  setPayload: (payload) =>
    set({
      payload,
      receivedAtMs: payload ? Date.now() : null,
    }),
  clear: () => set({ payload: null, receivedAtMs: null }),
}));

