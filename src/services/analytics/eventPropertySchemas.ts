import { AnalyticsEvent, type AnalyticsEventName } from './events';

export type AnalyticsEventPropertySchema = Readonly<{
  stringKeys: readonly string[];
}>;

// These dimensions have bounded product-controlled vocabularies across Kwilt.
// Free-form values are never safe merely because their key appears here: the
// sanitizer also enforces a short maximum value length and a sensitive-key denylist.
export const BASE_BOUNDED_STRING_KEYS = [
  'action', 'app_env', 'cadence', 'capability', 'capability_id', 'channel', 'code',
  'duration_bucket', 'error_code', 'event_name', 'fallback_reason',
  'job_intent', 'kind', 'method', 'mode', 'next_status', 'offer_state', 'outcome',
  'paywall_reason', 'paywall_source', 'platform', 'product_id', 'provider',
  'plan', 'reason', 'route_name', 'source', 'source_kind', 'source_type', 'sourceType',
  'state', 'status', 'store', 'surface', 'target_route', 'task', 'trigger',
  'type', 'upgrade_entry_source', 'variant', 'visibilityContract',
  'visibility_contract', 'warm_state',
] as const;

const schema = (...stringKeys: string[]): AnalyticsEventPropertySchema => ({ stringKeys });

const WORKFLOW_FEEDBACK_STRING_KEYS = [
  'feedback_instance_id',
  'prompt_id',
  'question_category',
  'capability_id',
  'workflow_id',
  'checkpoint_id',
  'invocation_kind',
  'response_band',
  'reason_code',
  'outcome_class',
] as const;

// Event-specific additions are intentionally explicit. This is the contract
// layer between feature builders and the global privacy boundary.
export const ANALYTICS_EVENT_PROPERTY_SCHEMAS: Partial<Record<AnalyticsEventName, AnalyticsEventPropertySchema>> = {
  [AnalyticsEvent.ApplicationOpened]: schema(),
  [AnalyticsEvent.ApplicationBecameActive]: schema(),
  [AnalyticsEvent.ApplicationBackgrounded]: schema(),
  [AnalyticsEvent.CapabilityOnboardingPathCompleted]: schema('path_id'),
  [AnalyticsEvent.FocusSessionStarted]: schema('session_kind'),
  [AnalyticsEvent.FocusSessionCompleted]: schema('session_kind'),
  [AnalyticsEvent.FocusSessionEnded]: schema('session_kind'),
  [AnalyticsEvent.ExploreRecordingStarted]: schema('recording_mode'),
  [AnalyticsEvent.ExploreRecordingCompleted]: schema('recording_mode'),
  [AnalyticsEvent.ChoreCreated]: schema('storage_mode'),
  [AnalyticsEvent.ChoreCompleted]: schema('storage_mode'),
  [AnalyticsEvent.GameTimerStarted]: schema('timer_bucket'),
  [AnalyticsEvent.GameTimerCompleted]: schema('timer_bucket'),
  [AnalyticsEvent.GlobalSearchResultOpened]: schema('result_kind', 'query_state'),

  [AnalyticsEvent.NotificationsPermissionResult]: schema('notification_type'),
  [AnalyticsEvent.NotificationScheduled]: schema('notification_type'),
  [AnalyticsEvent.NotificationCancelled]: schema('notification_type'),
  [AnalyticsEvent.NotificationReceived]: schema('notification_type'),
  [AnalyticsEvent.NotificationOpened]: schema('notification_type'),
  [AnalyticsEvent.NotificationFiredEstimated]: schema('notification_type'),
  [AnalyticsEvent.NotificationCopyVariant]: schema('notification_type'),

  [AnalyticsEvent.MealPlanHorizonSelected]: schema('horizon_kind'),
  [AnalyticsEvent.MealPlanFinalizeFailed]: schema('failure_class'),
  [AnalyticsEvent.OnlineShoppingPreferencesSaved]: schema('fulfillment_mode', 'retailer_id'),
  [AnalyticsEvent.OnlineRetailerOutcomesResolved]: schema('fulfillment_mode', 'retailer_id'),
  [AnalyticsEvent.OnlineCartExceptionsReviewed]: schema('fulfillment_mode', 'retailer_id'),
  [AnalyticsEvent.OnlineCartSavingsAccepted]: schema('fulfillment_mode', 'retailer_id'),
  [AnalyticsEvent.OnlineCartHandoffAcknowledged]: schema('fulfillment_mode', 'retailer_id', 'elapsed_time_bucket'),
  [AnalyticsEvent.CookVoiceFallback]: schema('failure_reason', 'voice_mode'),

  [AnalyticsEvent.UnifiedChatRouteSelected]: schema('request_class', 'planning_strategy', 'capability_ids'),
  [AnalyticsEvent.UnifiedChatToolSelected]: schema('request_class', 'planning_strategy', 'capability_ids'),
  [AnalyticsEvent.UnifiedChatAgentJudgmentSelected]: schema('request_class', 'planning_strategy', 'authorization', 'evidence_scope', 'response_contract'),
  [AnalyticsEvent.UnifiedChatAgentPlanOutcome]: schema('request_class', 'planning_strategy', 'authorization', 'evidence_scope', 'response_contract'),
  [AnalyticsEvent.UnifiedChatFreshEntryOutcome]: schema('request_class', 'freshness', 'outcome_class'),
  [AnalyticsEvent.UnifiedChatOperationalOutcome]: schema('request_class', 'outcome_class'),

  [AnalyticsEvent.FamilyScreenTimeViewed]: schema('entry_surface', 'lifecycle'),
  [AnalyticsEvent.FamilyScreenTimeSetupOpened]: schema('entry_surface', 'lifecycle'),
  [AnalyticsEvent.FamilyScreenTimeAgreementActivated]: schema('entry_surface', 'lifecycle'),
  [AnalyticsEvent.FamilyScreenTimePolicyApplied]: schema('entry_surface', 'lifecycle'),
  [AnalyticsEvent.FamilyScreenTimePolicyFailed]: schema('entry_surface', 'lifecycle', 'failure_reason'),
  [AnalyticsEvent.FamilyScreenTimeChatProposalDecided]: schema('entry_surface', 'lifecycle'),
  [AnalyticsEvent.FamilyScreenTimeChatPolicyOutcome]: schema('entry_surface', 'lifecycle', 'failure_reason'),

  [AnalyticsEvent.MoneyMutationCompleted]: schema('operation', 'freshness', 'period_relation', 'outcome_class'),
  [AnalyticsEvent.MoneyTrustedDecisionCompleted]: schema('operation'),
  [AnalyticsEvent.MoneyBudgetAnswerViewed]: schema('freshness', 'period_relation', 'outcome_class'),
  [AnalyticsEvent.MoneyBudgetExplanationOpened]: schema('freshness', 'period_relation', 'outcome_class'),
  [AnalyticsEvent.MoneyRebalancePreviewViewed]: schema('freshness', 'period_relation', 'outcome_class'),
  [AnalyticsEvent.MoneyRebalanceSaved]: schema('freshness', 'period_relation', 'outcome_class'),
  [AnalyticsEvent.MoneyTransactionClassificationCompleted]: schema('operation', 'outcome_class'),

  [AnalyticsEvent.WorkflowFeedbackShown]: schema(...WORKFLOW_FEEDBACK_STRING_KEYS),
  [AnalyticsEvent.WorkflowFeedbackDismissed]: schema(...WORKFLOW_FEEDBACK_STRING_KEYS),
  [AnalyticsEvent.WorkflowFeedbackSubmitted]: schema(...WORKFLOW_FEEDBACK_STRING_KEYS),
  [AnalyticsEvent.WorkflowFeedbackFollowupSubmitted]: schema(...WORKFLOW_FEEDBACK_STRING_KEYS),
};

const BASE_KEYS = new Set<string>(BASE_BOUNDED_STRING_KEYS);

export function isAllowedStringProperty(event: AnalyticsEventName, key: string): boolean {
  if (BASE_KEYS.has(key)) return true;
  return ANALYTICS_EVENT_PROPERTY_SCHEMAS[event]?.stringKeys.includes(key) ?? false;
}
