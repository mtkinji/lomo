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

  // Apple ecosystem adoption (widgets)
  WidgetPromptExposed: 'widget_prompt_exposed',
  WidgetPromptDismissed: 'widget_prompt_dismissed',
  WidgetPromptCtaTapped: 'widget_prompt_cta_tapped',
  WidgetSetupViewed: 'widget_setup_viewed',
  WidgetSetupHelpOpened: 'widget_setup_help_opened',
  AppOpenedFromWidget: 'app_opened_from_widget',

  // Monetization / paywall (MVP)
  PaywallViewed: 'paywall_viewed',
  PurchaseStarted: 'purchase_started',
  PurchaseSucceeded: 'purchase_succeeded',
  PurchaseFailed: 'purchase_failed',
  RestoreStarted: 'restore_started',
  RestoreSucceeded: 'restore_succeeded',
  RestoreFailed: 'restore_failed',

  // Social sharing (goals)
  ShareGoalDrawerOpened: 'share_goal_drawer_opened',
  ShareGoalDrawerClosed: 'share_goal_drawer_closed',
  ShareInviteKindSelected: 'share_invite_kind_selected',
  ShareInviteChannelSelected: 'share_invite_channel_selected',
  ShareInviteSmsComposerOpened: 'share_invite_sms_composer_opened',
  ShareInviteEmailSendAttempted: 'share_invite_email_send_attempted',
  ShareInviteEmailSendSucceeded: 'share_invite_email_send_succeeded',
  ShareInviteEmailSendFailed: 'share_invite_email_send_failed',
  ShareInviteCopyLink: 'share_invite_copy_link',

  JoinGoalDrawerOpened: 'join_goal_drawer_opened',
  JoinGoalDrawerClosed: 'join_goal_drawer_closed',
  JoinGoalAttempted: 'join_goal_attempted',
  JoinGoalSucceeded: 'join_goal_succeeded',
  JoinGoalFailed: 'join_goal_failed',
  JoinGoalAlreadyMember: 'join_goal_already_member',

  // Web → app ArcDraft handoff
  ArcDraftClaimAttempted: 'arc_draft_claim_attempted',
  ArcDraftClaimSucceeded: 'arc_draft_claim_succeeded',
  ArcDraftClaimFailed: 'arc_draft_claim_failed',

  // Shared goal check-ins + reactions
  SharedGoalCheckinCreated: 'shared_goal_checkin_created',
  SharedGoalCheckinFailed: 'shared_goal_checkin_failed',
  SharedGoalReactionAdded: 'shared_goal_reaction_added',
  SharedGoalReactionRemoved: 'shared_goal_reaction_removed',
  SharedGoalFeedViewed: 'shared_goal_feed_viewed',
} as const;

export type AnalyticsEventName = (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];


