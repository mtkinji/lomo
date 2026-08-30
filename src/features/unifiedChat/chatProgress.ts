import type { UnifiedChatCapabilityId } from './requestPolicy';

export type UnifiedChatProgressPhase = 'understanding' | 'checking' | 'analyzing' | 'drafting';

const EVIDENCE_TYPE_LABELS: Record<string, [string, string]> = {
  money_transaction: ['transaction', 'transactions'],
  money_category: ['budget', 'budgets'],
  activity: ['to-do', 'to-dos'],
  goal: ['goal', 'goals'],
  chapter: ['Chapter', 'Chapters'],
  arc: ['Arc', 'Arcs'],
};

export function getEvidenceProgressCopy(
  evidence: readonly { object: { type: string } }[],
): string {
  if (evidence.length === 0) return 'No relevant Kwilt records found';
  const counts = new Map<string, number>();
  for (const item of evidence) counts.set(item.object.type, (counts.get(item.object.type) ?? 0) + 1);
  const named = [...counts.entries()].map(([type, count]) => {
    const labels = EVIDENCE_TYPE_LABELS[type];
    return labels ? `${count} ${count === 1 ? labels[0] : labels[1]}` : null;
  }).filter((item): item is string => Boolean(item));
  if (named.length > 0 && named.length <= 2 && named.length === counts.size) {
    return `Reviewing ${named.join(' and ')}`;
  }
  return `Reviewing ${evidence.length} Kwilt ${evidence.length === 1 ? 'record' : 'records'}`;
}

const SINGLE_CAPABILITY_CHECKING_COPY: Record<UnifiedChatCapabilityId, string> = {
  account: 'Checking your account',
  arcs: 'Checking your Arcs',
  chapters: 'Checking your Chapters',
  chores: 'Checking your chores',
  goals: 'Checking your goals',
  household: 'Checking your Household',
  money: 'Checking your money',
  meal_planning: 'Checking your meals',
  groceries: 'Checking your groceries',
  savings: 'Checking Grocery savings',
  navigation: 'Checking where to go',
  notifications: 'Checking your notifications',
  plan: 'Checking your plan',
  profile: 'Checking your profile',
  relationships: 'Checking what you shared',
  recipes: 'Checking your recipes',
  screenTime: 'Checking Screen Time',
  todos: 'Checking your to-dos',
};

export function getUnifiedChatProgressCopy({
  phase,
  participatingCapabilities,
}: {
  phase: UnifiedChatProgressPhase;
  participatingCapabilities: readonly UnifiedChatCapabilityId[];
}): string {
  if (phase === 'understanding') return 'Understanding your request';
  if (phase === 'drafting') return 'Drafting your response';
  if (phase === 'analyzing') {
    return 'Comparing what Kwilt found';
  }
  if (participatingCapabilities.length === 1) {
    return SINGLE_CAPABILITY_CHECKING_COPY[participatingCapabilities[0]!] ?? 'Checking what matters';
  }
  return 'Checking what matters';
}
