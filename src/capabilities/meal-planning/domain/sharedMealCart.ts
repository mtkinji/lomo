export type SharedMealCartPerson = {
  personId: string;
  displayName: string;
  avatarUrl: string | null;
};

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
  contributor: SharedMealCartPerson;
  supporters: SharedMealCartPerson[];
  viewerReacted: boolean;
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
  reacted: boolean,
): SharedMealCartProjection {
  return {
    ...cart,
    candidates: cart.candidates.map((candidate) => {
      if (candidate.id !== candidateId || candidate.viewerReacted === reacted) return candidate;
      return {
        ...candidate,
        viewerReacted: reacted,
        voteCount: Math.max(0, candidate.voteCount + (reacted ? 1 : -1)),
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
      || typeof candidateValue.canMarkMade !== 'boolean' || !Number.isInteger(candidateValue.voteCount)) {
      throw new Error('Invalid shared Meal Cart projection.');
    }
    const supporters = candidateValue.supporters.map(parsePerson);
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
      contributor: parsePerson(candidateValue.contributor),
      supporters,
      viewerReacted: typeof candidateValue.viewerReacted === 'boolean' ? candidateValue.viewerReacted : supporters.some((person) => person.personId === viewer.personId),
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
