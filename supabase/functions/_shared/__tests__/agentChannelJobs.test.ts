import {
  buildAgentChannelJobInsert,
  splitAgentSmsResponse,
  validateClaimedAgentChannelJob,
} from '../agentChannelJobs';

test('builds an idempotent job without copying raw phone identity', () => {
  expect(buildAgentChannelJobInsert({
    userId: 'user-1', phoneLinkId: 'link-1', externalMessageId: 'SM123',
    prompt: '  What should I do tomorrow?  ',
  })).toEqual({
    user_id: 'user-1', channel: 'sms', phone_link_id: 'link-1', external_message_id: 'SM123',
    prompt: 'What should I do tomorrow?',
    channel_context: { phoneLinkId: 'link-1', externalMessageId: 'SM123' },
    state: 'queued',
  });
});

test('rejects malformed claimed jobs before model or Twilio access', () => {
  expect(validateClaimedAgentChannelJob({
    id: 'job-1', user_id: 'user-1', channel: 'sms', phone_link_id: 'link-1',
    external_message_id: 'SM123', prompt: 'Plan tomorrow', state: 'running', attempts: 1,
    run_id: 'run-1', response_body: 'Here is the plan.', outbound_message_ids: ['SM-out-1'],
  })).toMatchObject({
    id: 'job-1', attempts: 1, runId: 'run-1', responseBody: 'Here is the plan.',
    outboundMessageIds: ['SM-out-1'],
  });
  expect(() => validateClaimedAgentChannelJob({ id: 'job-1', state: 'queued' })).toThrow('invalid_claimed_channel_job');
});

test('splits long answers into calm bounded SMS parts without losing text', () => {
  const answer = Array.from({ length: 80 }, (_, index) => `item-${index}`).join(' ');
  const parts = splitAgentSmsResponse(answer, 240, 3);
  expect(parts.length).toBeGreaterThan(1);
  expect(parts.length).toBeLessThanOrEqual(3);
  expect(parts.every((part) => part.length <= 240)).toBe(true);
  expect(parts.join(' ').replace(/\s+/g, ' ').trim()).toBe(answer);
});

test('marks an answer that exceeds the configured SMS ceiling as truncated', () => {
  const answer = Array.from({ length: 300 }, (_, index) => `item-${index}`).join(' ');
  const parts = splitAgentSmsResponse(answer, 240, 3);
  expect(parts).toHaveLength(3);
  expect(parts[2].endsWith('…')).toBe(true);
});
