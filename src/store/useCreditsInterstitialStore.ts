import { create } from 'zustand';

export type CreditsInterstitialKind = 'education' | 'completion' | 'reward';

export type CreditsInterstitialState = {
  visible: boolean;
  kind: CreditsInterstitialKind | null;
  open: (params: { kind: CreditsInterstitialKind }) => void;
  close: () => void;
};

export const useCreditsInterstitialStore = create<CreditsInterstitialState>((set) => ({
  visible: false,
  kind: null,
  open: ({ kind }) => set({ visible: true, kind }),
  close: () => set({ visible: false, kind: null }),
}));


