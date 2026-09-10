import { DeliveryCard } from './SharedHomeDeliveryCard';
import { SharedLifeFeed } from './SharedLifeFeed';
import { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { useFeatureFlag } from '../../services/analytics/useFeatureFlag';
import { useFocusEffect } from '@react-navigation/native';
import { navigateWhenReady } from '../../navigation/rootNavigationRef';
import { AnalyticsEvent } from '../../services/analytics/events';
import { useAnalytics } from '../../services/analytics/useAnalytics';
import { resolveSharedHomeDestination } from './sharedHomeDestination';
import { UgcReportDrawer } from '../safety/UgcReportDrawer';
import type { UgcReportTarget } from '../../services/ugcSafety';
import {
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, type RouteProp } from '@react-navigation/native';

import type { RootDrawerParamList } from '../../navigation/RootNavigator';
import { useCapabilityShellOptional } from '../../navigation/CapabilityShellContext';
import { useAppStore } from '../../store/useAppStore';
import { colors, fonts, spacing, typography } from '../../theme';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { Button, Card, EmptyState, HStack, Text, VStack } from '../../ui/primitives';
import { groupSharedHomeDeliveries } from './sharedHomePresentation';
import type { SharedHomeDelivery } from './sharedHomeTypes';
import { useSharedHomeFeed, type SharedHomeFeedState } from './useSharedHomeFeed';
import { KwiltLoader } from '../../ui/KwiltLoader';
import { KwiltRefreshFrame, useKwiltRefresh } from '../../ui/KwiltRefresh';
type SharedHomeContentProps = Pick<
  SharedHomeFeedState,
  'items' | 'loading' | 'refreshing' | 'stale' | 'error'
> & {
  signedIn: boolean;
  now?: Date;
  onOpen: (delivery: SharedHomeDelivery) => void;
  onReport?: (delivery: SharedHomeDelivery) => void;
  onRefresh: () => void;
  highlightedDeliveryId?: string;
};

export function SharedHomeContent({
  items,
  loading,
  refreshing,
  stale,
  error,
  signedIn,
  now = new Date(),
  onOpen,
  onReport,
  onRefresh,
  highlightedDeliveryId,
}: SharedHomeContentProps) {
  const insets = useSafeAreaInsets();
  const { onScroll, refreshControl, refreshOverlay, refreshing: refreshActive, scrollEventThrottle } = useKwiltRefresh({ onRefresh });
  const groups = useMemo(() => groupSharedHomeDeliveries(items, now), [items, now]);
  const empty = groups.needsYou.length === 0 && groups.sharedWithYou.length === 0;

  return (
    <KwiltRefreshFrame refreshOverlay={refreshOverlay} refreshing={refreshActive}>
      <ScrollView
        testID="sharedHome.screen"
        contentContainerStyle={[styles.content, { paddingBottom: spacing['2xl'] + insets.bottom }]}
        onScroll={onScroll}
        refreshControl={refreshControl}
        scrollEventThrottle={scrollEventThrottle}
        showsVerticalScrollIndicator={false}
      >
      {loading && empty ? (
        <View style={styles.centeredState}>
          <KwiltLoader color={colors.textSecondary} />
          <Text style={styles.stateText}>Loading shared activity…</Text>
        </View>
      ) : !signedIn ? (
        <View style={styles.centeredState}>
          <EmptyState
            variant="screen"
            iconName="home"
            title="Shared things stay with your account"
            instructions="Sign in to see what people have shared with you."
            style={styles.centeredEmptyState}
          />
        </View>
      ) : error && empty ? (
        <View style={styles.centeredState}>
          <EmptyState
            variant="screen"
            iconName="inbox"
            title="Shared things could not be loaded"
            instructions="Check your connection and try again."
            primaryAction={{ label: 'Try again', onPress: onRefresh }}
            style={styles.centeredEmptyState}
          />
        </View>
      ) : empty ? (
        <View testID="sharedHome.empty" style={styles.centeredState}>
          <EmptyState
            variant="screen"
            iconName="inbox"
            title="Nothing shared with you yet"
            instructions="Invitations, game turns, and things people send you will appear here."
            style={styles.centeredEmptyState}
          />
        </View>
      ) : (
        <VStack space="lg">
          {stale ? (
            <View accessibilityRole="alert" style={styles.staleBanner}>
              <Text style={styles.staleText}>Showing saved activity. Pull to refresh.</Text>
            </View>
          ) : null}
          {groups.needsYou.length > 0 ? (
            <View testID="sharedHome.needsYou">
              <Text style={styles.sectionTitle}>Needs you</Text>
              {groups.needsYou.map((delivery) => (
                <DeliveryCard
                  key={delivery.id}
                  delivery={delivery}
                  now={now}
                  onOpen={() => onOpen(delivery)}
                  onReport={delivery.actorUserId ? () => onReport?.(delivery) : undefined}
                  highlighted={delivery.id === highlightedDeliveryId}
                />
              ))}
            </View>
          ) : null}
          {groups.sharedWithYou.length > 0 ? (
            <View testID="sharedHome.sharedWithYou">
              <Text style={styles.sectionTitle}>Shared with you</Text>
              {groups.sharedWithYou.map((delivery) => (
                <DeliveryCard
                  key={delivery.id}
                  delivery={delivery}
                  now={now}
                  onOpen={() => onOpen(delivery)}
                  onReport={delivery.actorUserId ? () => onReport?.(delivery) : undefined}
                  highlighted={delivery.id === highlightedDeliveryId}
                />
              ))}
            </View>
          ) : null}
        </VStack>
      )}
      </ScrollView>
    </KwiltRefreshFrame>
  );
}

export function SharedHomeScreen() {
  const enabled = useFeatureFlag('shared-life-v1', true);
  return __DEV__ || enabled ? <SharedLifeHomeScreen/> : <LegacySharedHomeScreen/>;
}
function SharedLifeHomeScreen() {
  const capabilityShell = useCapabilityShellOptional();
  const userId = useAppStore((state) => state.authIdentity?.userId ?? null);
  const route = useRoute<RouteProp<RootDrawerParamList, 'SharedHome'>>();
  return <SharedLifeFeed key={userId ?? 'signed-out'} userId={userId} highlightedDeliveryId={route.params?.deliveryId}
    renderFrame={(content, shareAction, moreMenu) => <AppShell>
      <PageHeader title="Home" onPressMenu={capabilityShell?.openMenu} rightElement={shareAction} moreMenu={moreMenu}/>
      {content}
    </AppShell>}/>;
}

function LegacySharedHomeScreen() {
  const capabilityShell = useCapabilityShellOptional();
  const userId = useAppStore((state) => state.authIdentity?.userId ?? null);
  const feed = useSharedHomeFeed(userId);
  const { capture } = useAnalytics();
  const route = useRoute<RouteProp<RootDrawerParamList, 'SharedHome'>>();
  const hasFocusedRef = useRef(false);
  const [reportTarget, setReportTarget] = useState<UgcReportTarget | null>(null);

  useFocusEffect(useCallback(() => {
    if (hasFocusedRef.current) void feed.refresh();
    else hasFocusedRef.current = true;
  }, [feed.refresh]));

  useEffect(() => {
    capture(AnalyticsEvent.SharedHomeViewed, {
      signed_in: Boolean(userId),
    });
  }, [capture, userId]);

  const openDelivery = (delivery: SharedHomeDelivery) => {
    capture(AnalyticsEvent.SharedHomeDeliveryOpened, {
      event_kind: delivery.eventKind,
      source_capability: delivery.sourceCapability,
      delivery_state: delivery.state,
    });
    navigateWhenReady(...resolveSharedHomeDestination(delivery.destination));
  };

  return (
    <AppShell>
      <PageHeader title="Home" onPressMenu={capabilityShell?.openMenu} />
      <SharedHomeContent
        {...feed}
        signedIn={Boolean(userId)}
        onOpen={openDelivery}
        onReport={(delivery) => {
          if (!delivery.actorUserId) return;
          setReportTarget({
            kind: 'shared_delivery',
            id: delivery.id,
            reportedUserId: delivery.actorUserId,
            displayName: delivery.actorDisplayName?.trim() || 'this person',
            contextLabel: delivery.eventKind === 'goal_checkin' ? 'Goal check-in' : 'Shared item',
          });
        }}
        onRefresh={() => { void feed.refresh(); }}
        highlightedDeliveryId={route.params?.deliveryId}
      />
      <UgcReportDrawer
        target={reportTarget}
        onClose={() => setReportTarget(null)}
        onBlocked={() => { void feed.refresh(); }}
      />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  centeredEmptyState: {
    marginTop: 0,
  },
  stateText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  staleBanner: {
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.shellAlt,
  },
  staleText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  sectionTitle: {
    ...typography.label,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.xs,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  reportAction: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightedCard: {
    borderColor: colors.textPrimary,
    borderWidth: 2,
  },
  actorContext: {
    flex: 1,
  },
  actorText: {
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.shellAlt,
  },
  avatarText: {
    ...typography.label,
    fontFamily: fonts.semibold,
    color: colors.textPrimary,
  },
  actorName: {
    ...typography.bodySm,
    fontFamily: fonts.semibold,
    color: colors.textPrimary,
  },
  sourceLine: {
    ...typography.label,
    color: colors.textSecondary,
  },
  cardTitle: {
    ...typography.body,
    fontFamily: fonts.semibold,
    color: colors.textPrimary,
  },
  cardBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  stateLabel: {
    ...typography.caption,
    fontFamily: fonts.medium,
    color: colors.muted,
  },
});
