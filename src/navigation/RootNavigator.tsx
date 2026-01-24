import { useEffect, useRef, useState } from 'react';
import { useWindowDimensions, View, StyleSheet, Platform, Text, Pressable, Linking } from 'react-native';
import { useAnalytics } from '../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../services/analytics/events';
import {
  NavigationContainer,
  DefaultTheme,
  Theme,
  DrawerActions,
  NavigatorScreenParams,
  getFocusedRouteNameFromRoute,
  type NavigationState,
  type LinkingOptions,
} from '@react-navigation/native';
import { createNativeStackNavigator, type NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItem,
} from '@react-navigation/drawer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArcsScreen } from '../features/arcs/ArcsScreen';
import { ArcDetailScreen } from '../features/arcs/ArcDetailScreen';
import { GoalDetailScreen } from '../features/arcs/GoalDetailScreen';
import { GoalsScreen } from '../features/goals/GoalsScreen';
import { JoinSharedGoalScreen } from '../features/goals/JoinSharedGoalScreen';
import { ActivitiesScreen } from '../features/activities/ActivitiesScreen';
import { ActivityDetailScreen } from '../features/activities/ActivityDetailScreen';
import { PlanScreen } from '../features/plan/PlanScreen';
import { PlanAvailabilitySettingsScreen } from '../features/plan/PlanAvailabilitySettingsScreen';
import { PlanCalendarSettingsScreen } from '../features/plan/PlanCalendarSettingsScreen';
import { AiChatScreen } from '../features/ai/AiChatScreen';
import { SettingsHomeScreen } from '../features/account/SettingsHomeScreen';
import { WidgetsSettingsScreen } from '../features/account/WidgetsSettingsScreen';
import { AppearanceSettingsScreen } from '../features/account/AppearanceSettingsScreen';
import { ProfileSettingsScreen } from '../features/account/ProfileSettingsScreen';
import { NotificationsSettingsScreen } from '../features/account/NotificationsSettingsScreen';
import { HapticsSettingsScreen } from '../features/account/HapticsSettingsScreen';
import { RedeemProCodeScreen } from '../features/account/RedeemProCodeScreen';
import { ExecutionTargetsSettingsScreen } from '../features/account/ExecutionTargetsSettingsScreen';
import { DestinationsLibraryScreen } from '../features/account/DestinationsLibraryScreen';
import { DestinationDetailScreen } from '../features/account/DestinationDetailScreen';
import { BuiltInDestinationDetailScreen } from '../features/account/BuiltInDestinationDetailScreen';
import { SuperAdminToolsScreen } from '../features/account/SuperAdminToolsScreen';
import { ManageSubscriptionScreen } from '../features/account/ManageSubscriptionScreen';
import { ChangePlanScreen } from '../features/account/ChangePlanScreen';
import { PaywallInterstitialScreen } from '../features/paywall/PaywallInterstitialScreen';
import { PaywallDrawerHost } from '../features/paywall/PaywallDrawer';
import { CreditsInterstitialDrawerHost } from '../features/onboarding/CreditsInterstitialDrawer';
import { JoinSharedGoalDrawerHost } from '../features/goals/JoinSharedGoalDrawerHost';
import { ToastHost } from '../ui/ToastHost';
import { AuthPromptDrawerHost } from '../features/account/AuthPromptDrawerHost';
import { PlanKickoffDrawerHost } from '../features/plan/PlanKickoffDrawerHost';
import { handleIncomingReferralUrl, syncBonusCreditsThisMonth } from '../services/referrals';
import { handleIncomingInviteUrl } from '../services/invites';
import { handleIncomingArcDraftUrl } from '../services/arcDrafts';
import { pingInstall } from '../services/installPing';
import { colors, spacing, typography } from '../theme';
import { Icon, IconName } from '../ui/Icon';
import { Input } from '../ui/Input';
import { DevToolsScreen } from '../features/dev/DevToolsScreen';
import { ArcTestingResultsPage } from '../features/dev/ArcTestingResultsPage';
import { useAppStore } from '../store/useAppStore';
import { useEntitlementsStore } from '../store/useEntitlementsStore';
import { ProfileAvatar } from '../ui/ProfileAvatar';
import { Button } from '../ui/Button';
import { rootNavigationRef } from './rootNavigationRef';
import { KwiltBottomBar } from './KwiltBottomBar';
import { ArcDraftContinueScreen } from '../features/arcs/ArcDraftContinueScreen';
import { MoreScreen } from '../features/more/MoreScreen';
import { ChaptersScreen } from '../features/chapters/ChaptersScreen';
import { PLACE_TABS } from './placeTabs';
import type {
  ActivityDetailRouteParams,
  GoalDetailRouteParams,
  ActivitiesListRouteParams,
  JoinSharedGoalRouteParams,
} from './routeParams';

export type RootDrawerParamList = {
  MainTabs: NavigatorScreenParams<MainTabsParamList> | undefined;
  /**
   * Compatibility route name used by existing deep links + callers.
   *
   * Arcs now lives under the More tab, so this route keeps direct access
   * to the Arcs stack without relying on tab navigation.
   */
  ArcsStack: NavigatorScreenParams<ArcsStackParamList> | undefined;
  /**
   * Hidden (no nav surface entry). Kept to preserve `kwilt://agent` deep links and
   * allow programmatic launches even though the "Agent" tab has been removed.
   */
  Agent: undefined;
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

export type MainTabsParamList = {
  GoalsTab: NavigatorScreenParams<GoalsStackParamList> | undefined;
  ActivitiesTab: NavigatorScreenParams<ActivitiesStackParamList> | undefined;
  PlanTab:
    | {
        /**
         * When true, open the Recommendations bottom sheet on entry.
         * Used by the app-start Plan kickoff guide CTA.
         */
        openRecommendations?: boolean;
      }
    | undefined;
  MoreTab: NavigatorScreenParams<MoreStackParamList> | undefined;
};

export type MoreStackParamList = {
  MoreHome: undefined;
  MoreArcs: NavigatorScreenParams<ArcsStackParamList> | undefined;
  MoreChapters: undefined;
};

export type ArcsStackParamList = {
  ArcsList:
    | {
        /**
         * When true, open the Arc creation flow on entry.
         * Used by the floating bottom bar primary action on the Arcs tab.
         */
        openCreateArc?: boolean;
      }
    | undefined;
  ArcDraftContinue: undefined;
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
  GoalsList:
    | {
        openCreateGoal?: boolean;
      }
    | undefined;
  GoalDetail: GoalDetailRouteParams;
  ActivityDetailFromGoal: ActivityDetailRouteParams;
  JoinSharedGoal: JoinSharedGoalRouteParams;
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
  SettingsHaptics: undefined;
  SettingsWidgets: undefined;
  SettingsRedeemProCode: undefined;
  SettingsExecutionTargets: undefined;
  SettingsDestinationsLibrary: undefined;
  SettingsPlanAvailability: undefined;
  SettingsPlanCalendars: undefined;
  SettingsDestinationDetail:
    | { mode: 'create'; definitionId: string }
    | { mode: 'edit'; targetId: string };
  SettingsBuiltInDestinationDetail: { kind: 'amazon' | 'home_depot' | 'instacart' | 'doordash' };
  SettingsSuperAdminTools: undefined;
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
const Tabs = createBottomTabNavigator<MainTabsParamList>();
const MoreStack = createNativeStackNavigator<MoreStackParamList>();
// Match the AppShell's top gutter so the drawer content aligns with the page header.
const NAV_DRAWER_TOP_OFFSET = spacing.sm;
// Bump this key whenever the top-level navigator structure changes in a way
// that could make previously persisted state incompatible (for example,
// renaming routes like "Arcs" -> "ArcsStack" or nesting a tab inside a stack).
// This ensures we don't restore stale navigation state that can prevent certain
// screens (like Arcs or Goals) from being reachable or animating correctly.
// Prefix with "kwilt" so new installs don't carry any legacy LOMO state keys.
const NAV_PERSISTENCE_KEY = 'kwilt-nav-state-v4';

const STACK_SCREEN_OPTIONS: NativeStackNavigationOptions = {
  headerShown: false,
  // Use a consistent horizontal slide animation so all intra-stack transitions
  // (e.g., list → detail) feel like part of the same flow, regardless of which
  // top-level canvas the user is on.
  animation: 'slide_from_right',
  animationTypeForReplace: 'push',
  // Avoid accidental back-swipes when users are primarily vertically scrolling.
  // (Still allows the standard iOS "edge swipe" back gesture unless a screen disables it.)
  fullScreenGestureEnabled: false,
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
  const { capture } = useAnalytics();
  const completeWidgetNudge = useAppStore((s) => s.completeWidgetNudge);
  const widgetNudgeStatus = useAppStore((s) => s.widgetNudge?.status);
  const authIdentity = useAppStore((state) => state.authIdentity);
  const lastWidgetOpenTrackedAtMsRef = useRef<number>(0);

  const [isNavReady, setIsNavReady] = useState(false);
  useEffect(() => {
    if (!isNavReady) return;
    // Best-effort device heartbeat so Super Admin can see installs + map them to users.
    // Includes auth user id when signed in, and RevenueCat app user id when available.
    pingInstall({ userId: authIdentity?.userId ?? null }).catch(() => undefined);
  }, [authIdentity?.userId, isNavReady]);

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
            'MainTabs',
            'ArcsStack',
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

  useEffect(() => {
    // Handle non-navigation deep links (referrals, etc.) as side effects.
    let mounted = true;

    const handleUrl = async (url: string) => {
      if (!mounted) return;
      try {
        const didHandleArcDraft = await handleIncomingArcDraftUrl(url, capture);
        if (didHandleArcDraft) return;
      } catch (e: any) {
        // Best-effort: don't block other handlers if this fails.
        capture(AnalyticsEvent.ArcDraftClaimFailed, {
          error_message: typeof e?.message === 'string' ? e.message.slice(0, 180) : 'unknown',
        });
      }
      const didHandleReferral = await handleIncomingReferralUrl(url);
      if (didHandleReferral) return;
      await handleIncomingInviteUrl(url);
    };

    // Best-effort sync so bonus credits granted server-side (e.g. referrals)
    // become visible in the client gate + UI.
    void syncBonusCreditsThisMonth();

    Linking.getInitialURL()
      .then((url) => {
        if (url) void handleUrl(url);
      })
      .catch(() => {});

    const sub = Linking.addEventListener('url', (evt) => {
      if (!evt?.url) return;
      void handleUrl(evt.url);
    });

    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  if (!isNavReady) {
    // Let the app shell/font loading in App.tsx handle the visible loading state.
    return null;
  }

  // Deep links embedded in calendar events and share surfaces.
  // Example: `kwilt://activity/<id>?openFocus=1`
  const linking: LinkingOptions<RootDrawerParamList> = {
    prefixes: ['kwilt://', 'https://go.kwilt.app', 'https://kwilt.app'],
    config: {
      screens: {
        MainTabs: {
          screens: {
            GoalsTab: {
              screens: {
                GoalsList: {
                  path: 'goals',
                },
                GoalDetail: {
                  path: 'goal/:goalId',
                },
                JoinSharedGoal: {
                  path: 'join/:inviteCode',
                },
              },
            },
            ActivitiesTab: {
              screens: {
                ActivitiesList: {
                  // Canonical "Today" entrypoint for ecosystem surfaces.
                  // We route into the Activities canvas (shell/canvas preserved) and let the
                  // screen decide what "Today" means based on current state.
                  path: 'today',
                  parse: {
                    highlightSuggested: (v: string) => v === '1' || v === 'true',
                    contextGoalId: (v: string) => String(v),
                    source: (v: string) => String(v),
                  },
                },
                ActivityDetail: {
                  path: 'activity/:activityId',
                  parse: {
                    openFocus: (v: string) => v === '1' || v === 'true',
                    autoStartFocus: (v: string) => v === '1' || v === 'true',
                    endFocus: (v: string) => v === '1' || v === 'true',
                    minutes: (v: string) => {
                      const parsed = Number(v);
                      return Number.isFinite(parsed) ? parsed : undefined;
                    },
                    source: (v: string) => String(v),
                  },
                },
              },
            },
            PlanTab: {
              path: 'plan',
            },
            MoreTab: {
              screens: {
                MoreHome: {
                  path: 'more',
                },
              },
            },
          },
        },
        Agent: {
          path: 'agent',
        },
        ArcsStack: {
          screens: {
            ArcsList: {
              path: 'arcs',
            },
            ArcDetail: {
              path: 'arc/:arcId',
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

        // Widget adoption: detect widget-origin deep links (tagged as source=widget).
        const source = (activeRoute?.params as any)?.source as string | undefined;
        if (source === 'widget') {
          const nowMs = Date.now();
          // Avoid double-tracking if state updates multiple times for the same open.
          if (nowMs - lastWidgetOpenTrackedAtMsRef.current > 1500) {
            lastWidgetOpenTrackedAtMsRef.current = nowMs;
            capture(AnalyticsEvent.AppOpenedFromWidget, {
              route_name: routeName ?? 'unknown',
            });
          }
          if (widgetNudgeStatus !== 'completed') {
            completeWidgetNudge('widget');
          }
          // Best-effort: clear the param so we don't repeatedly treat this as a widget open.
          try {
            rootNavigationRef.setParams({ source: undefined } as any);
          } catch {
            // best-effort
          }
        }
      }}
    >
      <Drawer.Navigator
        drawerContent={(props) => <KwiltDrawerContent {...props} />}
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

            if (route.name === 'Settings') {
              // Mirror other primary nav items: tapping Settings should always land on the
              // Settings home canvas, not the last nested Settings screen (e.g. Subscriptions).
              event.preventDefault();
              navigation.navigate('Settings', {
                screen: 'SettingsHome',
              });
              return;
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
        initialRouteName="MainTabs"
      >
        <Drawer.Screen
          name="MainTabs"
          component={MainTabsNavigator}
          options={{
            title: 'Home',
            drawerItemStyle: { display: 'none' },
          }}
        />
        <Drawer.Screen
          name="ArcsStack"
          component={ArcsStackRedirectScreen}
          options={{ title: 'Arcs' }}
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
      <PlanKickoffDrawerHost />
      <CreditsInterstitialDrawerHost />
      <PaywallDrawerHost />
      <JoinSharedGoalDrawerHost />
      <AuthPromptDrawerHost />
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
      <ArcsStack.Screen name="ArcDraftContinue" component={ArcDraftContinueScreen} />
      <ArcsStack.Screen name="ArcDetail" component={ArcDetailScreen} />
      <ArcsStack.Screen name="GoalDetail" component={GoalDetailScreen} />
      <ArcsStack.Screen
        name="ActivityDetailFromGoal"
        component={ActivityDetailScreen}
        options={{
          // Prevent accidental "swipe back" while vertically scrolling dense content.
          gestureEnabled: false,
          fullScreenGestureEnabled: false,
        }}
      />
    </ArcsStack.Navigator>
  );
}

function ArcsStackRedirectScreen({ navigation, route }: any) {
  useEffect(() => {
    const arcsParams =
      route?.params && typeof route.params === 'object' && 'screen' in route.params
        ? route.params
        : { screen: 'ArcsList', params: route?.params };
    navigation.navigate('MainTabs', {
      screen: 'MoreTab',
      params: {
        screen: 'MoreArcs',
        params: arcsParams,
      },
    });
  }, [navigation, route?.params]);

  return null;
}

function GoalsStackNavigator() {
  return (
    <GoalsStack.Navigator
      // Mirror the Arcs stack so Goals → GoalDetail (and back) use the same
      // horizontal slide transition semantics.
      screenOptions={STACK_SCREEN_OPTIONS}
    >
      <GoalsStack.Screen name="GoalsList" component={GoalsScreen} />
      <GoalsStack.Screen name="JoinSharedGoal" component={JoinSharedGoalScreen} />
      <GoalsStack.Screen name="GoalDetail" component={GoalDetailScreen} />
      <GoalsStack.Screen
        name="ActivityDetailFromGoal"
        component={ActivityDetailScreen}
        options={{
          // Prevent accidental "swipe back" while vertically scrolling dense content.
          gestureEnabled: false,
          fullScreenGestureEnabled: false,
        }}
      />
    </GoalsStack.Navigator>
  );
}

function ActivitiesStackNavigator() {
  return (
    <ActivitiesStack.Navigator screenOptions={STACK_SCREEN_OPTIONS}>
      <ActivitiesStack.Screen name="ActivitiesList" component={ActivitiesScreen} />
      <ActivitiesStack.Screen
        name="ActivityDetail"
        component={ActivityDetailScreen}
        options={{
          // Prevent accidental "swipe back" while vertically scrolling dense content.
          gestureEnabled: false,
          fullScreenGestureEnabled: false,
        }}
      />
    </ActivitiesStack.Navigator>
  );
}

function MainTabsNavigator() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => {
        const focusedRouteName = getFocusedRouteNameFromRoute(route) ?? '';
        const hideTabBar = route.name === 'ActivitiesTab' && focusedRouteName === 'ActivityDetail';
        return {
          headerShown: false,
          tabBarStyle: hideTabBar
            ? { display: 'none' }
            : {
                position: 'absolute',
                backgroundColor: 'transparent',
                borderTopWidth: 0,
                elevation: 0,
              },
        };
      }}
      tabBar={(props) => <KwiltBottomBar {...props} />}
      initialRouteName="ActivitiesTab"
    >
      <Tabs.Screen
        name="GoalsTab"
        component={GoalsStackNavigator}
        options={{ title: 'Goals' }}
      />
      <Tabs.Screen
        name="ActivitiesTab"
        component={ActivitiesStackNavigator}
        options={{ title: 'Activities' }}
      />
      <Tabs.Screen
        name="PlanTab"
        component={PlanScreen}
        options={{ title: 'Plan' }}
      />
      <Tabs.Screen
        name="MoreTab"
        component={MoreStackNavigator}
        options={{ title: 'More' }}
      />
    </Tabs.Navigator>
  );
}

function MoreStackNavigator() {
  return (
    <MoreStack.Navigator screenOptions={{ headerShown: false }}>
      <MoreStack.Screen name="MoreHome" component={MoreScreen} />
      <MoreStack.Screen name="MoreArcs" component={ArcsStackNavigator} />
      <MoreStack.Screen name="MoreChapters" component={ChaptersScreen} />
    </MoreStack.Navigator>
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
        name="SettingsHaptics"
        component={HapticsSettingsScreen}
      />
      <SettingsStack.Screen name="SettingsWidgets" component={WidgetsSettingsScreen} />
      <SettingsStack.Screen
        name="SettingsRedeemProCode"
        component={RedeemProCodeScreen}
      />
      <SettingsStack.Screen
        name="SettingsExecutionTargets"
        component={ExecutionTargetsSettingsScreen}
      />
      <SettingsStack.Screen
        name="SettingsDestinationsLibrary"
        component={DestinationsLibraryScreen}
      />
      <SettingsStack.Screen
        name="SettingsPlanAvailability"
        component={PlanAvailabilitySettingsScreen}
      />
      <SettingsStack.Screen
        name="SettingsPlanCalendars"
        component={PlanCalendarSettingsScreen}
      />
      <SettingsStack.Screen
        name="SettingsDestinationDetail"
        component={DestinationDetailScreen}
        options={{
          // Avoid accidental swipe back while editing config.
          gestureEnabled: false,
          fullScreenGestureEnabled: false,
        }}
      />
      <SettingsStack.Screen
        name="SettingsBuiltInDestinationDetail"
        component={BuiltInDestinationDetailScreen}
      />
      <SettingsStack.Screen
        name="SettingsSuperAdminTools"
        component={SuperAdminToolsScreen}
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
    case 'MainTabs':
      return 'home';
    case 'ArcsStack':
      return 'arcs';
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
  const authIdentity = useAppStore((state) => state.authIdentity);
  const userProfile = useAppStore((state) => state.userProfile);
  const isPro = useEntitlementsStore((state) => state.isPro);
  const displayName = authIdentity?.name?.trim() || userProfile?.fullName?.trim() || 'Kwilter';
  const subtitle = authIdentity?.email?.trim() || '';
  const DRAWER_ICON_SIZE = 24;

  // Hide the top-level Settings item from the drawer list while keeping the
  // Settings screen available for navigation from the profile row.
  const activeRoute = props.state.routes[props.state.index];
  const activeRouteName = activeRoute?.name as keyof RootDrawerParamList | undefined;

  const devToolsRoute = props.state.routes.find((route: { name: string }) => route.name === 'DevTools');
  const mainRoutes = props.state.routes.filter(
    (route: { name: string }) =>
      route.name !== 'MainTabs' &&
      route.name !== 'Settings' &&
      route.name !== 'DevArcTestingResults' &&
      route.name !== 'DevTools' &&
      route.name !== 'ArcsStack', // ArcsStack is shown via PLACE_TABS, so exclude it from main routes
  );

  const getActivePlaceTab = (): string | undefined => {
    if (activeRouteName !== 'MainTabs') return undefined;
    const mainTabsRoute = props.state.routes.find((route: { name: string }) => route.name === 'MainTabs');
    const tabState = mainTabsRoute?.state as
      | { index?: number; routes?: Array<{ name: string }> }
      | undefined;
    const activeIndex = tabState?.index ?? 0;
    const activeTab = tabState?.routes?.[activeIndex];
    return activeTab?.name;
  };

  const activePlaceTabName = getActivePlaceTab();

  const navigateToPlace = (tabName: string) => {
    if (tabName === 'GoalsTab') {
      props.navigation.navigate('MainTabs', { screen: 'GoalsTab', params: { screen: 'GoalsList' } });
      props.navigation.dispatch(DrawerActions.closeDrawer());
      return;
    }
    if (tabName === 'ActivitiesTab') {
      props.navigation.navigate('MainTabs', {
        screen: 'ActivitiesTab',
        params: { screen: 'ActivitiesList' },
      });
      props.navigation.dispatch(DrawerActions.closeDrawer());
      return;
    }
    props.navigation.navigate('MainTabs', { screen: tabName });
    props.navigation.dispatch(DrawerActions.closeDrawer());
  };

  const navigateFromDrawer = (routeName: keyof RootDrawerParamList) => {
    if (routeName === 'ArcsStack') {
      props.navigation.navigate('ArcsStack', { screen: 'ArcsList' });
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
              {PLACE_TABS.map((tab) => {
                const focused = activeRouteName === 'MainTabs' && activePlaceTabName === tab.name;
                return (
                  <DrawerItem
                    key={tab.name}
                    testID={`nav.drawer.place.${tab.name}`}
                    label={tab.label}
                    focused={focused}
                    onPress={() => navigateToPlace(tab.name)}
                    icon={({ color, size }) => (
                      <Icon name={tab.icon} color={color} size={DRAWER_ICON_SIZE ?? size ?? 20} />
                    )}
                    activeTintColor={colors.parchment}
                    inactiveTintColor={colors.textSecondary}
                    activeBackgroundColor={colors.pine700}
                    inactiveBackgroundColor="transparent"
                    labelStyle={styles.drawerLabel}
                    style={styles.drawerItem}
                  />
                );
              })}
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
                    <Icon name={iconName} color={color} size={DRAWER_ICON_SIZE ?? size ?? 20} />
                  )}
                  activeTintColor={colors.parchment}
                  inactiveTintColor={colors.textSecondary}
                  activeBackgroundColor={colors.pine700}
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
                <Icon name={getDrawerIcon('DevTools')} color={color} size={DRAWER_ICON_SIZE ?? size ?? 20} />
              )}
              activeTintColor={colors.parchment}
              inactiveTintColor={colors.textSecondary}
              activeBackgroundColor={colors.pine700}
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
              // Always land on the Settings home canvas from the profile row (not the last
              // nested Settings screen like Subscriptions).
              props.navigation.navigate('Settings', { screen: 'SettingsHome' });
              props.navigation.dispatch(DrawerActions.closeDrawer());
            }}
          >
            <ProfileAvatar
              name={displayName}
              avatarUrl={authIdentity?.avatarUrl || userProfile?.avatarUrl}
              size={44}
              borderRadius={22}
              style={styles.avatarPlaceholder}
            />
            <View style={styles.profileTextBlock}>
              <Text style={styles.profileName} numberOfLines={1}>
                {displayName}
              </Text>
              {subtitle ? (
                <Text style={styles.profileSubtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
          </Pressable>

          {!isPro ? (
            <View style={styles.upgradeButtonContainer}>
              <Button
                fullWidth
                variant="primary"
                accessibilityLabel="Upgrade to Kwilt Pro"
                onPress={() => {
                  props.navigation.navigate('Settings', {
                    screen: 'SettingsManageSubscription',
                    params: {
                      openPricingDrawer: true,
                      openPricingDrawerNonce: Date.now(),
                    },
                  });
                  props.navigation.dispatch(DrawerActions.closeDrawer());
                }}
              >
                Upgrade to Kwilt Pro
              </Button>
            </View>
          ) : null}
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
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.shell,
  },
  profileTextBlock: {
    flex: 1,
  },
  profileName: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  profileSubtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  upgradeButtonContainer: {
    marginTop: spacing.sm,
  },
  drawerItem: {
    borderRadius: 12,
    marginVertical: spacing.xs / 2,
    paddingVertical: spacing.sm / 2,
    minHeight: 52,
  },
  drawerLabel: {
    ...typography.body,
  },
});



