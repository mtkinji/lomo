import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

import { processMealPlanAttention } from './processMealPlanAttention.ts';

Deno.test('processes due windows and acknowledges every claimed push job', async () => {
  const completions: Array<{ jobId: string; succeeded: boolean }> = [];
  const result = await processMealPlanAttention({
    processDue: async () => 2,
    claimPushJobs: async () => [
      { jobId: 'job-1', planId: 'plan-1', recipientUserId: 'user-1', title: 'Meal Plan', body: 'New ideas.' },
      { jobId: 'job-2', planId: 'plan-1', recipientUserId: 'user-2', title: 'Meal Plan', body: 'New ideas.' },
    ],
    sendPush: async () => ({ attempted: 1, accepted: 1, rejected: 0 }),
    completePush: async (jobId, succeeded) => { completions.push({ jobId, succeeded }); },
  });

  assertEquals(result, { processedWindows: 2, claimedPushes: 2, completedPushes: 2, failedPushes: 0 });
  assertEquals(completions, [
    { jobId: 'job-1', succeeded: true },
    { jobId: 'job-2', succeeded: true },
  ]);
});

Deno.test('releases a failed push claim for bounded retry', async () => {
  const completions: Array<{ jobId: string; succeeded: boolean; error?: string }> = [];
  const result = await processMealPlanAttention({
    processDue: async () => 0,
    claimPushJobs: async () => [
      { jobId: 'job-1', planId: 'plan-1', recipientUserId: 'user-1', title: 'Meal Plan', body: 'New ideas.' },
    ],
    sendPush: async () => { throw new Error('provider unavailable'); },
    completePush: async (jobId, succeeded, error) => { completions.push({ jobId, succeeded, error }); },
  });

  assertEquals(result.failedPushes, 1);
  assertEquals(completions, [{ jobId: 'job-1', succeeded: false, error: 'provider unavailable' }]);
});
