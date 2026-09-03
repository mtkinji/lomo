import {
  resetAnalyticsIdentity,
  sanitizeAnalyticsProps,
  track,
  trackScreen,
} from './analytics';
import { AnalyticsEvent } from './events';
import type { PostHog } from 'posthog-react-native';

describe('sanitizeAnalyticsProps', () => {
  it('keeps coarse typed product telemetry', () => {
    expect(sanitizeAnalyticsProps(AnalyticsEvent.ActivityCreated, {
      source: 'settings',
      outcome: 'saved',
      candidate_count: 3,
      enabled: true,
      app_env: 'production',
    })).toEqual({
      source: 'settings',
      outcome: 'saved',
      candidate_count: 3,
      enabled: true,
      app_env: 'production',
    });
  });

  it.each([
    ['free-form content', { custom_copy: 'Call my doctor about the diagnosis' }],
    ['error text', { error: 'Account alice@example.com failed' }],
    ['financial amount', { amount_cents: 129900 }],
    ['merchant evidence', { merchant: 'Private clinic' }],
    ['coordinates', { latitude: 40.1, longitude: -111.7 }],
    ['route path', { precise_path: 'encoded-private-path' }],
    ['Health content', { health_summary: 'slept 3 hours' }],
    ['calendar content', { calendar_event_title: 'Therapy' }],
    ['food content', { grocery_item: 'insulin', recipe_text: 'family recipe' }],
    ['message content', { message_body: 'private message' }],
    ['invite secret', { invite_code: 'JOIN-ME', access_token: 'secret' }],
  ])('drops %s', (_label, props) => {
    expect(sanitizeAnalyticsProps(AnalyticsEvent.ActivityCreated, props)).toEqual({});
  });

  it('drops strings under unknown keys even when short', () => {
    expect(sanitizeAnalyticsProps(AnalyticsEvent.ActivityCreated, { unexplained: 'looks harmless' })).toEqual({});
  });

  it('keeps content-free local inference diagnostics', () => {
    expect(sanitizeAnalyticsProps(AnalyticsEvent.UnifiedChatProviderOutcome, {
      task: 'rewrite',
      fallback_reason: 'model_not_ready',
      duration_bucket: 'under_1s',
    })).toEqual({
      task: 'rewrite',
      fallback_reason: 'model_not_ready',
      duration_bucket: 'under_1s',
    });
  });

  it('keeps bounded monetization attribution without allowing free-form content', () => {
    expect(sanitizeAnalyticsProps(AnalyticsEvent.PaywallViewed, {
      paywall_reason: 'pro_money_budgets',
      paywall_source: 'money_onboarding_add_institution',
      upgrade_entry_source: 'settings_home',
    })).toEqual({
      paywall_reason: 'pro_money_budgets',
      paywall_source: 'money_onboarding_add_institution',
      upgrade_entry_source: 'settings_home',
    });
  });

  it('keeps the bounded Pro offer funnel dimensions', () => {
    expect(sanitizeAnalyticsProps(AnalyticsEvent.PurchaseStarted, {
      paywall_reason: 'pro_money_budgets',
      paywall_source: 'money_connect_account',
      variant: 'money_contextual_template_v1',
      offer_state: 'trial_merchandised',
      product_id: 'pro_annual',
      plan: 'individual',
      cadence: 'annual',
      trial_merchandised: true,
      price: '$59.99',
    })).toEqual({
      paywall_reason: 'pro_money_budgets',
      paywall_source: 'money_connect_account',
      variant: 'money_contextual_template_v1',
      offer_state: 'trial_merchandised',
      product_id: 'pro_annual',
      plan: 'individual',
      cadence: 'annual',
      trial_merchandised: true,
    });
  });

  it.each([
    [AnalyticsEvent.MealPlanHorizonSelected, { horizon_kind: 'week' }],
    [AnalyticsEvent.OnlineCartHandoffAcknowledged, { fulfillment_mode: 'pickup' }],
    [AnalyticsEvent.CookVoiceFallback, { failure_reason: 'model_not_ready', voice_mode: 'cook_mode' }],
    [AnalyticsEvent.UnifiedChatAgentJudgmentSelected, { request_class: 'capability_action', authorization: 'explicit_request' }],
    [AnalyticsEvent.FamilyScreenTimePolicyApplied, { entry_surface: 'learning', lifecycle: 'active' }],
    [AnalyticsEvent.MoneyMutationCompleted, { operation: 'rebalance', outcome_class: 'success' }],
  ])('keeps event-specific bounded dimensions for %s', (event, props) => {
    expect(sanitizeAnalyticsProps(event, props)).toEqual(props);
  });

  it('allows the bounded onboarding path id only for its declared event', () => {
    expect(sanitizeAnalyticsProps(AnalyticsEvent.CapabilityOnboardingPathCompleted, {
      path_id: 'make-progress',
    })).toEqual({ path_id: 'make-progress' });
    expect(sanitizeAnalyticsProps(AnalyticsEvent.ActivityCreated, {
      path_id: 'private/deep/link',
    })).toEqual({});
  });

  it('keeps only the registered workflow-feedback dimensions', () => {
    expect(sanitizeAnalyticsProps(AnalyticsEvent.WorkflowFeedbackSubmitted, {
      feedback_instance_id: '9ba92f7e-31ca-48e6-aa2d-d4310b63a38c',
      prompt_id: 'money_rebalance_satisfaction_v1',
      question_category: 'satisfaction',
      question_version: 1,
      capability_id: 'money',
      workflow_id: 'adjust_spending_plan',
      checkpoint_id: 'rebalance_saved',
      invocation_kind: 'authoritative_outcome_experience',
      response_value: 5,
      response_band: 'positive',
      sampling_policy_version: 1,
      outcome_class: 'saved',
      question_text: 'private runtime copy',
      transaction_id: 'private-transaction-id',
    })).toEqual({
      feedback_instance_id: '9ba92f7e-31ca-48e6-aa2d-d4310b63a38c',
      prompt_id: 'money_rebalance_satisfaction_v1',
      question_category: 'satisfaction',
      question_version: 1,
      capability_id: 'money',
      workflow_id: 'adjust_spending_plan',
      checkpoint_id: 'rebalance_saved',
      invocation_kind: 'authoritative_outcome_experience',
      response_value: 5,
      response_band: 'positive',
      sampling_policy_version: 1,
      outcome_class: 'saved',
    });
  });

  it.each([
    ['question copy', { question_text: 'How did that go?' }],
    ['workflow object id', { workflow_object_id: 'private-workflow-id' }],
    ['child membership id', { child_membership_id: 'private-child-id' }],
    ['selected app token', { selected_app_token: 'private-app-token' }],
  ])('drops workflow feedback %s', (_label, props) => {
    expect(sanitizeAnalyticsProps(AnalyticsEvent.WorkflowFeedbackSubmitted, props)).toEqual({});
  });
});

describe('analytics collection boundary', () => {
  it('never forwards route params to PostHog screen capture', () => {
    const screen = jest.fn();
    const posthog = { screen } as unknown as PostHog;
    trackScreen(posthog, 'GoalDetail');
    expect(screen).toHaveBeenCalledWith('GoalDetail', expect.objectContaining({
      app_env: expect.any(String),
      platform: expect.any(String),
    }));
    expect(screen.mock.calls[0][1]).not.toEqual(expect.objectContaining({
      invite_code: expect.anything(),
    }));
  });

  it('emits lifecycle events with no URL-bearing properties', () => {
    const capture = jest.fn();
    const posthog = { capture } as unknown as PostHog;
    track(posthog, AnalyticsEvent.ApplicationOpened);
    expect(capture).toHaveBeenCalledWith(
      AnalyticsEvent.ApplicationOpened,
      expect.objectContaining({ app_env: expect.any(String), platform: expect.any(String) }),
    );
    expect(capture.mock.calls[0][1]).not.toHaveProperty('url');
  });

  it('resets the PostHog identity boundary', () => {
    const reset = jest.fn();
    const posthog = { reset } as unknown as PostHog;
    resetAnalyticsIdentity(posthog);
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
