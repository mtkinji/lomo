import { splitAgentSmsResponse, validateClaimedAgentChannelJob } from './agentChannelJobs.ts';
import { resolveAgentChannelAdmission } from './agentRuntime.ts';

type ChannelContext = {
  phoneE164: string;
  status: string;
  optedOutAt: string | null;
  permissions: Record<string, boolean>;
  threadId: string | null;
  timeZone: string;
};

export type AgentChannelWorkerDependencies = {
  loadContext: (job: ReturnType<typeof validateClaimedAgentChannelJob>) => Promise<ChannelContext>;
  execute: (input: {
    userId: string;
    channel: 'sms' | 'phone';
    requestId: string;
    prompt: string;
    threadId: string | null;
    phoneLinkId: string;
    externalMessageId: string;
    permissions: Record<string, boolean>;
    timeZone: string;
  }) => Promise<{ answer: string; runId: string; threadId: string }>;
  bindThread: (userId: string, channel: 'sms' | 'phone', phoneLinkId: string, threadId: string) => Promise<void>;
  checkpointResponse: (jobId: string, runId: string, answer: string) => Promise<void>;
  enrichLegacyContext: (jobId: string, prompt: string, permissions: Record<string, boolean>) => Promise<void>;
  sendSms: (to: string, body: string) => Promise<{ sid: string }>;
  recordDeliveryPart: (jobId: string, expectedPart: number, sid: string) => Promise<void>;
  complete: (jobId: string, runId: string, answer: string, outboundMessageIds: string[]) => Promise<void>;
  retry: (jobId: string, delaySeconds: number, code: string) => Promise<void>;
  fail: (jobId: string, code: string) => Promise<void>;
  cancel: (jobId: string, code: string) => Promise<void>;
};

function errorCode(error: unknown): string {
  return error instanceof Error && error.message ? error.message.split(':')[0] : 'channel_job_failed';
}

export async function processAgentChannelJob(
  rawJob: unknown,
  dependencies: AgentChannelWorkerDependencies,
  options: { smsPartLength?: number; smsMaxParts?: number } = {},
) {
  const job = validateClaimedAgentChannelJob(rawJob);
  try {
    const context = await dependencies.loadContext(job);
    const admission = resolveAgentChannelAdmission({
      request: {
        channel: job.channel,
        requestId: job.externalMessageId,
        prompt: job.prompt,
        threadId: context.threadId,
        channelContext: {
          phoneLinkId: job.phoneLinkId,
          externalMessageId: job.externalMessageId,
          ...(job.channelContext.disclosureAcknowledged ? { disclosureAcknowledged: true } : {}),
          timeZone: context.timeZone,
        },
      },
      phoneLink: {
        status: context.status,
        optedOutAt: context.optedOutAt,
        permissions: context.permissions,
      },
    });
    if (admission.decision !== 'admit') {
      const reason = admission.decision === 'denied' ? admission.reason : 'deterministic_channel_command';
      await dependencies.cancel(job.id, reason);
      return { state: 'cancelled' as const, reason };
    }

    let answer = job.responseBody;
    let runId = job.runId;
    if (!answer || !runId) {
      const result = await dependencies.execute({
        userId: job.userId,
        channel: job.channel,
        requestId: job.attempts === 1 ? job.externalMessageId : `${job.externalMessageId}:retry:${job.attempts}`,
        prompt: job.prompt,
        threadId: context.threadId,
        phoneLinkId: job.phoneLinkId,
        externalMessageId: job.externalMessageId,
        permissions: context.permissions,
        timeZone: context.timeZone,
      });
      answer = result.answer.trim();
      runId = result.runId;
      if (!answer || !runId || !result.threadId) throw new Error('channel_run_result_malformed');
      await dependencies.checkpointResponse(job.id, runId, answer);
      await dependencies.bindThread(job.userId, job.channel, job.phoneLinkId, result.threadId);
    }
    await dependencies.enrichLegacyContext(job.id, job.prompt, context.permissions);

    const parts = splitAgentSmsResponse(answer, options.smsPartLength, options.smsMaxParts);
    if (parts.length === 0 || job.outboundMessageIds.length > parts.length) {
      throw new Error('channel_delivery_state_malformed');
    }
    const outboundMessageIds = [...job.outboundMessageIds];
    for (let index = outboundMessageIds.length; index < parts.length; index += 1) {
      const delivered = await dependencies.sendSms(context.phoneE164, parts[index]);
      if (!delivered.sid) throw new Error('channel_delivery_failed');
      await dependencies.recordDeliveryPart(job.id, index, delivered.sid);
      outboundMessageIds.push(delivered.sid);
    }
    await dependencies.complete(job.id, runId, answer, outboundMessageIds);
    return { state: 'completed' as const, parts: parts.length };
  } catch (error) {
    const code = errorCode(error);
    if (job.attempts < 3) {
      const delaySeconds = 30 * (2 ** (job.attempts - 1));
      await dependencies.retry(job.id, delaySeconds, code);
      return { state: 'queued' as const, reason: code };
    }
    await dependencies.fail(job.id, code);
    return { state: 'failed' as const, reason: code };
  }
}
