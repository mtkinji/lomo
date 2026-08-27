import type { ServerAgentToolCall, ServerAgentToolResult } from './agentRuntime.ts';
import type { ExternalMcpToolDefinition } from './externalMcp.ts';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

export type ExternalWriteResult = {
  object_type: string;
  object_id: string;
  result_summary: string;
  structured: JsonObject;
};

export function externalMcpIdempotencyMaterial(tool: ExternalMcpToolDefinition, idempotencyKey: string): string {
  return `${tool.operationId}:${idempotencyKey}`;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function compact(entries: Array<[string, unknown]>): Record<string, unknown> {
  return Object.fromEntries(entries.filter(([, value]) => value !== undefined));
}

function fields(args: Record<string, unknown>, mapping: ReadonlyArray<readonly [string, string]>): Record<string, unknown> {
  return compact(mapping.map(([external, canonical]) => [canonical, args[external]]));
}

function assertCompatibilityArguments(tool: ExternalMcpToolDefinition, args: Record<string, unknown>): void {
  const properties = record(tool.inputSchema.properties);
  const unknown = Object.keys(args).find((name) => !(name in properties));
  if (unknown) throw new Error(`unsupported_external_argument:${unknown}`);
}

const PRESET_TEXT: Readonly<Record<string, string>> = {
  made_progress: 'Made progress.',
  struggled_today: 'Struggled today.',
  need_encouragement: 'I need encouragement.',
  just_checking_in: 'Just checking in.',
};

/** Translate the v1 snake-case MCP envelope into the canonical Chat tool contract. */
export function prepareExternalMcpAction(
  tool: ExternalMcpToolDefinition,
  rawArgs: unknown,
  requestId: string,
): ServerAgentToolCall {
  if (tool.scope !== 'write') throw new Error('external_tool_is_not_write');
  const args = record(rawArgs);
  assertCompatibilityArguments(tool, args);
  let canonicalArgs: Record<string, unknown>;

  switch (tool.name) {
    case 'create_arc':
      canonicalArgs = fields(args, [
        ['name', 'name'], ['narrative', 'narrative'], ['identity_statement', 'identityStatement'], ['status', 'status'],
      ]);
      break;
    case 'update_arc':
      canonicalArgs = { arcId: args.arc_id, fields: fields(args, [
        ['name', 'name'], ['narrative', 'narrative'], ['identity_statement', 'identityStatement'], ['status', 'status'],
      ]) };
      break;
    case 'delete_arc': canonicalArgs = { arcId: args.arc_id }; break;
    case 'create_goal':
      canonicalArgs = fields(args, [
        ['title', 'title'], ['description', 'description'], ['arc_id', 'arcId'], ['status', 'status'],
        ['priority', 'priority'], ['target_date', 'targetDate'],
      ]);
      break;
    case 'update_goal':
      canonicalArgs = { goalId: args.goal_id, fields: fields(args, [
        ['title', 'title'], ['description', 'description'], ['arc_id', 'arcId'], ['status', 'status'],
        ['priority', 'priority'], ['target_date', 'targetDate'],
      ]) };
      break;
    case 'delete_goal': canonicalArgs = { goalId: args.goal_id }; break;
    case 'add_goal_checkin': {
      const text = typeof args.text === 'string' && args.text.trim()
        ? args.text.trim()
        : typeof args.preset === 'string' ? PRESET_TEXT[args.preset] : undefined;
      canonicalArgs = { goalId: args.goal_id, text: text ?? 'Just checking in.' };
      break;
    }
    case 'capture_activity':
      canonicalArgs = fields(args, [
        ['goal_id', 'goalId'], ['title', 'title'], ['notes', 'notes'], ['type', 'type'], ['status', 'status'],
        ['tags', 'tags'], ['priority', 'priority'], ['scheduled_date', 'scheduledDate'],
      ]);
      break;
    case 'update_activity':
      canonicalArgs = { activityId: args.activity_id, fields: fields(args, [
        ['goal_id', 'goalId'], ['title', 'title'], ['notes', 'notes'], ['type', 'type'], ['status', 'status'],
        ['tags', 'tags'], ['priority', 'priority'], ['scheduled_date', 'scheduledDate'],
      ]) };
      break;
    case 'create_activity_step':
      canonicalArgs = compact([['activityId', args.activity_id], ['title', args.title], ['optional', args.is_optional]]);
      break;
    case 'update_activity_step':
      canonicalArgs = compact([
        ['activityId', args.activity_id], ['stepId', args.step_id], ['title', args.title], ['optional', args.is_optional],
      ]);
      break;
    case 'mark_activity_step_done':
      canonicalArgs = { activityId: args.activity_id, stepId: args.step_id, completed: true };
      break;
    case 'delete_activity_step': canonicalArgs = { activityId: args.activity_id, stepId: args.step_id }; break;
    case 'reorder_activity_steps': canonicalArgs = { activityId: args.activity_id, stepIds: args.step_ids }; break;
    case 'mark_activity_done': canonicalArgs = { activityId: args.activity_id, fields: { status: 'done' } }; break;
    case 'set_focus_today': canonicalArgs = { activityId: args.activity_id }; break;
    case 'delete_activity': canonicalArgs = { activityId: args.activity_id }; break;
    case 'update_chapter_user_note': canonicalArgs = { chapterId: args.chapter_id, note: args.note }; break;
    default:
      if (tool.name !== tool.canonicalName) throw new Error('unknown_external_write_tool');
      canonicalArgs = Object.fromEntries(Object.entries(args).filter(([key]) => key !== 'idempotency_key'));
  }

  return { id: requestId, toolId: tool.toolId, arguments: canonicalArgs };
}

function resultReferences(value: unknown): JsonObject[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const ref = record(item);
    return typeof ref.kind === 'string' && typeof ref.id === 'string' ? [{ kind: ref.kind, id: ref.id }] : [];
  });
}

export function projectExternalMcpWriteResult(input: {
  tool: ExternalMcpToolDefinition;
  requestId: string;
  result: ServerAgentToolResult;
}): ExternalWriteResult {
  const { tool, requestId, result } = input;
  const base: JsonObject = {
    receipt_id: null, operation: tool.operationId, status: result.status,
    result_references: [], confirmation: null, handoff: null,
  };

  if (result.status === 'completed') {
    const receipt = record(result.receipt);
    const refs = resultReferences(receipt.resultRefs);
    const receiptId = typeof receipt.receiptId === 'string' ? receipt.receiptId : null;
    const first = refs[0] ?? {};
    const summary = refs.length > 0 ? `Completed ${tool.annotations.title}.` : `${tool.annotations.title} completed.`;
    return {
      object_type: typeof first.kind === 'string' ? first.kind : 'action',
      object_id: typeof first.id === 'string' ? first.id : receiptId ?? requestId,
      result_summary: summary,
      structured: { ...base, receipt_id: receiptId, result_references: refs, summary },
    };
  }
  if (result.status === 'proposed') {
    const proposal = record(result.proposal);
    const proposalId = typeof proposal.id === 'string' ? proposal.id : requestId;
    const summary = `${tool.annotations.title} is ready for review in Kwilt.`;
    return {
      object_type: 'proposal', object_id: proposalId, result_summary: summary,
      structured: { ...base, confirmation: { required: true, state: 'pending', proposal_id: proposalId }, summary },
    };
  }
  if (result.status === 'pending_client_action') {
    const summary = `${tool.annotations.title} is ready to continue in Kwilt.`;
    return {
      object_type: 'client_action', object_id: requestId, result_summary: summary,
      structured: {
        ...base, handoff: { required: true, provider: result.provider, request: result.request as JsonObject }, summary,
      },
    };
  }
  if (result.status === 'needs_input') {
    return {
      object_type: 'action', object_id: requestId, result_summary: result.prompt,
      structured: {
        ...base, confirmation: { required: true, state: 'needs_input', fields: result.fields }, summary: result.prompt,
      },
    };
  }
  if (result.status === 'unavailable') {
    return {
      object_type: 'action', object_id: requestId, result_summary: result.reason,
      structured: { ...base, summary: result.reason },
    };
  }
  throw new Error(result.code || 'external_action_failed');
}

export async function executeExternalMcpWrite(input: {
  tool: ExternalMcpToolDefinition;
  args: unknown;
  requestId: string;
  execute(call: ServerAgentToolCall): Promise<ServerAgentToolResult>;
}): Promise<ExternalWriteResult> {
  const call = prepareExternalMcpAction(input.tool, input.args, input.requestId);
  return projectExternalMcpWriteResult({
    tool: input.tool, requestId: input.requestId, result: await input.execute(call),
  });
}
