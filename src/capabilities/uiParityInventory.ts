import type {
  CapabilityManifestEntry,
  ExternalControlCoverageRow,
  KwiltCapabilityOperationId,
} from '@kwilt/agent-runtime';

export type UiParitySurfaceScope = 'included' | 'excluded';
export type UiParityGapPriority = 'p0' | 'p1' | 'p2' | 'p3';

export type UiParityIntent = {
  id: string;
  label: string;
  operationIds: readonly KwiltCapabilityOperationId[];
};

export type UiParityGap = {
  id: string;
  label: string;
  priority: UiParityGapPriority;
  reason: string;
};

export type UiParitySurface = {
  id: string;
  title: string;
  scope: UiParitySurfaceScope;
  scopeReason: string | null;
  routeRefs: readonly string[];
  sourcePaths: readonly string[];
  intents: readonly UiParityIntent[];
  gaps: readonly UiParityGap[];
};

const intent = (
  id: string,
  label: string,
  ...operationIds: readonly KwiltCapabilityOperationId[]
): UiParityIntent => ({ id, label, operationIds });

const gap = (
  id: string,
  label: string,
  priority: UiParityGapPriority,
  reason: string,
): UiParityGap => ({ id, label, priority, reason });

const included = (
  id: string,
  title: string,
  routeRefs: readonly string[],
  sourcePaths: readonly string[],
  intents: readonly UiParityIntent[],
  gaps: readonly UiParityGap[] = [],
): UiParitySurface => ({
  id, title, scope: 'included', scopeReason: null, routeRefs, sourcePaths, intents, gaps,
});

const excluded = (
  id: string,
  title: string,
  scopeReason: string,
  routeRefs: readonly string[],
  sourcePaths: readonly string[],
  intents: readonly UiParityIntent[],
): UiParitySurface => ({
  id, title, scope: 'excluded', scopeReason, routeRefs, sourcePaths, intents, gaps: [],
});

/**
 * Audited inventory of primary native surfaces and ordinary-language user intents.
 *
 * Canonical operation policy remains in KWILT_CAPABILITY_MANIFEST. This inventory
 * supplies the missing native-surface side of parity: every manifest operation must
 * appear exactly once here, while native intents without an operation remain explicit
 * prioritized gaps. Games, Explore, developer tools, authentication, and paywall
 * mechanics are deliberate program boundaries rather than silent omissions.
 */
export const UI_PARITY_SURFACES = [
  included('chat-general', 'Chat and contextual answers', ['UnifiedChat', 'Agent'], [
    'src/features/unifiedChat/UnifiedChatScreen.tsx',
    'src/features/unifiedChat/runUnifiedChatTurn.ts',
  ], [
    intent('chat.answer', 'Ask an ordinary question', 'general.answer'),
    intent('chat.answer_with_context', 'Ask using the minimum relevant Kwilt context', 'general.answer_with_context'),
  ]),
  included('relationships-memory', 'People and relationship memory', ['UnifiedChat', 'SettingsSharing'], [
    'src/services/relationshipMemoryToolProvider.ts',
    'src/capabilities/relationships/actions/relationshipActions.ts',
  ], [
    intent('relationships.read', 'Recall what Kwilt knows about a person or relationship', 'relationships.read'),
    intent('relationships.remember', 'Remember one explicitly stated relationship fact', 'relationships.remember'),
    intent('relationships.correct', 'Correct one relationship fact', 'relationships.correct'),
    intent('relationships.forget', 'Forget one relationship fact', 'relationships.forget'),
    intent('relationships.forget_person', 'Forget all retained information about one person', 'relationships.forget_person'),
  ]),
  included('household-settings', 'Household and family membership', [
    'SettingsHousehold', 'SettingsHouseholdMember', 'SettingsHouseholdDevices', 'SettingsHouseholdDeviceSetup',
  ], [
    'src/features/household/HouseholdSettingsScreen.tsx',
    'src/features/household/HouseholdMemberDetailScreen.tsx',
    'src/features/household/HouseholdDevicesScreen.tsx',
  ], [
    intent('household.read', 'View the household, members, roles, and capabilities', 'household.read'),
    intent('household.add_dependent', 'Add a dependent household member', 'household.member.add_dependent'),
    intent('household.invite', 'Create or preview a household invitation', 'household.invitation.create', 'household.invitation.preview'),
    intent('household.accept_invitation', 'Accept a household invitation', 'household.invitation.accept'),
    intent('household.child_capabilities', 'Change a child capability grant', 'household.child_capability.update'),
    intent('household.caregiver_grants', 'Change caregiver authority', 'household.caregiver_grant.update'),
  ], [
    gap('household.member.update', 'Update a household member profile or relationship', 'p0', 'Native Household supports member editing, but no canonical Chat operation covers it.'),
    gap('household.member.remove', 'Remove or release a household member', 'p0', 'Removal changes dependent authority and needs a reviewed, reversible Household operation.'),
    gap('household.device.manage', 'Rename, revoke, or reconcile a household device', 'p1', 'Device management exists natively but only setup and release handoffs are currently classified.'),
  ]),
  included('profile-settings', 'Profile', ['SettingsProfile'], [
    'src/features/account/ProfileSettingsScreen.tsx',
    'src/capabilities/life-structure/actions/profileActions.ts',
  ], [
    intent('profile.read', 'View the current profile', 'profile.read'),
    intent('profile.update', 'Update supported profile fields', 'profile.update'),
  ]),
  included('arcs', 'Arcs', ['MoreArcs', 'ArcsList', 'ArcDetail'], [
    'src/features/arcs/ArcsScreen.tsx',
    'src/features/arcs/ArcDetailScreen.tsx',
  ], [
    intent('arcs.read', 'List or inspect Arcs', 'arcs.list', 'arcs.get'),
    intent('arcs.create', 'Create an Arc', 'arcs.create'),
    intent('arcs.update', 'Update an Arc', 'arcs.update'),
    intent('arcs.delete', 'Delete an Arc', 'arcs.delete'),
  ]),
  included('goals', 'Goals', ['GoalsList', 'GoalDetail'], [
    'src/features/goals/GoalsScreen.tsx',
    'src/features/arcs/GoalDetailScreen.tsx',
  ], [
    intent('goals.read', 'List or inspect Goals', 'goals.list', 'goals.get'),
    intent('goals.create', 'Create a Goal', 'goals.create'),
    intent('goals.update', 'Update a Goal', 'goals.update'),
    intent('goals.delete', 'Delete a Goal', 'goals.delete'),
    intent('goals.check_in', 'Add a Goal check-in', 'goals.check_in'),
    intent('goals.share', 'Share a Goal after native audience review', 'goals.share'),
  ]),
  included('todos', 'To-dos and Focus', ['ActivitiesList', 'ActivityDetail', 'StandaloneFocus'], [
    'src/features/activities/ActivitiesScreen.tsx',
    'src/features/activities/ActivityDetailScreen.tsx',
    'src/features/activities/StandaloneFocusScreen.tsx',
  ], [
    intent('todos.read', 'List, find, or inspect To-dos', 'activities.list', 'activities.get', 'activities.search'),
    intent('todos.capture', 'Capture a To-do', 'activities.capture'),
    intent('todos.update', 'Update, complete, or delete a To-do', 'activities.update', 'activities.complete', 'activities.delete'),
    intent('todos.steps', 'Add, edit, complete, delete, or reorder To-do steps',
      'activities.steps.create', 'activities.steps.update', 'activities.steps.complete',
      'activities.steps.delete', 'activities.steps.reorder'),
    intent('todos.focus', 'Open Focus or choose a To-do for today', 'activities.focus.open', 'activities.focus_today'),
    intent('todos.schedule', 'Schedule a To-do or split it into calendar chunks', 'activities.schedule', 'plan.schedule_chunks'),
    intent('todos.reminder', 'Set or remove a To-do reminder', 'activities.reminder.update'),
    intent('todos.repeat', 'Set or change To-do recurrence', 'activities.repeat.update'),
    intent('todos.location', 'Set a location trigger after native permission review', 'activities.location.update'),
    intent('todos.attachments', 'Add or manage attachments with native selection', 'activities.attachments.update'),
    intent('todos.share', 'Share a To-do after native audience review', 'activities.share'),
  ]),
  included('plan', 'Plan and calendar placement', ['PlanTab', 'SettingsPlanAvailability', 'SettingsPlanCalendars'], [
    'src/features/plan/PlanScreen.tsx',
    'src/capabilities/plan/actions/planActions.ts',
  ], [
    intent('plan.read', 'Read the day context and current priorities', 'plan.read_day_context'),
    intent('plan.recommend', 'Recommend a realistic day without applying it', 'plan.recommend_day'),
    intent('plan.schedule', 'Schedule, reschedule, or remove a planned To-do',
      'plan.schedule_activity', 'plan.reschedule_activity', 'plan.remove_activity'),
    intent('plan.preferences', 'Open native availability and calendar preferences', 'plan.preferences.open'),
  ], [
    gap('plan.availability.update', 'Change working hours and availability directly', 'p1', 'Chat can open the native owner but cannot yet stage an exact availability diff.'),
    gap('plan.calendars.update', 'Enable, disable, or choose calendars directly', 'p1', 'Calendar authorization and provider selection remain native-only settings.'),
  ]),
  included('chapters', 'Chapters', ['MoreChapters', 'MoreChapterDetail', 'MoreChapterAlign'], [
    'src/features/chapters/ChaptersScreen.tsx',
    'src/features/chapters/ChapterDetailScreen.tsx',
  ], [
    intent('chapters.read', 'List, inspect, or reflect on Chapters', 'chapters.list', 'chapters.get', 'chapters.reflect'),
    intent('chapters.note', 'Update the private note on a Chapter', 'chapters.note.update'),
  ], [
    gap('settings.weekly_chapters.update', 'Change weekly Chapter digest settings', 'p2', 'Digest cadence and delivery settings have no canonical operation yet.'),
    gap('chapters.align', 'Apply a Chapter alignment recommendation', 'p1', 'The native alignment surface changes Activities and needs an explicit reviewed operation.'),
  ]),
  included('account-settings', 'Account and general settings', [
    'SettingsHome', 'SettingsAppearance', 'SettingsAiModel', 'SettingsPhoneAgent', 'SettingsConnectedTools',
    'SettingsSharing', 'SettingsHaptics', 'SettingsWidgets', 'SettingsExecutionTargets',
    'SettingsDestinationsLibrary', 'SettingsActivityAreas', 'SettingsManageSubscription', 'SettingsProfile',
  ], [
    'src/features/account/SettingsHomeScreen.tsx',
    'src/navigation/RootNavigator.tsx',
  ], [
    intent('account.show_up', 'Read current show-up status', 'account.show_up_status'),
    intent('account.settings', 'Open account settings', 'account.settings.open'),
    intent('account.subscription', 'Review or manage the subscription natively', 'account.subscription.manage'),
    intent('account.delete', 'Open the native account-deletion review', 'account.delete'),
  ], [
    gap('settings.appearance.update', 'Change appearance settings', 'p3', 'Theme and display preferences are device-local and need a bounded settings provider.'),
    gap('settings.ai_model.update', 'Change the preferred AI model', 'p2', 'Model selection affects cost and behavior and has no canonical reviewed operation.'),
    gap('settings.phone_agent.update', 'Configure Phone Agent', 'p1', 'Phone Agent enrollment and permissions have no direct conversational settings contract.'),
    gap('settings.connected_tools.manage', 'Connect, inspect, or revoke connected tools', 'p1', 'OAuth connections require dedicated secure review and revocation operations.'),
    gap('settings.sharing.manage', 'Manage sharing and friend connections', 'p1', 'The general sharing inventory is broader than Goal and To-do share handoffs.'),
    gap('settings.haptics.update', 'Change haptic preferences', 'p3', 'This device-local preference has no canonical operation.'),
    gap('settings.widgets.configure', 'Configure widgets', 'p2', 'Widget installation and placement remain OS-owned; Kwilt preferences still need a bounded handoff.'),
    gap('settings.execution_targets.manage', 'Manage execution targets', 'p2', 'Execution targets can contain provider authority and need typed review.'),
    gap('settings.destinations.manage', 'Create or edit destinations', 'p1', 'Destination definitions are user data with no canonical Chat operation.'),
    gap('settings.activity_areas.manage', 'Manage Activity areas', 'p2', 'Activity-area editing exists natively but is not represented in the operation manifest.'),
  ]),
  included('money', 'Money', [
    'MoneySummary', 'MoneyTransactions', 'MoneyTransactionDetail', 'MoneyCategoryDetail',
    'MoneyCategoryCreate', 'MoneyAccounts', 'MoneyAppControl', 'SettingsMoneyPrivacy', 'SettingsBudget',
  ], [
    'src/capabilities/money/navigation/MoneyNavigator.tsx',
    'src/capabilities/money/screens/MoneySummaryScreen.tsx',
    'src/capabilities/money/screens/MoneyTransactionDetailScreen.tsx',
  ], [
    intent('money.read', 'Read the bounded Money snapshot', 'money.read'),
    intent('money.review_transaction', 'Review a transaction classification natively', 'money.review_transaction'),
    intent('money.category', 'Create, rename, or update a budget category',
      'money.category.create', 'money.category.rename', 'money.category.update'),
    intent('money.app_control', 'Review a Money-linked Screen Time control', 'money.app_control.review'),
    intent('money.privacy', 'Configure Money privacy after native authentication', 'money.privacy.configure'),
    intent('money.connection', 'Connect or sync a financial institution', 'money.connection.connect', 'money.connection.sync'),
  ], [
    gap('money.budget.update', 'Change the monthly budget plan', 'p0', 'Budget edits are a main Money action but have no canonical reviewed operation.'),
    gap('money.transaction.update', 'Correct transaction meaning or planning treatment', 'p0', 'The current boundary only opens native review; it cannot stage the exact change.'),
    gap('money.connection.disconnect', 'Disconnect or repair a financial connection', 'p1', 'Connection removal and repair are absent from the operation manifest.'),
    gap('money.transfer.review', 'Review transfers and linked transaction evidence', 'p1', 'Transfer semantics are visible in Money but not independently controllable from Chat.'),
  ]),
  excluded('explore', 'Explore', 'Explore is explicitly outside this conversational-control program.', ['ExploreMap', 'SettingsExplore'], [
    'src/capabilities/explore/navigation/ExploreNavigator.tsx',
  ], [intent('explore.open', 'Open Explore', 'explore.open')]),
  excluded('games', 'Games', 'Games are explicitly outside this conversational-control program.', ['GamesShelf', 'GamesTimer', 'GamesConnection'], [
    'src/capabilities/games/navigation/GamesNavigator.tsx',
  ], [intent('games.open', 'Open Games', 'games.open')]),
  included('chores', 'Chores', ['Chores'], [
    'src/capabilities/chores/screens/ChoresScreen.tsx',
    'src/capabilities/chores/FEATURE.md',
  ], [intent('chores.open', 'Open Chores', 'chores.open')], [
    gap('chores.read', 'List and inspect chores and review status', 'p0', 'The main Chores inventory is not available as bounded Chat evidence.'),
    gap('chores.definition.manage', 'Create, edit, pause, or delete a chore', 'p0', 'Chore-series management has no canonical operations.'),
    gap('chores.occurrence.complete', 'Complete a chore and attach required evidence', 'p0', 'Occurrence completion and evidence policy are absent from the Chat contract.'),
    gap('chores.review.decide', 'Approve or return a completed chore', 'p0', 'Caregiver review is consequential and needs a typed reviewed operation.'),
    gap('chores.reward.manage', 'Configure or redeem chore rewards', 'p1', 'Reward state is not represented in the operation manifest.'),
  ]),
  included('recipes', 'Recipes and Cook Mode', [
    'RecipeLibrary', 'RecipeHome', 'RecipeEdit', 'RecipeImportReview', 'RecipeReadiness', 'RecipeCookMode', 'RecipeCookComplete',
  ], [
    'src/capabilities/recipes/screens/RecipeLibraryScreen.tsx',
    'src/capabilities/recipes/screens/RecipeHomeScreen.tsx',
    'src/capabilities/recipes/screens/RecipeCookModeScreen.tsx',
  ], [
    intent('recipes.read', 'Search or inspect recipes', 'recipes.search', 'recipes.read'),
    intent('recipes.create', 'Create a recipe', 'recipes.create'),
    intent('recipes.import', 'Prepare and approve a recipe import', 'recipes.import.prepare', 'recipes.import.approve'),
    intent('recipes.update', 'Edit, scale, fork, or delete a recipe',
      'recipes.update', 'recipes.scale.preview', 'recipes.fork', 'recipes.delete'),
    intent('recipes.share', 'Prepare a copy or invite a collaborator', 'recipes.share_copy.prepare', 'recipes.collaborator.invite'),
    intent('recipes.publish', 'Prepare, publish, or attest rights for a recipe',
      'recipes.publication.prepare', 'recipes.publication.publish', 'recipes.publication.attest_rights'),
    intent('cook_session', 'Read, start, control, or complete Cook Mode',
      'cook_session.read', 'cook_session.start', 'cook_session.control', 'cook_session.complete'),
  ], [
    gap('recipes.favorite.update', 'Favorite or unfavorite a recipe', 'p1', 'Favorites are a main library action without a canonical operation.'),
    gap('recipes.visibility.update', 'Hide or restore a recipe', 'p2', 'Recipe visibility preferences are not represented in the operation manifest.'),
  ]),
  included('meal-planning', 'Meal Plan', [
    'NextMeals', 'MealPlanEditor', 'MealChoiceInvite', 'MealChoiceResponse', 'MealPlanFinalize',
  ], [
    'src/capabilities/meal-planning/screens/NextMealsScreen.tsx',
    'src/capabilities/meal-planning/screens/MealPlanEditorScreen.tsx',
  ], [
    intent('meal_plan.manage', 'Create or update a meal plan', 'meal_planning.plan.create', 'meal_planning.plan.update'),
    intent('meal_plan.candidates', 'Add, remove, or prepare meal candidates',
      'meal_planning.candidate.add', 'meal_planning.candidate.remove', 'meal_planning.candidates.prepare'),
    intent('meal_plan.round', 'Open or close household meal voting', 'meal_planning.round.open', 'meal_planning.round.close'),
    intent('meal_plan.response', 'Submit or withdraw a meal response', 'meal_planning.response.submit', 'meal_planning.response.withdraw'),
    intent('meal_plan.finalize', 'Finalize or revise a meal plan', 'meal_planning.plan.finalize', 'meal_planning.plan.revise'),
  ], [
    gap('settings.meals.update', 'Change household meal preferences', 'p1', 'Meal settings and household preferences have no canonical Chat operation.'),
  ]),
  included('groceries', 'Groceries, food stock, receipts, and handoff', [
    'GroceryList', 'GroceryItemEdit', 'AlreadyHaveReview', 'GroceryHandoff', 'OnlineOrder',
    'FoodStockReview', 'FoodScenarioReview',
  ], [
    'src/capabilities/groceries/screens/GroceryListScreen.tsx',
    'src/capabilities/groceries/screens/GroceryHandoffScreen.tsx',
    'src/capabilities/groceries/screens/FoodStockReviewScreen.tsx',
  ], [
    intent('food_stock', 'Read, observe, or deplete household food stock',
      'food_stock.read', 'food_stock.observe', 'food_stock.deplete'),
    intent('groceries.compile', 'Compile a grocery list', 'groceries.compile'),
    intent('groceries.items', 'Add, edit, or change the state of grocery items',
      'groceries.item.add', 'groceries.item.update', 'groceries.item.set_state'),
    intent('groceries.review', 'Review the grocery list or a product match',
      'groceries.list.review', 'groceries.product_match.prepare', 'groceries.product_match.confirm'),
    intent('groceries.handoff', 'Prepare or open a retailer handoff', 'groceries.handoff.prepare', 'groceries.handoff.open'),
    intent('groceries.checkout', 'Attempt retailer checkout or payment only within provider authority',
      'groceries.checkout', 'groceries.payment'),
    intent('groceries.store_opportunity', 'Capture a store opportunity and prepare or accept its scenario',
      'store_opportunity.capture', 'food_scenario.prepare', 'food_scenario.accept'),
    intent('groceries.receipt', 'Extract and reconcile a receipt', 'receipt.extract', 'receipt.reconcile'),
  ]),
  included('savings', 'Food budget and grocery savings', ['GrocerySavings'], [
    'src/capabilities/groceries/screens/GrocerySavingsScreen.tsx',
  ], [
    intent('food_budget.read', 'Read the food budget', 'food_budget.read'),
    intent('savings.review', 'Review or accept a savings suggestion', 'savings.review', 'savings.accept'),
    intent('savings.coupon', 'Open a coupon while preserving unsupported apply boundaries',
      'savings.coupon.apply_unsupported', 'savings.coupon.open'),
  ]),
  included('screen-time', 'Screen Time', [
    'SettingsScreenTimeProtection', 'SettingsScreenTimeRuleBuilder', 'SettingsFamilyScreenTime', 'SettingsHouseholdDevices',
  ], [
    'src/features/account/ScreenTimeProtectionSettingsScreen.tsx',
    'src/features/household/screenTime/FamilyScreenTimeLearningScreen.tsx',
  ], [
    intent('screen_time.read', 'Read bounded personal and family Screen Time state', 'screen_time.read'),
    intent('screen_time.agreement', 'Create, update, or deactivate a family Screen Time agreement',
      'screen_time.agreement.create', 'screen_time.agreement.update', 'screen_time.agreement.deactivate'),
    intent('screen_time.override', 'Temporarily block, allow, or cancel an override',
      'screen_time.override.block', 'screen_time.override.allow', 'screen_time.override.cancel'),
    intent('screen_time.request', 'Approve or decline a Screen Time request', 'screen_time.request.decide'),
    intent('screen_time.personal', 'Open personal setup or a personal limit editor',
      'screen_time.personal.setup.open', 'screen_time.personal.limit.open'),
    intent('screen_time.family_setup', 'Open app selection, child-device setup, or release',
      'screen_time.selection.open', 'screen_time.device.setup.open', 'screen_time.device.release.open'),
    intent('screen_time.configure', 'Open the relevant Screen Time configuration surface', 'screen_time.configure'),
  ], [
    gap('screen_time.personal_rule.read', 'List and inspect personal Screen Time rules', 'p0', 'Personal rule inventory is not yet projected as structured Chat evidence.'),
    gap('screen_time.personal_rule.deactivate', 'Pause or remove a personal Screen Time rule', 'p0', 'The native editor supports rule lifecycle changes without an equivalent canonical operation.'),
  ]),
  included('notifications', 'Notifications', ['SettingsNotifications'], [
    'src/features/account/NotificationsSettingsScreen.tsx',
  ], [intent('notifications.configure', 'Open native notification configuration', 'notifications.configure')], [
    gap('notifications.preferences.update', 'Change individual notification preferences directly', 'p2', 'Chat can open settings but cannot stage a typed preference diff.'),
  ]),
  included('navigation', 'Search and navigation', ['Search', 'CapabilitySideSheet'], [
    'src/features/search/GlobalSearchDrawer.tsx',
    'src/navigation/CapabilitySideSheet.tsx',
  ], [intent('search.open', 'Open native search', 'search.open')], [
    gap('navigation.open_capability', 'Open any included capability or object by name', 'p1', 'Navigation handoffs exist piecemeal but are not one typed, discoverable contract.'),
  ]),
  included('channels', 'Phone and cross-channel continuation', ['SettingsPhoneAgent', 'UnifiedChat'], [
    'src/features/unifiedChat/UnifiedChatScreen.tsx',
    'supabase/functions/_shared/agentRunCoordinator.ts',
  ], [intent('channel.continue', 'Continue a Phone-started run in durable Chat', 'channel.phone.continue_run')]),
  excluded('developer-surfaces', 'Developer and diagnostic surfaces', 'Developer tools, labs, diagnostics, and fixture controls are not user product capabilities.', [
    'DevTools', 'GuidedOvertureLab', 'SettingsSuperAdminTools', 'SettingsKwiltLabs',
  ], [
    'src/navigation/RootNavigator.tsx',
    'src/features/account/KwiltLabsSettingsScreen.tsx',
  ], [intent('developer.use', 'Use developer-only diagnostics and fixtures')]),
] as const satisfies readonly UiParitySurface[];

type VoiceParityProjection = CapabilityManifestEntry['channels']['mobile'] & {
  proof: 'source_only' | 'not_applicable';
};

export type UiParityProjectionRow = {
  operationId: string;
  owner: string;
  purpose: string;
  surfaceId: string;
  surfaceTitle: string;
  intentId: string;
  intentLabel: string;
  mobile: CapabilityManifestEntry['channels']['mobile'];
  voice: VoiceParityProjection;
  chatgpt: {
    state: ExternalControlCoverageRow['state'] | 'unclassified';
    outcome: string;
    reason: string;
  };
};

export function projectUiParityInventory(
  manifest: readonly CapabilityManifestEntry[],
  externalCoverage: readonly ExternalControlCoverageRow[],
): readonly UiParityProjectionRow[] {
  const surfaceByOperation = new Map<string, { surface: UiParitySurface; intent: UiParityIntent }>();
  for (const surface of UI_PARITY_SURFACES) {
    for (const item of surface.intents) {
      for (const operationId of item.operationIds) {
        if (surfaceByOperation.has(operationId)) throw new Error(`Duplicate UI parity operation: ${operationId}`);
        surfaceByOperation.set(operationId, { surface, intent: item });
      }
    }
  }
  const externalByOperation = new Map(externalCoverage.map((row) => [row.operationId, row]));

  return manifest.map((operation) => {
    const mapping = surfaceByOperation.get(operation.id);
    if (!mapping) throw new Error(`Missing UI parity surface for operation: ${operation.id}`);
    const external = externalByOperation.get(operation.id);
    if (!external) throw new Error(`Missing ChatGPT coverage for operation: ${operation.id}`);
    const externallyCallable = external.state === 'exposed';
    return {
      operationId: operation.id,
      owner: operation.owner,
      purpose: operation.purpose,
      surfaceId: mapping.surface.id,
      surfaceTitle: mapping.surface.title,
      intentId: mapping.intent.id,
      intentLabel: mapping.intent.label,
      mobile: operation.channels.mobile,
      voice: {
        ...operation.channels.mobile,
        proof: operation.channels.mobile.state === 'excluded' ? 'not_applicable' : 'source_only',
      },
      chatgpt: {
        state: external.state,
        outcome: externallyCallable ? operation.channels.phone.outcome : 'honest_boundary',
        reason: external.reason,
      },
    };
  });
}
