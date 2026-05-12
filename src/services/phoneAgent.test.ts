import {
  buildPhoneAgentLinkRequest,
  normalizePhoneAgentLink,
  normalizePhoneAgentStatus,
} from './phoneAgent';

describe('phoneAgent service helpers', () => {
  test('builds request_code payload', () => {
    expect(buildPhoneAgentLinkRequest({ action: 'request_code', phone: '+1 415 555 1212' })).toEqual({
      action: 'request_code',
      phone: '+1 415 555 1212',
    });
  });

  test('normalizes link rows for Settings display', () => {
    expect(normalizePhoneAgentLink({
      phone: '+14155551212',
      status: 'verified',
      permissions: { create_activities: true },
      promptCapPerDay: 3,
      optedOutAt: null,
    })).toEqual({
      phone: '+14155551212',
      status: 'verified',
      permissions: { create_activities: true },
      promptCapPerDay: 3,
      optedOutAt: null,
    });
  });

  test('normalizes status metadata for Settings display', () => {
    expect(normalizePhoneAgentStatus({
      ok: true,
      links: [],
      memorySummary: { peopleCount: 2, activeEventsCount: 1, activeCadencesCount: 1 },
      recentActions: [{ id: 'log-1', actionType: 'capture_activity', createdAt: '2026-05-10T12:00:00.000Z', activityId: 'act-1', promptId: null }],
    })).toEqual({
      links: [],
      memorySummary: { peopleCount: 2, activeEventsCount: 1, activeCadencesCount: 1 },
      recentActions: [{ id: 'log-1', actionType: 'capture_activity', createdAt: '2026-05-10T12:00:00.000Z', activityId: 'act-1', promptId: null }],
    });
  });
});
