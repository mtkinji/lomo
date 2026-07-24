import type { IconName } from '../ui/Icon';

export type CapabilityId = 'goals' | 'todos' | 'plan' | 'arcs' | 'chapters' | 'money';

export type CapabilityMenuDestinationId =
  | Exclude<CapabilityId, 'money'>
  | 'money-summary'
  | 'money-transactions'
  | 'money-accounts';

export type CapabilityNavigationId = CapabilityId | CapabilityMenuDestinationId;

export type CapabilityGroupId = 'goals-plans' | 'money';

export type CapabilityAvailability = 'active' | 'preview' | 'hidden';

export type CapabilityRouteTarget =
  | { root: 'MainTabs'; tab: 'GoalsTab'; screen: 'GoalsList' }
  | { root: 'MainTabs'; tab: 'ActivitiesTab'; screen: 'ActivitiesList' }
  | { root: 'MainTabs'; tab: 'PlanTab' }
  | { root: 'MainTabs'; tab: 'MoreTab'; screen: 'MoreArcs' | 'MoreChapters' }
  | { root: 'Money'; screen: 'MoneySummary' | 'MoneyTransactions' | 'MoneyAccounts' };

export type CapabilitySettingsDestination = {
  id: string;
  label: string;
  route: string;
};

export type CapabilityPermission =
  | 'calendar'
  | 'health'
  | 'location'
  | 'notifications'
  | 'screen-time';

export type CapabilityAgentSurface = 'inventory' | 'detail' | 'session';

export type CapabilityAgentContract = {
  surfaces: readonly CapabilityAgentSurface[];
  supportsObjectContext: boolean;
};

export type CapabilityLifecycleContract = {
  preload?: () => Promise<void>;
  activate?: () => Promise<void>;
  deactivate?: () => Promise<void>;
};

export type CapabilityDefinition = {
  id: CapabilityId;
  label: string;
  group: CapabilityGroupId | null;
  icon: IconName;
  availability: CapabilityAvailability;
  rootRoute: CapabilityRouteTarget;
  deepLinks: readonly string[];
  settings?: readonly CapabilitySettingsDestination[];
  permissions?: readonly CapabilityPermission[];
  agent: CapabilityAgentContract;
  lifecycle: CapabilityLifecycleContract;
};

export type CapabilityGroupDefinition = {
  id: CapabilityGroupId;
  label: string;
};

export type CapabilityMenuDestinationDefinition = {
  id: CapabilityMenuDestinationId;
  ownerId: CapabilityId;
  label: string;
  group: CapabilityGroupId | null;
  icon: IconName;
  availability: CapabilityAvailability;
  rootRoute: CapabilityRouteTarget;
};
