import { create } from 'zustand';
import type { ScreenTimeShieldHandoff } from '../../../services/appleEcosystem/screenTimeProtection';

export const SCREEN_TIME_HANDOFF_MAX_AGE_MS = 2 * 60_000;

type ScreenTimeHandoffState = {
  pending: ScreenTimeShieldHandoff | null;
  visible: boolean;
  lastCapturedAtMs: number | null;
  capture: (handoff: ScreenTimeShieldHandoff, nowMs?: number) => boolean;
  dismiss: () => void;
  resetForTests: () => void;
};

export const useScreenTimeHandoffStore = create<ScreenTimeHandoffState>((set, get) => ({
  pending: null,
  visible: false,
  lastCapturedAtMs: null,
  capture: (handoff, nowMs = Date.now()) => {
    const ageMs = nowMs - handoff.requestedAtMs;
    if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > SCREEN_TIME_HANDOFF_MAX_AGE_MS) return false;
    if (get().lastCapturedAtMs === handoff.requestedAtMs) return false;
    set({
      pending: handoff,
      visible: true,
      lastCapturedAtMs: handoff.requestedAtMs,
    });
    return true;
  },
  dismiss: () => set({ pending: null, visible: false }),
  resetForTests: () => set({ pending: null, visible: false, lastCapturedAtMs: null }),
}));

