import { create } from 'zustand';

export type JoinSharedGoalDrawerState = {
  visible: boolean;
  inviteCode: string | null;
  /**
   * Optional source label for analytics / debugging.
   */
  source?: 'deeplink' | 'route' | 'unknown';
  open: (params: { inviteCode: string; source?: JoinSharedGoalDrawerState['source'] }) => void;
  close: () => void;
};

export const useJoinSharedGoalDrawerStore = create<JoinSharedGoalDrawerState>((set) => ({
  visible: false,
  inviteCode: null,
  source: 'unknown',
  open: ({ inviteCode, source }) =>
    set({
      visible: true,
      inviteCode: inviteCode.trim(),
      source: source ?? 'unknown',
    }),
  close: () => set({ visible: false, inviteCode: null, source: 'unknown' }),
}));


