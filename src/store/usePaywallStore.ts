import { create } from 'zustand';
import type { PaywallReason, PaywallSource } from '../services/paywall';

export type PaywallState = {
  visible: boolean;
  reason: PaywallReason | null;
  source: PaywallSource | null;
  /**
   * Timestamp of the most recent paywall dismiss, used to avoid immediately
   * re-showing follow-up nudges (e.g. credits toasts) right after the user
   * just saw the interstitial.
   */
  lastDismissedAtMs: number | null;
  lastDismissedReason: PaywallReason | null;
  lastDismissedSource: PaywallSource | null;
  open: (params: { reason: PaywallReason; source: PaywallSource }) => void;
  close: () => void;
};

export const usePaywallStore = create<PaywallState>((set) => ({
  visible: false,
  reason: null,
  source: null,
  lastDismissedAtMs: null,
  lastDismissedReason: null,
  lastDismissedSource: null,
  open: ({ reason, source }) => set({ visible: true, reason, source }),
  close: () =>
    set((prev) => ({
      visible: false,
      // capture what was just dismissed before clearing
      lastDismissedAtMs: Date.now(),
      lastDismissedReason: prev.reason,
      lastDismissedSource: prev.source,
      reason: null,
      source: null,
    })),
}));


