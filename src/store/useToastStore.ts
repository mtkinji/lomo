import { create } from 'zustand';
import type { ToastVariant } from '../ui/Toast';

export type ToastPayload = {
  message: string;
  variant?: ToastVariant;
  durationMs?: number;
  actionLabel?: string;
  actionOnPress?: () => void;
  /**
   * Absolute bottom offset within the current screen container.
   * If omitted, the ToastHost will choose a safe default.
   */
  bottomOffset?: number;
  /**
   * How this toast should behave while toasts are suppressed by higher-priority
   * UI overlays (e.g. guides / coachmarks).
   *
   * - 'queue' (default): defer and show after suppression ends.
   * - 'show': ignore suppression and show immediately.
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
  actionLabel?: string;
  actionOnPress?: () => void;
  bottomOffset?: number;
  /**
   * Behavior for the *currently visible* toast when a higher-priority overlay
   * begins suppressing toasts.
   */
  behaviorDuringSuppression: 'show' | 'queue' | 'drop';
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
  actionLabel: undefined,
  actionOnPress: undefined,
  bottomOffset: undefined,
  behaviorDuringSuppression: 'queue',
  suppressionKeys: {},
  queuedToasts: [],
  showToast: ({
    message,
    variant = 'default',
    durationMs = 3000,
    actionLabel,
    actionOnPress,
    bottomOffset,
    behaviorDuringSuppression = 'queue',
  }) =>
    set((prev) => {
      const isSuppressed = Object.keys(prev.suppressionKeys ?? {}).length > 0;
      const trimmed = message.trim();
      if (!trimmed) return prev;

      if (isSuppressed && behaviorDuringSuppression !== 'show') {
        if (behaviorDuringSuppression === 'drop') {
          return prev;
        }
        const nextQueue = [
          ...(prev.queuedToasts ?? []),
          { message: trimmed, variant, durationMs, actionLabel, actionOnPress, bottomOffset, behaviorDuringSuppression },
        ];
        const capped = nextQueue.slice(Math.max(0, nextQueue.length - MAX_QUEUED_TOASTS));
        return { ...prev, queuedToasts: capped };
      }

      return {
        ...prev,
        id: prev.id + 1,
        message: trimmed,
        variant,
        durationMs,
        actionLabel,
        actionOnPress,
        bottomOffset,
        behaviorDuringSuppression,
      };
    }),
  clearToast: () =>
    set((prev) => {
      const isSuppressed = Object.keys(prev.suppressionKeys ?? {}).length > 0;
      const nextBase = {
        ...prev,
        message: '',
        bottomOffset: undefined,
        actionLabel: undefined,
        actionOnPress: undefined,
        behaviorDuringSuppression: 'queue' as const,
      };
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
        actionLabel: next.actionLabel,
        actionOnPress: next.actionOnPress,
        bottomOffset: next.bottomOffset,
        behaviorDuringSuppression: next.behaviorDuringSuppression ?? 'queue',
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

      // If we are *entering* suppression, immediately hide any currently visible toast so it
      // can't appear above the overlay. If it was mid-flight, keep it by moving it into the queue.
      if (!wasSuppressed && isSuppressed) {
        const activeTrimmed = (prev.message ?? '').trim();
        if (activeTrimmed.length > 0) {
          // Some toasts (like "credits exhausted" nudges) should never reappear after an
          // interstitial covers them. Drop those instead of queueing.
          if (prev.behaviorDuringSuppression === 'drop') {
            return {
              ...prev,
              suppressionKeys: nextKeys,
              message: '',
              bottomOffset: undefined,
              actionLabel: undefined,
              actionOnPress: undefined,
              behaviorDuringSuppression: 'queue',
            };
          }
          const nextQueue = [
            {
              message: activeTrimmed,
              variant: prev.variant,
              durationMs: prev.durationMs,
              actionLabel: prev.actionLabel,
              actionOnPress: prev.actionOnPress,
              bottomOffset: prev.bottomOffset,
              behaviorDuringSuppression: prev.behaviorDuringSuppression ?? ('queue' as const),
            },
            ...(prev.queuedToasts ?? []),
          ];
          const capped = nextQueue.slice(Math.max(0, nextQueue.length - MAX_QUEUED_TOASTS));
          return {
            ...prev,
            suppressionKeys: nextKeys,
            message: '',
            bottomOffset: undefined,
            actionLabel: undefined,
            actionOnPress: undefined,
            behaviorDuringSuppression: 'queue',
            queuedToasts: capped,
          };
        }
        return {
          ...prev,
          suppressionKeys: nextKeys,
          message: '',
          bottomOffset: undefined,
          actionLabel: undefined,
          actionOnPress: undefined,
          behaviorDuringSuppression: 'queue',
        };
      }

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
          actionLabel: next.actionLabel,
          actionOnPress: next.actionOnPress,
          bottomOffset: next.bottomOffset,
          behaviorDuringSuppression: next.behaviorDuringSuppression ?? 'queue',
        };
      }

      return { ...prev, suppressionKeys: nextKeys };
    }),
}));
