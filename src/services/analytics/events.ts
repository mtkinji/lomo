export const AnalyticsEvent = {
  FtueStarted: 'ftue_started',
  FtueCompleted: 'ftue_completed',
  FtueDismissed: 'ftue_dismissed',

  NotificationsPermissionPrompted: 'notifications_permission_prompted',
  NotificationsPermissionResult: 'notifications_permission_result',
  NotificationScheduled: 'notification_scheduled',
  NotificationCancelled: 'notification_cancelled',
  NotificationReceived: 'notification_received',
  NotificationOpened: 'notification_opened',
  NotificationFiredEstimated: 'notification_fired_estimated',

  WorkflowStarted: 'workflow_started',
  WorkflowStepViewed: 'workflow_step_viewed',
  WorkflowStepCompleted: 'workflow_step_completed',
  WorkflowAbandoned: 'workflow_abandoned',

  ArcCreated: 'arc_created',
  GoalCreated: 'goal_created',

  ActivityCreated: 'activity_created',
  ActivityCompletionToggled: 'activity_completion_toggled',
  ActivityActionInvoked: 'activity_action_invoked',

  // Monetization / paywall (MVP)
  PaywallViewed: 'paywall_viewed',
  PurchaseStarted: 'purchase_started',
  PurchaseSucceeded: 'purchase_succeeded',
  PurchaseFailed: 'purchase_failed',
  RestoreStarted: 'restore_started',
  RestoreSucceeded: 'restore_succeeded',
  RestoreFailed: 'restore_failed',
} as const;

export type AnalyticsEventName = (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];


