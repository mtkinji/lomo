import { create } from 'zustand';
import type { KwiltSharePayloadV1 } from '../services/appleEcosystem/shareExtension';

export type ShareIntentState = {
  payload: KwiltSharePayloadV1 | null;
  receivedAtMs: number | null;
  setPayload: (payload: KwiltSharePayloadV1 | null) => void;
  clear: () => void;
};

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


