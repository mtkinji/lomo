import { processAgentChannelJob } from '../agentChannelWorker';

function claimed(overrides: Record<string, unknown> = {}) {
  return {
    id: 'job-1', user_id: 'user-1', channel: 'sms', phone_link_id: 'link-1',
    external_message_id: 'SM-in-1', prompt: 'What should I do tomorrow?', attempts: 1,
    run_id: null, response_body: null, outbound_message_ids: [], ...overrides,
  };
}

function dependencies(overrides: Record<string, unknown> = {}) {
  return {
    loadContext: jest.fn(async () => ({
      phoneE164: '+14155550123', status: 'verified', optedOutAt: null,
      permissions: { create_activities: true }, threadId: null, timeZone: 'America/Denver',
    })),
    execute: jest.fn(async () => ({ answer: 'First, choose your top priority.', runId: 'run-1', threadId: 'thread-1' })),
    bindThread: jest.fn(async () => undefined),
    checkpointResponse: jest.fn(async () => undefined),
    enrichLegacyContext: jest.fn(async () => undefined),
    sendSms: jest.fn(async () => ({ sid: 'SM-out-1' })),
    recordDeliveryPart: jest.fn(async () => undefined),
    complete: jest.fn(async () => undefined),
    retry: jest.fn(async () => undefined),
    fail: jest.fn(async () => undefined),
    cancel: jest.fn(async () => undefined),
    ...overrides,
  };
}

test('runs, checkpoints, binds, delivers, and completes one canonical SMS response', async () => {
  const deps = dependencies();
  await expect(processAgentChannelJob(claimed(), deps)).resolves.toEqual({ state: 'completed', parts: 1 });
  expect(deps.execute).toHaveBeenCalledWith(expect.objectContaining({
    userId: 'user-1', requestId: 'SM-in-1', threadId: null, timeZone: 'America/Denver',
  }));
  expect(deps.checkpointResponse).toHaveBeenCalledWith('job-1', 'run-1', 'First, choose your top priority.');
  expect(deps.bindThread).toHaveBeenCalledWith('user-1', 'sms', 'link-1', 'thread-1');
  expect(deps.enrichLegacyContext).toHaveBeenCalledWith(
    'job-1', 'What should I do tomorrow?', { create_activities: true },
  );
  expect(deps.recordDeliveryPart).toHaveBeenCalledWith('job-1', 0, 'SM-out-1');
  expect(deps.complete).toHaveBeenCalledWith('job-1', 'run-1', 'First, choose your top priority.', ['SM-out-1']);
});

test('resumes multipart delivery from its durable outbound checkpoint without rerunning the model', async () => {
  const answer = Array.from({ length: 90 }, (_, index) => `item-${index}`).join(' ');
  const deps = dependencies();
  await processAgentChannelJob(claimed({
    run_id: 'run-1', response_body: answer, outbound_message_ids: ['SM-out-1'], attempts: 2,
  }), deps, { smsPartLength: 240 });
  expect(deps.execute).not.toHaveBeenCalled();
  expect(deps.enrichLegacyContext).toHaveBeenCalledTimes(1);
  expect(deps.sendSms).toHaveBeenCalledTimes(2);
  expect(deps.recordDeliveryPart).toHaveBeenNthCalledWith(1, 'job-1', 1, 'SM-out-1');
  expect(deps.recordDeliveryPart).toHaveBeenNthCalledWith(2, 'job-1', 2, 'SM-out-1');
  expect(deps.complete).toHaveBeenCalledWith('job-1', 'run-1', answer, ['SM-out-1', 'SM-out-1', 'SM-out-1']);
});

test('cancels before model or delivery when the verified phone link is no longer active', async () => {
  const deps = dependencies({
    loadContext: jest.fn(async () => ({
      phoneE164: '+14155550123', status: 'opted_out', optedOutAt: '2026-07-23T00:00:00Z',
      permissions: {}, threadId: null, timeZone: 'America/Denver',
    })),
  });
  await expect(processAgentChannelJob(claimed(), deps)).resolves.toEqual({ state: 'cancelled', reason: 'phone_link_not_active' });
  expect(deps.cancel).toHaveBeenCalledWith('job-1', 'phone_link_not_active');
  expect(deps.execute).not.toHaveBeenCalled();
  expect(deps.sendSms).not.toHaveBeenCalled();
});

test('requeues retryable failures with bounded backoff and terminally fails the third attempt', async () => {
  const transient = dependencies({ execute: jest.fn(async () => { throw new Error('model_request_failed:503'); }) });
  await expect(processAgentChannelJob(claimed({ attempts: 2 }), transient)).resolves.toEqual({ state: 'queued', reason: 'model_request_failed' });
  expect(transient.retry).toHaveBeenCalledWith('job-1', 60, 'model_request_failed');

  const terminal = dependencies({ execute: jest.fn(async () => { throw new Error('model_request_failed:503'); }) });
  await expect(processAgentChannelJob(claimed({ attempts: 3 }), terminal)).resolves.toEqual({ state: 'failed', reason: 'model_request_failed' });
  expect(terminal.fail).toHaveBeenCalledWith('job-1', 'model_request_failed');
});
