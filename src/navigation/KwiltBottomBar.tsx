import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography, fonts } from '../theme';
import { Icon, type IconName } from '../ui/Icon';
import { PLACE_TABS } from './placeTabs';
import { useAppStore } from '../store/useAppStore';
import {
  KWILT_BOTTOM_BAR_BOTTOM_OFFSET_PX,
  KWILT_BOTTOM_BAR_FLOATING_SIZE_PX,
  KWILT_BOTTOM_BAR_RESERVED_HEIGHT_PX,
} from './kwiltBottomBarMetrics';

function withAlpha(hex: string, alpha: number) {
  // Supports #RRGGBB. Falls back to the original string if format is unexpected.
  if (!hex || hex[0] !== '#' || hex.length !== 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (![r, g, b].every(Number.isFinite)) return hex;
  const a = Math.min(1, Math.max(0, alpha));
  return `rgba(${r},${g},${b},${a})`;
}

export function KwiltBottomBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const planRecommendationsCount = useAppStore((s) => s.planRecommendationsCount);
  const [tabLayouts, setTabLayouts] = useState<Record<string, { x: number; y: number; width: number; height: number }>>(
    {},
  );
  const indicatorX = useRef(new Animated.Value(0)).current;
  const indicatorY = useRef(new Animated.Value(0)).current;
  const indicatorWidth = useRef(new Animated.Value(0)).current;
  const indicatorHeight = useRef(new Animated.Value(0)).current;
  const indicatorReady = useRef(false);
  const badgeScale = useRef(new Animated.Value(0)).current;
  const wasShowingBadge = useRef(false);
  const activeKey = state.routes[state.index]?.key;
  const activeLayout = activeKey ? tabLayouts[activeKey] : null;
  const activeOptions = descriptors[state.routes[state.index]?.key ?? '']?.options ?? {};
  const shouldHideTabBar =
    !!activeOptions.tabBarStyle &&
    typeof activeOptions.tabBarStyle === 'object' &&
    !Array.isArray(activeOptions.tabBarStyle) &&
    'display' in activeOptions.tabBarStyle &&
    activeOptions.tabBarStyle.display === 'none';

  const placeConfigByName = PLACE_TABS.reduce<Record<string, { label: string; icon: IconName }>>(
    (acc, tab) => {
      acc[tab.name] = { label: tab.label, icon: tab.icon };
      return acc;
    },
    {},
  );
  const activeRouteName = state.routes[state.index]?.name;
  const actionIcon: IconName =
    activeRouteName === 'PlanTab'
      ? 'checklist'
      : activeRouteName === 'ActivitiesTab'
        ? 'search'
        : 'plus';
  const showActionBadge = activeRouteName === 'PlanTab' && planRecommendationsCount > 0;
  const handlePlaceItemLayout = useCallback(
    (routeKey: string) => (event: LayoutChangeEvent) => {
      const { x, y, width, height } = event.nativeEvent.layout;
      setTabLayouts((prev) => {
        const existing = prev[routeKey];
        if (
          existing &&
          existing.x === x &&
          existing.y === y &&
          existing.width === width &&
          existing.height === height
        ) {
          return prev;
        }
        return { ...prev, [routeKey]: { x, y, width, height } };
      });
    },
    [],
  );
  const handleActionPress = () => {
    if (activeRouteName === 'ActivitiesTab') {
      navigation.navigate('ActivitiesTab', {
        screen: 'ActivitiesList',
        params: { openSearch: true },
      });
      return;
    }
    if (activeRouteName === 'GoalsTab') {
      navigation.navigate('GoalsTab', {
        screen: 'GoalsList',
        params: { openCreateGoal: true },
      });
      return;
    }
    if (activeRouteName === 'PlanTab') {
      navigation.navigate('PlanTab', { openRecommendations: true });
      return;
    }
    if (activeRouteName === 'MoreTab') {
      navigation.navigate('MoreTab', {
        screen: 'MoreArcs',
        params: { screen: 'ArcsList', params: { openCreateArc: true } },
      });
      return;
    }
  };

  useEffect(() => {
    if (shouldHideTabBar) {
      // Reset indicator when tab bar is hidden so it reinitializes cleanly when shown again
      indicatorReady.current = false;
      return;
    }
    if (!activeLayout) return;
    if (!indicatorReady.current) {
      indicatorX.setValue(activeLayout.x);
      indicatorY.setValue(activeLayout.y);
      indicatorWidth.setValue(activeLayout.width);
      indicatorHeight.setValue(activeLayout.height);
      indicatorReady.current = true;
      return;
    }
    const timingConfig = {
      duration: 160,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    } as const;
    Animated.parallel([
      Animated.timing(indicatorX, { ...timingConfig, toValue: activeLayout.x }),
      Animated.timing(indicatorY, { ...timingConfig, toValue: activeLayout.y }),
      Animated.timing(indicatorWidth, { ...timingConfig, toValue: activeLayout.width }),
      Animated.timing(indicatorHeight, { ...timingConfig, toValue: activeLayout.height }),
    ]).start();
  }, [activeLayout, indicatorHeight, indicatorWidth, indicatorX, indicatorY, shouldHideTabBar]);

  useEffect(() => {
    if (shouldHideTabBar) {
      // Reset badge state when tab bar is hidden
      wasShowingBadge.current = false;
      badgeScale.setValue(0);
      return;
    }
    if (showActionBadge && !wasShowingBadge.current) {
      badgeScale.setValue(0);
      Animated.spring(badgeScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 6,
      }).start();
    }
    if (!showActionBadge) {
      badgeScale.setValue(0);
    }
    wasShowingBadge.current = showActionBadge;
  }, [badgeScale, showActionBadge, shouldHideTabBar]);

  if (shouldHideTabBar) return null;

  // Match the Activity detail “edge fade under controls” so scroll content fades under the floating bar.
  const SCRIM_ALPHA = 0.75; // => content appears at ~25% opacity at the edge.
  const scrimStrong = withAlpha(colors.canvas, SCRIM_ALPHA);
  const scrimClear = withAlpha(colors.canvas, 0);
  // 0.45 => ramp happens over ~45% of the distance; the remaining region stays near-max.
  const FADE_RAMP_FRACTION = 0.45;
  // Keep this tight: we want to fade *scroll content under the bar*, not wash over bottom docks
  // like the Activities quick-add field.
  const bottomFadeHeightPx = Math.max(0, KWILT_BOTTOM_BAR_RESERVED_HEIGHT_PX + insets.bottom);

  return (
    <>
      <View pointerEvents="none" style={[styles.bottomFade, { height: bottomFadeHeightPx }]}>
        <LinearGradient
          colors={[scrimClear, scrimStrong, scrimStrong]}
          {...({ locations: [0, FADE_RAMP_FRACTION, 1] } as any)}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>
      <View pointerEvents="box-none" style={[styles.container, { bottom: KWILT_BOTTOM_BAR_BOTTOM_OFFSET_PX }]}>
        <View style={styles.barRow}>
          <View style={styles.placeZone}>
            {indicatorReady.current ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.placeIndicator,
                  {
                    width: indicatorWidth,
                    height: indicatorHeight,
                    transform: [{ translateX: indicatorX }, { translateY: indicatorY }],
                  },
                ]}
              />
            ) : null}
            {state.routes.map((route, index) => {
              const isFocused = state.index === index;
              const options = descriptors[route.key]?.options ?? {};
              const iconName = placeConfigByName[route.name]?.icon ?? 'dot';
              const tintColor = isFocused ? colors.pine700 : colors.textSecondary;

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (event.defaultPrevented) return;

                if (isFocused) {
                  if (route.name === 'GoalsTab') {
                    navigation.navigate(route.name, { screen: 'GoalsList' });
                    return;
                  }
                  if (route.name === 'ActivitiesTab') {
                    navigation.navigate(route.name, { screen: 'ActivitiesList' });
                    return;
                  }
                }

                navigation.navigate(route.name);
              };

              const onLongPress = () => {
                navigation.emit({
                  type: 'tabLongPress',
                  target: route.key,
                });
              };

              return (
                <Pressable
                  key={route.key}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={
                    typeof options.tabBarLabel === 'string'
                      ? options.tabBarLabel
                      : typeof options.title === 'string'
                        ? options.title
                        : placeConfigByName[route.name]?.label ?? route.name
                  }
                  onLayout={handlePlaceItemLayout(route.key)}
                  style={[styles.placeItem, isFocused && styles.placeItemActive]}
                >
                  <Icon name={iconName} size={20} color={tintColor} />
                  <Text style={[styles.placeLabel, { color: tintColor }, isFocused && styles.placeLabelActive]}>
                    {placeConfigByName[route.name]?.label ?? route.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            onPress={handleActionPress}
            accessibilityRole="button"
            accessibilityLabel="Primary action"
            style={styles.actionButton}
          >
            <View style={styles.actionWrapper} pointerEvents="box-none">
              <View style={styles.actionShadow}>
                <LinearGradient
                  colors={[colors.aiGradientStart, colors.aiGradientEnd]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.actionCircle}
                >
                  <Icon name={actionIcon} size={18} color={colors.parchment} />
                </LinearGradient>
              </View>
              {showActionBadge ? (
                <Animated.View style={[styles.badge, { transform: [{ scale: badgeScale }] }]} pointerEvents="none">
                  <Text style={styles.badgeText}>
                    {planRecommendationsCount > 99 ? '99+' : String(planRecommendationsCount)}
                  </Text>
                </Animated.View>
              ) : null}
            </View>
          </Pressable>
        </View>
      </View>
    </>
  );
}

const FLOATING_SIZE = KWILT_BOTTOM_BAR_FLOATING_SIZE_PX;
const FLOATING_RADIUS = FLOATING_SIZE / 2;

const styles = StyleSheet.create({
  bottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  barRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  placeZone: {
    flex: 1,
    marginRight: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
    paddingRight: spacing.sm,
    height: FLOATING_SIZE,
    paddingVertical: 0,
    paddingHorizontal: spacing.xs,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  placeItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  placeItemActive: {
    borderColor: 'transparent',
  },
  placeLabel: {
    ...typography.caption,
    marginTop: 2,
  },
  placeLabelActive: {
    fontFamily: fonts.bold,
  },
  placeIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: 999,
    backgroundColor: colors.gray100,
    zIndex: 0,
  },
  actionButton: {},
  actionWrapper: {
    width: FLOATING_SIZE,
    height: FLOATING_SIZE,
    position: 'relative',
    overflow: 'visible',
  },
  actionShadow: {
    width: FLOATING_SIZE,
    height: FLOATING_SIZE,
    borderRadius: FLOATING_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.aiBorder,
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    overflow: 'visible',
  },
  actionCircle: {
    width: '100%',
    height: '100%',
    borderRadius: FLOATING_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 999,
    backgroundColor: colors.destructive,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    elevation: 20,
  },
  badgeText: {
    ...typography.caption,
    color: colors.primaryForeground,
    fontWeight: '700',
    includeFontPadding: false,
  },
});

