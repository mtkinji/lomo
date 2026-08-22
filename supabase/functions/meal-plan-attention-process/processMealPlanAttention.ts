export type MealPlanAttentionPushJob = {
  jobId: string;
  planId: string;
  recipientUserId: string;
  title: string;
  body: string;
};

type PushReceipt = { attempted: number; accepted: number; rejected: number };

export type MealPlanAttentionProcessor = {
  processDue(): Promise<number>;
  claimPushJobs(): Promise<MealPlanAttentionPushJob[]>;
  sendPush(job: MealPlanAttentionPushJob): Promise<PushReceipt>;
  completePush(jobId: string, succeeded: boolean, error?: string): Promise<void>;
};

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim() ? error.message.trim().slice(0, 160) : 'push_failed';
}

export async function processMealPlanAttention(dependencies: MealPlanAttentionProcessor) {
  const processedWindows = await dependencies.processDue();
  const jobs = await dependencies.claimPushJobs();
  let completedPushes = 0;
  let failedPushes = 0;

  for (const job of jobs) {
    try {
      await dependencies.sendPush(job);
      await dependencies.completePush(job.jobId, true);
      completedPushes += 1;
    } catch (error) {
      await dependencies.completePush(job.jobId, false, errorMessage(error));
      failedPushes += 1;
    }
  }

  return {
    processedWindows,
    claimedPushes: jobs.length,
    completedPushes,
    failedPushes,
  };
}
