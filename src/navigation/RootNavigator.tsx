import { useEffect, useRef, useState } from 'react';
import { useWindowDimensions, View, StyleSheet, Platform } from 'react-native';
import { useAnalytics } from '../services/analytics/useAnalytics';
import {
  NavigationContainer,
  DefaultTheme,
  Theme,
  DrawerActions,
  NavigatorScreenParams,
  type NavigationState,
  type LinkingOptions,
} from '@react-navigation/native';
import { createNativeStackNavigator, type NativeStackNavigationOptions } from '@react-navigation/native-stack';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItem,
} from '@react-navigation/drawer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArcsScreen } from '../features/arcs/ArcsScreen';
import { ArcDetailScreen } from '../features/arcs/ArcDetailScreen';
import { GoalDetailScreen } from '../features/arcs/GoalDetailScreen';
import { GoalsScreen } from '../features/goals/GoalsScreen';
import { ActivitiesScreen } from '../features/activities/ActivitiesScreen';
import { ActivityDetailScreen } from '../features/activities/ActivityDetailScreen';
import { SettingsHomeScreen } from '../features/account/SettingsHomeScreen';
import { AppearanceSettingsScreen } from '../features/account/AppearanceSettingsScreen';
import { ProfileSettingsScreen } from '../features/account/ProfileSettingsScreen';
import { NotificationsSettingsScreen } from '../features/account/NotificationsSettingsScreen';
import { ManageSubscriptionScreen } from '../features/account/ManageSubscriptionScreen';
import { ChangePlanScreen } from '../features/account/ChangePlanScreen';
import { PaywallInterstitialScreen } from '../features/paywall/PaywallInterstitialScreen';
import { PaywallDrawerHost } from '../features/paywall/PaywallDrawer';
import { ToastHost } from '../ui/ToastHost';
import { colors, spacing, typography } from '../theme';
import { Icon, IconName } from '../ui/Icon';
import { Input } from '../ui/Input';
import { DevToolsScreen } from '../features/dev/DevToolsScreen';
import { ArcTestingResultsPage } from '../features/dev/ArcTestingResultsPage';
import { useAppStore } from '../store/useAppStore';
import { ProfileAvatar } from '../ui/ProfileAvatar';
import { Badge } from '../ui/Badge';
import { rootNavigationRef } from './rootNavigationRef';
import type {
  ActivityDetailRouteParams,
  GoalDetailRouteParams,
  ActivitiesListRouteParams,
} from './routeParams';

export type RootDrawerParamList = {
  ArcsStack: NavigatorScreenParams<ArcsStackParamList> | undefined;
  Goals: NavigatorScreenParams<GoalsStackParamList> | undefined;
  Activities: NavigatorScreenParams<ActivitiesStackParamList> | undefined;
  Settings: NavigatorScreenParams<SettingsStackParamList> | undefined;
  DevTools:
    | {
        initialTab?: 'tools' | 'gallery' | 'typeColor' | 'arcTesting' | 'memory' | 'e2e';
      }
    | undefined;
  DevArcTestingResults:
    | {
        mode: 'full' | 'response';
        responseId?: string;
        /**
         * Generation model under test (e.g. gpt-4o-mini vs gpt-5.2).
         */
        model?: string;
        /**
         * How to compute rubric scores.
         */
        scoringMode?: 'heuristic' | 'ai';
        /**
         * Optional judge model used when scoringMode === 'ai'.
         * Defaults to gpt-4o-mini if omitted.
         */
        judgeModel?: string;
      }
    | undefined;
};

export type { ActivityDetailRouteParams, GoalDetailRouteParams } from './routeParams';

export type ArcsStackParamList = {
  ArcsList: undefined;
  ArcDetail: {
    arcId: string;
    /**
     * When true, ArcDetail should immediately open the Goal creation wizard
     * so the user can adopt a new goal for this Arc without hunting for the
     * inline button.
     */
    openGoalCreation?: boolean;
    /**
     * When true, ArcDetail should show the first-Arc celebration interstitial
     * on first mount so the transition from onboarding feels intentional.
     */
    showFirstArcCelebration?: boolean;
  };
  GoalDetail: GoalDetailRouteParams;
  ActivityDetailFromGoal: ActivityDetailRouteParams;
};

export type GoalsStackParamList = {
  GoalsList: undefined;
  GoalDetail: GoalDetailRouteParams;
  ActivityDetailFromGoal: ActivityDetailRouteParams;
};

export type ActivitiesStackParamList = {
  ActivitiesList: ActivitiesListRouteParams | undefined;
  ActivityDetail: ActivityDetailRouteParams;
};

export type SettingsStackParamList = {
  SettingsHome: undefined;
  SettingsAppearance: undefined;
  SettingsProfile: undefined;
  SettingsAiModel: undefined;
  SettingsNotifications: undefined;
  SettingsManageSubscription:
    | {
        /**
         * When true, open the plan/pricing bottom drawer immediately on mount/focus.
         * Useful when arriving from an in-context paywall CTA.
         */
        openPricingDrawer?: boolean;
        /**
         * Optional nonce to force re-opening the drawer even if already on the
         * subscriptions screen (e.g. paywall overlay).
         */
        openPricingDrawerNonce?: number;
      }
    | undefined;
  SettingsChangePlan: undefined;
  SettingsPaywall: {
    reason: import('../services/paywall').PaywallReason;
    source: import('../services/paywall').PaywallSource;
  };
};

const ArcsStack = createNativeStackNavigator<ArcsStackParamList>();
const GoalsStack = createNativeStackNavigator<GoalsStackParamList>();
const ActivitiesStack = createNativeStackNavigator<ActivitiesStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();
const Drawer = createDrawerNavigator<RootDrawerParamList>();
// Match the AppShell's top gutter so the drawer content aligns with the page header.
const NAV_DRAWER_TOP_OFFSET = spacing.sm;
// Bump this key whenever the top-level navigator structure changes in a way
// that could make previously persisted state incompatible (for example,
// renaming routes like "Arcs" -> "ArcsStack" or nesting a tab inside a stack).
// This ensures we don't restore stale navigation state that can prevent certain
// screens (like Arcs or Goals) from being reachable or animating correctly.
// Prefix with "kwilt" so new installs don't carry any legacy LOMO state keys.
const NAV_PERSISTENCE_KEY = 'kwilt-nav-state-v2';

const STACK_SCREEN_OPTIONS: NativeStackNavigationOptions = {
  headerShown: false,
  // Use a consistent horizontal slide animation so all intra-stack transitions
  // (e.g., list → detail) feel like part of the same flow, regardless of which
  // top-level canvas the user is on.
  animation: 'slide_from_right',
  animationTypeForReplace: 'push',
  fullScreenGestureEnabled: true,
};

const navTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.canvas,
    card: colors.canvas,
    border: colors.border,
    text: colors.textPrimary,
    primary: colors.accent,
  },
};

type TrackScreenFn = (
  screenName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params?: Record<string, any>,
) => void;

function RootNavigatorBase({ trackScreen }: { trackScreen?: TrackScreenFn }) {
  const { width } = useWindowDimensions();
  const drawerWidth = width * 0.8;
  const showDevTools = __DEV__;

  const [isNavReady, setIsNavReady] = useState(false);
  const [initialState, setInitialState] = useState<NavigationState | undefined>(undefined);
  const lastTrackedRouteNameRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;

    const restoreState = async () => {
      try {
        // On web, let the URL drive navigation instead of persisted state.
        if (Platform.OS === 'web') {
          return;
        }

        const savedStateString = await AsyncStorage.getItem(NAV_PERSISTENCE_KEY);
        if (savedStateString) {
          const state = JSON.parse(savedStateString) as NavigationState;

          // Defensive guard: if the persisted root routes don't match the
          // current drawer structure, ignore the saved state so navigation
          // can re-initialize cleanly.
          const allowedRootRoutes: Array<keyof RootDrawerParamList> = [
            'ArcsStack',
            'Goals',
            'Activities',
            'Settings',
            ...(showDevTools ? (['DevTools', 'DevArcTestingResults'] as const) : []),
          ];

          const rootHasUnexpectedRoute =
            !state?.routes ||
            state.routes.some(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (route: any) => !allowedRootRoutes.includes(route.name as keyof RootDrawerParamList),
            );

          if (!rootHasUnexpectedRoute && isMounted) {
            setInitialState(state);
          }
        }
      } catch (e) {
        console.warn('Failed to load navigation state', e);
      } finally {
        if (isMounted) {
          setIsNavReady(true);
        }
      }
    };

    restoreState();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!isNavReady) {
    // Let the app shell/font loading in App.tsx handle the visible loading state.
    return null;
  }

  // Deep links embedded in calendar events and share surfaces.
  // Example: `kwilt://activity/<id>?openFocus=1`
  const linking: LinkingOptions<RootDrawerParamList> = {
    prefixes: ['kwilt://'],
    config: {
      screens: {
        Activities: {
          screens: {
            ActivityDetail: {
              path: 'activity/:activityId',
              parse: {
                openFocus: (v: string) => v === '1' || v === 'true',
              },
            },
          },
        },
      },
    },
  };

  return (
    <NavigationContainer
      ref={rootNavigationRef}
      theme={navTheme}
      initialState={initialState}
      linking={linking}
      onReady={() => {
        const currentRoute = rootNavigationRef.getCurrentRoute();
        if (currentRoute?.name) {
          lastTrackedRouteNameRef.current = currentRoute.name;
          trackScreen?.(currentRoute.name, currentRoute.params as any);
        }
      }}
      onStateChange={(state) => {
        if (!state) return;
        AsyncStorage.setItem(NAV_PERSISTENCE_KEY, JSON.stringify(state)).catch((e) => {
          console.warn('Failed to persist navigation state', e);
        });

        const activeRoute = getActiveRoute(state);
        const routeName = activeRoute?.name;
        if (routeName && routeName !== lastTrackedRouteNameRef.current) {
          lastTrackedRouteNameRef.current = routeName;
          trackScreen?.(routeName, activeRoute?.params as any);
        }
      }}
    >
      <Drawer.Navigator
        drawerContent={(props) => <KwiltDrawerContent {...props} />}
        // Normalize drawer behavior so that tapping a primary nav item always
        // lands on its top-level canvas list, even if the current nested
        // screen is a deep detail view like GoalDetail or ActivityDetail. This
        // keeps the mental model of the primary nav items mapping to their
        // root canvases.
        screenListeners={({ navigation, route }) => ({
          drawerItemPress: (event) => {
            if (route.name === 'ArcsStack') {
              // Override the default so we always jump to the ArcsList screen
              // inside the Arcs stack instead of treating a tap on an already
              // focused drawer item as a no-op.
              event.preventDefault();
              navigation.navigate('ArcsStack', {
                screen: 'ArcsList',
              });
              return;
            }

            if (route.name === 'Goals') {
              event.preventDefault();
              navigation.navigate('Goals', {
                screen: 'GoalsList',
              });
              return;
            }

            if (route.name === 'Activities') {
              event.preventDefault();
              navigation.navigate('Activities', {
                screen: 'ActivitiesList',
              });
            }
          },
        })}
        screenOptions={({ route }) => ({
          headerShown: false,
          // Use "slide" so the entire app canvas shifts right while the drawer stays pinned,
          // similar to the ChatGPT mobile app behavior.
          drawerType: 'slide',
          drawerStyle: {
            backgroundColor: colors.canvas,
            width: drawerWidth,
          },
          overlayColor: 'rgba(15,23,42,0.35)',
          sceneContainerStyle: {
            backgroundColor: colors.shell,
          },
          drawerActiveTintColor: colors.accent,
          drawerInactiveTintColor: colors.textSecondary,
          drawerLabelStyle: {
            ...typography.bodySm,
          },
          drawerItemStyle: {
            borderRadius: 12,
            marginVertical: spacing.xs / 4,
            paddingVertical: spacing.xs / 8,
            minHeight: 32,
          },
          drawerIcon: ({ color, size }) => {
            const iconName = getDrawerIcon(route.name as keyof RootDrawerParamList);
            return <Icon name={iconName} color={color} size={size ?? 20} />;
          },
        })}
        initialRouteName="Activities"
      >
        <Drawer.Screen
          name="ArcsStack"
          component={ArcsStackNavigator}
          options={{ title: 'Arcs' }}
        />
        <Drawer.Screen
          name="Goals"
          component={GoalsStackNavigator}
          options={{ title: 'Goals' }}
        />
        <Drawer.Screen
          name="Activities"
          component={ActivitiesStackNavigator}
          options={{ title: 'Activities' }}
        />
        {showDevTools && (
          <>
            <Drawer.Screen
              name="DevTools"
              component={DevToolsScreen}
              options={{ title: 'Dev Mode' }}
            />
            <Drawer.Screen
              name="DevArcTestingResults"
              component={ArcTestingResultsPage}
              options={{
                title: 'Arc Testing Results',
                drawerItemStyle: { display: 'none' },
              }}
            />
          </>
        )}
        <Drawer.Screen
          name="Settings"
          component={SettingsStackNavigator}
          options={{ title: 'Settings' }}
        />
      </Drawer.Navigator>
      <PaywallDrawerHost />
      <ToastHost />
    </NavigationContainer>
  );
}

export function RootNavigator() {
  return <RootNavigatorBase />;
}

export function RootNavigatorWithPostHog() {
  const { posthog } = useAnalytics();

  return (
    <RootNavigatorBase
      trackScreen={(screenName, params) => {
        try {
          posthog?.screen(screenName, params);
        } catch (error) {
          if (__DEV__) {
            console.warn('[posthog] failed to capture screen', error);
          }
        }
      }}
    />
  );
}

function getActiveRoute(
  state: NavigationState | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): { name: string; params?: any } | undefined {
  if (!state?.routes?.length) return undefined;
  const route: any = state.routes[state.index ?? 0];
  if (!route) return undefined;
  if (route.state) {
    return getActiveRoute(route.state as NavigationState) ?? { name: route.name, params: route.params };
  }
  return { name: route.name, params: route.params };
}

function ArcsStackNavigator() {
  return (
    <ArcsStack.Navigator screenOptions={STACK_SCREEN_OPTIONS}>
      <ArcsStack.Screen name="ArcsList" component={ArcsScreen} />
      <ArcsStack.Screen name="ArcDetail" component={ArcDetailScreen} />
      <ArcsStack.Screen name="GoalDetail" component={GoalDetailScreen} />
      <ArcsStack.Screen name="ActivityDetailFromGoal" component={ActivityDetailScreen} />
    </ArcsStack.Navigator>
  );
}

function GoalsStackNavigator() {
  return (
    <GoalsStack.Navigator
      // Mirror the Arcs stack so Goals → GoalDetail (and back) use the same
      // horizontal slide transition semantics.
      screenOptions={STACK_SCREEN_OPTIONS}
    >
      <GoalsStack.Screen name="GoalsList" component={GoalsScreen} />
      <GoalsStack.Screen name="GoalDetail" component={GoalDetailScreen} />
      <GoalsStack.Screen name="ActivityDetailFromGoal" component={ActivityDetailScreen} />
    </GoalsStack.Navigator>
  );
}

function ActivitiesStackNavigator() {
  return (
    <ActivitiesStack.Navigator screenOptions={STACK_SCREEN_OPTIONS}>
      <ActivitiesStack.Screen name="ActivitiesList" component={ActivitiesScreen} />
      <ActivitiesStack.Screen name="ActivityDetail" component={ActivityDetailScreen} />
    </ActivitiesStack.Navigator>
  );
}

function SettingsStackNavigator() {
  return (
    <SettingsStack.Navigator screenOptions={{ headerShown: false }}>
      <SettingsStack.Screen name="SettingsHome" component={SettingsHomeScreen} />
      <SettingsStack.Screen
        name="SettingsAppearance"
        component={AppearanceSettingsScreen}
      />
      <SettingsStack.Screen
        name="SettingsProfile"
        component={ProfileSettingsScreen}
      />
      <SettingsStack.Screen
        name="SettingsAiModel"
        component={require('../features/account/AiModelSettingsScreen').AiModelSettingsScreen}
      />
      <SettingsStack.Screen
        name="SettingsNotifications"
        component={NotificationsSettingsScreen}
      />
      <SettingsStack.Screen
        name="SettingsManageSubscription"
        component={ManageSubscriptionScreen}
      />
      <SettingsStack.Screen
        name="SettingsChangePlan"
        component={ChangePlanScreen}
      />
      <SettingsStack.Screen
        name="SettingsPaywall"
        component={PaywallInterstitialScreen}
      />
    </SettingsStack.Navigator>
  );
}

function getDrawerIcon(routeName: keyof RootDrawerParamList): IconName {
  switch (routeName) {
    case 'ArcsStack':
      return 'arcs';
    case 'Goals':
      return 'goals';
    case 'Activities':
      return 'activities';
    case 'Settings':
      return 'dot';
    case 'DevTools':
      return 'dev';
    case 'DevArcTestingResults':
      return 'dev';
    default:
      return 'dot';
  }
}

function KwiltDrawerContent(props: any) {
  const insets = useSafeAreaInsets();
  const userProfile = useAppStore((state) => state.userProfile);
  const arcs = useAppStore((state) => state.arcs);

  const generatedNameFromFirstArc = (() => {
    let firstArcName: string | null = null;
    let firstArcCreatedAt: string | null = null;
    for (const arc of arcs) {
      const arcName = arc?.name?.trim();
      if (!arcName) continue;
      if (!firstArcCreatedAt || arc.createdAt < firstArcCreatedAt) {
        firstArcCreatedAt = arc.createdAt;
        firstArcName = arcName;
      }
    }
    return firstArcName;
  })();

  const displayName = userProfile?.fullName?.trim() || generatedNameFromFirstArc || 'Kwilter';
  const subscriptionLabel = 'Kwilt Free';

  // Hide the top-level Settings item from the drawer list while keeping the
  // Settings screen available for navigation from the profile row.
  const activeRoute = props.state.routes[props.state.index];
  const activeRouteName = activeRoute?.name as keyof RootDrawerParamList | undefined;

  const devToolsRoute = props.state.routes.find((route: { name: string }) => route.name === 'DevTools');
  const mainRoutes = props.state.routes.filter(
    (route: { name: string }) =>
      route.name !== 'Settings' &&
      route.name !== 'DevArcTestingResults' &&
      route.name !== 'DevTools',
  );

  const navigateFromDrawer = (routeName: keyof RootDrawerParamList) => {
    if (routeName === 'ArcsStack') {
      props.navigation.navigate('ArcsStack', { screen: 'ArcsList' });
      props.navigation.dispatch(DrawerActions.closeDrawer());
      return;
    }

    if (routeName === 'Goals') {
      props.navigation.navigate('Goals', { screen: 'GoalsList' });
      props.navigation.dispatch(DrawerActions.closeDrawer());
      return;
    }

    if (routeName === 'Activities') {
      props.navigation.navigate('Activities', { screen: 'ActivitiesList' });
      props.navigation.dispatch(DrawerActions.closeDrawer());
      return;
    }

    props.navigation.navigate(routeName as any);
    props.navigation.dispatch(DrawerActions.closeDrawer());
  };

  const getDrawerLabel = (route: { key: string; name: keyof RootDrawerParamList }) => {
    const options = props.descriptors?.[route.key]?.options ?? {};
    if (typeof options.drawerLabel === 'string' && options.drawerLabel.trim()) {
      return options.drawerLabel.trim();
    }
    if (typeof options.title === 'string' && options.title.trim()) {
      return options.title.trim();
    }
    return route.name;
  };

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={[
        styles.drawerContentContainer,
        {
          paddingTop: insets.top + NAV_DRAWER_TOP_OFFSET,
          // Keep the footer (Dev Mode + Profile) visually anchored to the bottom.
          // Use minimal safe-area padding so it doesn't float upward.
          paddingBottom: spacing.sm + insets.bottom,
        },
      ]}
    >
      {/* Search is temporarily disabled until navigation search is implemented. */}
      {/*
      <View style={styles.drawerHeader}>
        <Input
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search arcs, goals, activities"
          accessibilityLabel="Search navigation"
          leadingIcon="search"
          returnKeyType="search"
          clearButtonMode="while-editing"
          containerStyle={styles.searchContainer}
        />
      </View>
      */}
      <View style={styles.drawerLayout}>
        <View style={styles.drawerTop}>
          <View style={styles.drawerMainItems}>
            {mainRoutes.map((route: { key: string; name: keyof RootDrawerParamList }) => {
              const focused = route.key === activeRoute?.key;
              const label = getDrawerLabel(route);
              const iconName = getDrawerIcon(route.name);

              return (
                <DrawerItem
                  key={route.key}
                  testID={`nav.drawer.item.${String(route.name)}`}
                  label={label}
                  focused={focused}
                  onPress={() => navigateFromDrawer(route.name)}
                  icon={({ color, size }) => (
                    <Icon name={iconName} color={color} size={size ?? 20} />
                  )}
                  activeTintColor={colors.accent}
                  inactiveTintColor={colors.textSecondary}
                  activeBackgroundColor={colors.pine100}
                  inactiveBackgroundColor="transparent"
                  labelStyle={styles.drawerLabel}
                  style={styles.drawerItem}
                />
              );
            })}
          </View>
        </View>

        <View style={styles.drawerBottom}>
          {!!devToolsRoute && (
            <DrawerItem
              testID="nav.drawer.item.DevTools"
              label={getDrawerLabel(devToolsRoute)}
              focused={activeRouteName === 'DevTools'}
              onPress={() => navigateFromDrawer('DevTools')}
              icon={({ color, size }) => (
                <Icon name={getDrawerIcon('DevTools')} color={color} size={size ?? 20} />
              )}
              activeTintColor={colors.accent}
              inactiveTintColor={colors.textSecondary}
              activeBackgroundColor={colors.pine100}
              inactiveBackgroundColor="transparent"
              labelStyle={styles.drawerLabel}
              style={styles.drawerItem}
            />
          )}

          <Pressable
            style={styles.profileRow}
            accessibilityRole="button"
            accessibilityLabel="View profile and settings"
            onPress={() => {
              props.navigation.navigate('Settings');
              props.navigation.dispatch(DrawerActions.closeDrawer());
            }}
          >
            <ProfileAvatar
              name={displayName}
              avatarUrl={userProfile?.avatarUrl}
              size={36}
              borderRadius={18}
              style={styles.avatarPlaceholder}
            />
            <View style={styles.profileTextBlock}>
              <Text style={styles.profileName} numberOfLines={1}>
                {displayName}
              </Text>
              <Badge variant="secondary" style={styles.subscriptionBadge}>
                {subscriptionLabel}
              </Badge>
            </View>
          </Pressable>
        </View>
      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  drawerContentContainer: {
    // DrawerContentScrollView uses contentContainerStyle; `flexGrow` is the
    // reliable way to make the content fill the viewport height.
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
  },
  drawerHeader: {
    marginBottom: spacing.lg,
  },
  searchContainer: {
  },
  drawerLayout: {
    flex: 1,
    justifyContent: 'space-between',
  },
  drawerTop: {
    flex: 1,
  },
  drawerMainItems: {
    paddingTop: spacing.lg,
  },
  drawerBottom: {
    // Keep this section tight so it sits lower in the drawer.
    paddingTop: spacing.md,
    marginTop: spacing.md,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.shell,
  },
  profileTextBlock: {
    flex: 1,
  },
  profileName: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  subscriptionBadge: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs / 2,
  },
  drawerItem: {
    borderRadius: 12,
    marginVertical: spacing.xs / 4,
    paddingVertical: spacing.xs / 8,
    minHeight: 32,
  },
  drawerLabel: {
    ...typography.bodySm,
  },
});



