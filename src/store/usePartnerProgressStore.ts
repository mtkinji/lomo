/**
 * Partner progress store for shared goal alerts.
 *
 * Tracks unseen progress events from partners and controls the
 * PartnerProgressGuide visibility.
 */

import { create } from 'zustand';
import type { FeedItem } from '../services/goalFeed';

export type PartnerProgressEvent = {
  /** Feed event ID */
  id: string;
  /** Goal ID this event belongs to */
  goalId: string;
  /** Goal title for display */
  goalTitle: string;
  /** Event type */
  type: 'progress_made' | 'goal_completed';
  /** Partner's name */
  partnerName: string;
  /** Partner's avatar URL */
  partnerAvatarUrl: string | null;
  /** When the event occurred */
  createdAt: string;
};

type PartnerProgressState = {
  /** Currently pending partner progress event to show */
  pendingEvent: PartnerProgressEvent | null;
  /** Whether the guide is visible */
  guideVisible: boolean;
  /** Set of event IDs we've already shown (prevents repeat alerts) */
  seenEventIds: Set<string>;
  /** Timestamp of last check (for throttling) */
  lastCheckAt: string | null;

  /** Show the partner progress guide with an event */
  showProgress: (event: PartnerProgressEvent) => void;
  /** Dismiss the guide */
  dismiss: () => void;
  /** Mark an event as seen without showing it */
  markSeen: (eventId: string) => void;
  /** Check if we've already shown this event */
  hasSeen: (eventId: string) => boolean;
  /** Update last check timestamp */
  setLastCheckAt: (timestamp: string) => void;
  /** Clear all state (for testing) */
  reset: () => void;
};

export const usePartnerProgressStore = create<PartnerProgressState>((set, get) => ({
  pendingEvent: null,
  guideVisible: false,
  seenEventIds: new Set(),
  lastCheckAt: null,

  showProgress: (event) => {
    const { seenEventIds } = get();

    // Don't show if already seen
    if (seenEventIds.has(event.id)) {
      return;
    }

    // Mark as seen and show
    const nextSeenIds = new Set(seenEventIds);
    nextSeenIds.add(event.id);

    set({
      pendingEvent: event,
      guideVisible: true,
      seenEventIds: nextSeenIds,
    });
  },

  dismiss: () => {
    set({
      guideVisible: false,
      // Keep pendingEvent briefly for exit animation, then clear
    });
    // Clear the event after animation
    setTimeout(() => {
      set({ pendingEvent: null });
    }, 300);
  },

  markSeen: (eventId) => {
    set((state) => {
      const nextSeenIds = new Set(state.seenEventIds);
      nextSeenIds.add(eventId);
      return { seenEventIds: nextSeenIds };
    });
  },

  hasSeen: (eventId) => get().seenEventIds.has(eventId),

  setLastCheckAt: (timestamp) => set({ lastCheckAt: timestamp }),

  reset: () =>
    set({
      pendingEvent: null,
      guideVisible: false,
      seenEventIds: new Set(),
      lastCheckAt: null,
    }),
}));

