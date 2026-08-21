import { useCallback, useEffect, useRef } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import type { CapabilityOnboardingContract } from './capabilityOnboardingContracts';
import { getCapabilityOnboardingDoors } from './capabilityOnboardingContracts';
import { normalizeCapabilityOnboardingRecord } from './capabilityOnboardingState';
import { CapabilityOnboardingPager } from './CapabilityOnboardingPager';
import { useCapabilityOnboardingStore } from './useCapabilityOnboardingStore';
import { FOOD_FIRST_CYCLE_CHECKPOINTS } from '../household-food/onboarding/foodFirstCycleGuide';
import { useAnalytics } from '../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../services/analytics/events';
import { CapabilityOnboardingResumeScreen } from './CapabilityOnboardingResumeScreen';
import {
  buildCapabilityOnboardingDoorStartedProperties,
  buildCapabilityOnboardingExploredProperties,
  buildCapabilityOnboardingPageViewedProperties,
  type CapabilityOnboardingSessionEntry,
} from './capabilityOnboardingAnalytics';

type Props = {
  visible: boolean;
  userId: string;
  surface: 'development' | 'production';
  onStartPath: (path: CapabilityOnboardingContract) => void;
  onExploreKwilt: () => void;
};

export function CapabilityOnboardingHost({
  visible,
  userId,
  surface,
  onStartPath,
  onExploreKwilt,
}: Props) {
  const persistedRecord = useCapabilityOnboardingStore(
    (state) => state.recordsByUserId[userId],
  );
  const dispatch = useCapabilityOnboardingStore((state) => state.dispatch);
  const { capture } = useAnalytics();
  const trackedVisible = useRef(false);
  const viewedPages = useRef(new Set<string>());
  const sessionEntry = useRef<CapabilityOnboardingSessionEntry>('fresh');
  const record = normalizeCapabilityOnboardingRecord(persistedRecord);
  const doors = getCapabilityOnboardingDoors(surface);
  const pageIds = ['welcome', ...doors.map((door) => door.id)] as const;

  const pageContext = useCallback((pageId: typeof pageIds[number], pageIndex?: number) => ({
    surface,
    pageId,
    pageIndex: pageIndex ?? Math.max(0, pageIds.indexOf(pageId)),
    pageCount: pageIds.length,
    entry: sessionEntry.current,
  }), [pageIds, surface]);

  const trackPageViewed = useCallback((pageId: typeof pageIds[number], pageIndex: number) => {
    if (viewedPages.current.has(pageId)) return;
    viewedPages.current.add(pageId);
    capture(
      AnalyticsEvent.CapabilityOnboardingPageViewed,
      buildCapabilityOnboardingPageViewedProperties(pageContext(pageId, pageIndex)),
    );
  }, [capture, pageContext]);

  useEffect(() => {
    if (visible && !trackedVisible.current) {
      trackedVisible.current = true;
      sessionEntry.current = record.updatedAt !== null ? 'resume' : 'fresh';
      viewedPages.current.clear();
      capture(AnalyticsEvent.CapabilityOnboardingStarted, { surface });
      const initialIndex = Math.max(0, pageIds.indexOf(record.activePageId));
      trackPageViewed(pageIds[initialIndex], initialIndex);
    } else if (!visible) {
      trackedVisible.current = false;
      viewedPages.current.clear();
    }
  }, [capture, pageIds, record.activePageId, record.updatedAt, surface, trackPageViewed, visible]);

  const explore = useCallback((input: 'button' | 'swipe-past-last') => {
    dispatch(userId, { type: 'explore', now: Date.now() });
    capture(
      AnalyticsEvent.CapabilityOnboardingExplored,
      buildCapabilityOnboardingExploredProperties({
        ...pageContext(record.activePageId),
        input,
      }),
    );
    onExploreKwilt();
  }, [capture, dispatch, onExploreKwilt, pageContext, record.activePageId, userId]);

  if (!visible || record.universalState === 'explored') return null;

  const selectedFoodPath =
    record.universalState === 'chosen' && record.selectedPathId === 'make-meals-easier';
  if (record.universalState === 'chosen' && !selectedFoodPath) return null;
  if (selectedFoodPath && record.checkpoint === 'complete') return null;

  const chooseAnotherDoor = () => dispatch(userId, { type: 'choose-another-door', now: Date.now() });

  return (
    <Modal visible animationType="fade" presentationStyle="fullScreen" onRequestClose={() => {}}>
      <View style={styles.root}>
        <StatusBar style="dark" />
        {selectedFoodPath ? (
          <CapabilityOnboardingResumeScreen
            onContinue={() => {
              const path = doors.find((candidate) => candidate.id === 'make-meals-easier');
              if (path) onStartPath(path);
            }}
            onChooseAnotherPath={chooseAnotherDoor}
            onLookAround={() => explore('button')}
          />
        ) : (
          <CapabilityOnboardingPager
            doors={doors}
            initialPageId={record.activePageId}
            onExplore={explore}
            onPageChanged={(pageId, pageIndex) => {
              dispatch(userId, { type: 'view-page', pageId, now: Date.now() });
              trackPageViewed(pageId, pageIndex);
            }}
            onStartDoor={(path) => {
              dispatch(userId, { type: 'select-path', pathId: path.id, now: Date.now() });
              capture(AnalyticsEvent.CapabilityOnboardingPathSelected, {
                path_id: path.id,
                surface,
              });
              capture(
                AnalyticsEvent.CapabilityOnboardingDoorStarted,
                buildCapabilityOnboardingDoorStartedProperties({
                  ...pageContext(path.id),
                  pathId: path.id,
                  rank: path.reelRank ?? doors.length,
                  input: 'button',
                }),
              );
              if (path.handoff.kind === 'food-meal-loop') {
                dispatch(userId, {
                  type: 'checkpoint',
                  checkpoint: FOOD_FIRST_CYCLE_CHECKPOINTS['choose-recipe'],
                  now: Date.now(),
                });
              }
              onStartPath(path);
            }}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
