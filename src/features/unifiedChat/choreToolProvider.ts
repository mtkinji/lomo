import type { AgentToolCall, AgentToolDefinition, AgentToolExecutionResult } from '@kwilt/agent-runtime';
import type { createChoreActions } from '../../capabilities/chores/domain/choreActions';
import type { StagedUnifiedChatClientAction } from './deviceToolProvider';

type ChoreActions = ReturnType<typeof createChoreActions>;

export type ChoreProposalOperation = {
  type:
    | 'chores.definition.create' | 'chores.definition.update' | 'chores.definition.pause' | 'chores.definition.delete'
    | 'chores.occurrence.claim' | 'chores.occurrence.release' | 'chores.occurrence.complete'
    | 'chores.occurrence.reopen' | 'chores.occurrence.report_earlier'
    | 'chores.review.approve' | 'chores.review.return' | 'chores.review.leave_missed'
    | 'chores.reward.configure' | 'chores.reward.reserve' | 'chores.reward.cancel' | 'chores.reward.settle';
  targetId: string | null;
  expectedUpdatedAt: string | null;
  payload: Record<string, unknown>;
};

export type StagedChoreToolProposal = {
  capabilityId: 'chores';
  title: string;
  body: string;
  operation: ChoreProposalOperation;
};

const CHORE_TOOLS = new Set([
  'chores.list', 'chores.get', 'chores.definition.create', 'chores.definition.update',
  'chores.definition.pause', 'chores.definition.delete', 'chores.occurrence.complete',
  'chores.occurrence.claim', 'chores.occurrence.release', 'chores.occurrence.reopen',
  'chores.occurrence.report_earlier',
  'chores.evidence.add', 'chores.review.approve', 'chores.review.return', 'chores.reward.read',
  'chores.review.leave_missed',
  'chores.reward.configure', 'chores.reward.reserve', 'chores.reward.cancel', 'chores.reward.settle',
]);

const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const record = (value: unknown): Record<string, unknown> | null => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const fieldsRecord = (value: unknown): Record<string, unknown> | null => {
  const direct = record(value); if (direct) return direct;
  if (!Array.isArray(value)) return null;
  const entries = value.flatMap((item) => {
    const field = record(item); const key = text(field?.key);
    return key && field && 'value' in field ? [[key, field.value] as [string, unknown]] : [];
  });
  return entries.length === value.length ? Object.fromEntries(entries) : null;
};
const failed = (code: string, message: string): AgentToolExecutionResult => ({ status: 'failed', code, message, retryable: false });

function writeTitle(toolId: string, targetTitle: string): { title: string; body: string } {
  if (toolId === 'chores.definition.create') return { title: 'Create chore', body: 'Creates an Activity-backed chore after review.' };
  if (toolId === 'chores.definition.update') return { title: `Update ${targetTitle}`, body: 'Changes only the reviewed occurrence or this and future occurrences.' };
  if (toolId === 'chores.definition.pause') return { title: `Pause ${targetTitle}`, body: 'Stops future chore occurrences without marking them complete.' };
  if (toolId === 'chores.definition.delete') return { title: `Delete ${targetTitle}`, body: 'Removes future work while preserving completed receipts.' };
  if (toolId === 'chores.occurrence.complete') return { title: `Complete ${targetTitle}`, body: 'Submits this exact dated occurrence under its evidence and review policy.' };
  if (toolId === 'chores.occurrence.claim') return { title: `Take ${targetTitle}`, body: 'Claims this exact open occurrence for the current child.' };
  if (toolId === 'chores.occurrence.release') return { title: `Return ${targetTitle} to the family list`, body: 'Releases this exact claimed occurrence back to the open pool.' };
  if (toolId === 'chores.occurrence.reopen') return { title: `Reopen ${targetTitle}`, body: 'Reopens this exact completion and reverses its current token credit.' };
  if (toolId === 'chores.occurrence.report_earlier') return { title: 'Report earlier Chores', body: 'Submits the selected missed dates for caregiver review.' };
  if (toolId === 'chores.review.approve') return { title: `Approve ${targetTitle}`, body: 'Approves this submission and credits it at most once.' };
  if (toolId === 'chores.review.return') return { title: `Return ${targetTitle}`, body: 'Marks this submission Needs another pass with the reviewed note.' };
  if (toolId === 'chores.review.leave_missed') return { title: `Leave ${targetTitle} missed`, body: 'Rejects the earlier-day correction without crediting it.' };
  if (toolId === 'chores.reward.configure') return { title: 'Update chore rewards', body: 'Changes the digital token program and rate; Kwilt does not move money.' };
  if (toolId === 'chores.reward.reserve') return { title: 'Reserve chore tokens', body: 'Locks these tokens and the current rate for an outside-app payout.' };
  if (toolId === 'chores.reward.cancel') return { title: 'Cancel token reservation', body: 'Returns an unpaid reservation to the available token balance.' };
  return { title: 'Record reward payout', body: 'Records that the payout happened outside Kwilt. Kwilt does not transfer funds.' };
}

export function createChoreToolProvider({ actions }: { actions: ChoreActions }) {
  const staged: StagedChoreToolProposal[] = [];
  const clientActions: StagedUnifiedChatClientAction[] = [];
  const execute = async (call: AgentToolCall, tool: AgentToolDefinition): Promise<AgentToolExecutionResult | null> => {
    if (!CHORE_TOOLS.has(call.toolId)) return null;
    if (call.toolId !== tool.id) return failed('tool_mismatch', 'The discovered Chores tool does not match this call.');
    try {
      if (call.toolId === 'chores.list') {
        const receipt = await actions.list();
        return { status: 'completed', output: receipt.result, receipt: null };
      }
      if (call.toolId === 'chores.get') {
        const choreId = text(call.arguments.choreId);
        const occurrenceId = call.arguments.occurrenceId == null ? null : text(call.arguments.occurrenceId);
        if (!choreId || (call.arguments.occurrenceId != null && !occurrenceId)) return failed('invalid_chore_target', 'Choose one exact chore.');
        const receipt = await actions.get({ choreId, occurrenceId });
        return { status: 'completed', output: receipt.result, receipt: null };
      }
      if (call.toolId === 'chores.reward.read') {
        const membershipId = text(call.arguments.membershipId);
        if (!membershipId) return failed('invalid_chore_member', 'Choose one Household member.');
        const receipt = await actions.readReward({ membershipId });
        return { status: 'completed', output: receipt.result, receipt: null };
      }
      if (call.toolId === 'chores.evidence.add') {
        const occurrenceId = text(call.arguments.occurrenceId);
        if (!occurrenceId) return failed('invalid_chore_occurrence', 'Choose one exact chore occurrence.');
        const request: StagedUnifiedChatClientAction = {
          capabilityId: 'chores', actionType: 'open_chore_evidence_picker', targetType: 'chore_occurrence', targetId: occurrenceId,
          title: 'Add chore photo', consequenceSummary: 'Kwilt will open the native camera or photo library. A photo is evidence for caregiver review, not automated proof.',
          payload: { occurrenceId },
        };
        clientActions.push(request);
        return { status: 'pending_client_action', provider: 'device', request: request as unknown as Record<string, unknown> };
      }

      const projection = (await actions.list()).result;
      const targetId = text(call.arguments.choreId) || text(call.arguments.occurrenceId)
        || text(call.arguments.reservationId) || text(call.arguments.membershipId) || null;
      const expectedUpdatedAt = text(call.arguments.expectedUpdatedAt) || text(call.arguments.expectedVersion) || null;
      let targetTitle = 'chore';
      if (call.toolId.startsWith('chores.definition.') && call.toolId !== 'chores.definition.create') {
        const target = projection.definitions.find((item) => item.id === targetId);
        if (!target) return failed('chore_not_found', 'That chore is no longer available.');
        if (target.updatedAt !== expectedUpdatedAt) return { status: 'failed', code: 'chore_target_stale', message: `${target.title} changed. Review its current version.`, retryable: true };
        targetTitle = target.title;
      }
      if (['chores.occurrence.claim', 'chores.occurrence.release', 'chores.occurrence.complete', 'chores.occurrence.reopen'].includes(call.toolId) || call.toolId.startsWith('chores.review.')) {
        const occurrence = [...projection.assignedWork, ...projection.openPool, ...projection.reviewQueue].find((item) => item.id === targetId);
        if (!occurrence) return failed('chore_occurrence_not_found', 'That chore occurrence is no longer available.');
        if (occurrence.updatedAt !== expectedUpdatedAt) return { status: 'failed', code: 'chore_target_stale', message: `${occurrence.title} changed. Review its current version.`, retryable: true };
        targetTitle = occurrence.title;
      }
      const normalizedFields = fieldsRecord(call.arguments.fields);
      const payload: Record<string, unknown> = { ...call.arguments, ...(normalizedFields ? { fields: normalizedFields } : {}) };
      delete payload.choreId; delete payload.occurrenceId; delete payload.reservationId;
      delete payload.expectedUpdatedAt; delete payload.expectedVersion;
      if ((call.toolId === 'chores.definition.create' || call.toolId === 'chores.definition.update') && !normalizedFields) return failed('invalid_chore_definition', 'Choose valid chore fields.');
      const copy = writeTitle(call.toolId, targetTitle);
      const proposal: StagedChoreToolProposal = {
        capabilityId: 'chores', ...copy,
        operation: { type: call.toolId as ChoreProposalOperation['type'], targetId, expectedUpdatedAt, payload },
      };
      staged.push(proposal);
      return { status: 'proposed', proposal: proposal as unknown as Record<string, unknown> };
    } catch (error) {
      const name = error instanceof Error ? error.name : '';
      if (name === 'ChoreAuthorizationError') return failed('chore_not_authorized', 'The current Household member is not authorized for that Chore action.');
      return failed('chore_provider_failed', error instanceof Error ? error.message : 'Kwilt could not safely prepare that Chore action.');
    }
  };
  return { execute, proposals: () => staged as readonly StagedChoreToolProposal[], actions: () => clientActions as readonly StagedUnifiedChatClientAction[] };
}
