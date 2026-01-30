/**
 * Milestone share prompt state.
 *
 * Purpose:
 * - Enforce strict caps on auto share prompts (Duolingo-style).
 * - Track lightweight “People graph established” hinting for CTA copy.
 *
 * Note: this is best-effort local state (privacy-first, no server dependency).
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { localDateKey } from './streakProtection';

const AUTO_PROMPT_COOLDOWN_DAYS = 7;
const AUTO_PROMPT_COOLDOWN_MS = AUTO_PROMPT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

export type AutoPromptCheck = {
  ok: boolean;
  cooldownRemainingDays: number;
  blockedBySession: boolean;
  blockedByDay: boolean;
};

type MilestoneSharePromptState = {
  lastAutoPromptAtMs: number | null;
  lastAutoPromptDayKey: string | null;
  hasPromptedThisSession: boolean;
  peopleGraphEstablished: boolean;

  // Actions
  markSessionPrompted: () => void;
  resetSession: () => void;
  setPeopleGraphEstablished: (established: boolean) => void;
  canAutoPromptNow: (params?: { now?: Date }) => AutoPromptCheck;
  markAutoPromptShown: (params?: { now?: Date }) => void;
};

export const useMilestoneSharePromptStore = create<MilestoneSharePromptState>()(
  persist(
    (set, get) => ({
      lastAutoPromptAtMs: null,
      lastAutoPromptDayKey: null,
      hasPromptedThisSession: false,
      peopleGraphEstablished: false,

      markSessionPrompted: () => set({ hasPromptedThisSession: true }),
      resetSession: () => set({ hasPromptedThisSession: false }),
      setPeopleGraphEstablished: (established) => set({ peopleGraphEstablished: Boolean(established) }),

      canAutoPromptNow: (params) => {
        const state = get();
        const now = params?.now ?? new Date();
        const nowMs = now.getTime();
        const todayKey = localDateKey(now);

        const blockedBySession = Boolean(state.hasPromptedThisSession);
        const blockedByDay = Boolean(state.lastAutoPromptDayKey && state.lastAutoPromptDayKey === todayKey);

        let cooldownRemainingDays = 0;
        if (typeof state.lastAutoPromptAtMs === 'number' && Number.isFinite(state.lastAutoPromptAtMs)) {
          const elapsed = nowMs - state.lastAutoPromptAtMs;
          if (elapsed < AUTO_PROMPT_COOLDOWN_MS) {
            cooldownRemainingDays = Math.max(1, Math.ceil((AUTO_PROMPT_COOLDOWN_MS - elapsed) / (24 * 60 * 60 * 1000)));
          }
        }

        const ok = !blockedBySession && !blockedByDay && cooldownRemainingDays === 0;
        return { ok, cooldownRemainingDays, blockedBySession, blockedByDay };
      },

      markAutoPromptShown: (params) => {
        const now = params?.now ?? new Date();
        const nowMs = now.getTime();
        const todayKey = localDateKey(now);
        set({
          lastAutoPromptAtMs: nowMs,
          lastAutoPromptDayKey: todayKey,
          hasPromptedThisSession: true,
        });
      },
    }),
    {
      name: 'kwilt-milestone-share-prompt-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        lastAutoPromptAtMs: state.lastAutoPromptAtMs,
        lastAutoPromptDayKey: state.lastAutoPromptDayKey,
        peopleGraphEstablished: state.peopleGraphEstablished,
        // Intentionally do NOT persist hasPromptedThisSession.
      }),
    },
  ),
);






