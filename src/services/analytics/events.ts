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
  WidgetAssistedShowUp: 'widget_assisted_show_up',

  // Monetization / paywall (MVP)
  PaywallViewed: 'paywall_viewed',
  // Intent signal between paywall_viewed and purchase_started: user tapped the
  // Upgrade CTA on the paywall interstitial (before seeing the pricing drawer).
  // Enables a 5-step upsell funnel broken down by `source` (the feature gate
  // that surfaced the paywall). See docs/email-system-ga-plan.md §Monetization.
  PaywallUpgradeCtaTapped: 'paywall_upgrade_cta_tapped',
  PurchaseStarted: 'purchase_started',
  PurchaseSucceeded: 'purchase_succeeded',
  PurchaseFailed: 'purchase_failed',
  RestoreStarted: 'restore_started',
  RestoreSucceeded: 'restore_succeeded',
  RestoreFailed: 'restore_failed',
  FreeTrialStarted: 'free_trial_started',

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
  SharedGoalCheckinNudgeTapped: 'shared_goal_checkin_nudge_tapped',
  SharedGoalReactionAdded: 'shared_goal_reaction_added',
  SharedGoalReactionRemoved: 'shared_goal_reaction_removed',
  SharedGoalFeedViewed: 'shared_goal_feed_viewed',

  // Server-side milestones
  MilestoneRecorded: 'milestone_recorded',
  MilestoneRecordFailed: 'milestone_record_failed',

  // Email attribution (Phase 6.2 of docs/email-system-ga-plan.md).
  // Fires when the app is opened via a URL carrying `utm_source=email`.
  // Pairs with `email_cta_clicked` on kwilt-site to close the funnel.
  EmailDeepLinkConverted: 'email_deep_link_converted',

  // Pro preview (streak-based)
  ProPreviewGranted: 'pro_preview_granted',
  ProPreviewExpired: 'pro_preview_expired',

  // Notification copy variant tracking
  NotificationCopyVariant: 'notification_copy_variant',

  // Chapters (see docs/chapters-plan.md Phase 1.1).
  //
  // Phase 2.1 dropped user-initiated chapter generation: Chapters land from a
  // server-side cron every Monday, not a user tap. Scheduled-generation
  // observability lives in server logs / Sentry, not product analytics, so
  // we intentionally do NOT emit `chapter_generate_started / _succeeded /
  // _failed` from the client.
  ChapterListViewed: 'chapter_list_viewed',
  ChapterViewed: 'chapter_viewed',
  ChapterSectionExpanded: 'chapter_section_expanded',
  ChapterShared: 'chapter_shared',
  ChapterFeedbackSubmitted: 'chapter_feedback_submitted',
  ChapterPrevNextTapped: 'chapter_prev_next_tapped',

  // Phase 5.2 of docs/chapters-plan.md: Next Steps v1 — Arc Nominations.
  // `shown` fires once per (chapter, recommendation) pair when the card is
  // rendered (not when the Chapter is opened if the card is sleeping from a
  // prior dismissal). `cta` fires on the primary action — for Arc Nominations
  // the primary is either "Create Arc" (Pro) or the paywall upsell (Free).
  // `dismissed` fires on "Not now" and puts the recommendation to sleep for
  // 90 days (see `chapterRecommendationDismissals.ts`). All three carry
  // `{ chapter_id, recommendation_id, kind }`; `cta` additionally carries
  // `{ result: 'paywall' | 'create_flow' }` so we can separate free-tier
  // upsell funnels from Pro-tier adoption.
  ChapterNextStepShown: 'chapter_next_step_shown',
  ChapterNextStepCtaTapped: 'chapter_next_step_cta_tapped',
  ChapterNextStepDismissed: 'chapter_next_step_dismissed',

  // Friends
  FriendInviteCreated: 'friend_invite_created',
  FriendInviteShared: 'friend_invite_shared',
  FriendInviteAccepted: 'friend_invite_accepted',
  FriendRequestAccepted: 'friend_request_accepted',
  FriendRequestDeclined: 'friend_request_declined',
  FriendsListViewed: 'friends_list_viewed',
} as const;

export type AnalyticsEventName = (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];


