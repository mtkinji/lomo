import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Portal } from '@rn-primitives/portal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MainTabsParamList } from './RootNavigator';
import { colors, spacing } from '../theme';
import {
  KWILT_BOTTOM_BAR_RESERVED_HEIGHT_PX,
} from './kwiltBottomBarMetrics';

type TabRouteName = keyof MainTabsParamList;

type TabTransitionGhostProps = {
  routeName: TabRouteName;
  visible: boolean;
  onExited: () => void;
};

export function TabTransitionGhost({ routeName, visible, onExited }: TabTransitionGhostProps) {
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: visible ? 90 : 120,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !visible) onExited();
    });
  }, [onExited, opacity, visible]);

  return (
    <Portal name="tab-transition-ghost">
      <Animated.View
        pointerEvents="none"
        style={[
          styles.overlay,
          {
            paddingTop: insets.top + spacing.sm,
            bottom: KWILT_BOTTOM_BAR_RESERVED_HEIGHT_PX + insets.bottom + spacing.sm,
            opacity,
          },
        ]}
      >
        <View style={styles.canvas}>
          <HeaderGhost />
          {routeName === 'GoalsTab' ? <GoalsGhost /> : null}
          {routeName === 'ActivitiesTab' ? <ActivitiesGhost /> : null}
          {routeName === 'PlanTab' ? <PlanGhost /> : null}
          {routeName === 'MoreTab' ? <MoreGhost /> : null}
        </View>
      </Animated.View>
    </Portal>
  );
}

export function shouldShowTabTransitionGhost(routeName: string): routeName is TabRouteName {
  return routeName === 'GoalsTab' || routeName === 'ActivitiesTab';
}

function HeaderGhost() {
  return (
    <View style={styles.header}>
      <View style={styles.titleBlock} />
      <View style={styles.headerRight}>
        <View style={styles.capsule} />
        <View style={styles.avatar} />
      </View>
    </View>
  );
}

function GoalsGhost() {
  return (
    <View style={styles.masonryRow}>
      <View style={styles.masonryColumn}>
        <GhostCard height={176} />
        <GhostCard height={132} />
      </View>
      <View style={styles.masonryColumn}>
        <GhostCard height={132} />
        <GhostCard height={188} />
      </View>
    </View>
  );
}

function ActivitiesGhost() {
  return (
    <View style={styles.list}>
      <View style={styles.toolbarRow}>
        <View style={styles.toolbarChipLarge} />
        <View style={styles.toolbarChip} />
        <View style={styles.toolbarChip} />
      </View>
      {Array.from({ length: 6 }).map((_, index) => (
        <View key={index} style={styles.row}>
          <View style={styles.rowCheck} />
          <View style={styles.rowBody}>
            <View style={styles.rowTitle} />
            <View style={styles.rowMeta} />
          </View>
        </View>
      ))}
      <View style={styles.quickAddGhost} />
    </View>
  );
}

function PlanGhost() {
  return (
    <View style={styles.planGrid}>
      <View style={styles.dateStrip} />
      {Array.from({ length: 7 }).map((_, index) => (
        <View key={index} style={styles.calendarLine} />
      ))}
    </View>
  );
}

function MoreGhost() {
  return (
    <View style={styles.list}>
      {Array.from({ length: 5 }).map((_, index) => (
        <View key={index} style={styles.moreRow}>
          <View style={styles.moreIcon} />
          <View style={styles.moreText} />
        </View>
      ))}
    </View>
  );
}

function GhostCard({ height }: { height: number }) {
  return (
    <View style={[styles.card, { height }]}>
      <View style={styles.cardHero} />
      <View style={styles.cardLineLarge} />
      <View style={styles.cardLine} />
    </View>
  );
}

const ghostFill = 'rgba(245, 245, 244, 0.94)';
const ghostStrong = 'rgba(231, 229, 228, 0.92)';

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.canvas,
    zIndex: 900,
    paddingHorizontal: spacing.sm,
  },
  canvas: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: colors.canvas,
  },
  header: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  titleBlock: {
    width: 128,
    height: 34,
    borderRadius: 8,
    backgroundColor: ghostStrong,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  capsule: {
    width: 128,
    height: 42,
    borderRadius: 999,
    backgroundColor: ghostFill,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: ghostStrong,
  },
  masonryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  masonryColumn: {
    flex: 1,
    gap: spacing.sm,
  },
  card: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    backgroundColor: ghostFill,
    padding: spacing.sm,
    overflow: 'hidden',
  },
  cardHero: {
    height: 52,
    borderRadius: 6,
    backgroundColor: ghostStrong,
    marginBottom: spacing.sm,
  },
  cardLineLarge: {
    width: '78%',
    height: 16,
    borderRadius: 999,
    backgroundColor: ghostStrong,
    marginBottom: spacing.xs,
  },
  cardLine: {
    width: '52%',
    height: 12,
    borderRadius: 999,
    backgroundColor: ghostStrong,
  },
  list: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  toolbarRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  toolbarChipLarge: {
    width: 108,
    height: 34,
    borderRadius: 999,
    backgroundColor: ghostStrong,
  },
  toolbarChip: {
    width: 72,
    height: 34,
    borderRadius: 999,
    backgroundColor: ghostFill,
  },
  row: {
    minHeight: 64,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  rowCheck: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: ghostStrong,
  },
  rowBody: {
    flex: 1,
    gap: spacing.xs,
  },
  rowTitle: {
    width: '72%',
    height: 15,
    borderRadius: 999,
    backgroundColor: ghostStrong,
  },
  rowMeta: {
    width: '44%',
    height: 11,
    borderRadius: 999,
    backgroundColor: ghostFill,
  },
  quickAddGhost: {
    marginTop: spacing.sm,
    height: 52,
    borderRadius: 999,
    backgroundColor: ghostFill,
  },
  planGrid: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  dateStrip: {
    height: 64,
    borderRadius: 8,
    backgroundColor: ghostFill,
  },
  calendarLine: {
    height: 1,
    backgroundColor: colors.border,
  },
  moreRow: {
    height: 64,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  moreIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: ghostFill,
  },
  moreText: {
    width: '58%',
    height: 15,
    borderRadius: 999,
    backgroundColor: ghostStrong,
  },
});
