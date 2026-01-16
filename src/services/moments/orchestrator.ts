/**
 * Moment Orchestrator (v1)
 *
 * A tiny cross-feature guardrail so we don't stack/queue awkward "moments"
 * (celebrations, paywalls, nudges, deep-link success flows) on top of each other.
 *
 * Design goals:
 * - Keep implementation lightweight (module-local state; no persistence).
 * - Provide a single place to encode the moment ladder.
 * - Only gate *low-priority* moments for now (nudges + follow nav).
 */

import { useFirstTimeUxStore } from '../../store/useFirstTimeUxStore';
import { useToastStore } from '../../store/useToastStore';
import { useCelebrationStore } from '../../store/useCelebrationStore';
import { usePaywallStore } from '../../store/usePaywallStore';

export type MomentKind =
  | 'ftue'
  | 'streak_protection'
  | 'celebration'
  | 'paywall'
  | 'checkin_nudge'
  | 'follow_navigation';

// Higher number = higher priority.
const MOMENT_PRIORITY: Record<MomentKind, number> = {
  ftue: 60,
  streak_protection: 50,
  celebration: 40,
  paywall: 30,
  checkin_nudge: 20,
  follow_navigation: 10,
};

const HIGH_ATTENTION_KINDS = new Set<MomentKind>([
  'ftue',
  'streak_protection',
  'celebration',
  'paywall',
]);

// If a high-attention moment just happened, don't immediately show low-priority nudges.
const DEFAULT_LOW_PRIORITY_COOLDOWN_MS = 20_000;

let lastHighAttentionAtMs: number | null = null;
let lastHighAttentionKind: MomentKind | null = null;

export function markMomentShown(kind: MomentKind, params?: { nowMs?: number }) {
  const nowMs = params?.nowMs ?? Date.now();
  if (!HIGH_ATTENTION_KINDS.has(kind)) return;
  lastHighAttentionAtMs = nowMs;
  lastHighAttentionKind = kind;
}

/**
 * Returns false when a low-priority moment (nudge toast, deep-link auto-nav)
 * should be suppressed to avoid stacking with more important flows.
 *
 * Intentionally conservative: if in doubt, don't show the low-priority moment.
 */
export function shouldShowLowPriorityMomentNow(
  kind: Extract<MomentKind, 'checkin_nudge' | 'follow_navigation'>,
  params?: { nowMs?: number; cooldownMs?: number },
): { ok: boolean; reason?: string } {
  const nowMs = params?.nowMs ?? Date.now();
  const cooldownMs = params?.cooldownMs ?? DEFAULT_LOW_PRIORITY_COOLDOWN_MS;

  // 1) FTUE always wins.
  if (useFirstTimeUxStore.getState().isFlowActive) {
    return { ok: false, reason: 'ftue_active' };
  }

  // 2) If any overlay is suppressing toasts, treat it as attention-owned.
  const suppressionKeys = Object.keys(useToastStore.getState().suppressionKeys ?? {});
  if (suppressionKeys.length > 0) {
    return { ok: false, reason: 'overlay_active' };
  }

  // 3) If a celebration is active, don't stack a low-priority moment.
  if (useCelebrationStore.getState().activeCelebration) {
    return { ok: false, reason: 'celebration_active' };
  }

  // 4) If paywall is visible, don't stack.
  if (usePaywallStore.getState().visible) {
    return { ok: false, reason: 'paywall_active' };
  }

  // 5) Cooldown after a recent high-attention moment.
  if (lastHighAttentionAtMs && lastHighAttentionKind) {
    const elapsed = nowMs - lastHighAttentionAtMs;
    const lastPriority = MOMENT_PRIORITY[lastHighAttentionKind];
    const myPriority = MOMENT_PRIORITY[kind];
    if (Number.isFinite(elapsed) && elapsed >= 0 && elapsed < cooldownMs && myPriority < lastPriority) {
      return { ok: false, reason: 'recent_high_attention' };
    }
  }

  return { ok: true };
}


