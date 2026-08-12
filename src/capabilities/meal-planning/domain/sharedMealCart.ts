export type SharedMealCartPerson = {
  personId: string;
  displayName: string;
  avatarUrl: string | null;
};

export const PLAN_POSITIVE_REACTION_OPTIONS = [
  { id: 'thumbs_up', emoji: '👍', label: 'Thumbs up' },
  { id: 'heart', emoji: '❤️', label: 'Love' },
  { id: 'yum', emoji: '😋', label: 'Yum' },
  { id: 'excited', emoji: '🤩', label: 'Excited' },
  { id: 'fire', emoji: '🔥', label: 'Fire' },
] as const;

export const PLAN_NEGATIVE_REACTION_OPTIONS = [
  { id: 'downvote', emoji: '👎', label: 'Thumbs down' },
  { id: 'uneasy', emoji: '😬', label: 'Not sure' },
  { id: 'gross', emoji: '🤢', label: 'Gross' },
  { id: 'nope', emoji: '🙅', label: 'Nope' },
  { id: 'dislike', emoji: '😖', label: 'Really not for me' },
] as const;

export const PLAN_HARD_PASS_REACTION = { id: 'hard_pass', emoji: '🚫', label: 'Hard pass' } as const;
export const PLAN_REACTION_OPTIONS = [
  ...PLAN_POSITIVE_REACTION_OPTIONS,
  ...PLAN_NEGATIVE_REACTION_OPTIONS,
  PLAN_HARD_PASS_REACTION,
] as const;

export type PlanPositiveReaction = typeof PLAN_POSITIVE_REACTION_OPTIONS[number]['id'];
export type PlanNegativeReaction = typeof PLAN_NEGATIVE_REACTION_OPTIONS[number]['id'];
export type PlanReaction = typeof PLAN_REACTION_OPTIONS[number]['id'];
export type PlanReactionCounts = Record<PlanPositiveReaction, number>
  & Partial<Record<PlanNegativeReaction | typeof PLAN_HARD_PASS_REACTION.id, number>>;
export type SharedMealCartSupporter = SharedMealCartPerson & { reaction: PlanReaction; reason?: string | null };

const PLAN_REACTION_IDS = new Set<string>(PLAN_REACTION_OPTIONS.map((reaction) => reaction.id));

export function isPlanReaction(value: unknown): value is PlanReaction {
  return typeof value === 'string' && PLAN_REACTION_IDS.has(value);
}

function emptyPlanReactionCounts(): PlanReactionCounts {
  return {
    thumbs_up: 0,
    heart: 0,
    yum: 0,
    excited: 0,
    fire: 0,
    downvote: 0,
    uneasy: 0,
    gross: 0,
    nope: 0,
    dislike: 0,
    hard_pass: 0,
  };
}

function isPositiveReaction(reaction: PlanReaction | null): reaction is PlanPositiveReaction {
  return PLAN_POSITIVE_REACTION_OPTIONS.some((option) => option.id === reaction);
}

function isNegativeReaction(reaction: PlanReaction | null): reaction is PlanNegativeReaction {
  return PLAN_NEGATIVE_REACTION_OPTIONS.some((option) => option.id === reaction);
}

function normalizeReactionReason(reaction: PlanReaction | null, reason?: string | null) {
  if (reaction !== PLAN_HARD_PASS_REACTION.id) return null;
  const normalized = reason?.trim().slice(0, 140) ?? '';
  return normalized || null;
}

export type SharedMealCartCandidate = {
  id: string;
  kind: 'recipe' | 'meal_note';
  title: string;
  recipeSnapshot: Record<string, unknown> | null;
  position: number;
  createdAt: string;
  lifecycle: 'idea' | 'sent' | 'ready';
  sentAt: string | null;
  missingItemCount: number | null;
  voteCount: number;
  downvoteCount: number;
  hardPassCount: number;
  requiresHardPassReview: boolean;
  reactionCounts: PlanReactionCounts;
  contributor: SharedMealCartPerson;
  supporters: SharedMealCartSupporter[];
  viewerReaction: PlanReaction | null;
  viewerReactionReason: string | null;
  canReact: boolean;
  canRemove: boolean;
  canMarkMade: boolean;
};

export type SharedMealCartProjection = {
  planId: string | null;
  householdId: string;
  version: number | null;
  state: 'draft' | 'finalized' | null;
  activeCount: number;
  groceryListId: string | null;
  viewer: {
    personId: string;
    role: 'owner' | 'caregiver' | 'child';
    canAdd: boolean;
    canManage: boolean;
  };
  candidates: SharedMealCartCandidate[];
};

export function optimisticallySetSharedMealReaction(
  cart: SharedMealCartProjection,
  candidateId: string,
  reaction: PlanReaction | null,
  reason?: string | null,
): SharedMealCartProjection {
  const normalizedReason = normalizeReactionReason(reaction, reason);
  return {
    ...cart,
    candidates: cart.candidates.map((candidate) => {
      if (candidate.id !== candidateId) return candidate;
      if (candidate.viewerReaction === reaction && candidate.viewerReactionReason === normalizedReason) return candidate;
      const reactionCounts = { ...candidate.reactionCounts };
      const reactionChanged = candidate.viewerReaction !== reaction;
      if (reactionChanged && candidate.viewerReaction) {
        reactionCounts[candidate.viewerReaction] = Math.max(0, (reactionCounts[candidate.viewerReaction] ?? 0) - 1);
      }
      if (reactionChanged && reaction) reactionCounts[reaction] = (reactionCounts[reaction] ?? 0) + 1;
      const positiveDelta = Number(isPositiveReaction(reaction)) - Number(isPositiveReaction(candidate.viewerReaction));
      const downvoteDelta = Number(isNegativeReaction(reaction)) - Number(isNegativeReaction(candidate.viewerReaction));
      const hardPassDelta = Number(reaction === 'hard_pass') - Number(candidate.viewerReaction === 'hard_pass');
      const hardPassCount = Math.max(0, candidate.hardPassCount + hardPassDelta);
      return {
        ...candidate,
        viewerReaction: reaction,
        reactionCounts,
        voteCount: Math.max(0, candidate.voteCount + positiveDelta),
        downvoteCount: Math.max(0, candidate.downvoteCount + downvoteDelta),
        hardPassCount,
        requiresHardPassReview: reaction === 'hard_pass'
          ? true
          : hardPassCount === 0
            ? false
            : candidate.requiresHardPassReview,
        viewerReactionReason: normalizedReason,
      };
    }),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parsePerson(value: unknown): SharedMealCartPerson {
  if (!isRecord(value) || typeof value.personId !== 'string' || typeof value.displayName !== 'string') {
    throw new Error('Invalid shared Meal Cart projection.');
  }
  return {
    personId: value.personId,
    displayName: value.displayName,
    avatarUrl: typeof value.avatarUrl === 'string' ? value.avatarUrl : null,
  };
}

function parseSupporter(value: unknown): SharedMealCartSupporter {
  const person = parsePerson(value);
  if (!isRecord(value) || !isPlanReaction(value.reaction)) {
    throw new Error('Invalid shared Meal Cart projection.');
  }
  return {
    ...person,
    reaction: value.reaction,
    reason: typeof value.reason === 'string' ? value.reason : null,
  };
}

function parseReactionCounts(value: unknown): PlanReactionCounts {
  if (!isRecord(value)) throw new Error('Invalid shared Meal Cart projection.');
  const counts = emptyPlanReactionCounts();
  for (const reaction of PLAN_REACTION_OPTIONS) {
    const count = value[reaction.id];
    if (count === undefined) {
      counts[reaction.id] = 0;
      continue;
    }
    if (!Number.isInteger(count) || Number(count) < 0) throw new Error('Invalid shared Meal Cart projection.');
    counts[reaction.id] = Number(count);
  }
  return counts;
}

export function parseSharedMealCartProjection(value: unknown): SharedMealCartProjection | null {
  if (value === null) return null;
  if (!isRecord(value) || !isRecord(value.viewer) || !Array.isArray(value.candidates)) {
    throw new Error('Invalid shared Meal Cart projection.');
  }
  const viewer = value.viewer;
  const planId = value.planId === null ? null : typeof value.planId === 'string' ? value.planId : undefined;
  const version = value.version === null ? null : Number.isInteger(value.version) ? Number(value.version) : undefined;
  const state = value.state === null || value.state === 'draft' || value.state === 'finalized' ? value.state : undefined;
  const role = viewer.role;
  if (planId === undefined || version === undefined || state === undefined || typeof value.householdId !== 'string'
    || typeof viewer.personId !== 'string' || !['owner', 'caregiver', 'child'].includes(String(role))
    || typeof viewer.canAdd !== 'boolean' || typeof viewer.canManage !== 'boolean'
    || !Number.isInteger(value.activeCount)) {
    throw new Error('Invalid shared Meal Cart projection.');
  }
  const candidates = value.candidates.map((candidateValue) => {
    if (!isRecord(candidateValue) || typeof candidateValue.id !== 'string'
      || !['recipe', 'meal_note'].includes(String(candidateValue.kind))
      || typeof candidateValue.title !== 'string' || !Number.isInteger(candidateValue.position)
      || typeof candidateValue.createdAt !== 'string' || !['idea', 'sent', 'ready'].includes(String(candidateValue.lifecycle))
      || !Array.isArray(candidateValue.supporters) || typeof candidateValue.canRemove !== 'boolean'
      || typeof candidateValue.canMarkMade !== 'boolean' || !Number.isInteger(candidateValue.voteCount)
      || !Number.isInteger(candidateValue.downvoteCount)) {
      throw new Error('Invalid shared Meal Cart projection.');
    }
    const supporters = candidateValue.supporters.map(parseSupporter);
    const viewerReaction = candidateValue.viewerReaction === null
      ? null
      : isPlanReaction(candidateValue.viewerReaction)
        ? candidateValue.viewerReaction
        : undefined;
    if (viewerReaction === undefined) throw new Error('Invalid shared Meal Cart projection.');
    return {
      id: candidateValue.id,
      kind: candidateValue.kind as SharedMealCartCandidate['kind'],
      title: candidateValue.title,
      recipeSnapshot: isRecord(candidateValue.recipeSnapshot) ? candidateValue.recipeSnapshot : null,
      position: Number(candidateValue.position),
      createdAt: candidateValue.createdAt,
      lifecycle: candidateValue.lifecycle as SharedMealCartCandidate['lifecycle'],
      sentAt: typeof candidateValue.sentAt === 'string' ? candidateValue.sentAt : null,
      missingItemCount: Number.isInteger(candidateValue.missingItemCount) ? Number(candidateValue.missingItemCount) : null,
      voteCount: Number(candidateValue.voteCount),
      downvoteCount: Number(candidateValue.downvoteCount),
      hardPassCount: Number.isInteger(candidateValue.hardPassCount) ? Number(candidateValue.hardPassCount) : 0,
      requiresHardPassReview: candidateValue.requiresHardPassReview === true,
      reactionCounts: parseReactionCounts(candidateValue.reactionCounts),
      contributor: parsePerson(candidateValue.contributor),
      supporters,
      viewerReaction,
      viewerReactionReason: typeof candidateValue.viewerReactionReason === 'string'
        ? candidateValue.viewerReactionReason
        : null,
      canReact: Boolean(candidateValue.canReact) && state === 'draft' && Boolean(viewer.canAdd),
      canRemove: candidateValue.canRemove,
      canMarkMade: candidateValue.canMarkMade,
    };
  });
  return {
    planId,
    householdId: value.householdId,
    version,
    state,
    activeCount: Number(value.activeCount),
    groceryListId: typeof value.groceryListId === 'string' ? value.groceryListId : null,
    viewer: {
      personId: viewer.personId,
      role: role as SharedMealCartProjection['viewer']['role'],
      canAdd: viewer.canAdd,
      canManage: viewer.canManage,
    },
    candidates,
  };
}
