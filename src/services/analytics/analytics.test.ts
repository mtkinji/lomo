import { sanitizeAnalyticsProps } from './analytics';

describe('sanitizeAnalyticsProps', () => {
  it('keeps coarse typed product telemetry', () => {
    expect(sanitizeAnalyticsProps({
      source: 'settings',
      outcome: 'saved',
      candidate_count: 3,
      enabled: true,
      activity_id: 'activity-1',
      app_env: 'production',
    })).toEqual({
      source: 'settings',
      outcome: 'saved',
      candidate_count: 3,
      enabled: true,
      activity_id: 'activity-1',
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
    expect(sanitizeAnalyticsProps(props)).toEqual({});
  });

  it('drops strings under unknown keys even when short', () => {
    expect(sanitizeAnalyticsProps({ unexplained: 'looks harmless' })).toEqual({});
  });
});
