import { create } from 'zustand';
import type { ToastVariant } from '../ui/Toast';

export type ToastPayload = {
  message: string;
  variant?: ToastVariant;
  durationMs?: number;
  /**
   * Absolute bottom offset within the current screen container.
   * If omitted, the ToastHost will choose a safe default.
   */
  bottomOffset?: number;
  /**
   * How this toast should behave while toasts are suppressed by higher-priority
   * UI overlays (e.g. guides / coachmarks).
   *
   * - 'show' (default): ignore suppression and show immediately (current behavior).
   * - 'queue': defer and show after suppression ends.
   * - 'drop': do nothing while suppressed.
   */
  behaviorDuringSuppression?: 'show' | 'queue' | 'drop';
};

export type ToastState = {
  id: number;
  message: string;
  variant: ToastVariant;
  durationMs: number;
  bottomOffset?: number;
  /**
   * When non-empty, toasts can be considered suppressed by other overlays
   * that should "own" the user's attention.
   */
  suppressionKeys: Record<string, true>;
  /**
   * Deferred toast queue used for low-priority messages (e.g. credits warnings)
   * that shouldn't compete with guides. This is intentionally small.
   */
  queuedToasts: ToastPayload[];
  showToast: (payload: ToastPayload) => void;
  clearToast: () => void;
  setToastsSuppressed: (params: { key: string; suppressed: boolean }) => void;
};

const MAX_QUEUED_TOASTS = 3;

export const useToastStore = create<ToastState>((set) => ({
  id: 0,
  message: '',
  variant: 'default',
  durationMs: 3000,
  bottomOffset: undefined,
  suppressionKeys: {},
  queuedToasts: [],
  showToast: ({
    message,
    variant = 'default',
    durationMs = 3000,
    bottomOffset,
    behaviorDuringSuppression = 'show',
  }) =>
    set((prev) => {
      const isSuppressed = Object.keys(prev.suppressionKeys ?? {}).length > 0;
      const trimmed = message.trim();
      if (!trimmed) return prev;

      if (isSuppressed && behaviorDuringSuppression !== 'show') {
        if (behaviorDuringSuppression === 'drop') {
          return prev;
        }
        const nextQueue = [...(prev.queuedToasts ?? []), { message: trimmed, variant, durationMs, bottomOffset, behaviorDuringSuppression }];
        const capped = nextQueue.slice(Math.max(0, nextQueue.length - MAX_QUEUED_TOASTS));
        return { ...prev, queuedToasts: capped };
      }

      return {
        ...prev,
        id: prev.id + 1,
        message: trimmed,
        variant,
        durationMs,
        bottomOffset,
      };
    }),
  clearToast: () =>
    set((prev) => {
      const isSuppressed = Object.keys(prev.suppressionKeys ?? {}).length > 0;
      const nextBase = { ...prev, message: '', bottomOffset: undefined };
      if (isSuppressed) {
        return nextBase;
      }
      const queue = prev.queuedToasts ?? [];
      if (queue.length === 0) {
        return nextBase;
      }
      const [next, ...rest] = queue;
      const trimmed = next.message.trim();
      if (!trimmed) {
        return { ...nextBase, queuedToasts: rest };
      }
      return {
        ...nextBase,
        queuedToasts: rest,
        id: prev.id + 1,
        message: trimmed,
        variant: next.variant ?? 'default',
        durationMs: next.durationMs ?? 3000,
        bottomOffset: next.bottomOffset,
      };
    }),
  setToastsSuppressed: ({ key, suppressed }) =>
    set((prev) => {
      const current = prev.suppressionKeys ?? {};
      const has = Boolean(current[key]);
      let nextKeys = current;
      if (suppressed && !has) {
        nextKeys = { ...current, [key]: true };
      } else if (!suppressed && has) {
        const { [key]: _removed, ...rest } = current;
        nextKeys = rest;
      }

      // If we just lifted the final suppression and there's no active toast, flush one queued toast.
      const wasSuppressed = Object.keys(current).length > 0;
      const isSuppressed = Object.keys(nextKeys).length > 0;
      const noActiveToast = (prev.message ?? '').trim().length === 0;
      if (wasSuppressed && !isSuppressed && noActiveToast && (prev.queuedToasts?.length ?? 0) > 0) {
        const [next, ...rest] = prev.queuedToasts ?? [];
        const trimmed = next.message.trim();
        if (!trimmed) {
          return { ...prev, suppressionKeys: nextKeys, queuedToasts: rest };
        }
        return {
          ...prev,
          suppressionKeys: nextKeys,
          queuedToasts: rest,
          id: prev.id + 1,
          message: trimmed,
          variant: next.variant ?? 'default',
          durationMs: next.durationMs ?? 3000,
          bottomOffset: next.bottomOffset,
        };
      }

      return { ...prev, suppressionKeys: nextKeys };
    }),
}));
