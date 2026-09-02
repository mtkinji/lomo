import { create } from 'zustand';
import type { PaywallReason, PaywallSource } from '../services/paywall';

export type UpgradeEntrySource = 'settings_home' | 'more';

export type PaywallResumeIntentKind =
  | 'money_connect_account'
  | 'screen_time_add_condition'
  | 'screen_time_choose_condition'
  | 'screen_time_review_rule';

export type PaywallResumeIntent = {
  kind: PaywallResumeIntentKind;
  requestedAtMs: number;
};

export function getUpgradeResumeDestination(
  resumeIntent: PaywallResumeIntent,
): 'money' | 'previous' {
  return resumeIntent.kind === 'money_connect_account' ? 'money' : 'previous';
}

type NewPaywallResumeIntent = Omit<PaywallResumeIntent, 'requestedAtMs'>;

const UPSELL_CONTEXT_TTL_MS = 30 * 60 * 1000;

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
  directEntrySource: UpgradeEntrySource | null;
  upsellTappedAtMs: number | null;
  currentResumeIntent: PaywallResumeIntent | null;
  pendingResumeIntent: PaywallResumeIntent | null;
  readyResumeIntent: PaywallResumeIntent | null;
  open: (params: {
    reason: PaywallReason;
    source: PaywallSource;
    resumeIntent?: NewPaywallResumeIntent;
  }) => void;
  close: () => void;
  setUpsellContext: (params: { reason: PaywallReason; source: PaywallSource }) => void;
  setDirectUpsellContext: (params: { source: UpgradeEntrySource }) => void;
  completeUpgrade: () => PaywallResumeIntent | null;
  consumeReadyResumeIntent: (kind: PaywallResumeIntentKind) => PaywallResumeIntent | null;
  clearUpsellContext: () => void;
};

export const usePaywallStore = create<PaywallState>((set, get) => ({
  visible: false,
  reason: null,
  source: null,
  lastDismissedAtMs: null,
  lastDismissedReason: null,
  lastDismissedSource: null,
  upsellReason: null,
  upsellSource: null,
  directEntrySource: null,
  upsellTappedAtMs: null,
  currentResumeIntent: null,
  pendingResumeIntent: null,
  readyResumeIntent: null,
  open: ({ reason, source, resumeIntent }) => set({
    visible: true,
    reason,
    source,
    directEntrySource: null,
    pendingResumeIntent: null,
    currentResumeIntent: resumeIntent
      ? { ...resumeIntent, requestedAtMs: Date.now() }
      : null,
  }),
  close: () =>
    set((prev) => ({
      visible: false,
      lastDismissedAtMs: Date.now(),
      lastDismissedReason: prev.reason,
      lastDismissedSource: prev.source,
      reason: null,
      source: null,
      currentResumeIntent: null,
    })),
  setUpsellContext: ({ reason, source }) =>
    set((state) => ({
      upsellReason: reason,
      upsellSource: source,
      directEntrySource: null,
      upsellTappedAtMs: Date.now(),
      pendingResumeIntent: state.currentResumeIntent,
      currentResumeIntent: null,
    })),
  setDirectUpsellContext: ({ source }) => set({
    upsellReason: null,
    upsellSource: null,
    directEntrySource: source,
    upsellTappedAtMs: Date.now(),
    currentResumeIntent: null,
    pendingResumeIntent: null,
  }),
  completeUpgrade: () => {
    const pending = get().pendingResumeIntent;
    const fresh = pending && Date.now() - pending.requestedAtMs <= UPSELL_CONTEXT_TTL_MS
      ? pending
      : null;
    set({
      upsellReason: null,
      upsellSource: null,
      directEntrySource: null,
      upsellTappedAtMs: null,
      pendingResumeIntent: null,
      readyResumeIntent: fresh,
    });
    return fresh;
  },
  consumeReadyResumeIntent: (kind) => {
    const ready = get().readyResumeIntent;
    if (!ready) return null;
    if (Date.now() - ready.requestedAtMs > UPSELL_CONTEXT_TTL_MS) {
      set({ readyResumeIntent: null });
      return null;
    }
    if (ready.kind !== kind) return null;
    set({ readyResumeIntent: null });
    return ready;
  },
  clearUpsellContext: () =>
    set({
      upsellReason: null,
      upsellSource: null,
      directEntrySource: null,
      upsellTappedAtMs: null,
      pendingResumeIntent: null,
    }),
}));
