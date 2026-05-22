import { create } from 'zustand';

export const DEFAULT_ACTIVITY_ENRICHMENT_TIMEOUT_MS = 20_000;

type ActivityEnrichmentState = {
  enrichingById: Record<string, true>;
  markActivityEnrichment: (activityId: string, enriching: boolean, timeoutMs?: number) => void;
  reset: () => void;
};

const timeouts = new Map<string, ReturnType<typeof setTimeout>>();

function clearActivityTimeout(activityId: string) {
  const timeout = timeouts.get(activityId);
  if (timeout) clearTimeout(timeout);
  timeouts.delete(activityId);
}

export const useActivityEnrichmentStore = create<ActivityEnrichmentState>((set, get) => ({
  enrichingById: {},
  markActivityEnrichment: (activityId, enriching, timeoutMs = DEFAULT_ACTIVITY_ENRICHMENT_TIMEOUT_MS) => {
    if (!activityId) return;
    clearActivityTimeout(activityId);

    if (!enriching) {
      set((state) => {
        if (!state.enrichingById[activityId]) return state;
        const next = { ...state.enrichingById };
        delete next[activityId];
        return { enrichingById: next };
      });
      return;
    }

    set((state) => {
      if (state.enrichingById[activityId]) return state;
      return { enrichingById: { ...state.enrichingById, [activityId]: true } };
    });

    const timeout = setTimeout(() => {
      get().markActivityEnrichment(activityId, false);
    }, Math.max(1, timeoutMs));
    timeouts.set(activityId, timeout);
  },
  reset: () => {
    timeouts.forEach((timeout) => clearTimeout(timeout));
    timeouts.clear();
    set({ enrichingById: {} });
  },
}));
