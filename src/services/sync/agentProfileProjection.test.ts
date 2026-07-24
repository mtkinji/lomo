import { agentProfileProjectionSignature, buildAgentProfileProjectionRow } from './agentProfileProjection';

test('projects only bounded Phone-safe Profile fields and the native optimistic version', () => {
  const profile = {
    id: 'profile-1', createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-23T18:00:00.000Z',
    fullName: '  Andrew  ', ageRange: '35-44' as const, email: 'private@example.com',
    birthdate: '1988-01-01', identitySummary: 'Private identity context', coachContextRaw: 'Private raw context',
    communication: {}, visuals: {},
  };
  expect(buildAgentProfileProjectionRow({ userId: ' user-1 ', profile, now: () => 'now' })).toEqual({
    user_id: 'user-1', profile_id: 'profile-1', full_name: 'Andrew', age_range: '35-44',
    profile_updated_at: '2026-07-23T18:00:00.000Z', updated_at: 'now',
  });
  expect(JSON.stringify(buildAgentProfileProjectionRow({ userId: 'user-1', profile }))).not.toMatch(
    /private@example|birthdate|identity|coachContext/i,
  );
});

test('changes its signature only when the bounded projection changes', () => {
  const base = {
    id: 'profile-1', createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-23T18:00:00.000Z',
    fullName: 'Andrew', ageRange: '35-44' as const, communication: {}, visuals: {},
  };
  expect(agentProfileProjectionSignature({ ...base, coachContextRaw: 'one' }))
    .toBe(agentProfileProjectionSignature({ ...base, coachContextRaw: 'two' }));
  expect(agentProfileProjectionSignature({ ...base, fullName: 'Andy' }))
    .not.toBe(agentProfileProjectionSignature(base));
});
