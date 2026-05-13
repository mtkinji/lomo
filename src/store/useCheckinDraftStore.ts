/**
 * Persistent per-goal check-in draft store.
 *
 * Each shared goal can have at most one `active` check-in draft. Drafts span
 * days, persist across app launches, and are recoverable from the Partners
 * sheet on the goal until the user explicitly sends or skips them.
 *
 * The store is intentionally small — domain logic (composing text, deciding
 * when to prompt, etc.) lives in `src/services/checkinDrafts.ts` so it can be
 * unit-tested without React Native dependencies. This store handles persistence,
 * selection, and lifecycle wiring.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  type CheckinDraft,
  type CheckinDraftItem,
  type CheckinDraftItemSource,
  appendItem as appendDraftItem,
  applyPartnerCircleKey,
  composeDraftText,
  createDraft,
  markDismissed as markDismissedDraft,
  markPrompted as markPromptedDraft,
  markSent as markSentDraft,
  markSkipped as markSkippedDraft,
  removeBySource as removeBySourceDraft,
  removeItem as removeDraftItem,
  toggleItemInclusion as toggleDraftItemInclusion,
} from '../services/checkinDrafts';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type DraftMap = Record<string, CheckinDraft>;

export type CheckinDraftStoreState = {
  /**
   * goalId -> active draft. Once a draft is sent/skipped, it is removed so the
   * next completion event can start a fresh active draft.
   */
  draftsByGoalId: DraftMap;

  // ── Selectors ────────────────────────────────────────────────────────────
  getDraft: (goalId: string) => CheckinDraft | null;
  hasPendingDraft: (goalId: string) => boolean;
  listActiveDrafts: () => CheckinDraft[];

  // ── Lifecycle ────────────────────────────────────────────────────────────
  ensureDraft: (params: {
    goalId: string;
    partnerCircleKey: string;
    initialItem?: CheckinDraftItem;
  }) => CheckinDraft;

  appendItem: (params: { goalId: string; item: CheckinDraftItem }) => CheckinDraft | null;

  removeItem: (params: { goalId: string; itemId: string }) => CheckinDraft | null;

  /**
   * Remove an item by its source identity (e.g. activity id). Useful when the
   * underlying object is deleted or undone before the user sends the draft.
   * Returns null if the draft is empty after removal.
   */
  removeItemBySource: (params: {
    goalId: string;
    sourceType: CheckinDraftItemSource;
    sourceId: string;
  }) => CheckinDraft | null;

  toggleItemInclusion: (params: { goalId: string; itemId: string }) => CheckinDraft | null;

  setDraftText: (params: { goalId: string; draftText: string }) => CheckinDraft | null;

  regenerateDraftText: (params: { goalId: string }) => CheckinDraft | null;

  updatePartnerCircle: (params: { goalId: string; partnerCircleKey: string }) => CheckinDraft | null;

  markPrompted: (goalId: string) => void;

  markDismissed: (goalId: string) => void;

  markSent: (goalId: string) => void;

  markSkipped: (goalId: string) => void;

  /** Reset everything. For tests only. */
  reset: () => void;
};

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

function updateDraft(
  state: { draftsByGoalId: DraftMap },
  goalId: string,
  mutate: (draft: CheckinDraft) => CheckinDraft | null
): Partial<CheckinDraftStoreState> {
  const existing = state.draftsByGoalId[goalId];
  if (!existing) return {};
  const next = mutate(existing);
  if (next === null) {
    const { [goalId]: _omit, ...rest } = state.draftsByGoalId;
    return { draftsByGoalId: rest };
  }
  if (next === existing) return {};
  return {
    draftsByGoalId: {
      ...state.draftsByGoalId,
      [goalId]: next,
    },
  };
}

export const useCheckinDraftStore = create<CheckinDraftStoreState>()(
  persist(
    (set, get) => ({
      draftsByGoalId: {},

      getDraft: (goalId) => get().draftsByGoalId[goalId] ?? null,

      hasPendingDraft: (goalId) => {
        const d = get().draftsByGoalId[goalId];
        if (!d || d.status !== 'active') return false;
        if (d.items.some((i) => i.includeInDraft)) return true;
        return d.draftText.trim().length > 0;
      },

      listActiveDrafts: () => Object.values(get().draftsByGoalId).filter((d) => d.status === 'active'),

      ensureDraft: ({ goalId, partnerCircleKey, initialItem }) => {
        const now = new Date();
        const existing = get().draftsByGoalId[goalId];
        if (existing && existing.status === 'active') {
          let next = existing;
          if (next.partnerCircleKey !== partnerCircleKey) {
            next = applyPartnerCircleKey(next, partnerCircleKey, now);
          }
          if (initialItem) {
            next = appendDraftItem(next, initialItem, now);
          }
          if (next !== existing) {
            set((state) => ({
              draftsByGoalId: {
                ...state.draftsByGoalId,
                [goalId]: next,
              },
            }));
          }
          return next;
        }
        const draft = createDraft({
          goalId,
          partnerCircleKey,
          initialItem,
          now,
        });
        set((state) => ({
          draftsByGoalId: {
            ...state.draftsByGoalId,
            [goalId]: draft,
          },
        }));
        return draft;
      },

      appendItem: ({ goalId, item }) => {
        const now = new Date();
        let result: CheckinDraft | null = null;
        set((state) => {
          const existing = state.draftsByGoalId[goalId];
          if (!existing || existing.status !== 'active') return {};
          const next = appendDraftItem(existing, item, now);
          result = next;
          return {
            draftsByGoalId: {
              ...state.draftsByGoalId,
              [goalId]: next,
            },
          };
        });
        return result;
      },

      removeItem: ({ goalId, itemId }) => {
        const now = new Date();
        let result: CheckinDraft | null = null;
        set((state) =>
          updateDraft(state, goalId, (draft) => {
            const next = removeDraftItem(draft, itemId, now);
            if (next.items.length === 0 && next.draftText.trim().length === 0) {
              result = null;
              return null;
            }
            result = next;
            return next;
          })
        );
        return result;
      },

      removeItemBySource: ({ goalId, sourceType, sourceId }) => {
        const now = new Date();
        let result: CheckinDraft | null = null;
        set((state) =>
          updateDraft(state, goalId, (draft) => {
            const next = removeBySourceDraft(draft, sourceType, sourceId, now);
            if (next === draft) {
              result = draft;
              return draft;
            }
            if (next.items.length === 0 && next.draftText.trim().length === 0) {
              result = null;
              return null;
            }
            result = next;
            return next;
          })
        );
        return result;
      },

      toggleItemInclusion: ({ goalId, itemId }) => {
        const now = new Date();
        let result: CheckinDraft | null = null;
        set((state) =>
          updateDraft(state, goalId, (draft) => {
            const next = toggleDraftItemInclusion(draft, itemId, now);
            result = next;
            return next;
          })
        );
        return result;
      },

      setDraftText: ({ goalId, draftText }) => {
        const now = new Date();
        let result: CheckinDraft | null = null;
        set((state) =>
          updateDraft(state, goalId, (draft) => {
            const next: CheckinDraft = {
              ...draft,
              draftText,
              updatedAt: now.toISOString(),
            };
            result = next;
            return next;
          })
        );
        return result;
      },

      regenerateDraftText: ({ goalId }) => {
        const now = new Date();
        let result: CheckinDraft | null = null;
        set((state) =>
          updateDraft(state, goalId, (draft) => {
            const next: CheckinDraft = {
              ...draft,
              draftText: composeDraftText(draft, now),
              updatedAt: now.toISOString(),
            };
            result = next;
            return next;
          })
        );
        return result;
      },

      updatePartnerCircle: ({ goalId, partnerCircleKey }) => {
        const now = new Date();
        let result: CheckinDraft | null = null;
        set((state) =>
          updateDraft(state, goalId, (draft) => {
            const next = applyPartnerCircleKey(draft, partnerCircleKey, now);
            result = next;
            return next;
          })
        );
        return result;
      },

      markPrompted: (goalId) => {
        const now = new Date();
        set((state) =>
          updateDraft(state, goalId, (draft) => markPromptedDraft(draft, now))
        );
      },

      markDismissed: (goalId) => {
        const now = new Date();
        set((state) =>
          updateDraft(state, goalId, (draft) => markDismissedDraft(draft, now))
        );
      },

      markSent: (goalId) => {
        const now = new Date();
        set((state) => {
          const existing = state.draftsByGoalId[goalId];
          if (!existing) return {};
          markSentDraft(existing, now); // returned value unused; we drop the row
          const { [goalId]: _omit, ...rest } = state.draftsByGoalId;
          return { draftsByGoalId: rest };
        });
      },

      markSkipped: (goalId) => {
        const now = new Date();
        set((state) => {
          const existing = state.draftsByGoalId[goalId];
          if (!existing) return {};
          markSkippedDraft(existing, now);
          const { [goalId]: _omit, ...rest } = state.draftsByGoalId;
          return { draftsByGoalId: rest };
        });
      },

      reset: () => set({ draftsByGoalId: {} }),
    }),
    {
      name: 'kwilt-checkin-drafts-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        draftsByGoalId: state.draftsByGoalId,
      }),
    }
  )
);

// ─────────────────────────────────────────────────────────────────────────────
// Convenience hooks/selectors for components
// ─────────────────────────────────────────────────────────────────────────────

export function selectDraftForGoal(state: CheckinDraftStoreState, goalId: string): CheckinDraft | null {
  return state.draftsByGoalId[goalId] ?? null;
}

export function selectHasPendingDraft(state: CheckinDraftStoreState, goalId: string): boolean {
  const d = state.draftsByGoalId[goalId];
  if (!d || d.status !== 'active') return false;
  if (d.items.some((i) => i.includeInDraft)) return true;
  return d.draftText.trim().length > 0;
}
