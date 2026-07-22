import type { ActivityDifficulty, ActivityStatus, ActivityType } from '../../domain/types';
import type { UnifiedChatProposalStatus } from './runStateMachine';

export type ActivityMutationPatch = {
  title?: string;
  notes?: string | null;
  goalId?: string | null;
  type?: ActivityType;
  status?: ActivityStatus;
  tags?: string[];
  priority?: 1 | 2 | 3 | null;
  scheduledDate?: string | null;
  estimateMinutes?: number | null;
  difficulty?: ActivityDifficulty | null;
};

export type ActivityProposalOperation =
  | {
      type: 'create_activity';
      targetId: null;
      expectedUpdatedAt: null;
      payload: ActivityMutationPatch & { title: string };
    }
  | {
      type: 'update_activity';
      targetId: string;
      expectedUpdatedAt: string;
      payload: ActivityMutationPatch;
    };

export type ActivityActionResponse = {
  answer: string;
  proposal: {
    title: string;
    body: string;
    operation: ActivityProposalOperation;
  } | null;
};

export const ACTIVITY_ACTION_RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'kwilt_activity_action_response',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['answer', 'proposal'],
      properties: {
        answer: { type: 'string', minLength: 1, maxLength: 4000 },
        proposal: {
          type: ['object', 'null'],
          additionalProperties: false,
          required: ['title', 'body', 'operation'],
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 500 },
            body: { type: 'string', minLength: 1, maxLength: 2000 },
            operation: {
              type: 'object',
              additionalProperties: false,
              required: ['type', 'targetId', 'expectedUpdatedAt', 'payload'],
              properties: {
                type: { type: 'string', enum: ['create_activity', 'update_activity'] },
                targetId: { type: ['string', 'null'] },
                expectedUpdatedAt: { type: ['string', 'null'] },
                payload: {
                  type: 'object',
                  additionalProperties: false,
                  required: [
                    'title',
                    'notes',
                    'goalId',
                    'type',
                    'status',
                    'tags',
                    'priority',
                    'scheduledDate',
                    'estimateMinutes',
                    'difficulty',
                    'clearFields',
                  ],
                  properties: {
                    title: { type: ['string', 'null'], minLength: 1, maxLength: 240 },
                    notes: { type: ['string', 'null'], maxLength: 5000 },
                    goalId: { type: ['string', 'null'], maxLength: 200 },
                    type: {
                      type: ['string', 'null'],
                      enum: ['task', 'checklist', 'shopping_list', 'instructions', 'plan', null],
                    },
                    status: { type: ['string', 'null'], enum: ['planned', 'in_progress', 'done', 'skipped', 'cancelled', null] },
                    tags: {
                      type: ['array', 'null'],
                      maxItems: 20,
                      items: { type: 'string', minLength: 1, maxLength: 80 },
                    },
                    priority: { type: ['integer', 'null'], enum: [1, 2, 3, null] },
                    scheduledDate: {
                      type: ['string', 'null'],
                      pattern: '^\\d{4}-\\d{2}-\\d{2}$',
                    },
                    estimateMinutes: {
                      type: ['integer', 'null'],
                      minimum: 1,
                      maximum: 1440,
                    },
                    difficulty: { type: ['string', 'null'], enum: ['very_easy', 'easy', 'medium', 'hard', 'very_hard', null] },
                    clearFields: {
                      type: 'array',
                      maxItems: 7,
                      items: {
                        type: 'string',
                        enum: ['notes', 'goalId', 'tags', 'priority', 'scheduledDate', 'estimateMinutes', 'difficulty'],
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

const ALLOWED_PATCH_KEYS = new Set([
  'title',
  'notes',
  'goalId',
  'type',
  'status',
  'tags',
  'priority',
  'scheduledDate',
  'estimateMinutes',
  'difficulty',
]);
const CLEARABLE_PATCH_KEYS = new Set([
  'notes',
  'goalId',
  'tags',
  'priority',
  'scheduledDate',
  'estimateMinutes',
  'difficulty',
]);
const ACTIVITY_STATUSES = new Set<ActivityStatus>([
  'planned',
  'in_progress',
  'done',
  'skipped',
  'cancelled',
]);
const ACTIVITY_DIFFICULTIES = new Set<ActivityDifficulty>([
  'very_easy',
  'easy',
  'medium',
  'hard',
  'very_hard',
]);

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function boundedText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= max ? trimmed : null;
}

function nullableText(value: unknown, max: number): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  return value.length <= max ? value : undefined;
}

function isActivityType(value: unknown): value is ActivityType {
  return value === 'task' ||
    value === 'checklist' ||
    value === 'shopping_list' ||
    value === 'instructions' ||
    value === 'plan' ||
    (typeof value === 'string' && value.startsWith('custom:') && value.length <= 80);
}

export function parseActivityMutationPatch(value: unknown): ActivityMutationPatch | null {
  const input = record(value);
  if (!input || Object.keys(input).length === 0) return null;
  if (Object.keys(input).some((key) => !ALLOWED_PATCH_KEYS.has(key))) return null;
  const patch: ActivityMutationPatch = {};

  if ('title' in input) {
    const title = boundedText(input.title, 240);
    if (!title) return null;
    patch.title = title;
  }
  if ('notes' in input) {
    const notes = nullableText(input.notes, 5_000);
    if (notes === undefined) return null;
    patch.notes = notes;
  }
  if ('goalId' in input) {
    const goalId = nullableText(input.goalId, 200);
    if (goalId === undefined) return null;
    patch.goalId = goalId;
  }
  if ('type' in input) {
    if (!isActivityType(input.type)) return null;
    patch.type = input.type;
  }
  if ('status' in input) {
    if (typeof input.status !== 'string' || !ACTIVITY_STATUSES.has(input.status as ActivityStatus)) return null;
    patch.status = input.status as ActivityStatus;
  }
  if ('tags' in input) {
    if (!Array.isArray(input.tags) || input.tags.length > 20) return null;
    const tags = input.tags.map((tag) => boundedText(tag, 80));
    if (tags.some((tag) => tag == null)) return null;
    patch.tags = [...new Set(tags as string[])];
  }
  if ('priority' in input) {
    if (input.priority !== null && input.priority !== 1 && input.priority !== 2 && input.priority !== 3) return null;
    patch.priority = input.priority;
  }
  if ('scheduledDate' in input) {
    if (input.scheduledDate !== null &&
        (typeof input.scheduledDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.scheduledDate))) return null;
    patch.scheduledDate = input.scheduledDate;
  }
  if ('estimateMinutes' in input) {
    if (input.estimateMinutes !== null &&
        (typeof input.estimateMinutes !== 'number' || !Number.isInteger(input.estimateMinutes) || input.estimateMinutes < 1 || input.estimateMinutes > 1440)) return null;
    patch.estimateMinutes = input.estimateMinutes;
  }
  if ('difficulty' in input) {
    if (input.difficulty !== null &&
        (typeof input.difficulty !== 'string' || !ACTIVITY_DIFFICULTIES.has(input.difficulty as ActivityDifficulty))) return null;
    patch.difficulty = input.difficulty as ActivityDifficulty | null;
  }
  return patch;
}

export function parseActivityActionResponse(raw: string): ActivityActionResponse | null {
  try {
    const root = record(JSON.parse(raw));
    if (!root || Object.keys(root).some((key) => key !== 'answer' && key !== 'proposal')) return null;
    const answer = boundedText(root.answer, 4_000);
    if (!answer) return null;
    if (root.proposal === null) return { answer, proposal: null };
    const proposal = record(root.proposal);
    if (!proposal || Object.keys(proposal).some((key) => !['title', 'body', 'operation'].includes(key))) return null;
    const title = boundedText(proposal.title, 500);
    const body = boundedText(proposal.body, 2_000);
    const operation = record(proposal.operation);
    if (!title || !body || !operation ||
        Object.keys(operation).some((key) => !['type', 'targetId', 'expectedUpdatedAt', 'payload'].includes(key))) return null;
    const rawPayload = record(operation.payload);
    if (!rawPayload) return null;
    const allowedResponseKeys = new Set([...ALLOWED_PATCH_KEYS, 'clearFields']);
    if (Object.keys(rawPayload).some((key) => !allowedResponseKeys.has(key))) return null;
    const clearFields = rawPayload.clearFields === undefined
      ? []
      : Array.isArray(rawPayload.clearFields) && rawPayload.clearFields.every(
          (field) => typeof field === 'string' && CLEARABLE_PATCH_KEYS.has(field),
        )
        ? [...new Set(rawPayload.clearFields as string[])]
        : null;
    if (!clearFields) return null;
    const compactPayload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rawPayload)) {
      if (key === 'clearFields' || value === null) continue;
      compactPayload[key] = value;
    }
    for (const field of clearFields) {
      compactPayload[field] = field === 'tags' ? [] : null;
    }
    const payload = parseActivityMutationPatch(compactPayload);
    if (!payload) return null;

    if (operation.type === 'create_activity') {
      if (operation.targetId !== null || operation.expectedUpdatedAt !== null || !payload.title) return null;
      return {
        answer,
        proposal: {
          title,
          body,
          operation: { type: 'create_activity', targetId: null, expectedUpdatedAt: null, payload: { ...payload, title: payload.title } },
        },
      };
    }
    if (operation.type === 'update_activity') {
      const targetId = boundedText(operation.targetId, 200);
      const expectedUpdatedAt = boundedText(operation.expectedUpdatedAt, 100);
      if (!targetId || !expectedUpdatedAt || Number.isNaN(new Date(expectedUpdatedAt).getTime())) return null;
      return {
        answer,
        proposal: {
          title,
          body,
          operation: { type: 'update_activity', targetId, expectedUpdatedAt, payload },
        },
      };
    }
    return null;
  } catch {
    return null;
  }
}

export class ActivityProposalApprovalRequiredError extends Error {
  constructor(status: UnifiedChatProposalStatus) {
    super(`Activity proposal must be approved before apply; current status is ${status}.`);
    this.name = 'ActivityProposalApprovalRequiredError';
  }
}

export function assertActivityProposalCanApply(status: UnifiedChatProposalStatus): void {
  if (status !== 'approved') throw new ActivityProposalApprovalRequiredError(status);
}
