import type { ServerAgentProposalRecord, ServerAgentProposalRequest, ServerAgentToolCall, ServerAgentToolResult } from './agentRuntime.ts';

type QueryResult = { data: unknown; error: unknown };
type ChoreClient = { rpc?: (name: string, args: Record<string, unknown>) => PromiseLike<QueryResult> };
type DeviceActionRequest = { capabilityId: string; actionType: string; targetType: string; targetId: string;
  title: string; consequenceSummary: string; payload: Record<string, unknown>; idempotencyKey: string };

const CHORE_TOOL_IDS = new Set([
  'chores.list', 'chores.get', 'chores.definition.create', 'chores.definition.update',
  'chores.definition.pause', 'chores.definition.delete', 'chores.occurrence.complete',
  'chores.occurrence.claim', 'chores.occurrence.release', 'chores.occurrence.reopen',
  'chores.occurrence.report_earlier',
  'chores.evidence.add', 'chores.review.approve', 'chores.review.return', 'chores.reward.read',
  'chores.review.leave_missed',
  'chores.reward.configure', 'chores.reward.reserve', 'chores.reward.cancel', 'chores.reward.settle',
]);
const string = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : null;
const record = (value: unknown): Record<string, unknown> | null => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;

function validSnapshot(value: unknown): value is Record<string, unknown> {
  const input = record(value); const actor = record(input?.actor); const household = record(input?.household); const reward = record(input?.reward);
  return !!input && !!actor && !!household && !!reward && !!string(actor.membershipId) && !!string(household.id)
    && Array.isArray(input.members) && Array.isArray(input.definitions) && Array.isArray(input.occurrences)
    && Array.isArray(reward.balances) && Array.isArray(reward.reservations) && !!string(input.observedAt);
}

export async function executeServerChoreTool({ client, userId, call, stageProposal, stageDeviceAction }: {
  client: ChoreClient; userId: string; call: ServerAgentToolCall;
  stageProposal?: (request: ServerAgentProposalRequest) => Promise<ServerAgentProposalRecord>;
  stageDeviceAction?: (request: DeviceActionRequest) => Promise<void>;
}): Promise<ServerAgentToolResult | null> {
  if (!CHORE_TOOL_IDS.has(call.toolId)) return null;
  if (!client.rpc) return { status: 'unavailable', reason: 'server_chore_provider_unavailable', retryable: false };
  const { data, error } = await client.rpc('get_kwilt_agent_chore_snapshot', { p_user_id: userId });
  if (error || !validSnapshot(data)) return { status: 'refused', reason: 'The current account does not have an authorized Household Chores context.' };
  const snapshot = data;
  if (call.toolId === 'chores.list') return { status: 'completed', output: snapshot, receipt: null };
  if (call.toolId === 'chores.get') {
    const choreId = string(call.arguments.choreId); const occurrenceId = call.arguments.occurrenceId == null ? null : string(call.arguments.occurrenceId);
    const definition = (snapshot.definitions as Record<string, unknown>[]).find((item) => item.id === choreId) ?? null;
    const occurrence = occurrenceId ? (snapshot.occurrences as Record<string, unknown>[]).find((item) => item.id === occurrenceId) ?? null : null;
    if (!definition || (occurrenceId && !occurrence)) return { status: 'refused', reason: 'That Chore is not available to the current Household member.' };
    return { status: 'completed', output: { definition, occurrence }, receipt: null };
  }
  if (call.toolId === 'chores.reward.read') {
    const membershipId = string(call.arguments.membershipId); const actor = record(snapshot.actor)!;
    if (!membershipId || (actor.role === 'child' && actor.membershipId !== membershipId)) return { status: 'refused', reason: 'That reward balance is not available to the current Household member.' };
    const reward = record(snapshot.reward)!;
    return { status: 'completed', output: { enabled: reward.enabled, centsPerToken: reward.centsPerToken, version: reward.version,
      balance: (reward.balances as Record<string, unknown>[]).find((item) => item.membershipId === membershipId) ?? null,
      reservations: (reward.reservations as Record<string, unknown>[]).filter((item) => item.membershipId === membershipId) }, receipt: null };
  }
  if (call.toolId === 'chores.evidence.add') {
    const occurrenceId = string(call.arguments.occurrenceId);
    if (!occurrenceId || !stageDeviceAction) return { status: 'failed', code: 'invalid_chore_evidence_target', message: 'Choose one exact Chore occurrence on a linked device.', retryable: false };
    const request: DeviceActionRequest = { capabilityId: 'chores', actionType: 'open_chore_evidence_picker', targetType: 'chore_occurrence', targetId: occurrenceId,
      title: 'Add chore photo', consequenceSummary: 'Kwilt will open the camera or photo library. The photo documents the chore; Kwilt does not automatically decide whether it is complete.',
      payload: { occurrenceId }, idempotencyKey: call.id };
    await stageDeviceAction(request);
    return { status: 'pending_client_action', provider: 'device', request };
  }
  if (!stageProposal) return { status: 'unavailable', reason: 'server_chore_proposal_persistence_unavailable', retryable: false };
  const actor = record(snapshot.actor)!;
  const caregiverOnly = call.toolId.startsWith('chores.definition.') || call.toolId.startsWith('chores.review.')
    || call.toolId === 'chores.reward.configure' || call.toolId === 'chores.reward.settle';
  if (caregiverOnly && actor.role !== 'owner' && actor.role !== 'caregiver') return { status: 'refused', reason: 'Only a Household caregiver can review that Chore change.' };
  const targetId = string(call.arguments.choreId) || string(call.arguments.occurrenceId) || string(call.arguments.reservationId) || string(call.arguments.membershipId);
  const expectedUpdatedAt = string(call.arguments.expectedUpdatedAt) || string(call.arguments.expectedVersion);
  if (call.toolId.startsWith('chores.definition.') && call.toolId !== 'chores.definition.create') {
    const definition = (snapshot.definitions as Record<string, unknown>[]).find((item) => item.id === targetId);
    if (!definition || definition.updatedAt !== expectedUpdatedAt) return { status: 'refused', reason: 'That Chore definition changed or is unavailable. Read it again before review.' };
  }
  if (['chores.occurrence.claim', 'chores.occurrence.release', 'chores.occurrence.complete', 'chores.occurrence.reopen'].includes(call.toolId) || call.toolId.startsWith('chores.review.')) {
    const occurrence = (snapshot.occurrences as Record<string, unknown>[]).find((item) => item.id === targetId);
    if (!occurrence || occurrence.updatedAt !== expectedUpdatedAt) return { status: 'refused', reason: 'That Chore occurrence changed or is unavailable. Read it again before review.' };
  }
  if (call.toolId === 'chores.reward.reserve' && actor.role === 'child' && targetId !== actor.membershipId) {
    return { status: 'refused', reason: 'A child can reserve only their own available Chore tokens.' };
  }
  if (call.toolId.startsWith('chores.reward.') && call.toolId !== 'chores.reward.read') {
    const reward = record(snapshot.reward)!;
    if ((call.toolId === 'chores.reward.configure' || call.toolId === 'chores.reward.reserve') && reward.version !== expectedUpdatedAt) {
      return { status: 'refused', reason: 'The Chore reward settings changed. Read them again before review.' };
    }
    if (call.toolId === 'chores.reward.cancel' || call.toolId === 'chores.reward.settle') {
      const reservation = (reward.reservations as Record<string, unknown>[]).find((item) => item.id === targetId);
      if (!reservation || reservation.updatedAt !== expectedUpdatedAt) return { status: 'refused', reason: 'That reward reservation changed or is unavailable.' };
      if (actor.role === 'child' && reservation.membershipId !== actor.membershipId) return { status: 'refused', reason: 'A child can cancel only their own reward reservation.' };
    }
  }
  const title = call.toolId === 'chores.reward.settle' ? 'Record outside-app reward payout' : `Review ${call.toolId.replace(/^chores\./, '').replaceAll('.', ' ')}`;
  const body = call.toolId === 'chores.reward.settle' ? 'Records only that a payout happened outside Kwilt; Kwilt never moves money.' : 'Applies only this authorized, reviewed Chore change.';
  const proposal = await stageProposal({ capabilityId: 'chores', title, body, operation: {
    type: call.toolId, targetType: call.toolId.includes('reward') ? 'chore_reward' : 'chore', targetId,
    summary: body, payload: { ...call.arguments, ...(expectedUpdatedAt ? { expectedUpdatedAt } : {}) },
  } });
  return { status: 'proposed', proposal };
}
