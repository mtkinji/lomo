import {
  FOUNDER_ALERT_EVENT_NAMES,
  buildFounderAlertSlackMessage,
  buildFounderDigestSlackMessage,
  buildFounderPosthogPayload,
  buildPosthogCaptureUrl,
  deriveFounderAlertFromRevenueCatEvent,
  isFounderAlertsEnabled,
  recordFounderAlertEvent,
} from '../founderAlerts';

function createMockAdmin(opts?: { existingEventKeys?: string[]; insertError?: Error | null }) {
  const eventRows = new Map<string, any>();
  for (const key of opts?.existingEventKeys ?? []) {
    eventRows.set(key, {
      event_key: key,
      event_name: 'subscription_initial_purchase',
      source: 'revenuecat',
      subject_id: 'user-1',
      occurred_at: '2026-06-08T10:00:00.000Z',
      environment: 'production',
      properties: {},
      slack_sent_at: null,
      slack_error: null,
    });
  }
  const calls: Array<{ table: string; operation: string; payload?: any }> = [];

  const admin = {
    from: (table: string) => ({
      select: () => ({
        eq: (_field: string, value: string) => ({
          maybeSingle: async () => ({
            data: eventRows.get(value) ?? null,
            error: null,
          }),
          limit: () => ({
            maybeSingle: async () => ({
              data: eventRows.get(value) ?? null,
              error: null,
            }),
          }),
        }),
        gte: () => ({
          lt: () => ({
            order: async () => ({
              data: Array.from(eventRows.values()),
              error: null,
            }),
          }),
        }),
      }),
      insert: async (payload: any) => {
        calls.push({ table, operation: 'insert', payload });
        if (opts?.insertError) return { error: opts.insertError };
        eventRows.set(payload.event_key, payload);
        return { error: null };
      },
      update: (payload: any) => ({
        eq: async (_field: string, value: string) => {
          calls.push({ table, operation: 'update', payload: { event_key: value, ...payload } });
          const row = eventRows.get(value);
          if (row) eventRows.set(value, { ...row, ...payload });
          return { error: null };
        },
      }),
    }),
  };

  return { admin, calls, eventRows };
}

describe('founder alert environment gate', () => {
  test.each([
    [undefined, false],
    ['', false],
    ['0', false],
    ['false', false],
    ['off', false],
    ['1', true],
    ['true', true],
    ['yes', true],
  ])('KWILT_FOUNDER_ALERTS_ENABLED=%s -> %s', (value, expected) => {
    const getEnv = (key: string) => (key === 'KWILT_FOUNDER_ALERTS_ENABLED' ? value : undefined);
    expect(isFounderAlertsEnabled(getEnv)).toBe(expected);
  });
});

describe('deriveFounderAlertFromRevenueCatEvent', () => {
  test('maps production initial purchase into a canonical subscription alert', () => {
    const alert = deriveFounderAlertFromRevenueCatEvent({
      id: 'evt_1',
      type: 'INITIAL_PURCHASE',
      app_user_id: 'user_abc',
      product_id: 'pro_annual',
      environment: 'PRODUCTION',
      event_timestamp_ms: Date.parse('2026-06-08T12:00:00.000Z'),
      price: 49.99,
      currency: 'USD',
      store: 'APP_STORE',
    });

    expect(alert).toMatchObject({
      eventKey: 'revenuecat:evt_1',
      eventName: 'subscription_initial_purchase',
      source: 'revenuecat',
      subjectId: 'user_abc',
      occurredAt: '2026-06-08T12:00:00.000Z',
      environment: 'PRODUCTION',
      properties: {
        revenuecat_app_user_id: 'user_abc',
        product_id: 'pro_annual',
        plan: 'individual',
        cadence: 'annual',
        event_type: 'INITIAL_PURCHASE',
        price: 49.99,
        currency: 'USD',
        store: 'APP_STORE',
      },
    });
  });

  test('maps trial starts separately from paid initial purchase', () => {
    const alert = deriveFounderAlertFromRevenueCatEvent({
      id: 'evt_trial',
      type: 'INITIAL_PURCHASE',
      app_user_id: 'user_trial',
      product_id: 'pro_monthly',
      period_type: 'TRIAL',
      environment: 'PRODUCTION',
      event_timestamp_ms: Date.parse('2026-06-08T12:00:00.000Z'),
    });

    expect(alert?.eventName).toBe('subscription_trial_started');
    expect(alert?.properties).toMatchObject({
      plan: 'individual',
      cadence: 'monthly',
      period_type: 'TRIAL',
    });
  });

  test('maps trial conversion renewal into a purchase alert with conversion metadata', () => {
    const alert = deriveFounderAlertFromRevenueCatEvent({
      id: 'evt_conversion',
      type: 'RENEWAL',
      app_user_id: 'user_trial',
      product_id: 'pro_family_annual',
      is_trial_conversion: true,
      environment: 'PRODUCTION',
      event_timestamp_ms: Date.parse('2026-06-08T12:00:00.000Z'),
    });

    expect(alert?.eventName).toBe('subscription_initial_purchase');
    expect(alert?.properties).toMatchObject({
      plan: 'family',
      cadence: 'annual',
      is_trial_conversion: true,
    });
  });

  test.each([
    ['CANCELLATION', 'subscription_cancelled'],
    ['EXPIRATION', 'subscription_expired'],
    ['BILLING_ISSUE', 'subscription_billing_issue'],
  ])('maps %s into %s', (type, eventName) => {
    const alert = deriveFounderAlertFromRevenueCatEvent({
      type,
      app_user_id: 'user_abc',
      product_id: 'pro_monthly',
      environment: 'PRODUCTION',
      event_timestamp_ms: Date.parse('2026-06-08T12:00:00.000Z'),
    });

    expect(alert?.eventName).toBe(eventName);
    expect(alert?.eventKey).toBe(`revenuecat:${type}:user_abc:pro_monthly:1780920000000`);
  });

  test('returns null for sandbox events unless sandbox alerts are enabled', () => {
    const event = {
      id: 'evt_sandbox',
      type: 'INITIAL_PURCHASE',
      app_user_id: 'user_sandbox',
      environment: 'SANDBOX',
    };
    expect(deriveFounderAlertFromRevenueCatEvent(event)).toBeNull();
    expect(deriveFounderAlertFromRevenueCatEvent(event, { includeSandbox: true })?.eventName).toBe(
      'subscription_initial_purchase',
    );
  });

  test('does not alert on ordinary renewals or unknown event types', () => {
    expect(
      deriveFounderAlertFromRevenueCatEvent({
        id: 'evt_renewal',
        type: 'RENEWAL',
        app_user_id: 'user_abc',
        environment: 'PRODUCTION',
      }),
    ).toBeNull();
    expect(
      deriveFounderAlertFromRevenueCatEvent({
        id: 'evt_noise',
        type: 'PRODUCT_CHANGE',
        app_user_id: 'user_abc',
        environment: 'PRODUCTION',
      }),
    ).toBeNull();
  });
});

describe('Slack and PostHog payloads', () => {
  const event = {
    eventKey: 'install:install_123:first_open',
    eventName: 'activation_first_opened' as const,
    source: 'install_ping' as const,
    subjectId: 'install_123',
    occurredAt: '2026-06-08T12:00:00.000Z',
    environment: 'production',
    properties: {
      install_id: 'install_123',
      platform: 'ios',
      app_version: '1.0.72',
      build_number: '73',
      user_email: 'andy@example.com',
      notes: 'this should not render',
    },
  };

  test('formats a privacy-light Slack message', () => {
    const message = buildFounderAlertSlackMessage(event);
    expect(message.text).toContain('First app open');
    expect(message.text).toContain('install_123');
    expect(message.text).toContain('ios');
    expect(message.text).toContain('1.0.72');
    expect(message.text).toContain('andy@example.com');
    expect(message.text).not.toContain('this should not render');
  });

  test('builds a server-side PostHog capture payload', () => {
    const payload = buildFounderPosthogPayload({
      apiKey: 'phc_test',
      distinctId: 'install_123',
      event,
    });
    expect(payload).toEqual({
      api_key: 'phc_test',
      distinct_id: 'install_123',
      event: 'activation_first_opened',
      timestamp: '2026-06-08T12:00:00.000Z',
      properties: expect.objectContaining({
        app_env: 'production',
        platform: 'ios',
        install_id: 'install_123',
        founder_alert_key: 'install:install_123:first_open',
      }),
    });
  });

  test('shares the same PostHog capture URL normalization as other server events', () => {
    expect(buildPosthogCaptureUrl('eu.i.posthog.com')).toBe('https://eu.i.posthog.com/capture/');
    expect(buildPosthogCaptureUrl('')).toBe('https://us.i.posthog.com/capture/');
  });
});

describe('recordFounderAlertEvent', () => {
  test('inserts a new ledger row and sends Slack/PostHog best-effort', async () => {
    const { admin, calls } = createMockAdmin();
    const fetchMock = jest.fn(async () => ({ ok: true, status: 200, text: async () => 'ok' }));

    const result = await recordFounderAlertEvent({
      admin,
      event: {
        eventKey: 'revenuecat:evt_1',
        eventName: 'subscription_initial_purchase',
        source: 'revenuecat',
        subjectId: 'user_1',
        occurredAt: '2026-06-08T12:00:00.000Z',
        environment: 'PRODUCTION',
        properties: { revenuecat_app_user_id: 'user_1', product_id: 'pro_annual' },
      },
      env: {
        KWILT_FOUNDER_ALERTS_ENABLED: '1',
        KWILT_FOUNDER_ALERTS_SLACK_WEBHOOK_URL: 'https://hooks.slack.test/services/abc',
        KWILT_POSTHOG_PROJECT_API_KEY: 'phc_test',
        KWILT_POSTHOG_HOST: 'us.i.posthog.com',
      },
      fetchFn: fetchMock as any,
      nowIso: () => '2026-06-08T12:00:01.000Z',
    });

    expect(result).toEqual({ ok: true, inserted: true, slackSent: true, posthogSent: true });
    expect(calls.find((c) => c.operation === 'insert')?.payload).toMatchObject({
      event_key: 'revenuecat:evt_1',
      event_name: 'subscription_initial_purchase',
      slack_sent_at: null,
      slack_error: null,
    });
    expect(calls.filter((c) => c.operation === 'update')).toEqual([
      {
        table: 'kwilt_founder_alert_events',
        operation: 'update',
        payload: { event_key: 'revenuecat:evt_1', slack_sent_at: '2026-06-08T12:00:01.000Z', slack_error: null },
      },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe('https://hooks.slack.test/services/abc');
    expect(fetchMock.mock.calls[1][0]).toBe('https://us.i.posthog.com/capture/');
  });

  test('skips duplicates by event key before sending Slack', async () => {
    const { admin, calls } = createMockAdmin({ existingEventKeys: ['revenuecat:evt_1'] });
    const fetchMock = jest.fn();

    const result = await recordFounderAlertEvent({
      admin,
      event: {
        eventKey: 'revenuecat:evt_1',
        eventName: 'subscription_initial_purchase',
        source: 'revenuecat',
        subjectId: 'user_1',
        occurredAt: '2026-06-08T12:00:00.000Z',
        environment: 'PRODUCTION',
        properties: {},
      },
      env: {
        KWILT_FOUNDER_ALERTS_ENABLED: '1',
        KWILT_FOUNDER_ALERTS_SLACK_WEBHOOK_URL: 'https://hooks.slack.test/services/abc',
      },
      fetchFn: fetchMock as any,
    });

    expect(result).toEqual({ ok: true, inserted: false, skipped: 'duplicate' });
    expect(calls).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('records Slack failure without failing the caller', async () => {
    const { admin, calls } = createMockAdmin();
    const fetchMock = jest.fn(async () => ({ ok: false, status: 500, text: async () => 'bad hook' }));

    const result = await recordFounderAlertEvent({
      admin,
      event: {
        eventKey: 'install:first',
        eventName: 'activation_first_opened',
        source: 'install_ping',
        subjectId: 'install_1',
        occurredAt: '2026-06-08T12:00:00.000Z',
        environment: 'production',
        properties: {},
      },
      env: {
        KWILT_FOUNDER_ALERTS_ENABLED: '1',
        KWILT_FOUNDER_ALERTS_SLACK_WEBHOOK_URL: 'https://hooks.slack.test/services/abc',
      },
      fetchFn: fetchMock as any,
      nowIso: () => '2026-06-08T12:00:01.000Z',
    });

    expect(result).toEqual({ ok: true, inserted: true, slackSent: false, posthogSent: false });
    expect(calls.find((c) => c.operation === 'update')?.payload).toMatchObject({
      event_key: 'install:first',
      slack_sent_at: null,
      slack_error: 'slack_500: bad hook',
    });
  });

  test('does not insert or send when the kill switch is off', async () => {
    const { admin, calls } = createMockAdmin();
    const fetchMock = jest.fn();

    const result = await recordFounderAlertEvent({
      admin,
      event: {
        eventKey: 'install:first',
        eventName: 'activation_first_opened',
        source: 'install_ping',
        subjectId: 'install_1',
        occurredAt: '2026-06-08T12:00:00.000Z',
        environment: 'production',
        properties: {},
      },
      env: {
        KWILT_FOUNDER_ALERTS_ENABLED: '0',
        KWILT_FOUNDER_ALERTS_SLACK_WEBHOOK_URL: 'https://hooks.slack.test/services/abc',
      },
      fetchFn: fetchMock as any,
    });

    expect(result).toEqual({ ok: true, inserted: false, skipped: 'disabled' });
    expect(calls).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('daily digest formatting', () => {
  test('includes counts for all canonical events and watch-list rows', () => {
    const message = buildFounderDigestSlackMessage({
      dateLabel: '2026-06-07',
      counts: {
        activation_first_opened: 7,
        activation_account_linked: 3,
        subscription_initial_purchase: 2,
        subscription_trial_started: 1,
        subscription_cancelled: 1,
        subscription_expired: 0,
        subscription_billing_issue: 1,
      },
      watchList: [
        {
          event_name: 'subscription_billing_issue',
          subject_id: 'user_1',
          occurred_at: '2026-06-07T22:00:00.000Z',
          properties: { product_id: 'pro_monthly', store: 'APP_STORE' },
        },
        {
          event_name: 'subscription_cancelled',
          subject_id: 'user_2',
          occurred_at: '2026-06-07T21:00:00.000Z',
          properties: { product_id: 'pro_annual', cancel_reason: 'UNSUBSCRIBE' },
        },
      ],
    });

    for (const eventName of FOUNDER_ALERT_EVENT_NAMES) {
      expect(message.text).toContain(eventName);
    }
    expect(message.text).toContain('First opens: 7');
    expect(message.text).toContain('user_1');
    expect(message.text).toContain('BILLING');
    expect(message.text).toContain('UNSUBSCRIBE');
  });
});
