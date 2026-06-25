import type {
  ActivityDifficulty,
  ActivityRepeatRule,
  ActivityType,
} from '../domain/types';

export type NormalizedActivityAiEnrichment = {
  notes?: string;
  tags?: string[];
  goalId?: string | null;
  areaId?: string | null;
  type?: ActivityType;
  reminderAt?: string | null;
  scheduledDate?: string | null;
  repeatRule?: ActivityRepeatRule | null;
  steps?: Array<{ title: string }>;
  estimateMinutes?: number | null;
  priority?: 1 | 2 | 3 | null;
  difficulty?: ActivityDifficulty;
};

export type NormalizeActivityAiEnrichmentResponseOptions = {
  validGoalIds?: ReadonlySet<string>;
  validAreaIds?: ReadonlySet<string>;
  validActivityTypes?: readonly ActivityType[];
  validRepeatRules?: readonly ActivityRepeatRule[];
};

const DEFAULT_VALID_ACTIVITY_TYPES: readonly ActivityType[] = [
  'task',
  'checklist',
  'shopping_list',
  'instructions',
  'plan',
];

const DEFAULT_VALID_REPEAT_RULES: readonly ActivityRepeatRule[] = [
  'daily',
  'weekly',
  'weekdays',
  'monthly',
  'yearly',
];

const VALID_DIFFICULTIES: readonly ActivityDifficulty[] = [
  'very_easy',
  'easy',
  'medium',
  'hard',
  'very_hard',
];

const EMPTY_ID_SET: ReadonlySet<string> = new Set<string>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeActivityAiEnrichmentResponse(
  input: unknown,
  options: NormalizeActivityAiEnrichmentResponseOptions = {},
): NormalizedActivityAiEnrichment | null {
  if (!isRecord(input)) return null;

  const parsed = input;
  const validGoalIds = options.validGoalIds ?? EMPTY_ID_SET;
  const validAreaIds = options.validAreaIds ?? EMPTY_ID_SET;
  const validActivityTypes = options.validActivityTypes ?? DEFAULT_VALID_ACTIVITY_TYPES;
  const validRepeatRules = options.validRepeatRules ?? DEFAULT_VALID_REPEAT_RULES;
  const normalized: NormalizedActivityAiEnrichment = {};

  if (typeof parsed.notes === 'string' && parsed.notes.trim().length > 0) {
    normalized.notes = parsed.notes.trim();
  }

  if (Array.isArray(parsed.tags)) {
    const tags = parsed.tags
      .map((tag) => String(tag ?? '').trim())
      .filter(Boolean)
      .slice(0, 5);
    if (tags.length > 0) normalized.tags = tags;
  }

  if (typeof parsed.goalId === 'string' && validGoalIds.has(parsed.goalId)) {
    normalized.goalId = parsed.goalId;
  } else if (parsed.goalId === null) {
    normalized.goalId = null;
  }

  if (typeof parsed.areaId === 'string' && validAreaIds.has(parsed.areaId)) {
    normalized.areaId = parsed.areaId;
  } else if (parsed.areaId === null) {
    normalized.areaId = null;
  }

  if (typeof parsed.type === 'string' && validActivityTypes.includes(parsed.type as ActivityType)) {
    normalized.type = parsed.type as ActivityType;
  }

  if (typeof parsed.reminderAt === 'string' && Number.isFinite(Date.parse(parsed.reminderAt))) {
    normalized.reminderAt = parsed.reminderAt.trim();
  } else if (parsed.reminderAt === null) {
    normalized.reminderAt = null;
  }

  if (typeof parsed.scheduledDate === 'string' && Number.isFinite(Date.parse(parsed.scheduledDate))) {
    normalized.scheduledDate = parsed.scheduledDate.trim();
  } else if (parsed.scheduledDate === null) {
    normalized.scheduledDate = null;
  }

  if (
    typeof parsed.repeatRule === 'string' &&
    validRepeatRules.includes(parsed.repeatRule as ActivityRepeatRule)
  ) {
    normalized.repeatRule = parsed.repeatRule as ActivityRepeatRule;
  } else if (parsed.repeatRule === null) {
    normalized.repeatRule = null;
  }

  if (Array.isArray(parsed.steps)) {
    const steps = parsed.steps
      .map((step) => ({
        title: String(isRecord(step) ? step.title ?? '' : '').trim(),
      }))
      .filter((step) => step.title.length > 0)
      .slice(0, 6);
    if (steps.length > 0) normalized.steps = steps;
  }

  if (typeof parsed.estimateMinutes === 'number' && Number.isFinite(parsed.estimateMinutes)) {
    normalized.estimateMinutes = Math.max(5, Math.min(180, Math.round(parsed.estimateMinutes)));
  }

  if (parsed.priority === 1 || parsed.priority === 2 || parsed.priority === 3) {
    normalized.priority = parsed.priority;
  }

  if (typeof parsed.difficulty === 'string' && VALID_DIFFICULTIES.includes(parsed.difficulty as ActivityDifficulty)) {
    normalized.difficulty = parsed.difficulty as ActivityDifficulty;
  }

  return Object.keys(normalized).length > 0 ? normalized : null;
}
