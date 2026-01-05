import { create } from 'zustand';
import type { ArcDraftPayload } from '@kwilt/arc-survey';

type ArcDraftClaimState = {
  draftId: string | null;
  payload: ArcDraftPayload | null;
  claimedAtMs: number | null;

  setClaimed: (params: { draftId: string; payload: ArcDraftPayload }) => void;
  clear: () => void;
};

export const useArcDraftClaimStore = create<ArcDraftClaimState>((set) => ({
  draftId: null,
  payload: null,
  claimedAtMs: null,

  setClaimed: ({ draftId, payload }) =>
    set({
      draftId,
      payload,
      claimedAtMs: Date.now(),
    }),

  clear: () => set({ draftId: null, payload: null, claimedAtMs: null }),
}));


