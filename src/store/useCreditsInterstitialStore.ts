import { create } from 'zustand';

export type CreditsInterstitialKind = 'education' | 'completion' | 'reward';

export type CreditsInterstitialState = {
  visible: boolean;
  kind: CreditsInterstitialKind | null;
  spentCredits: number | null;
  open: (params: { kind: CreditsInterstitialKind; spentCredits?: number }) => void;
  close: () => void;
};

export const useCreditsInterstitialStore = create<CreditsInterstitialState>((set) => ({
  visible: false,
  kind: null,
  spentCredits: null,
  open: ({ kind, spentCredits }) =>
    set({
      visible: true,
      kind,
      spentCredits: typeof spentCredits === 'number' && Number.isFinite(spentCredits) ? spentCredits : null,
    }),
  close: () => set({ visible: false, kind: null, spentCredits: null }),
}));


