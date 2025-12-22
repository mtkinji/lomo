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
};

export type ToastState = {
  id: number;
  message: string;
  variant: ToastVariant;
  durationMs: number;
  bottomOffset?: number;
  showToast: (payload: ToastPayload) => void;
  clearToast: () => void;
};

export const useToastStore = create<ToastState>((set) => ({
  id: 0,
  message: '',
  variant: 'default',
  durationMs: 3000,
  bottomOffset: undefined,
  showToast: ({ message, variant = 'default', durationMs = 3000, bottomOffset }) =>
    set((prev) => ({
      id: prev.id + 1,
      message,
      variant,
      durationMs,
      bottomOffset,
    })),
  clearToast: () =>
    set({
      message: '',
      bottomOffset: undefined,
    }),
}));
