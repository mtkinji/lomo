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
  selected: boolean;
  contributor: SharedMealCartPerson;
  supporters: SharedMealCartPerson[];
  viewerReacted: boolean;
  canReact: boolean;
  canWithdraw: boolean;
};

export type SharedMealCartProjection = {
  planId: string | null;
  householdId: string;
  version: number | null;
  state: 'draft' | 'finalized' | null;
  viewer: {
    personId: string;
    role: 'owner' | 'caregiver' | 'child';
    canAdd: boolean;
    canSettle: boolean;
  };
  candidates: SharedMealCartCandidate[];
};

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
    || typeof viewer.canAdd !== 'boolean' || typeof viewer.canSettle !== 'boolean') {
    throw new Error('Invalid shared Meal Cart projection.');
  }
  const candidates = value.candidates.map((candidateValue) => {
    if (!isRecord(candidateValue) || typeof candidateValue.id !== 'string'
      || !['recipe', 'meal_note'].includes(String(candidateValue.kind))
      || typeof candidateValue.title !== 'string' || !Number.isInteger(candidateValue.position)
      || !Array.isArray(candidateValue.supporters) || typeof candidateValue.canWithdraw !== 'boolean'
      || 'voteCount' in candidateValue || 'rank' in candidateValue) {
      throw new Error('Invalid shared Meal Cart projection.');
    }
    const supporters = candidateValue.supporters.map(parsePerson);
    return {
      id: candidateValue.id,
      kind: candidateValue.kind as SharedMealCartCandidate['kind'],
      title: candidateValue.title,
      recipeSnapshot: isRecord(candidateValue.recipeSnapshot) ? candidateValue.recipeSnapshot : null,
      position: Number(candidateValue.position),
      selected: typeof candidateValue.selected === 'boolean' ? candidateValue.selected : state === 'draft',
      contributor: parsePerson(candidateValue.contributor),
      supporters,
      viewerReacted: supporters.some((person) => person.personId === viewer.personId),
      canReact: state === 'draft' && Boolean(viewer.canAdd),
      canWithdraw: candidateValue.canWithdraw,
    };
  }).sort((a, b) => a.position - b.position);
  return {
    planId,
    householdId: value.householdId,
    version,
    state,
    viewer: {
      personId: viewer.personId,
      role: role as SharedMealCartProjection['viewer']['role'],
      canAdd: viewer.canAdd,
      canSettle: viewer.canSettle,
    },
    candidates,
  };
}
