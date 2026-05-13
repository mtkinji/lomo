type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

export type ExternalMcpToolDefinition = {
  name: string;
  description: string;
  inputSchema: JsonObject;
  annotations: {
    readOnlyHint: boolean;
    destructiveHint: boolean;
    openWorldHint: boolean;
  };
};

const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
};

export const EXTERNAL_MCP_READ_TOOLS: ExternalMcpToolDefinition[] = [
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
    annotations: READ_ONLY_ANNOTATIONS,
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
    annotations: READ_ONLY_ANNOTATIONS,
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
    annotations: READ_ONLY_ANNOTATIONS,
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
    annotations: READ_ONLY_ANNOTATIONS,
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
    annotations: READ_ONLY_ANNOTATIONS,
  },
  {
    name: 'get_current_chapter',
    description: 'Get the latest ready Kwilt Chapter narrative for the user.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    annotations: READ_ONLY_ANNOTATIONS,
  },
  {
    name: 'get_show_up_status',
    description: "Get the user's current Kwilt show-up streak status.",
    inputSchema: {
      type: 'object',
      properties: {},
    },
    annotations: READ_ONLY_ANNOTATIONS,
  },
];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
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
