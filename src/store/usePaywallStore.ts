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
  /**
   * Upsell attribution: the reason/source the user was in when they tapped
   * the paywall's Upgrade CTA (or equivalent) and were routed to the pricing
   * drawer. Read by ManageSubscriptionScreen to stamp `paywall_reason` and
   * `paywall_source` onto purchase events so we can attribute conversions
   * back to the originating feature gate. Cleared after a purchase resolves
   * or when the user navigates away without buying.
   */
  upsellReason: PaywallReason | null;
  upsellSource: PaywallSource | null;
  upsellTappedAtMs: number | null;
  open: (params: { reason: PaywallReason; source: PaywallSource }) => void;
  close: () => void;
  setUpsellContext: (params: { reason: PaywallReason; source: PaywallSource }) => void;
  clearUpsellContext: () => void;
};

export const usePaywallStore = create<PaywallState>((set) => ({
  visible: false,
  reason: null,
  source: null,
  lastDismissedAtMs: null,
  lastDismissedReason: null,
  lastDismissedSource: null,
  upsellReason: null,
  upsellSource: null,
  upsellTappedAtMs: null,
  open: ({ reason, source }) => set({ visible: true, reason, source }),
  close: () =>
    set((prev) => ({
      visible: false,
      lastDismissedAtMs: Date.now(),
      lastDismissedReason: prev.reason,
      lastDismissedSource: prev.source,
      reason: null,
      source: null,
    })),
  setUpsellContext: ({ reason, source }) =>
    set({ upsellReason: reason, upsellSource: source, upsellTappedAtMs: Date.now() }),
  clearUpsellContext: () =>
    set({ upsellReason: null, upsellSource: null, upsellTappedAtMs: null }),
}));


