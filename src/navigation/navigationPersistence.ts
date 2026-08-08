import type { NavigationState } from '@react-navigation/native';
import type { RootDrawerParamList } from './RootNavigator';

type ProductionRootRouteName = Exclude<keyof RootDrawerParamList, 'DevTools' | 'GuidedOvertureLab'>;
type RootRouteName = ProductionRootRouteName | 'DevTools' | 'GuidedOvertureLab';

type PersistedRouteLike = {
  key?: string;
  name: string;
  params?: unknown;
  state?: PersistedStateLike;
};

type PersistedStateLike = {
  stale?: boolean;
  type?: string;
  key?: string;
  index?: number;
  routeNames?: string[];
  routes: PersistedRouteLike[];
};

type ChildSchema = {
  allowed: readonly string[];
  fallback: string;
};

const MAIN_TABS_SCHEMA: ChildSchema = {
  allowed: ['GoalsTab', 'ActivitiesTab', 'PlanTab', 'MoreTab'],
  fallback: 'ActivitiesTab',
};

const GOALS_STACK_SCHEMA: ChildSchema = {
  allowed: ['GoalsList', 'JoinSharedGoal', 'GoalDetail', 'ActivityDetailFromGoal'],
  fallback: 'GoalsList',
};

const ACTIVITIES_STACK_SCHEMA: ChildSchema = {
  allowed: ['ActivitiesList', 'ActivitiesListFromWidget', 'GoalDetail', 'ActivityDetail'],
  fallback: 'ActivitiesList',
};

const MORE_STACK_SCHEMA: ChildSchema = {
  allowed: [
    'MoreHome',
    'MoreArcs',
    'MoreChapters',
    'MoreChapterDetail',
    'MoreChapterAlign',
    'MoreChapterDigestSettings',
  ],
  fallback: 'MoreHome',
};

const ARCS_STACK_SCHEMA: ChildSchema = {
  allowed: ['ArcsList', 'ArcDraftContinue', 'ArcDetail', 'GoalDetail', 'ActivityDetailFromGoal'],
  fallback: 'ArcsList',
};

const MONEY_STACK_SCHEMA: ChildSchema = {
  allowed: [
    'MoneySummary',
    'MoneyTransactions',
    'MoneyAccounts',
    'MoneyCategoryDetail',
    'MoneyCategoryCreate',
    'MoneyTransactionDetail',
  ],
  fallback: 'MoneySummary',
};

const EXPLORE_STACK_SCHEMA: ChildSchema = {
  allowed: ['ExploreMap'],
  fallback: 'ExploreMap',
};

const GAMES_STACK_SCHEMA: ChildSchema = {
  allowed: [
    'GamesShelf',
    'GamesTimer',
    'GamesStitchFive',
    'GamesTumble',
    'GamesConnection',
    'GamesJoin',
    'GamesRemote',
    'GamesAccount',
  ],
  fallback: 'GamesShelf',
};

const FOOD_STACK_SCHEMA: ChildSchema = {
  allowed: [
    'FoodHome',
    'RecipeLibrary',
    'EditorialMealCollection',
    'RecipeEdit',
    'RecipeHome',
    'RecipeCooking',
    'RecipeReadiness',
    'RecipeCookMode',
    'RecipeCookComplete',
    'RecipeImportReview',
    'NextMeals',
    'MealPlanEditor',
    'MealChoiceInvite',
    'MealPlanFinalize',
    'MealChoiceResponse',
    'GroceryList',
    'AlreadyHaveReview',
    'GroceryItemEdit',
    'GroceryHandoff',
    'GrocerySavings',
    'FoodStockReview',
    'FoodScenarioReview',
  ],
  fallback: 'FoodHome',
};

const SETTINGS_STACK_SCHEMA: ChildSchema = {
  allowed: [
    'SettingsHome',
    'SettingsMeals',
    'SettingsExplore',
    'SettingsGames',
    'SettingsAppearance',
    'SettingsProfile',
    'SettingsAiModel',
    'SettingsNotifications',
    'SettingsScreenTimeProtection',
    'SettingsHousehold',
    'SettingsFamilyScreenTime',
    'SettingsMoneyPrivacy',
    'SettingsMoneyHousehold',
    'SettingsWeeklyChapters',
    'SettingsPhoneAgent',
    'SettingsConnectedTools',
    'SettingsConnectKwiltApp',
    'SettingsConnectedToolDetail',
    'SettingsSharing',
    'SettingsLegalPrivacy',
    'SettingsHaptics',
    'SettingsWidgets',
    'SettingsExecutionTargets',
    'SettingsDestinationsLibrary',
    'SettingsActivityAreas',
    'SettingsPlanAvailability',
    'SettingsPlanCalendars',
    'SettingsDestinationDetail',
    'SettingsBuiltInDestinationDetail',
    'SettingsSuperAdminTools',
    'SettingsManageSubscription',
    'SettingsChangePlan',
    'SettingsPaywall',
  ],
  fallback: 'SettingsHome',
};

// Keep persistence coverage compile-time complete with the registered root navigator.
// Adding a production root to RootDrawerParamList must add its restoration policy here.
const PRODUCTION_ROOT_SCHEMAS = {
  StandaloneFocus: null,
  MainTabs: MAIN_TABS_SCHEMA,
  Agent: null,
  UnifiedChat: null,
  SharedHome: null,
  ArcsStack: ARCS_STACK_SCHEMA,
  Money: MONEY_STACK_SCHEMA,
  Explore: EXPLORE_STACK_SCHEMA,
  Games: GAMES_STACK_SCHEMA,
  Food: FOOD_STACK_SCHEMA,
  Settings: SETTINGS_STACK_SCHEMA,
} satisfies Record<ProductionRootRouteName, ChildSchema | null>;

function childSchemaForRoute(routeName: string): ChildSchema | null {
  if (routeName === 'MainTabs') return MAIN_TABS_SCHEMA;
  if (routeName === 'GoalsTab') return GOALS_STACK_SCHEMA;
  if (routeName === 'ActivitiesTab') return ACTIVITIES_STACK_SCHEMA;
  if (routeName === 'MoreTab') return MORE_STACK_SCHEMA;
  if (routeName === 'MoreArcs' || routeName === 'ArcsStack') return ARCS_STACK_SCHEMA;
  if (routeName === 'Money') return MONEY_STACK_SCHEMA;
  if (routeName === 'Explore') return EXPLORE_STACK_SCHEMA;
  if (routeName === 'Games') return GAMES_STACK_SCHEMA;
  if (routeName === 'Food') return FOOD_STACK_SCHEMA;
  if (routeName === 'Settings') return SETTINGS_STACK_SCHEMA;
  return null;
}

function sanitizeChildState(
  state: PersistedStateLike | undefined,
  schema: ChildSchema,
): PersistedStateLike | undefined {
  if (!state || !Array.isArray(state.routes)) return undefined;

  const activeRoute = state.routes[state.index ?? 0];
  const activeName = activeRoute?.name;
  const routes = state.routes
    .filter((route): route is PersistedRouteLike =>
      Boolean(route && typeof route.name === 'string' && schema.allowed.includes(route.name)),
    )
    .map((route) => {
      const childSchema = childSchemaForRoute(route.name);
      if (!childSchema) {
        const { state: _discardedState, ...leafRoute } = route;
        return leafRoute;
      }
      const childState = sanitizeChildState(route.state, childSchema);
      return childState ? { ...route, state: childState } : { ...route, state: undefined };
    });

  if (!routes.some(({ name }) => name === schema.fallback)) {
    routes.unshift({ name: schema.fallback });
  }

  const requestedActiveName = schema.allowed.includes(activeName ?? '')
    ? activeName
    : schema.fallback;
  const index = Math.max(0, routes.findIndex(({ name }) => name === requestedActiveName));

  return {
    ...state,
    index,
    routeNames: routes.map(({ name }) => name),
    routes,
  };
}

export function sanitizePersistedNavigationState(
  state: NavigationState,
  options: { showDevTools: boolean },
): NavigationState | undefined {
  if (!shouldRestoreNavigationState(state, options)) return undefined;

  const rootSchema: ChildSchema = {
    allowed: getAllowedPersistedRootRoutes(options.showDevTools),
    fallback: 'MainTabs',
  };
  return sanitizeChildState(state as unknown as PersistedStateLike, rootSchema) as
    | NavigationState
    | undefined;
}

export function getAllowedPersistedRootRoutes(showDevTools: boolean): RootRouteName[] {
  return [
    ...(Object.keys(PRODUCTION_ROOT_SCHEMAS) as ProductionRootRouteName[]),
    ...(showDevTools ? (['DevTools', 'GuidedOvertureLab'] as const) : []),
  ];
}

export function shouldRestoreNavigationState(
  state: NavigationState | undefined,
  options: { showDevTools: boolean },
): boolean {
  const allowedRootRoutes = getAllowedPersistedRootRoutes(options.showDevTools);

  return Boolean(
    state?.routes?.length &&
      state.routes.every((route) => allowedRootRoutes.includes(route.name as RootRouteName)),
  );
}

export function shouldRestorePersistedNavigationForInitialUrl(initialUrl: string | null): boolean {
  return !initialUrl;
}

export async function resolvePersistedNavigationState(
  savedStatePromise: Promise<string | null>,
  options: { showDevTools: boolean; timeoutMs: number },
): Promise<NavigationState | undefined> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timeoutId = setTimeout(() => resolve(null), options.timeoutMs);
  });

  try {
    const savedStateString = await Promise.race([savedStatePromise, timeout]);
    if (!savedStateString) return undefined;

    try {
      const state = JSON.parse(savedStateString) as NavigationState;
      return sanitizePersistedNavigationState(state, options);
    } catch {
      return undefined;
    }
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}
