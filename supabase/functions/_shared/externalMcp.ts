import {
  EXTERNAL_ACTION_REGISTRATIONS,
  projectExternalActionCatalog,
  projectExternalControlCoverage,
  type ExternalActionAnnotations,
  type ExternalRedactionPolicy,
} from '../../../packages/kwilt-agent-runtime/src/externalActionCatalog.ts';
import {
  KWILT_CAPABILITY_MANIFEST,
  KWILT_EXTERNAL_CONTROL_SCOPE,
} from '../../../packages/kwilt-agent-runtime/src/kwiltCapabilityManifest.ts';
import { SERVER_TOOL_PROVIDER_REGISTRATIONS } from './serverToolImplementations.ts';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

export type ExternalMcpToolDefinition = {
  name: string;
  description: string;
  scope: 'read' | 'write';
  inputSchema: JsonObject;
  outputSchema: JsonObject;
  annotations: ExternalActionAnnotations;
  canonicalName: string;
  operationId: string;
  toolId: string;
  requiredScopes: string[];
  redactionPolicy: ExternalRedactionPolicy;
  compatibilityAlias: { name: string; version: 1 } | null;
};

type LegacyExternalMcpToolDefinition = Pick<
  ExternalMcpToolDefinition,
  'name' | 'description' | 'scope' | 'inputSchema' | 'annotations'
>;

const ACTIVITY_STEP_PATCH_PROPERTIES: JsonObject = {
  title: { type: 'string' },
  is_optional: { type: 'boolean' },
};

function readOnlyAnnotations(title: string) {
  return {
    title,
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  };
}

function writeAnnotations(title: string) {
  return {
    title,
    readOnlyHint: false,
    destructiveHint: false,
    openWorldHint: false,
  };
}

function deleteAnnotations(title: string) {
  return {
    title,
    readOnlyHint: false,
    destructiveHint: true,
    openWorldHint: false,
  };
}

const LEGACY_EXTERNAL_MCP_READ_TOOLS: LegacyExternalMcpToolDefinition[] = [
  {
    name: 'get_current_account',
    description: 'Get the authenticated Kwilt account for this MCP connection.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    annotations: readOnlyAnnotations('Get Current Account'),
    scope: 'read',
  },
  {
    name: 'list_arcs',
    description: 'List the user-owned Kwilt Arcs. Returns compact identity context only.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['active', 'paused', 'archived'] },
        limit: { type: 'integer', minimum: 1, maximum: 100 },
      },
    },
    annotations: readOnlyAnnotations('List Arcs'),
    scope: 'read',
  },
  {
    name: 'get_arc',
    description: 'Get one user-owned Kwilt Arc and its recent Goals.',
    inputSchema: {
      type: 'object',
      properties: {
        arc_id: { type: 'string' },
      },
      required: ['arc_id'],
    },
    annotations: readOnlyAnnotations('Get Arc'),
    scope: 'read',
  },
  {
    name: 'list_goals',
    description: 'List user-owned Kwilt Goals, optionally filtered by Arc or status.',
    inputSchema: {
      type: 'object',
      properties: {
        arc_id: { type: 'string' },
        status: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
        limit: { type: 'integer', minimum: 1, maximum: 100 },
      },
    },
    annotations: readOnlyAnnotations('List Goals'),
    scope: 'read',
  },
  {
    name: 'get_goal',
    description: 'Get one user-owned Kwilt Goal and its most recent Activities.',
    inputSchema: {
      type: 'object',
      properties: {
        goal_id: { type: 'string' },
      },
      required: ['goal_id'],
    },
    annotations: readOnlyAnnotations('Get Goal'),
    scope: 'read',
  },
  {
    name: 'list_recent_activities',
    description: 'List user-owned Kwilt Activities updated in the last N days. Rich fields require include_rich=true.',
    inputSchema: {
      type: 'object',
      properties: {
        days: { type: 'integer', minimum: 1, maximum: 90 },
        include_rich: { type: 'boolean' },
      },
    },
    annotations: readOnlyAnnotations('List Recent To-dos'),
    scope: 'read',
  },
  {
    name: 'get_current_chapter',
    description: 'Get the latest ready Kwilt Chapter narrative for the user.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    annotations: readOnlyAnnotations('Get Current Chapter'),
    scope: 'read',
  },
  {
    name: 'get_show_up_status',
    description: "Get the user's current Kwilt show-up streak status.",
    inputSchema: {
      type: 'object',
      properties: {},
    },
    annotations: readOnlyAnnotations('Get Show-up Status'),
    scope: 'read',
  },
];

const IDEMPOTENCY_PROPERTY = {
  type: 'string',
  minLength: 8,
  maxLength: 200,
  description: 'Required stable request ID. Reuse it only when safely retrying the same write.',
};

const LEGACY_EXTERNAL_MCP_WRITE_TOOLS: LegacyExternalMcpToolDefinition[] = [
  {
    name: 'create_arc',
    description: 'Create a Kwilt Arc for the authenticated user. The Arc appears exactly as if the user created it in Kwilt.',
    scope: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        idempotency_key: IDEMPOTENCY_PROPERTY,
        name: { type: 'string' },
        narrative: { type: 'string' },
        identity_statement: { type: 'string' },
        status: { type: 'string', enum: ['active', 'paused', 'archived'] },
      },
      required: ['name'],
    },
    annotations: writeAnnotations('Create Arc'),
  },
  {
    name: 'update_arc',
    description: 'Update fields on a user-owned Kwilt Arc.',
    scope: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        arc_id: { type: 'string' },
        idempotency_key: IDEMPOTENCY_PROPERTY,
        name: { type: 'string' },
        narrative: { type: 'string' },
        identity_statement: { type: 'string' },
        status: { type: 'string', enum: ['active', 'paused', 'archived'] },
      },
      required: ['arc_id'],
    },
    annotations: writeAnnotations('Update Arc'),
  },
  {
    name: 'delete_arc',
    description: 'Delete a user-owned Kwilt Arc using the same recoverable delete behavior as the Kwilt app.',
    scope: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        arc_id: { type: 'string' },
        idempotency_key: IDEMPOTENCY_PROPERTY,
      },
      required: ['arc_id'],
    },
    annotations: deleteAnnotations('Delete Arc'),
  },
  {
    name: 'create_goal',
    description: 'Create a Kwilt Goal for the authenticated user. The Goal appears exactly as if the user created it in Kwilt.',
    scope: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        idempotency_key: IDEMPOTENCY_PROPERTY,
        title: { type: 'string' },
        description: { type: 'string' },
        arc_id: { type: ['string', 'null'] },
        status: { type: 'string', enum: ['planned', 'in_progress', 'completed', 'archived'] },
        priority: { type: 'integer', enum: [1, 2, 3] },
        target_date: { type: 'string' },
      },
      required: ['title'],
    },
    annotations: writeAnnotations('Create Goal'),
  },
  {
    name: 'update_goal',
    description: 'Update fields on a user-owned Kwilt Goal.',
    scope: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        goal_id: { type: 'string' },
        idempotency_key: IDEMPOTENCY_PROPERTY,
        title: { type: 'string' },
        description: { type: 'string' },
        arc_id: { type: ['string', 'null'] },
        status: { type: 'string', enum: ['planned', 'in_progress', 'completed', 'archived'] },
        priority: { type: 'integer', enum: [1, 2, 3] },
        target_date: { type: ['string', 'null'] },
      },
      required: ['goal_id'],
    },
    annotations: writeAnnotations('Update Goal'),
  },
  {
    name: 'delete_goal',
    description: 'Delete a user-owned Kwilt Goal using the same recoverable delete behavior as the Kwilt app.',
    scope: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        goal_id: { type: 'string' },
        idempotency_key: IDEMPOTENCY_PROPERTY,
      },
      required: ['goal_id'],
    },
    annotations: deleteAnnotations('Delete Goal'),
  },
  {
    name: 'add_goal_checkin',
    description: 'Add a Kwilt check-in to a goal the authenticated user can access.',
    scope: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        goal_id: { type: 'string' },
        idempotency_key: IDEMPOTENCY_PROPERTY,
        preset: { type: ['string', 'null'], enum: ['made_progress', 'struggled_today', 'need_encouragement', 'just_checking_in', null] },
        text: { type: 'string' },
      },
      required: ['goal_id'],
    },
    annotations: writeAnnotations('Add Goal Check-in'),
  },
  {
    name: 'capture_activity',
    description: 'Create a Kwilt To-do for the authenticated user. The To-do appears exactly as if the user created it in Kwilt.',
    scope: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        idempotency_key: IDEMPOTENCY_PROPERTY,
        goal_id: { type: ['string', 'null'] },
        title: { type: 'string' },
        notes: { type: 'string' },
        type: { type: 'string' },
        status: { type: 'string', enum: ['planned', 'in_progress', 'done', 'skipped', 'cancelled'] },
        tags: { type: 'array', items: { type: 'string' } },
        priority: { type: 'integer', enum: [1, 2, 3] },
        scheduled_date: { type: ['string', 'null'] },
      },
      required: ['title'],
    },
    annotations: writeAnnotations('Capture To-do'),
  },
  {
    name: 'update_activity',
    description: 'Update fields on a user-owned Kwilt To-do.',
    scope: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        activity_id: { type: 'string' },
        idempotency_key: IDEMPOTENCY_PROPERTY,
        goal_id: { type: ['string', 'null'] },
        title: { type: 'string' },
        notes: { type: 'string' },
        type: { type: 'string' },
        status: { type: 'string', enum: ['planned', 'in_progress', 'done', 'skipped', 'cancelled'] },
        tags: { type: 'array', items: { type: 'string' } },
        priority: { type: ['integer', 'null'], enum: [1, 2, 3, null] },
        scheduled_date: { type: ['string', 'null'] },
      },
      required: ['activity_id'],
    },
    annotations: writeAnnotations('Update To-do'),
  },
  {
    name: 'create_activity_step',
    description: 'Add one step to a user-owned Kwilt To-do without replacing the existing step list.',
    scope: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        activity_id: { type: 'string' },
        idempotency_key: IDEMPOTENCY_PROPERTY,
        title: { type: 'string' },
        is_optional: { type: 'boolean' },
      },
      required: ['activity_id', 'title'],
    },
    annotations: writeAnnotations('Create To-do Step'),
  },
  {
    name: 'update_activity_step',
    description: 'Update one step on a user-owned Kwilt To-do without replacing the existing step list.',
    scope: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        activity_id: { type: 'string' },
        step_id: { type: 'string' },
        idempotency_key: IDEMPOTENCY_PROPERTY,
        ...ACTIVITY_STEP_PATCH_PROPERTIES,
      },
      required: ['activity_id', 'step_id'],
    },
    annotations: writeAnnotations('Update To-do Step'),
  },
  {
    name: 'mark_activity_step_done',
    description: 'Mark one step done on a user-owned Kwilt To-do.',
    scope: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        activity_id: { type: 'string' },
        step_id: { type: 'string' },
        idempotency_key: IDEMPOTENCY_PROPERTY,
      },
      required: ['activity_id', 'step_id'],
    },
    annotations: writeAnnotations('Mark To-do Step Done'),
  },
  {
    name: 'delete_activity_step',
    description: 'Delete one step from a user-owned Kwilt To-do.',
    scope: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        activity_id: { type: 'string' },
        step_id: { type: 'string' },
        idempotency_key: IDEMPOTENCY_PROPERTY,
      },
      required: ['activity_id', 'step_id'],
    },
    annotations: deleteAnnotations('Delete To-do Step'),
  },
  {
    name: 'reorder_activity_steps',
    description: 'Reorder steps on a user-owned Kwilt To-do. Listed step ids are placed first; omitted existing steps are appended in their previous order.',
    scope: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        activity_id: { type: 'string' },
        idempotency_key: IDEMPOTENCY_PROPERTY,
        step_ids: { type: 'array', items: { type: 'string' } },
      },
      required: ['activity_id', 'step_ids'],
    },
    annotations: writeAnnotations('Reorder To-do Steps'),
  },
  {
    name: 'mark_activity_done',
    description: 'Mark a user-owned Kwilt To-do done.',
    scope: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        activity_id: { type: 'string' },
        idempotency_key: IDEMPOTENCY_PROPERTY,
      },
      required: ['activity_id'],
    },
    annotations: writeAnnotations('Mark To-do Done'),
  },
  {
    name: 'set_focus_today',
    description: "Schedule a user-owned Kwilt To-do for today's focus.",
    scope: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        activity_id: { type: 'string' },
        idempotency_key: IDEMPOTENCY_PROPERTY,
      },
      required: ['activity_id'],
    },
    annotations: writeAnnotations('Set Focus Today'),
  },
  {
    name: 'delete_activity',
    description: 'Delete a user-owned Kwilt To-do using the same recoverable delete behavior as the Kwilt app.',
    scope: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        activity_id: { type: 'string' },
        idempotency_key: IDEMPOTENCY_PROPERTY,
      },
      required: ['activity_id'],
    },
    annotations: deleteAnnotations('Delete To-do'),
  },
  {
    name: 'update_chapter_user_note',
    description: "Update the authenticated user's private note on an existing Kwilt Chapter.",
    scope: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        chapter_id: { type: 'string' },
        idempotency_key: IDEMPOTENCY_PROPERTY,
        note: { type: 'string' },
      },
      required: ['chapter_id', 'note'],
    },
    annotations: writeAnnotations('Update Chapter Note'),
  },
];

const LEGACY_EXTERNAL_MCP_TOOLS = [
  ...LEGACY_EXTERNAL_MCP_READ_TOOLS,
  ...LEGACY_EXTERNAL_MCP_WRITE_TOOLS,
];

function strictExternalSchema(schema: JsonObject): JsonObject {
  const result = Object.fromEntries(Object.entries(schema).map(([key, value]) => {
    if (key === 'properties' && value && typeof value === 'object' && !Array.isArray(value)) {
      return [key, Object.fromEntries(Object.entries(value).map(([name, child]) => [
        name,
        child && typeof child === 'object' && !Array.isArray(child) ? strictExternalSchema(child as JsonObject) : child,
      ]))];
    }
    if (key === 'items' && value && typeof value === 'object' && !Array.isArray(value)) {
      return [key, strictExternalSchema(value as JsonObject)];
    }
    if ((key === 'oneOf' || key === 'anyOf') && Array.isArray(value)) {
      return [key, value.map((child) => child && typeof child === 'object' && !Array.isArray(child)
        ? strictExternalSchema(child as JsonObject)
        : child)];
    }
    return [key, value];
  })) as JsonObject;
  if (schema.type === 'object') result.additionalProperties = false;
  return result;
}

function requireStableWriteRequestId(schema: JsonObject): JsonObject {
  const required = Array.isArray(schema.required)
    ? schema.required.filter((value): value is string => typeof value === 'string')
    : [];
  return {
    ...schema,
    properties: {
      ...(schema.properties && typeof schema.properties === 'object' && !Array.isArray(schema.properties)
        ? schema.properties as JsonObject
        : {}),
      idempotency_key: IDEMPOTENCY_PROPERTY,
    },
    required: Array.from(new Set([...required, 'idempotency_key'])),
  };
}

const projectedActions = projectExternalActionCatalog({
  manifest: KWILT_CAPABILITY_MANIFEST,
  serverRegistrations: SERVER_TOOL_PROVIDER_REGISTRATIONS,
  externalRegistrations: EXTERNAL_ACTION_REGISTRATIONS,
  availableScopes: [
    'life.read', 'life.write',
    'household.read', 'household.write',
    'money.read', 'money.write',
    'food.read', 'food.write',
  ],
});

export const EXTERNAL_MCP_CONTROL_COVERAGE = projectExternalControlCoverage({
  manifest: KWILT_CAPABILITY_MANIFEST,
  serverRegistrations: SERVER_TOOL_PROVIDER_REGISTRATIONS,
  externalRegistrations: EXTERNAL_ACTION_REGISTRATIONS,
  scopeByOwner: KWILT_EXTERNAL_CONTROL_SCOPE,
  nonApplicableOperationIds: ['general.answer', 'general.answer_with_context'],
});
const legacyToolByName = new Map(LEGACY_EXTERNAL_MCP_TOOLS.map((tool) => [tool.name, tool] as const));

const EXTERNAL_STRUCTURED_OUTPUT_SCHEMA: JsonObject = {
  type: 'object',
  additionalProperties: true,
};

function canonicalExternalTool(action: (typeof projectedActions)[number]): ExternalMcpToolDefinition {
  return {
    name: action.canonicalName,
    description: action.description,
    scope: action.effect === 'write' ? 'write' as const : 'read' as const,
    inputSchema: action.effect === 'write'
      ? requireStableWriteRequestId(strictExternalSchema(action.inputSchema as JsonObject))
      : strictExternalSchema(action.inputSchema as JsonObject),
    outputSchema: EXTERNAL_STRUCTURED_OUTPUT_SCHEMA,
    annotations: action.annotations,
    canonicalName: action.canonicalName,
    operationId: action.operationId,
    toolId: action.toolId,
    requiredScopes: [...action.requiredScopes],
    redactionPolicy: action.redactionPolicy,
    compatibilityAlias: null,
  };
}

const canonicalToolByName = new Map(projectedActions.map((action) => {
  const tool = canonicalExternalTool(action);
  return [tool.name, tool] as const;
}));
const compatibilityToolByName = new Map<string, ExternalMcpToolDefinition>();
for (const action of projectedActions) {
  const canonical = canonicalToolByName.get(action.canonicalName);
  if (!canonical) throw new Error(`Missing canonical external MCP tool: ${action.canonicalName}`);
  for (const compatibilityAlias of action.compatibilityAliases) {
    const legacy = legacyToolByName.get(compatibilityAlias.name);
    if (!legacy) throw new Error(`Missing external MCP compatibility schema: ${compatibilityAlias.name}`);
    if (legacy.scope !== canonical.scope) throw new Error(`External MCP scope drift: ${compatibilityAlias.name}`);
    compatibilityToolByName.set(compatibilityAlias.name, {
      ...canonical,
      ...legacy,
      inputSchema: canonical.scope === 'write'
        ? requireStableWriteRequestId(strictExternalSchema(legacy.inputSchema))
        : strictExternalSchema(legacy.inputSchema),
      outputSchema: EXTERNAL_STRUCTURED_OUTPUT_SCHEMA,
      annotations: action.annotations,
      compatibilityAlias,
    });
  }
}

export const EXTERNAL_MCP_ACTION_CATALOG: readonly ExternalMcpToolDefinition[] = projectedActions.map((action) => {
  const compatibilityAlias = action.compatibilityAliases[0];
  return compatibilityAlias
    ? compatibilityToolByName.get(compatibilityAlias.name)!
    : canonicalToolByName.get(action.canonicalName)!;
});

export function resolveExternalMcpTool(name: string): ExternalMcpToolDefinition | null {
  return canonicalToolByName.get(name) ?? compatibilityToolByName.get(name) ?? null;
}

export const EXTERNAL_MCP_READ_TOOLS = EXTERNAL_MCP_ACTION_CATALOG.filter((tool) => tool.scope === 'read');
export const EXTERNAL_MCP_WRITE_TOOLS = EXTERNAL_MCP_ACTION_CATALOG.filter((tool) => tool.scope === 'write');

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function normalizeExternalWriteRequestId(value: unknown): string | null {
  const requestId = asString(value);
  return requestId && requestId.length >= 8 && requestId.length <= 200 ? requestId : null;
}

function asInt(value: unknown): number | null {
  const numberValue = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(numberValue) ? Math.floor(numberValue) : null;
}

function asBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.trim().toLowerCase() === 'true';
  return false;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toJsonObject(value: unknown): JsonObject {
  return asRecord(value) ? (value as JsonObject) : {};
}

function summarizeActivitySteps(value: unknown): JsonObject[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw) => {
      const step = asRecord(raw);
      const id = asString(step?.id);
      const title = asString(step?.title);
      if (!id || !title) return null;
      const summary: JsonObject = {
        id,
        title,
      };
      const completedAt = asString(step?.completedAt);
      if (completedAt) summary.completed_at = completedAt;
      if (typeof step?.isOptional === 'boolean') summary.is_optional = step.isOptional;
      const orderIndex = asInt(step?.orderIndex);
      if (orderIndex !== null) summary.order_index = orderIndex;
      return summary;
    })
    .filter((step): step is JsonObject => !!step);
}

export function normalizeListRecentActivitiesArgs(raw: unknown): { days: number; includeRich: boolean } {
  const args = asRecord(raw) ?? {};
  return {
    days: clamp(asInt(args.days) ?? 7, 1, 90),
    includeRich: asBoolean(args.include_rich),
  };
}

const GOAL_STATUSES = new Set(['planned', 'in_progress', 'completed', 'archived']);
const DEFAULT_GOAL_STATUSES = ['planned', 'in_progress'];

export function normalizeListGoalsArgs(raw: unknown): { arcId: string | null; statuses: string[]; limit: number } {
  const args = asRecord(raw) ?? {};
  const rawStatuses = Array.isArray(args.status)
    ? args.status
    : asString(args.status)
      ? [args.status]
      : [];
  const statuses = rawStatuses
    .map(asString)
    .filter((status): status is string => !!status && GOAL_STATUSES.has(status));

  return {
    arcId: asString(args.arc_id),
    statuses: statuses.length > 0 ? statuses : DEFAULT_GOAL_STATUSES,
    limit: clamp(asInt(args.limit) ?? 50, 1, 100),
  };
}

export function normalizeGetArcArgs(raw: unknown): { arcId: string | null } {
  const args = asRecord(raw) ?? {};
  return { arcId: asString(args.arc_id) };
}

export function normalizeGetGoalArgs(raw: unknown): { goalId: string | null } {
  const args = asRecord(raw) ?? {};
  return { goalId: asString(args.goal_id) };
}

export function summarizeArc(raw: unknown): JsonObject {
  const arc = asRecord(raw) ?? {};
  const identity = asRecord(arc.identity);
  return {
    id: asString(arc.id) ?? '',
    name: asString(arc.name) ?? 'Untitled Arc',
    status: asString(arc.status) ?? 'active',
    identity_statement: asString(identity?.statement),
    updated_at: asString(arc.updatedAt) ?? asString(arc.updated_at),
  };
}

export function summarizeGoal(raw: unknown): JsonObject {
  const goal = asRecord(raw) ?? {};
  return {
    id: asString(goal.id) ?? '',
    arc_id: asString(goal.arcId),
    title: asString(goal.title) ?? 'Untitled Goal',
    status: asString(goal.status) ?? 'planned',
    force_intent: toJsonObject(goal.forceIntent),
    updated_at: asString(goal.updatedAt) ?? asString(goal.updated_at),
  };
}

export function summarizeActivity(raw: unknown, options: { includeRich: boolean }): JsonObject {
  const activity = asRecord(raw) ?? {};
  const summary: JsonObject = {
    id: asString(activity.id) ?? '',
    goal_id: asString(activity.goalId),
    title: asString(activity.title) ?? 'Untitled Activity',
    status: asString(activity.status) ?? 'planned',
    type: asString(activity.type) ?? 'task',
    scheduled_date: asString(activity.scheduledDate),
    completed_at: asString(activity.completedAt),
    updated_at: asString(activity.updatedAt) ?? asString(activity.updated_at),
  };

  if (options.includeRich) {
    summary.notes = asString(activity.notes);
    summary.tags = Array.isArray(activity.tags) ? activity.tags.map(asString).filter((tag): tag is string => !!tag) : [];
    summary.force_actual = toJsonObject(activity.forceActual);
    summary.steps = summarizeActivitySteps(activity.steps);
  }

  return summary;
}

export function summarizeChapter(raw: unknown): JsonObject {
  const chapter = asRecord(raw) ?? {};
  const output = asRecord(chapter.output_json);
  return {
    id: asString(chapter.id) ?? '',
    period_start: asString(chapter.period_start),
    period_end: asString(chapter.period_end),
    period_key: asString(chapter.period_key),
    title: asString(output?.title),
    narrative: asString(output?.narrative),
    updated_at: asString(chapter.updated_at),
  };
}

export function summarizeShowUpStatus(raw: unknown): JsonObject {
  const status = asRecord(raw) ?? {};
  const repairUntil = asInt(status.eligible_repair_until_ms);
  return {
    last_show_up_date: asString(status.last_show_up_date),
    current_show_up_streak: asInt(status.current_show_up_streak) ?? 0,
    current_covered_show_up_streak: asInt(status.current_covered_show_up_streak) ?? 0,
    repair_window_active: repairUntil != null && repairUntil > Date.now(),
  };
}

export function summarizeCurrentAccount(raw: unknown): JsonObject {
  const user = asRecord(raw) ?? {};
  const identities = Array.isArray(user.identities)
    ? user.identities
      .map((identity) => asString(asRecord(identity)?.provider))
      .filter((provider): provider is string => Boolean(provider))
    : [];

  return {
    user_id: asString(user.id) ?? '',
    email: asString(user.email),
    phone: asString(user.phone),
    providers: Array.from(new Set(identities)),
  };
}
