import type { ServerAgentToolCall, ServerAgentToolResult } from './agentRuntime.ts';

type QueryResult = { data: unknown; error: unknown };
type RelationshipQuery = {
  select: (...args: unknown[]) => RelationshipQuery;
  eq: (...args: unknown[]) => RelationshipQuery;
  order: (...args: unknown[]) => RelationshipQuery;
  limit: (count: number) => Promise<QueryResult>;
};
type RelationshipClient = {
  from: (table: string) => unknown;
  rpc?: (name: string, args: Record<string, unknown>) => PromiseLike<QueryResult>;
};

export type ServerRelationshipUndoResult = {
  receiptId: string;
  proposalId: string;
  undoneAt: string;
  replayed: boolean;
};

type RelationshipMemoryInput = {
  personName: string;
  aliases: string[];
  memories: Array<{ kind: 'preference' | 'constraint' | 'note' | 'sensitivity' | 'milestone'; text: string }>;
  events: Array<{
    kind: 'birthday' | 'gathering' | 'deadline' | 'post_event' | 'other';
    title: string;
    dateText: string | null;
    startsAt: string | null;
    timeZone: string | null;
  }>;
  cadences: Array<{
    kind: 'drift' | 'recurring_followup' | 'other';
    intervalDays: number;
    nextDueAt: string | null;
  }>;
};
type RelationshipRecordType = 'memory' | 'event' | 'cadence';
type RelationshipManagementInput = {
  action: 'correct' | 'forget';
  recordType: RelationshipRecordType;
  recordId: string;
  expectedUpdatedAt: string;
  fields: Record<string, unknown>;
};

const MEMORY_KINDS = new Set(['preference', 'constraint', 'note', 'sensitivity', 'milestone']);
const EVENT_KINDS = new Set(['birthday', 'gathering', 'deadline', 'post_event', 'other']);
const CADENCE_KINDS = new Set(['drift', 'recurring_followup', 'other']);
const INPUT_KEYS = new Set(['personName', 'aliases', 'memories', 'events', 'cadences']);

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function nullableBoundedString(value: unknown, maxLength: number): string | null | undefined {
  if (value == null) return null;
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized.length <= maxLength ? normalized || null : undefined;
}

function validIso(value: string | null): boolean {
  return value === null || Number.isFinite(Date.parse(value));
}

export function normalizeRelationshipMemoryInput(value: unknown): RelationshipMemoryInput | null {
  const input = record(value);
  if (Object.keys(input).some((key) => !INPUT_KEYS.has(key))) return null;
  const personName = typeof input.personName === 'string' ? input.personName.trim() : '';
  if (!personName || personName.length > 160) return null;

  const rawAliases = input.aliases ?? [];
  if (!Array.isArray(rawAliases) || rawAliases.length > 5) return null;
  const aliases = rawAliases.map((alias) => typeof alias === 'string' ? alias.trim() : '');
  if (aliases.some((alias) => !alias || alias.length > 160)) return null;

  const rawMemories = input.memories ?? [];
  if (!Array.isArray(rawMemories) || rawMemories.length > 8) return null;
  const memories: RelationshipMemoryInput['memories'] = [];
  for (const value of rawMemories) {
    const memory = record(value);
    if (Object.keys(memory).some((key) => key !== 'kind' && key !== 'text')) return null;
    const kind = typeof memory.kind === 'string' ? memory.kind : '';
    const text = typeof memory.text === 'string' ? memory.text.trim() : '';
    if (!MEMORY_KINDS.has(kind) || !text || text.length > 5000) return null;
    memories.push({ kind: kind as RelationshipMemoryInput['memories'][number]['kind'], text });
  }

  const rawEvents = input.events ?? [];
  if (!Array.isArray(rawEvents) || rawEvents.length > 4) return null;
  const events: RelationshipMemoryInput['events'] = [];
  for (const value of rawEvents) {
    const event = record(value);
    if (Object.keys(event).some((key) => !['kind', 'title', 'dateText', 'startsAt', 'timeZone'].includes(key))) return null;
    const kind = typeof event.kind === 'string' ? event.kind : '';
    const title = typeof event.title === 'string' ? event.title.trim() : '';
    const dateText = nullableBoundedString(event.dateText, 160);
    const startsAt = nullableBoundedString(event.startsAt, 100);
    const timeZone = nullableBoundedString(event.timeZone, 100);
    if (!EVENT_KINDS.has(kind) || !title || title.length > 500 || dateText === undefined ||
        startsAt === undefined || !validIso(startsAt) || timeZone === undefined) return null;
    events.push({
      kind: kind as RelationshipMemoryInput['events'][number]['kind'], title, dateText, startsAt, timeZone,
    });
  }

  const rawCadences = input.cadences ?? [];
  if (!Array.isArray(rawCadences) || rawCadences.length > 4) return null;
  const cadences: RelationshipMemoryInput['cadences'] = [];
  for (const value of rawCadences) {
    const cadence = record(value);
    if (Object.keys(cadence).some((key) => !['kind', 'intervalDays', 'nextDueAt'].includes(key))) return null;
    const kind = typeof cadence.kind === 'string' ? cadence.kind : '';
    const nextDueAt = nullableBoundedString(cadence.nextDueAt, 100);
    if (!CADENCE_KINDS.has(kind) || !Number.isInteger(cadence.intervalDays) ||
        Number(cadence.intervalDays) < 1 || Number(cadence.intervalDays) > 730 ||
        nextDueAt === undefined || !validIso(nextDueAt)) return null;
    cadences.push({
      kind: kind as RelationshipMemoryInput['cadences'][number]['kind'],
      intervalDays: Number(cadence.intervalDays), nextDueAt,
    });
  }

  if (memories.length + events.length + cadences.length === 0) return null;
  return { personName, aliases: [...new Set(aliases)], memories, events, cadences };
}

function normalizeRelationshipManagementInput(call: ServerAgentToolCall): RelationshipManagementInput | null {
  const input = record(call.arguments);
  const forget = call.toolId === 'relationships.forget';
  const allowedTopLevel = forget
    ? ['recordType', 'recordId', 'expectedUpdatedAt']
    : ['recordType', 'recordId', 'expectedUpdatedAt', 'fields'];
  if (Object.keys(input).some((key) => !allowedTopLevel.includes(key))) return null;
  const recordType = typeof input.recordType === 'string' ? input.recordType : '';
  const allowedTypes = ['memory', 'event', 'cadence'];
  const recordId = typeof input.recordId === 'string' ? input.recordId.trim() : '';
  const expectedUpdatedAt = typeof input.expectedUpdatedAt === 'string' ? input.expectedUpdatedAt.trim() : '';
  if (!allowedTypes.includes(recordType) || !recordId || recordId.length > 200 ||
      !expectedUpdatedAt || !Number.isFinite(Date.parse(expectedUpdatedAt))) return null;
  if (forget) {
    return {
      action: 'forget', recordType: recordType as RelationshipManagementInput['recordType'],
      recordId, expectedUpdatedAt, fields: {},
    };
  }

  const fields = record(input.fields);
  const keys = Object.keys(fields);
  if (keys.length === 0) return null;
  const normalized: Record<string, unknown> = {};
  if (recordType === 'memory') {
    if (keys.some((key) => !['kind', 'text'].includes(key))) return null;
    if ('kind' in fields) {
      if (typeof fields.kind !== 'string' || !MEMORY_KINDS.has(fields.kind)) return null;
      normalized.kind = fields.kind;
    }
    if ('text' in fields) {
      const text = typeof fields.text === 'string' ? fields.text.trim() : '';
      if (!text || text.length > 5000) return null;
      normalized.text = text;
    }
  } else if (recordType === 'event') {
    if (keys.some((key) => !['kind', 'title', 'dateText', 'startsAt', 'timeZone'].includes(key))) return null;
    if ('kind' in fields) {
      if (typeof fields.kind !== 'string' || !EVENT_KINDS.has(fields.kind)) return null;
      normalized.kind = fields.kind;
    }
    if ('title' in fields) {
      const title = typeof fields.title === 'string' ? fields.title.trim() : '';
      if (!title || title.length > 500) return null;
      normalized.title = title;
    }
    for (const [key, max] of [['dateText', 160], ['startsAt', 100], ['timeZone', 100]] as const) {
      if (key in fields) {
        const value = nullableBoundedString(fields[key], max);
        if (value === undefined || (key === 'startsAt' && !validIso(value))) return null;
        normalized[key] = value;
      }
    }
  } else {
    if (keys.some((key) => !['kind', 'intervalDays', 'nextDueAt'].includes(key))) return null;
    if ('kind' in fields) {
      if (typeof fields.kind !== 'string' || !CADENCE_KINDS.has(fields.kind)) return null;
      normalized.kind = fields.kind;
    }
    if ('intervalDays' in fields) {
      if (!Number.isInteger(fields.intervalDays) || Number(fields.intervalDays) < 1 || Number(fields.intervalDays) > 730) return null;
      normalized.intervalDays = Number(fields.intervalDays);
    }
    if ('nextDueAt' in fields) {
      const value = nullableBoundedString(fields.nextDueAt, 100);
      if (value === undefined || !validIso(value)) return null;
      normalized.nextDueAt = value;
    }
  }
  return {
    action: 'correct', recordType: recordType as RelationshipRecordType,
    recordId, expectedUpdatedAt, fields: normalized,
  };
}

async function readTable(
  client: RelationshipClient,
  table: string,
  columns: string,
  userId: string,
  limit: number,
): Promise<QueryResult> {
  return (client.from(table) as RelationshipQuery).select(columns)
    .eq('user_id', userId).eq('status', 'active')
    .order('updated_at', { ascending: false }).limit(limit);
}

export async function executeServerRelationshipTool({
  client, userId, call, writeContext,
}: {
  client: RelationshipClient;
  userId: string;
  call: ServerAgentToolCall;
  writeContext?: { threadId: string; runId: string; messageId: string };
}): Promise<ServerAgentToolResult | null> {
  if (!['relationships.read', 'relationships.remember', 'relationships.correct', 'relationships.forget'].includes(call.toolId)) return null;
  if (call.toolId === 'relationships.read') {
    const [peopleResult, memoriesResult, eventsResult, cadencesResult] = await Promise.all([
      readTable(client, 'kwilt_phone_agent_people', 'id,display_name,status,updated_at', userId, 100),
      readTable(client, 'kwilt_phone_agent_memory_items', 'id,person_id,kind,text,status,updated_at', userId, 200),
      readTable(client, 'kwilt_phone_agent_events', 'id,person_id,kind,title,date_text,starts_at,timezone,status,updated_at', userId, 100),
      readTable(client, 'kwilt_phone_agent_cadences', 'id,person_id,kind,interval_days,next_due_at,status,updated_at', userId, 100),
    ]);
    if (peopleResult.error || memoriesResult.error || eventsResult.error || cadencesResult.error) {
      return { status: 'failed', code: 'relationships_read_failed', message: 'Kwilt could not read relationship memory.', retryable: true };
    }
    const peopleRows = Array.isArray(peopleResult.data) ? peopleResult.data.map(record) : [];
    const names = new Map(peopleRows.map((person) => [String(person.id ?? ''), String(person.display_name ?? '')]));
    const personFields = (row: Record<string, unknown>) => ({
      personId: typeof row.person_id === 'string' ? row.person_id : null,
      personName: typeof row.person_id === 'string' ? names.get(row.person_id) ?? null : null,
    });
    return {
      status: 'completed', receipt: null,
      output: {
        people: peopleRows.map((row) => ({
          id: String(row.id ?? ''), displayName: String(row.display_name ?? ''), updatedAt: String(row.updated_at ?? ''),
        })),
        memories: (Array.isArray(memoriesResult.data) ? memoriesResult.data.map(record) : []).map((row) => ({
          id: String(row.id ?? ''), ...personFields(row), kind: String(row.kind ?? ''),
          text: String(row.text ?? ''), updatedAt: String(row.updated_at ?? ''),
        })),
        events: (Array.isArray(eventsResult.data) ? eventsResult.data.map(record) : []).map((row) => ({
          id: String(row.id ?? ''), ...personFields(row), kind: String(row.kind ?? ''), title: String(row.title ?? ''),
          dateText: typeof row.date_text === 'string' ? row.date_text : null,
          startsAt: typeof row.starts_at === 'string' ? row.starts_at : null,
          timeZone: typeof row.timezone === 'string' ? row.timezone : null,
          updatedAt: String(row.updated_at ?? ''),
        })),
        cadences: (Array.isArray(cadencesResult.data) ? cadencesResult.data.map(record) : []).map((row) => ({
          id: String(row.id ?? ''), ...personFields(row), kind: String(row.kind ?? ''),
          intervalDays: Number(row.interval_days), nextDueAt: typeof row.next_due_at === 'string' ? row.next_due_at : null,
          updatedAt: String(row.updated_at ?? ''),
        })),
      },
    };
  }

  if (!writeContext || !client.rpc) {
    return { status: 'unavailable', reason: 'server_write_context_unavailable', retryable: false };
  }
  if (call.toolId === 'relationships.remember') {
    const payload = normalizeRelationshipMemoryInput(call.arguments);
    if (!payload) {
      return { status: 'failed', code: 'invalid_relationship_memory', message: 'A named person and at least one supported fact, event, or cadence are required.', retryable: false };
    }
    const { data, error } = await client.rpc('remember_kwilt_agent_relationship', {
      p_user_id: userId, p_thread_id: writeContext.threadId, p_run_id: writeContext.runId,
      p_message_id: writeContext.messageId, p_call_id: call.id, p_payload: payload,
    });
    const result = record(data);
    const personId = typeof result.personId === 'string' ? result.personId : '';
    const receiptId = typeof result.receiptId === 'string' ? result.receiptId : '';
    const recordIds = Array.isArray(result.recordIds)
      ? result.recordIds.filter((id): id is string => typeof id === 'string')
      : [];
    if (error || result.status !== 'applied' || !personId || !receiptId) {
      return { status: 'failed', code: 'relationship_memory_write_failed', message: 'Kwilt could not save that relationship memory.', retryable: true };
    }
    return {
      status: 'completed', output: { personId, recordIds, replayed: result.replayed === true },
      receipt: { id: receiptId, status: 'applied', resultingObjectType: 'relationship_memory', resultingObjectId: personId },
    };
  }

  const management = normalizeRelationshipManagementInput(call);
  if (!management) {
    return { status: 'failed', code: 'invalid_relationship_management', message: 'A current relationship record and supported correction or forget action are required.', retryable: false };
  }
  const { data, error } = await client.rpc('manage_kwilt_agent_relationship', {
    p_user_id: userId, p_thread_id: writeContext.threadId, p_run_id: writeContext.runId,
    p_message_id: writeContext.messageId, p_call_id: call.id, p_action: management.action,
    p_record_type: management.recordType, p_record_id: management.recordId,
    p_expected_updated_at: management.expectedUpdatedAt, p_fields: management.fields,
  });
  const result = record(data);
  const recordType = typeof result.recordType === 'string' ? result.recordType : '';
  const recordId = typeof result.recordId === 'string' ? result.recordId : '';
  const receiptId = typeof result.receiptId === 'string' ? result.receiptId : '';
  if (error || result.status !== 'applied' || !recordType || !recordId || !receiptId) {
    return { status: 'failed', code: 'relationship_management_failed', message: 'Kwilt could not update that relationship memory. It may have changed.', retryable: true };
  }
  return {
    status: 'completed', output: { recordType, recordId, replayed: result.replayed === true },
    receipt: {
      id: receiptId, status: 'applied', resultingObjectType: `relationship_${recordType}`,
      resultingObjectId: recordId,
    },
  };
}

export async function executeServerRelationshipUndo({
  client, userId, receiptId,
}: {
  client: RelationshipClient;
  userId: string;
  receiptId: string;
}): Promise<ServerRelationshipUndoResult | null> {
  const normalizedReceiptId = receiptId.trim();
  if (!client.rpc || !normalizedReceiptId || normalizedReceiptId.length > 200) return null;
  const { data, error } = await client.rpc('undo_kwilt_agent_relationship', {
    p_user_id: userId,
    p_receipt_id: normalizedReceiptId,
  });
  const result = record(data);
  const returnedReceiptId = typeof result.receiptId === 'string' ? result.receiptId : '';
  const proposalId = typeof result.proposalId === 'string' ? result.proposalId : '';
  const undoneAt = typeof result.undoneAt === 'string' ? result.undoneAt : '';
  if (error || result.status !== 'undone' || !returnedReceiptId || !proposalId || !undoneAt) return null;
  return {
    receiptId: returnedReceiptId,
    proposalId,
    undoneAt,
    replayed: result.replayed === true,
  };
}
