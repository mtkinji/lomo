import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
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

type SharedHomeContentProps = Pick<
  SharedHomeFeedState,
  'items' | 'loading' | 'refreshing' | 'stale' | 'error'
> & {
  signedIn: boolean;
  now?: Date;
  onOpen: (delivery: SharedHomeDelivery) => void;
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
  return delivery.eventKind === 'goal_invitation' ? 'Review invitation' : 'Take your turn';
}

function DeliveryCard({
  delivery,
  now,
  onOpen,
  highlighted = false,
}: {
  delivery: SharedHomeDelivery;
  now: Date;
  onOpen: () => void;
  highlighted?: boolean;
}) {
  const actionable = delivery.state === 'pending';
  return (
    <View testID={`sharedHome.item.${delivery.id}`}>
    <Card padding="sm" marginVertical="xs" elevation="none" style={[styles.card, highlighted && styles.highlightedCard]}>
      <VStack space="sm">
        <HStack alignItems="center" justifyContent="space-between" space="sm">
          <Text style={styles.source}>{capabilityLabel(delivery)}</Text>
          <Text style={styles.time}>{relativeTime(delivery.createdAt, now)}</Text>
        </HStack>
        <VStack space="xs">
          <Text style={styles.cardTitle}>{delivery.title}</Text>
          <Text style={styles.cardBody}>{delivery.body}</Text>
        </VStack>
        {actionable ? (
          <Button
            size="sm"
            variant="primary"
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
  onRefresh,
  highlightedDeliveryId,
}: SharedHomeContentProps) {
  const insets = useSafeAreaInsets();
  const groups = useMemo(() => groupSharedHomeDeliveries(items, now), [items, now]);
  const empty = groups.needsYou.length === 0 && groups.recent.length === 0;

  return (
    <ScrollView
      testID="sharedHome.screen"
      contentContainerStyle={[styles.content, { paddingBottom: spacing['2xl'] + insets.bottom }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {loading && empty ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.textSecondary} />
          <Text style={styles.stateText}>Loading shared activity…</Text>
        </View>
      ) : !signedIn ? (
        <EmptyState
          variant="screen"
          iconName="home"
          title="Shared activity stays with your account"
          instructions="Sign in to see invitations and game turns sent to you."
        />
      ) : error && empty ? (
        <EmptyState
          variant="screen"
          iconName="inbox"
          title="Shared activity could not be loaded"
          instructions="Check your connection and try again."
          primaryAction={{ label: 'Try again', onPress: onRefresh }}
        />
      ) : empty ? (
        <EmptyState
          variant="screen"
          iconName="inbox"
          title="Nothing needs you right now"
          instructions="Invitations and game turns sent to you will appear here."
        />
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
                  highlighted={delivery.id === highlightedDeliveryId}
                />
              ))}
            </View>
          ) : null}
          {groups.recent.length > 0 ? (
            <View testID="sharedHome.recent">
              <Text style={styles.sectionTitle}>Recent</Text>
              {groups.recent.map((delivery) => (
                <DeliveryCard
                  key={delivery.id}
                  delivery={delivery}
                  now={now}
                  onOpen={() => onOpen(delivery)}
                  highlighted={delivery.id === highlightedDeliveryId}
                />
              ))}
            </View>
          ) : null}
        </VStack>
      )}
    </ScrollView>
  );
}

export function SharedHomeScreen() {
  const capabilityShell = useCapabilityShellOptional();
  const userId = useAppStore((state) => state.authIdentity?.userId ?? null);
  const feed = useSharedHomeFeed(userId);
  const { capture } = useAnalytics();
  const route = useRoute<RouteProp<RootDrawerParamList, 'SharedHome'>>();
  const hasFocusedRef = useRef(false);

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
        onRefresh={() => { void feed.refresh(); }}
        highlightedDeliveryId={route.params?.deliveryId}
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
  loading: {
    flex: 1,
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
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
  highlightedCard: {
    borderColor: colors.textPrimary,
    borderWidth: 2,
  },
  source: {
    ...typography.label,
    color: colors.textSecondary,
  },
  time: {
    ...typography.caption,
    color: colors.muted,
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
