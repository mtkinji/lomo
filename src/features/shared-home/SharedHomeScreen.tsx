import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRoute, type RouteProp } from '@react-navigation/native';

import type { RootDrawerParamList } from '../../navigation/RootNavigator';
import { useCapabilityShellOptional } from '../../navigation/CapabilityShellContext';
import { navigateWhenReady } from '../../navigation/rootNavigationRef';
import { useAppStore } from '../../store/useAppStore';
import { colors, fonts, spacing, typography } from '../../theme';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { Button, Card, EmptyState, HStack, Text, VStack } from '../../ui/primitives';
import { AnalyticsEvent } from '../../services/analytics/events';
import { useAnalytics } from '../../services/analytics/useAnalytics';
import { resolveSharedHomeDestination } from './sharedHomeDestination';
import { groupSharedHomeDeliveries } from './sharedHomePresentation';
import type { SharedHomeDelivery } from './sharedHomeTypes';
import { useSharedHomeFeed, type SharedHomeFeedState } from './useSharedHomeFeed';
import { KwiltLoader } from '../../ui/KwiltLoader';
import { KwiltRefreshFrame, useKwiltRefresh } from '../../ui/KwiltRefresh';
import { Icon } from '../../ui/Icon';
import { Pressable } from '../../ui/HapticPressable';
import { UgcReportDrawer } from '../safety/UgcReportDrawer';
import type { UgcReportTarget } from '../../services/ugcSafety';
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

function relativeTime(value: string, now: Date): string {
  const elapsedMinutes = Math.max(0, Math.floor((now.getTime() - new Date(value).getTime()) / 60_000));
  if (elapsedMinutes < 1) return 'Just now';
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;
  const hours = Math.floor(elapsedMinutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function capabilityLabel(delivery: SharedHomeDelivery): string {
  return delivery.sourceCapability === 'goals' ? 'Goals' : 'Games';
}

function actionLabel(delivery: SharedHomeDelivery): string {
  if (delivery.eventKind === 'goal_invitation') return 'Review invitation';
  if (delivery.eventKind === 'goal_checkin') return 'Open Goal';
  return 'Take your turn';
}

function actorInitials(value: string | null): string {
  const words = value?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (words.length === 0) return 'K';
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join('');
}

function DeliveryCard({
  delivery,
  now,
  onOpen,
  onReport,
  highlighted = false,
}: {
  delivery: SharedHomeDelivery;
  now: Date;
  onOpen: () => void;
  onReport?: () => void;
  highlighted?: boolean;
}) {
  const actionable = delivery.state === 'pending' || delivery.state === 'available';
  return (
    <View testID={`sharedHome.item.${delivery.id}`}>
      <Card padding="sm" marginVertical="xs" elevation="none" style={[styles.card, highlighted && styles.highlightedCard]}>
        <VStack space="sm">
          <HStack alignItems="center" justifyContent="space-between" space="sm">
            <HStack alignItems="center" space="sm" style={styles.actorContext}>
              <View style={styles.avatar} accessibilityElementsHidden>
                <Text style={styles.avatarText}>{actorInitials(delivery.actorDisplayName)}</Text>
              </View>
              <VStack space="xs" style={styles.actorText}>
                <Text style={styles.actorName}>{delivery.actorDisplayName ?? 'Someone in Kwilt'}</Text>
                <Text style={styles.sourceLine}>
                  {capabilityLabel(delivery)} · {relativeTime(delivery.createdAt, now)}
                </Text>
              </VStack>
            </HStack>
            {onReport ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Report content from ${delivery.actorDisplayName ?? 'this person'}`}
                onPress={onReport}
                hitSlop={8}
                style={styles.reportAction}
              >
                <Icon name="more" size={18} color={colors.textSecondary} />
              </Pressable>
            ) : null}
          </HStack>
          <VStack space="xs">
            <Text style={styles.cardTitle}>{delivery.title}</Text>
            <Text style={styles.cardBody}>{delivery.body}</Text>
          </VStack>
          {actionable ? (
            <Button
              size="sm"
              variant={delivery.state === 'pending' ? 'primary' : 'outline'}
              accessibilityLabel={`${actionLabel(delivery)} from ${delivery.actorDisplayName ?? 'your family'}`}
              onPress={onOpen}
            >
              {actionLabel(delivery)}
            </Button>
          ) : (
            <Text style={styles.stateLabel}>
              {delivery.state === 'unavailable'
                ? 'Unavailable'
                : delivery.state === 'expired'
                  ? 'Expired'
                  : 'Handled'}
            </Text>
          )}
        </VStack>
      </Card>
    </View>
  );
}

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
