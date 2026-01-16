/**
 * Partner progress service for shared goal alerts.
 *
 * Checks for new progress events from partners when the app foregrounds
 * and triggers the PartnerProgressGuide to celebrate their achievements.
 */

import { AppState, type AppStateStatus } from 'react-native';
import { getSupabaseClient } from './backend/supabaseClient';
import { usePartnerProgressStore, type PartnerProgressEvent } from '../store/usePartnerProgressStore';
import { useAppStore } from '../store/useAppStore';

// Throttle checks to avoid excessive queries
const CHECK_THROTTLE_MS = 30_000; // 30 seconds

let isStarted = false;
let lastAppState: AppStateStatus = AppState.currentState;

/**
 * Start the partner progress service.
 * This subscribes to app state changes and checks for partner progress on foreground.
 */
export function startPartnerProgressService(): void {
  if (isStarted) return;
  isStarted = true;

  // Check on foreground
  AppState.addEventListener('change', (nextState) => {
    if (nextState === 'active' && lastAppState !== 'active') {
      void checkForPartnerProgress();
    }
    lastAppState = nextState;
  });

  // Also check on initial start (after a small delay to let auth settle)
  setTimeout(() => {
    void checkForPartnerProgress();
  }, 2000);
}

/**
 * Check for unseen partner progress events across all shared goals.
 */
export async function checkForPartnerProgress(): Promise<void> {
  const store = usePartnerProgressStore.getState();
  const now = new Date().toISOString();

  // Throttle checks
  if (store.lastCheckAt) {
    const elapsed = Date.now() - new Date(store.lastCheckAt).getTime();
    if (elapsed < CHECK_THROTTLE_MS) {
      return;
    }
  }

  store.setLastCheckAt(now);

  const supabase = getSupabaseClient();

  try {
    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      // Not authenticated
      return;
    }

    // Get all shared goals where user is a member
    const { data: memberships, error: memberError } = await supabase
      .from('kwilt_memberships')
      .select('entity_id')
      .eq('entity_type', 'goal')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (memberError || !memberships || memberships.length === 0) {
      return;
    }

    const goalIds = memberships.map((m) => m.entity_id);

    // Check for recent progress events from partners (not from current user)
    // Only look at events from the last 24 hours to keep it relevant
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: events, error: eventsError } = await supabase
      .from('kwilt_feed_events')
      .select('id, entity_id, actor_id, type, created_at')
      .eq('entity_type', 'goal')
      .in('entity_id', goalIds)
      .in('type', ['progress_made', 'goal_completed'])
      .neq('actor_id', user.id) // Only partner events
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: false })
      .limit(10);

    if (eventsError || !events || events.length === 0) {
      return;
    }

    // Find the first unseen event
    const unseenEvent = events.find((e) => !store.hasSeen(e.id));
    if (!unseenEvent) {
      return;
    }

    // Get partner info
    const { data: partnerProfile } = await supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', unseenEvent.actor_id)
      .single();

    // Get goal title from local store
    const goals = useAppStore.getState().goals ?? [];
    const goal = goals.find((g) => g.id === unseenEvent.entity_id);
    const goalTitle = goal?.title ?? 'your shared goal';

    // Build the event
    const progressEvent: PartnerProgressEvent = {
      id: unseenEvent.id,
      goalId: unseenEvent.entity_id,
      goalTitle,
      type: unseenEvent.type as 'progress_made' | 'goal_completed',
      partnerName: partnerProfile?.display_name ?? 'Your partner',
      partnerAvatarUrl: partnerProfile?.avatar_url ?? null,
      createdAt: unseenEvent.created_at,
    };

    // Show the guide
    store.showProgress(progressEvent);
  } catch (err) {
    // Silent fail - this is best-effort
    console.warn('[partnerProgressService] Check failed:', err);
  }
}

