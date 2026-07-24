export type ClaimedAgentChannelJob = {
  id: string;
  userId: string;
  channel: 'sms' | 'phone';
  phoneLinkId: string;
  externalMessageId: string;
  prompt: string;
  attempts: number;
  runId: string | null;
  responseBody: string | null;
  outboundMessageIds: string[];
  channelContext: { disclosureAcknowledged?: boolean };
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function requiredString(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

export function buildAgentChannelJobInsert(input: {
  userId: string;
  phoneLinkId: string;
  externalMessageId: string;
  prompt: string;
}) {
  const prompt = input.prompt.trim();
  if (!input.userId || !input.phoneLinkId || !input.externalMessageId || !prompt) {
    throw new Error('invalid_channel_job');
  }
  return {
    user_id: input.userId,
    channel: 'sms' as const,
    phone_link_id: input.phoneLinkId,
    external_message_id: input.externalMessageId,
    prompt,
    channel_context: { phoneLinkId: input.phoneLinkId, externalMessageId: input.externalMessageId },
    state: 'queued' as const,
  };
}

export function validateClaimedAgentChannelJob(raw: unknown): ClaimedAgentChannelJob {
  const row = asRecord(raw);
  const attempts = typeof row.attempts === 'number' && Number.isInteger(row.attempts) ? row.attempts : 0;
  const channel = row.channel === 'phone' ? 'phone' : row.channel === 'sms' ? 'sms' : null;
  const job = {
    id: requiredString(row.id),
    userId: requiredString(row.user_id),
    channel,
    phoneLinkId: requiredString(row.phone_link_id),
    externalMessageId: requiredString(row.external_message_id),
    prompt: requiredString(row.prompt),
    attempts,
    runId: requiredString(row.run_id) || null,
    responseBody: requiredString(row.response_body) || null,
    outboundMessageIds: Array.isArray(row.outbound_message_ids)
      ? row.outbound_message_ids.map(requiredString).filter(Boolean)
      : [],
    channelContext: asRecord(row.channel_context).disclosureAcknowledged === true
      ? { disclosureAcknowledged: true }
      : {},
  };
  if (!job.id || !job.userId || !job.channel || !job.phoneLinkId || !job.externalMessageId || !job.prompt || attempts < 1) {
    throw new Error('invalid_claimed_channel_job');
  }
  return job as ClaimedAgentChannelJob;
}

export function splitAgentSmsResponse(raw: string, maxLength = 1500, maxParts = 3): string[] {
  const normalized = raw.trim().replace(/\s+/g, ' ');
  if (!normalized) return [];
  const safeLength = Math.max(80, Math.min(1500, Math.floor(maxLength)));
  const safeParts = Math.max(1, Math.min(5, Math.floor(maxParts)));
  const words = normalized.split(' ');
  const parts: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= safeLength) {
      current = candidate;
      continue;
    }
    if (current) parts.push(current);
    current = word.slice(0, safeLength);
    if (parts.length >= safeParts) break;
  }
  if (current && parts.length < safeParts) parts.push(current);
  if (parts.length === safeParts) {
    const included = parts.join(' ').length;
    if (included < normalized.length) {
      const last = parts.length - 1;
      parts[last] = `${parts[last].slice(0, Math.max(0, safeLength - 1))}…`;
    }
  }
  return parts;
}
