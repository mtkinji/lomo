import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import {
  Alert,
  View,
  StyleSheet,
  Platform,
  Text,
  Pressable,
  Linking,
} from 'react-native';
import { KwiltLoader } from '../ui/KwiltLoader';
import { useAnalytics } from '../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../services/analytics/events';
import {
  NavigationContainer,
  DefaultTheme,
  Theme,
  NavigatorScreenParams,
  getFocusedRouteNameFromRoute,
  type NavigationState,
  type LinkingOptions,
} from '@react-navigation/native';
import { createNativeStackNavigator, type NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArcsScreen } from '../features/arcs/ArcsScreen';
import { ArcDetailScreen } from '../features/arcs/ArcDetailScreen';
import { GoalDetailScreen } from '../features/arcs/GoalDetailScreen';
import { GoalsScreen } from '../features/goals/GoalsScreen';
import { JoinSharedGoalScreen } from '../features/goals/JoinSharedGoalScreen';
import { ActivitiesScreen } from '../features/activities/ActivitiesScreen';
import { ActivityDetailScreen } from '../features/activities/ActivityDetailScreen';
import { StandaloneFocusScreen } from '../features/activities/StandaloneFocusScreen';
import { PlanScreen } from '../features/plan/PlanScreen';
import { PlanAvailabilitySettingsScreen } from '../features/plan/PlanAvailabilitySettingsScreen';
import { PlanCalendarSettingsScreen } from '../features/plan/PlanCalendarSettingsScreen';
import { MoneyPrivacySettingsScreen } from '../capabilities/money/screens/MoneyPrivacySettingsScreen';
import { MoneyHouseholdSettingsScreen } from '../capabilities/money/screens/MoneyHouseholdSettingsScreen';
import { BudgetSettingsScreen } from '../capabilities/money/screens/MoneyLivingPlanScreen';
import { AiChatScreen } from '../features/ai/AiChatScreen';
import { UnifiedChatScreen } from '../features/unifiedChat/UnifiedChatScreen';
import { SharedHomeScreen } from '../features/shared-home/SharedHomeScreen';
import type { UnifiedChatLaunchContext, UnifiedChatRouteParams } from '../features/unifiedChat/launchContext';
import { deriveCapabilityAgentContext, resolveCapabilityAgentReturn } from '../features/ai/capabilityAgentContext';
import { SettingsHomeScreen } from '../features/account/SettingsHomeScreen';
import { MealsSettingsScreen } from '../features/account/MealsSettingsScreen';
import { HouseholdSettingsScreen } from '../features/household/HouseholdSettingsScreen';
import { HouseholdMemberDetailScreen } from '../features/household/HouseholdMemberDetailScreen';
import { FamilyScreenTimeLearningScreen } from '../features/household/screenTime/FamilyScreenTimeLearningScreen';
import { ActivityAreasSettingsScreen } from '../features/account/ActivityAreasSettingsScreen';
import { WidgetsSettingsScreen } from '../features/account/WidgetsSettingsScreen';
import { AppearanceSettingsScreen } from '../features/account/AppearanceSettingsScreen';
import { ProfileSettingsScreen } from '../features/account/ProfileSettingsScreen';
import { NotificationsSettingsScreen } from '../features/account/NotificationsSettingsScreen';
import { ScreenTimeProtectionSettingsScreen } from '../features/account/ScreenTimeProtectionSettingsScreen';
import { PersonalScreenTimeRuleBuilderScreen } from '../features/screen-time/rule-builder/PersonalScreenTimeRuleBuilderScreen';
import { PersonalScreenTimeRuleBuilderHost } from '../features/screen-time/rule-builder/PersonalScreenTimeRuleBuilderHost';
import type { PersonalScreenTimeRuleBuilderParams } from '../features/screen-time/rule-builder/personalRuleBuilderLaunch';
import type {
  ScreenTimeSetupIntent,
  ScreenTimeSetupOfferSurface,
} from '../services/screenTimeProtection';
import { PhoneAgentSettingsScreen } from '../features/account/PhoneAgentSettingsScreen';
import {
  ConnectedToolsScreen,
  ConnectedToolDetailScreen,
  ConnectKwiltAppScreen,
  type ConnectableApp,
} from '../features/account/ConnectedToolsScreen';
import { HapticsSettingsScreen } from '../features/account/HapticsSettingsScreen';
import { SharingSettingsScreen } from '../features/account/SharingSettingsScreen';
import { JoinFriendInviteScreen } from '../features/friends/JoinFriendInviteScreen';
import { ExecutionTargetsSettingsScreen } from '../features/account/ExecutionTargetsSettingsScreen';
import { DestinationsLibraryScreen } from '../features/account/DestinationsLibraryScreen';
import { DestinationDetailScreen } from '../features/account/DestinationDetailScreen';
import { BuiltInDestinationDetailScreen } from '../features/account/BuiltInDestinationDetailScreen';
import { SuperAdminToolsScreen } from '../features/account/SuperAdminToolsScreen';
import { ManageSubscriptionScreen } from '../features/account/ManageSubscriptionScreen';
import { ChangePlanScreen } from '../features/account/ChangePlanScreen';
import { LegalPrivacyScreen } from '../features/account/LegalPrivacyScreen';
import { PaywallInterstitialScreen } from '../features/paywall/PaywallInterstitialScreen';
import { PaywallDrawerHost } from '../features/paywall/PaywallDrawer';
import { CreditsInterstitialDrawerHost } from '../features/onboarding/CreditsInterstitialDrawer';
import { JoinSharedGoalDrawerHost } from '../features/goals/JoinSharedGoalDrawerHost';
import { ToastHost } from '../ui/ToastHost';
import { AuthPromptDrawerHost } from '../features/account/AuthPromptDrawerHost';
import { ScreenTimeUnlockGuideHost } from '../features/screen-time/components/ScreenTimeUnlockGuideHost';
import { PlanKickoffDrawerHost } from '../features/plan/PlanKickoffDrawerHost';
import { handleIncomingReferralUrl, syncBonusCreditsThisMonth } from '../services/referrals';
import { markOpenedFromWidget } from '../services/analytics/widgetAttribution';
import { handleIncomingInviteUrl } from '../services/invites';
import { handleIncomingArcDraftUrl } from '../services/arcDrafts';
import { handleIncomingShareUrl } from '../services/appleEcosystem/shareExtension';
import { pingInstall } from '../services/installPing';
import { colors, spacing, typography } from '../theme';
import { DevToolsScreen } from '../features/dev/DevToolsScreen';
import { GuidedOvertureLabScreen } from '../features/dev/GuidedOvertureLabScreen';
import { useAppStore } from '../store/useAppStore';
import { useToastStore } from '../store/useToastStore';
import { rootNavigationRef } from './rootNavigationRef';
import { ChromeVisibilityProvider } from './ChromeVisibilityContext';
import { ArcDraftContinueScreen } from '../features/arcs/ArcDraftContinueScreen';
import { MoreScreen } from '../features/more/MoreScreen';
import { ChaptersScreen } from '../features/chapters/ChaptersScreen';
import { ChapterDetailScreen } from '../features/chapters/ChapterDetailScreen';
import { ChapterAlignScreen } from '../features/chapters/ChapterAlignScreen';
import { ChapterDigestSettingsScreen } from '../features/chapters/ChapterDigestSettingsScreen';
import { LINKING_PREFIXES, linkingConfig, prepareIncomingNavigationUrl } from './linkingConfig';
import { parseEmailAttribution } from './emailAttribution';
import { recordChapterOpenHint } from '../features/chapters/chapterOpenSource';
import {
  resolvePersistedNavigationState,
  shouldRestorePersistedNavigationForInitialUrl,
} from './navigationPersistence';
import type {
  ActivityDetailRouteParams,
  GoalDetailRouteParams,
  ActivitiesListRouteParams,
  ActivitiesWidgetRouteParams,
  JoinSharedGoalRouteParams,
  JoinFriendInviteRouteParams,
} from './routeParams';
import type { LaunchContext } from '../domain/workflows';
import type { CapabilityAgentContext, ChatMode } from '../features/ai/workflowRegistry';
import { CapabilityMenu } from './CapabilityMenu';
import {
  CapabilityShellProvider,
  deriveActiveCapabilityDestinationId,
} from './CapabilityShellContext';
import {
  createCapabilityNavigateAction,
  ROOT_DRAWER_BACK_BEHAVIOR,
  resolveCapabilityNavigation,
} from './capabilityNavigation';
import { markRootNavigationReady } from '../services/performance/startupTelemetry';
import {
  CapabilityMenuStateProvider,
  useCapabilityMenuActions,
  useCapabilityMenuOpen,
} from './CapabilityMenuStateContext';
import { CapabilitySideSheet } from './CapabilitySideSheet';
import { createUnifiedChatRepository } from '../features/unifiedChat/threadRepository';
import type { UnifiedChatThread } from '../features/unifiedChat/types';
import { MoneyNavigator } from '../capabilities/money/navigation/MoneyNavigator';
import type { MoneyStackParamList } from '../capabilities/money/navigation/types';
import { ExploreNavigator } from '../capabilities/explore/navigation/ExploreNavigator';
import type { ExploreStackParamList } from '../capabilities/explore/navigation/types';
import { GamesNavigator } from '../capabilities/games/navigation/GamesNavigator';
import { GamesPlayerSettingsScreen } from '../capabilities/games/settings/GamesPlayerSettingsScreen';
import type { GamesStackParamList } from '../capabilities/games/navigation/types';
import { FoodNavigator, type FoodStackParamList } from '../features/household-food/FoodNavigator';
import { ExploreSettingsScreen } from '../capabilities/explore/screens/ExploreSettingsScreen';
import {
  KwiltLabsSettingsScreen,
  KwiltLabsSettingsSurface,
} from '../features/account/KwiltLabsSettingsScreen';
import { useKwiltLabsStore } from '../labs/useKwiltLabsStore';
import { useFeatureFlag } from '../services/analytics/useFeatureFlag';
import { useNavigationOrientationPolicy } from './navigationOrientation';
import { useFocusSessionStore } from '../features/activities/focusSessionStore';
import { ChoresScreen } from '../capabilities/chores/screens/ChoresScreen';
import { projectChoreReviewQueue } from '../capabilities/chores/domain/choreLearning';
import { useChoreLearningStore } from '../capabilities/chores/runtime/useChoreLearningStore';
import { shouldShowCapabilityDiscoveryDot } from './capabilityDiscovery';
import { useCapabilityDiscoveryStore } from '../store/useCapabilityDiscoveryStore';
import { CAPABILITY_MENU_REGISTRY } from '../capabilities/registry';
import { useMoneyNavigationAvailabilityStore } from '../capabilities/money/runtime/useMoneyNavigationAvailabilityStore';

export type RootDrawerParamList = {
  StandaloneFocus: { source?: string } | undefined;
  MainTabs: NavigatorScreenParams<MainTabsParamList> | undefined;
  /**
   * Compatibility route name used by existing deep links + callers.
   *
   * Arcs now lives under the More tab, so this route keeps direct access
   * to the Arcs stack without relying on tab navigation.
   */
  ArcsStack: NavigatorScreenParams<ArcsStackParamList> | undefined;
  Money: NavigatorScreenParams<MoneyStackParamList> | undefined;
  Explore: NavigatorScreenParams<ExploreStackParamList> | undefined;
  Games: NavigatorScreenParams<GamesStackParamList> | undefined;
  Chores: undefined;
  Food: NavigatorScreenParams<FoodStackParamList> | undefined;
  /**
   * Hidden (no nav surface entry). Kept to preserve `kwilt://agent` deep links and
   * allow programmatic launches even though the "Agent" tab has been removed.
   */
  Agent:
    | {
        mode?: ChatMode;
        launchContext?: LaunchContext;
        workspaceSnapshot?: string;
        guidedOvertureOfferId?: string;
        guidedOvertureSessionId?: number;
        workflowDefinitionId?: string;
        resumeDraft?: boolean;
        hidePromptSuggestions?: boolean;
        capabilityContext?: CapabilityAgentContext;
      }
    | undefined;
  /**
   * Standalone durable Chat capability. This is intentionally separate from
   * the compatibility `Agent` route that owns Kwilt's existing workflow chat.
   */
  UnifiedChat: UnifiedChatRouteParams | undefined;
  SharedHome: { deliveryId?: string; source?: 'manual' | 'push' | 'link' } | undefined;
  Settings: NavigatorScreenParams<SettingsStackParamList> | undefined;
  DevTools: {
    familyScreenTimeChild?: {
      childMembershipId: string;
      childDisplayName: string;
    };
  } | undefined;
  GuidedOvertureLab: { sessionId?: number } | undefined;
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
        /** Open Plan on the exact local day selected by a durable Chat receipt. */
        dateKey?: string;
      }
    | undefined;
  MoreTab: NavigatorScreenParams<MoreStackParamList> | undefined;
};

export type MoreStackParamList = {
  MoreHome: undefined;
  MoreArcs: NavigatorScreenParams<ArcsStackParamList> | undefined;
  // Chapters are server-scheduled-only (Phase 2.1 of docs/chapters-plan.md);
  // the screen takes no params and there is no user-initiated generation
  // entrypoint.
  MoreChapters: undefined;
  MoreChapterDetail: { chapterId: string; addLine?: boolean };
  MoreChapterDigestSettings: undefined;
  /**
   * Phase 6 of docs/chapters-plan.md — Next Steps "Align" CTA. Opens a
   * lightweight surface that lets the user tag a list of untagged
   * activities to an existing Goal in one step. Activities in Kwilt
   * belong to Goals (not directly to Arcs); the Arc is carried only
   * for display copy. All props are server-sourced from the Chapter's
   * `recommendations[]` entry.
   */
  MoreChapterAlign: {
    chapterId: string;
    recommendationId: string;
    goalId: string;
    goalTitle: string;
    arcId: string | null;
    arcTitle: string | null;
    activityIds: string[];
  };
};

export type ArcsStackParamList = {
  ArcsList:
    | {
        /**
         * When true, open the Arc creation flow on entry.
         * Used by the floating bottom bar primary action on the Arcs tab.
         */
        openCreateArc?: boolean;
        /**
         * Phase 5.2 of docs/chapters-plan.md — Next Steps "Create Arc"
         * CTA. When the Chapter detail screen deep-links an Arc
         * Nomination into Arc creation, it forwards the nominated title
         * so the manual tab is pre-populated. Free-tier users are never
         * routed here (the CTA hits the paywall instead), so this is
         * Pro-only in practice.
         */
        prefilledArcName?: string;
        /**
         * Phase 8 of docs/chapters-plan.md — Cross-Chapter continuity.
         * When the Chapter detail screen deep-links an Arc Nomination
         * into Arc creation, it forwards the originating Chapter +
         * recommendation ids. The NewArcModal records an `acted_on`
         * event on successful Arc creation so the next Chapter's
         * generator can cite the outcome and suppress re-nomination.
         */
        chapterRecommendation?: {
          chapterId: string;
          recommendationId: string;
        };
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
     * Phase 6 of docs/chapters-plan.md — Next Steps "Create Goal" CTA.
     * When a Chapter's Goal Nomination deep-links into this screen with
     * `openGoalCreation: true`, it forwards the nominated title so the
     * Goal creation drawer is pre-populated and defaulted to the manual
     * tab. The drawer still respects the per-Arc Goal limit; paywall
     * gating happens at the Chapter detail CTA, not here.
     */
    prefilledGoalTitle?: string;
    goalCreationInitialTab?: 'ai' | 'manual';
    /**
     * Phase 8 of docs/chapters-plan.md — Cross-Chapter continuity.
     * When the Chapter detail screen deep-links a Goal Nomination into
     * Goal creation, it forwards the originating Chapter +
     * recommendation ids so ArcDetailScreen can record an `acted_on`
     * event (with the new goalId as resulting_object_id) when the
     * GoalCoachDrawer fires `onGoalCreated`.
     */
    chapterRecommendation?: {
      chapterId: string;
      recommendationId: string;
    };
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
        prefilledGoalTitle?: string;
        prefilledGoalDescription?: string;
        goalCreationInitialTab?: 'ai' | 'manual';
      }
    | undefined;
  GoalDetail: GoalDetailRouteParams;
  ActivityDetailFromGoal: ActivityDetailRouteParams;
  JoinSharedGoal: JoinSharedGoalRouteParams;
};

export type ActivitiesStackParamList = {
  ActivitiesList: ActivitiesListRouteParams | undefined;
  ActivitiesListFromWidget: ActivitiesWidgetRouteParams | undefined;
  GoalDetail: GoalDetailRouteParams;
  ActivityDetail: ActivityDetailRouteParams;
};

export type SettingsStackParamList = {
  SettingsHome: undefined;
  SettingsKwiltLabs: undefined;
  SettingsExplore: { entrySurface?: 'explore-map' } | undefined;
  SettingsGames: undefined;
  SettingsMeals: undefined;
  SettingsAppearance: undefined;
  SettingsProfile: { openAccountDeletion?: boolean } | undefined;
  SettingsAiModel: undefined;
  SettingsNotifications: undefined;
  SettingsScreenTimeProtection:
    | {
        setupIntent?: ScreenTimeSetupIntent;
        entrySurface?: ScreenTimeSetupOfferSurface;
        returnToActivityId?: string;
      }
    | undefined;
  SettingsScreenTimeRuleBuilder: PersonalScreenTimeRuleBuilderParams;
  SettingsHousehold: { inviteCode?: string } | undefined;
  SettingsHouseholdMember: { membershipId: string };
  SettingsFamilyScreenTime: {
    childMembershipId: string;
    childDisplayName: string;
    setupStep?: 'device' | 'selection' | 'release';
    suggestedLabel?: string;
    clientActionId?: string;
  };
  SettingsMoneyPrivacy: undefined;
  SettingsMoneyHousehold: undefined;
  SettingsBudget: undefined;
  SettingsWeeklyChapters: undefined;
  SettingsPhoneAgent: undefined;
  SettingsConnectedTools: undefined;
  SettingsConnectKwiltApp: { app: ConnectableApp };
  SettingsConnectedToolDetail: { clientId: string };
  SettingsSharing: undefined;
  SettingsJoinFriend: JoinFriendInviteRouteParams;
  SettingsLegalPrivacy: undefined;
  SettingsHaptics: undefined;
  SettingsWidgets: undefined;
  SettingsExecutionTargets: undefined;
  SettingsDestinationsLibrary: undefined;
  SettingsActivityAreas: undefined;
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
const NAV_PERSISTENCE_KEY = 'kwilt-nav-state-v5';
const NAV_RESTORE_TIMEOUT_MS = 2000;

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
  const showDevTools = __DEV__;
  const { capture } = useAnalytics();
  const completeWidgetNudge = useAppStore((s) => s.completeWidgetNudge);
  const widgetNudgeStatus = useAppStore((s) => s.widgetNudge?.status);
  const authIdentity = useAppStore((state) => state.authIdentity);
  const focusVideoEnvironmentId = useAppStore((state) => state.focusVideoEnvironmentId);
  const activeFocusSessionId = useFocusSessionStore((state) => state.activeSession?.sessionId);
  const focusVideoActive = Boolean(focusVideoEnvironmentId && activeFocusSessionId);
  const lastWidgetOpenTrackedAtMsRef = useRef<number>(0);
  const markCapabilityMenuOpened = useCapabilityDiscoveryStore((state) => state.markMenuOpened);

  const [isNavReady, setIsNavReady] = useState(false);
  useEffect(() => {
    if (!isNavReady) return;
    // Best-effort device heartbeat so Super Admin can see installs + map them to users.
    // Includes auth user id when signed in, and RevenueCat app user id when available.
    pingInstall({ userId: authIdentity?.userId ?? null }).catch(() => undefined);
  }, [authIdentity?.userId, isNavReady]);

  const [initialState, setInitialState] = useState<NavigationState | undefined>(undefined);
  const [currentNavigationState, setCurrentNavigationState] = useState<NavigationState | undefined>();
  const lastTrackedRouteNameRef = useRef<string | undefined>(undefined);
  const activeRouteName = getActiveRoute(currentNavigationState)?.name;
  useNavigationOrientationPolicy({
    ready: isNavReady && currentNavigationState !== undefined,
    routeName: activeRouteName,
    focusVideoActive,
  });

  useEffect(() => {
    let isMounted = true;

    const restoreState = async () => {
      try {
        // On web, let the URL drive navigation instead of persisted state.
        if (Platform.OS === 'web') {
          return;
        }

        const initialUrl = await Linking.getInitialURL().catch(() => null);
        if (!shouldRestorePersistedNavigationForInitialUrl(initialUrl)) {
          return;
        }

        const state = await resolvePersistedNavigationState(
          AsyncStorage.getItem(NAV_PERSISTENCE_KEY),
          { showDevTools, timeoutMs: NAV_RESTORE_TIMEOUT_MS },
        );

        // Defensive guard: if storage stalls or the persisted root routes don't
        // match the current drawer structure, start from the default route.
        if (state && isMounted) {
          setInitialState(state);
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

      // Email-campaign attribution. Fires best-effort BEFORE the short-
      // circuiting handlers below, because email CTAs often deep-link to
      // share/referral surfaces that would otherwise consume the URL and
      // swallow the event. The capture itself is side-effect free (PostHog
      // queue) so it's safe to run unconditionally.
      // Phase 6.2 of docs/email-system-ga-plan.md.
      const emailAttribution = parseEmailAttribution(url);
      if (emailAttribution) {
        capture(AnalyticsEvent.EmailDeepLinkConverted, {
          utm_campaign: emailAttribution.utmCampaign,
          utm_medium: emailAttribution.utmMedium,
          target_route: emailAttribution.targetRoute,
        });
      }

      // Chapter-open attribution: stash a hint if the URL targets a chapter
      // detail route so `chapter_viewed` can report a correct `from` dimension
      // (Phase 1.1 of docs/chapters-plan.md). Works for both
      // email CTAs (`utm_source=email`) and any other deep-link entrypoints.
      try {
        const parsed = new URL(url);
        const rawPath = (() => {
          if (parsed.protocol === 'kwilt:') {
            const host = parsed.hostname ?? '';
            const suffix = parsed.pathname && parsed.pathname !== '/' ? parsed.pathname : '';
            return (host + suffix).replace(/^\/+/, '');
          }
          let path = parsed.pathname.replace(/^\/+/, '');
          if (path === 'open' || path.startsWith('open/')) {
            path = path.slice('open'.length).replace(/^\/+/, '');
          }
          return path;
        })();
        const match = rawPath.match(/^chapters\/([^/?#]+)/);
        if (match && match[1]) {
          const isEmail = parsed.searchParams.get('utm_source') === 'email';
          recordChapterOpenHint(
            match[1],
            isEmail ? 'email' : 'deep_link',
            parsed.searchParams.get('utm_campaign'),
          );
        }
      } catch {
        // Best-effort: malformed URLs just fall through without a hint.
      }

      const didHandleShare = await handleIncomingShareUrl(url);
      if (didHandleShare) return;
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
    // Avoid a blank shell while restoring persisted navigation state.
    return (
      <View style={styles.navRestoreScreen}>
        <KwiltLoader size="small" color={colors.accent} />
        <Text style={styles.navRestoreText}>Opening your workspace...</Text>
      </View>
    );
  }

  // Deep links embedded in calendar events, email CTAs, and share surfaces.
  // Example: `kwilt://activity/<id>?openFocus=1`
  // The config is extracted to `./linkingConfig.ts` so it can be unit-tested
  // and so adding new deep-link paths doesn't require touching this file.
  const linking: LinkingOptions<RootDrawerParamList> = {
    prefixes: [...LINKING_PREFIXES],
    config: linkingConfig,
    getInitialURL: async () => {
      const url = await Linking.getInitialURL();
      return url ? prepareIncomingNavigationUrl(url) : null;
    },
    subscribe: (listener) => {
      const subscription = Linking.addEventListener('url', ({ url }) => listener(prepareIncomingNavigationUrl(url)));
      return () => subscription.remove();
    },
  };

  return (
    <NavigationContainer
      ref={rootNavigationRef}
      theme={navTheme}
      initialState={initialState}
      linking={linking}
      onReady={() => {
        markRootNavigationReady(Boolean(initialState));
        const rootState = rootNavigationRef.getRootState();
        setCurrentNavigationState(rootState);
        const currentRoute = rootNavigationRef.getCurrentRoute();
        if (currentRoute?.name) {
          lastTrackedRouteNameRef.current = currentRoute.name;
          trackScreen?.(currentRoute.name, currentRoute.params as any);
        }
      }}
      onStateChange={(state) => {
        if (!state) return;
        setCurrentNavigationState(state);
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
            markOpenedFromWidget();
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
      <CapabilityMenuStateProvider
        onMenuOpened={() => {
          markCapabilityMenuOpened();
          capture(AnalyticsEvent.CapabilityMenuOpened, {
            source_surface: 'capability_shell',
          });
        }}
      >
        <CapabilitySideSheet
          menu={<KwiltCapabilityMenuHost navigationState={currentNavigationState} />}
        >
          <Drawer.Navigator
            backBehavior={ROOT_DRAWER_BACK_BEHAVIOR}
            drawerContent={() => null}
            screenOptions={{
              headerShown: false,
              drawerType: 'front',
              swipeEnabled: false,
              drawerStyle: { width: 1 },
              overlayColor: 'transparent',
              sceneStyle: { backgroundColor: colors.canvas },
            }}
            initialRouteName="MainTabs"
          >
            <Drawer.Screen
              name="StandaloneFocus"
              component={StandaloneFocusScreen}
              options={{ title: 'Focus', drawerItemStyle: { display: 'none' } }}
            />
            <Drawer.Screen
              name="MainTabs"
              component={CapabilityMainTabsHost}
              options={{ title: 'Home', drawerItemStyle: { display: 'none' } }}
            />
            <Drawer.Screen
              name="Agent"
              component={AiChatScreen}
              options={{ title: 'Agent', drawerItemStyle: { display: 'none' } }}
            />
            <Drawer.Screen
              name="UnifiedChat"
              component={UnifiedChatScreen}
              options={{ title: 'Chat', drawerItemStyle: { display: 'none' } }}
            />
            <Drawer.Screen
              name="SharedHome"
              component={SharedHomeCapabilityHost}
              options={{ title: 'Home', drawerItemStyle: { display: 'none' } }}
            />
            <Drawer.Screen
              name="ArcsStack"
              component={ArcsStackRedirectScreen}
              options={{ title: 'Arcs', drawerItemStyle: { display: 'none' } }}
            />
            <Drawer.Screen
              name="Money"
              component={MoneyCapabilityHost}
              options={{ title: 'Money', drawerItemStyle: { display: 'none' } }}
            />
            <Drawer.Screen
              name="Explore"
              component={ExploreCapabilityHost}
              options={{ title: 'Explore', drawerItemStyle: { display: 'none' } }}
            />
            <Drawer.Screen
              name="Games"
              component={GamesCapabilityHost}
              options={{ title: 'Games', drawerItemStyle: { display: 'none' } }}
            />
            <Drawer.Screen
              name="Chores"
              component={ChoresCapabilityHost}
              options={{ title: 'Chores', drawerItemStyle: { display: 'none' } }}
            />
            <Drawer.Screen
              name="Food"
              component={FoodCapabilityHost}
              options={{ title: 'Food', drawerItemStyle: { display: 'none' } }}
            />
            {showDevTools ? (
              <>
                <Drawer.Screen
                  name="DevTools"
                  component={DevToolsScreen}
                  options={{ title: 'Developer tools', drawerItemStyle: { display: 'none' } }}
                />
                <Drawer.Screen
                  name="GuidedOvertureLab"
                  component={GuidedOvertureLabScreen}
                  options={{ title: 'Guided Overture lab', drawerItemStyle: { display: 'none' } }}
                />
              </>
            ) : null}
            <Drawer.Screen
              name="Settings"
              component={SettingsStackNavigator}
              options={{ title: 'Settings', drawerItemStyle: { display: 'none' } }}
            />
          </Drawer.Navigator>
        </CapabilitySideSheet>
      </CapabilityMenuStateProvider>
      <PlanKickoffDrawerHost />
      <CreditsInterstitialDrawerHost />
      <PaywallDrawerHost />
      <JoinSharedGoalDrawerHost />
      <AuthPromptDrawerHost />
      <PersonalScreenTimeRuleBuilderHost />
      <ScreenTimeUnlockGuideHost />
      <ToastHost />
    </NavigationContainer>
  );
}

export function RootNavigator() {
  return (
    <ChromeVisibilityProvider>
      <RootNavigatorBase />
    </ChromeVisibilityProvider>
  );
}

export function RootNavigatorWithPostHog() {
  const { posthog } = useAnalytics();

  return (
    <ChromeVisibilityProvider>
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
    </ChromeVisibilityProvider>
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
      <ActivitiesStack.Screen name="ActivitiesListFromWidget" component={ActivitiesScreen} />
      <ActivitiesStack.Screen name="GoalDetail" component={GoalDetailScreen} />
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
      screenOptions={{ headerShown: false }}
      tabBar={() => null}
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
        options={{ title: 'To-dos' }}
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

function CapabilityMainTabsHost() {
  return (
    <CapabilityShellProvider>
      <MainTabsNavigator />
    </CapabilityShellProvider>
  );
}

function MoneyCapabilityHost() {
  return (
    <CapabilityShellProvider>
      <MoneyNavigator />
    </CapabilityShellProvider>
  );
}

function ExploreCapabilityHost() {
  const enabled = useKwiltLabsStore((state) => state.enabledCapabilities.includes('explore'));
  if (!enabled) {
    return (
      <KwiltLabsSettingsSurface
        onBack={() => {
          if (rootNavigationRef.canGoBack()) rootNavigationRef.goBack();
          else rootNavigationRef.navigate('Settings', { screen: 'SettingsHome' });
        }}
      />
    );
  }
  return (
    <CapabilityShellProvider>
      <ExploreNavigator />
    </CapabilityShellProvider>
  );
}

function ExploreSettingsCapabilityHost(props: ComponentProps<typeof ExploreSettingsScreen>) {
  const enabled = useKwiltLabsStore((state) => state.enabledCapabilities.includes('explore'));
  if (!enabled) {
    return <KwiltLabsSettingsSurface onBack={() => props.navigation.goBack()} />;
  }
  return <ExploreSettingsScreen {...props} />;
}

function GamesCapabilityHost() {
  return (
    <CapabilityShellProvider>
      <GamesNavigator />
    </CapabilityShellProvider>
  );
}

function ChoresCapabilityHost() {
  const enabled = useKwiltLabsStore((state) => state.enabledCapabilities.includes('chores'));
  if (!enabled) {
    return (
      <KwiltLabsSettingsSurface
        onBack={() => {
          if (rootNavigationRef.canGoBack()) rootNavigationRef.goBack();
          else rootNavigationRef.navigate('Settings', { screen: 'SettingsHome' });
        }}
      />
    );
  }
  return (
    <CapabilityShellProvider>
      <ChoresScreen />
    </CapabilityShellProvider>
  );
}

function FoodCapabilityHost() {
  return (
    <CapabilityShellProvider>
      <FoodNavigator />
    </CapabilityShellProvider>
  );
}

function SharedHomeCapabilityHost() {
  return (
    <CapabilityShellProvider>
      <SharedHomeScreen />
    </CapabilityShellProvider>
  );
}

function MoreStackNavigator() {
  return (
    <MoreStack.Navigator screenOptions={{ headerShown: false }}>
      <MoreStack.Screen name="MoreHome" component={MoreScreen} />
      <MoreStack.Screen name="MoreArcs" component={ArcsStackNavigator} />
      <MoreStack.Screen name="MoreChapters" component={ChaptersScreen} />
      <MoreStack.Screen name="MoreChapterDetail" component={ChapterDetailScreen} />
      <MoreStack.Screen name="MoreChapterAlign" component={ChapterAlignScreen} />
      <MoreStack.Screen
        name="MoreChapterDigestSettings"
        component={ChapterDigestSettingsScreen}
      />
    </MoreStack.Navigator>
  );
}

function SettingsStackNavigator() {
  return (
    <SettingsStack.Navigator screenOptions={{ headerShown: false }}>
      <SettingsStack.Screen name="SettingsHome" component={SettingsHomeScreen} />
      <SettingsStack.Screen name="SettingsKwiltLabs" component={KwiltLabsSettingsScreen} />
      <SettingsStack.Screen name="SettingsMeals" component={MealsSettingsScreen} />
      <SettingsStack.Screen name="SettingsExplore" component={ExploreSettingsCapabilityHost} />
      <SettingsStack.Screen name="SettingsGames" component={GamesPlayerSettingsScreen} />
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
        name="SettingsScreenTimeProtection"
        component={ScreenTimeProtectionSettingsScreen}
      />
      <SettingsStack.Screen
        name="SettingsScreenTimeRuleBuilder"
        component={PersonalScreenTimeRuleBuilderScreen}
        options={{
          presentation: 'transparentModal',
          animation: 'none',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <SettingsStack.Screen name="SettingsHousehold" component={HouseholdSettingsScreen} />
      <SettingsStack.Screen name="SettingsHouseholdMember" component={HouseholdMemberDetailScreen} />
      <SettingsStack.Screen
        name="SettingsFamilyScreenTime"
        component={FamilyScreenTimeLearningScreen}
      />
      <SettingsStack.Screen name="SettingsMoneyPrivacy" component={MoneyPrivacySettingsScreen} />
      <SettingsStack.Screen name="SettingsMoneyHousehold" component={MoneyHouseholdSettingsScreen} />
      <SettingsStack.Screen name="SettingsBudget" component={BudgetSettingsScreen} />
      <SettingsStack.Screen
        name="SettingsWeeklyChapters"
        component={ChapterDigestSettingsScreen}
      />
      <SettingsStack.Screen
        name="SettingsPhoneAgent"
        component={PhoneAgentSettingsScreen}
      />
      <SettingsStack.Screen
        name="SettingsConnectedTools"
        component={ConnectedToolsScreen}
      />
      <SettingsStack.Screen
        name="SettingsConnectKwiltApp"
        component={ConnectKwiltAppScreen}
      />
      <SettingsStack.Screen
        name="SettingsConnectedToolDetail"
        component={ConnectedToolDetailScreen}
      />
      <SettingsStack.Screen
        name="SettingsSharing"
        component={SharingSettingsScreen}
      />
      <SettingsStack.Screen
        name="SettingsJoinFriend"
        component={JoinFriendInviteScreen}
      />
      <SettingsStack.Screen
        name="SettingsLegalPrivacy"
        component={LegalPrivacyScreen}
      />
      <SettingsStack.Screen
        name="SettingsHaptics"
        component={HapticsSettingsScreen}
      />
      <SettingsStack.Screen name="SettingsWidgets" component={WidgetsSettingsScreen} />
      <SettingsStack.Screen
        name="SettingsExecutionTargets"
        component={ExecutionTargetsSettingsScreen}
      />
      <SettingsStack.Screen
        name="SettingsDestinationsLibrary"
        component={DestinationsLibraryScreen}
      />
      <SettingsStack.Screen
        name="SettingsActivityAreas"
        component={ActivityAreasSettingsScreen}
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

function KwiltCapabilityMenuHost({ navigationState }: { navigationState?: NavigationState }) {
  const insets = useSafeAreaInsets();
  const authIdentity = useAppStore((state) => state.authIdentity);
  const userProfile = useAppStore((state) => state.userProfile);
  const { capture } = useAnalytics();
  const { coverMenu } = useCapabilityMenuActions();
  const menuOpen = useCapabilityMenuOpen();
  const liveTransactionsAvailability = useMoneyNavigationAvailabilityStore((state) => (
    authIdentity?.userId
      ? state.transactionsByUserId[authIdentity.userId] ?? 'unknown'
      : 'unknown'
  ));
  const [menuTransactionsAvailability, setMenuTransactionsAvailability] = useState(liveTransactionsAvailability);
  useEffect(() => {
    if (!menuOpen) setMenuTransactionsAvailability(liveTransactionsAvailability);
  }, [liveTransactionsAvailability, menuOpen]);
  const exploreEnabled = useKwiltLabsStore((state) => state.enabledCapabilities.includes('explore'));
  const choresEnabled = useKwiltLabsStore((state) => state.enabledCapabilities.includes('chores'));
  const choreRecord = useChoreLearningStore((state) => state.record);
  const choresAttentionCount = useMemo(
    () => projectChoreReviewQueue(choreRecord, choreRecord.activeMemberId).length,
    [choreRecord],
  );
  const sharedHomeEnabled = useFeatureFlag('shared-home-v1', false);
  const chatRepository = useMemo(() => createUnifiedChatRepository(), []);
  const [chatThreads, setChatThreads] = useState<UnifiedChatThread[]>([]);
  const [chatsLoading, setChatsLoading] = useState(false);
  const [chatsError, setChatsError] = useState<string | null>(null);
  const displayName = authIdentity?.name?.trim() || userProfile?.fullName?.trim() || 'Kwilter';
  const activeCapabilityId = deriveActiveCapabilityDestinationId(navigationState);
  const discovery = useCapabilityDiscoveryStore((state) => state.discovery);
  const markCapabilityVisited = useCapabilityDiscoveryStore((state) => state.markVisited);
  const unvisitedCapabilityIds = useMemo(
    () => CAPABILITY_MENU_REGISTRY
      .filter(({ id }) => shouldShowCapabilityDiscoveryDot(discovery, id))
      .map(({ id }) => id),
    [discovery],
  );
  const activeRoute = getActiveRoute(navigationState);
  const activeChatThreadId = activeRoute?.name === 'UnifiedChat' && typeof activeRoute.params?.threadId === 'string'
    ? activeRoute.params.threadId
    : null;

  useEffect(() => {
    if (activeCapabilityId) markCapabilityVisited(activeCapabilityId);
  }, [activeCapabilityId, markCapabilityVisited]);

  const refreshChatThreads = useCallback(async () => {
    setChatsLoading(true);
    setChatsError(null);
    try {
      setChatThreads(await chatRepository.listThreads());
    } catch {
      setChatsError('Chats could not be loaded.');
    } finally {
      setChatsLoading(false);
    }
  }, [chatRepository]);

  useEffect(() => {
    if (menuOpen) void refreshChatThreads();
  }, [menuOpen, refreshChatThreads]);

  const openChatThread = useCallback((threadId: string) => {
    rootNavigationRef.navigate('UnifiedChat', { threadId });
    coverMenu();
  }, [coverMenu]);

  const createChatThread = useCallback(async () => {
    setChatsError(null);
    try {
      const thread = await chatRepository.createThread();
      setChatThreads((current) => [thread, ...current.filter((item) => item.id !== thread.id)]);
      openChatThread(thread.id);
    } catch {
      Alert.alert('Could not create chat', 'Try again in a moment.');
    }
  }, [chatRepository, openChatThread]);

  const navigateAfterChatRemoval = useCallback((removedThreadId: string, remaining: UnifiedChatThread[]) => {
    if (activeChatThreadId !== removedThreadId) return;
    rootNavigationRef.navigate('UnifiedChat', { threadId: remaining[0]?.id ?? null });
  }, [activeChatThreadId]);

  const archiveChatThread = useCallback(async (threadId: string) => {
    const thread = chatThreads.find((candidate) => candidate.id === threadId);
    if (!thread) return;
    try {
      await chatRepository.archiveThread(threadId);
      const remaining = chatThreads.filter((candidate) => candidate.id !== threadId);
      setChatThreads(remaining);
      navigateAfterChatRemoval(threadId, remaining);
      useToastStore.getState().showToast({
        message: 'Chat archived',
        actionLabel: 'Undo',
        actionOnPress: () => {
          void (async () => {
            try {
              const restored = await chatRepository.restoreThread(threadId);
              setChatThreads((current) => [
                restored,
                ...current.filter((candidate) => candidate.id !== restored.id),
              ]);
            } catch {
              useToastStore.getState().showToast({
                message: 'Could not restore chat',
                variant: 'danger',
              });
            }
          })();
        },
      });
    } catch {
      useToastStore.getState().showToast({
        message: 'Could not archive chat',
        variant: 'danger',
      });
    }
  }, [chatRepository, chatThreads, navigateAfterChatRemoval]);

  const deleteChatThread = useCallback((threadId: string) => {
    const thread = chatThreads.find((candidate) => candidate.id === threadId);
    if (!thread) return;
    Alert.alert(
      'Delete chat?',
      `“${thread.title}” and its conversation history will be permanently deleted. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await chatRepository.deleteThread(threadId);
                const remaining = chatThreads.filter((candidate) => candidate.id !== threadId);
                setChatThreads(remaining);
                navigateAfterChatRemoval(threadId, remaining);
                useToastStore.getState().showToast({ message: 'Chat deleted' });
              } catch {
                useToastStore.getState().showToast({
                  message: 'Could not delete chat',
                  variant: 'danger',
                });
              }
            })();
          },
        },
      ],
    );
  }, [chatRepository, chatThreads, navigateAfterChatRemoval]);

  return (
    <View
      style={[
        styles.drawerContentContainer,
        { paddingTop: insets.top + NAV_DRAWER_TOP_OFFSET, paddingBottom: spacing.sm + insets.bottom },
      ]}
    >
      <CapabilityMenu
        activeCapabilityId={activeCapabilityId}
        activeChatThreadId={activeChatThreadId}
        chats={chatThreads}
        chatsLoading={chatsLoading}
        chatsError={chatsError}
        displayName={displayName}
        avatarUrl={userProfile?.avatarUrl || authIdentity?.avatarUrl}
        hiddenCapabilityIds={menuTransactionsAvailability === 'pristine' ? ['money-transactions'] : []}
        onSelectCapability={(id) => {
          const capability = resolveCapabilityNavigation(id);
          capture(AnalyticsEvent.CapabilitySelected, {
            capability_id: id.startsWith('money-') ? 'money' : id,
            destination_id: id,
            source_surface: 'menu',
          });
          rootNavigationRef.dispatch(createCapabilityNavigateAction(capability));
          coverMenu();
        }}
        onSelectChat={openChatThread}
        onArchiveChat={(threadId) => void archiveChatThread(threadId)}
        onDeleteChat={deleteChatThread}
        onCreateChat={() => void createChatThread()}
        onOpenSearch={() => {
          coverMenu();
          useAppStore.getState().openGlobalSearch();
        }}
        onOpenSettings={() => {
          rootNavigationRef.navigate('Settings', { screen: 'SettingsHome' });
          coverMenu();
        }}
        sharedHomeEnabled={sharedHomeEnabled}
        onOpenHome={() => {
          rootNavigationRef.navigate('SharedHome', { source: 'manual' });
          coverMenu();
        }}
        onOpenChat={() => {
          const context = deriveCapabilityAgentContext(navigationState);
          let launchContext: UnifiedChatLaunchContext | undefined;
          if (context && (
            context.capabilityId === 'goals' ||
            context.capabilityId === 'todos' ||
            context.capabilityId === 'chapters'
          )) {
            let supportedObject: UnifiedChatLaunchContext['object'];
            if (context.object?.type === 'goal') {
              supportedObject = { type: 'goal', id: context.object.id };
            } else if (context.object?.type === 'activity') {
              supportedObject = { type: 'activity', id: context.object.id };
            } else if (context.object?.type === 'chapter') {
              supportedObject = { type: 'chapter', id: context.object.id };
            }
            launchContext = {
              capabilityId: context.capabilityId,
              surface: context.surface === 'detail' ? 'detail' : 'inventory',
              ...(supportedObject ? { object: supportedObject } : {}),
              returnTarget: resolveCapabilityAgentReturn(context) as unknown as Record<string, unknown>,
            };
          }
          rootNavigationRef.navigate(
            'UnifiedChat',
            launchContext
              ? { entry: 'fresh', source: 'capability_menu', launchContext }
              : { entry: 'fresh', source: 'capability_menu' },
          );
          coverMenu();
        }}
        exploreEnabled={exploreEnabled}
        choresEnabled={choresEnabled}
        choresAttentionCount={choresAttentionCount}
        unvisitedCapabilityIds={unvisitedCapabilityIds}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  navRestoreScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.shell,
    paddingHorizontal: spacing.lg,
  },
  navRestoreText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  drawerContentContainer: {
    flex: 1,
  },
});
