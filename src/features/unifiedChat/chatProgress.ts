import type { UnifiedChatCapabilityId } from './requestPolicy';

export type UnifiedChatProgressPhase = 'understanding' | 'checking' | 'drafting';

const SINGLE_CAPABILITY_CHECKING_COPY: Record<UnifiedChatCapabilityId, string> = {
  account: 'Checking your account',
  arcs: 'Checking your Arcs',
  chapters: 'Checking your Chapters',
  goals: 'Checking your goals',
  money: 'Checking your money',
  navigation: 'Checking where to go',
  notifications: 'Checking your notifications',
  plan: 'Checking your plan',
  profile: 'Checking your profile',
  relationships: 'Checking what you shared',
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
  if (participatingCapabilities.length === 1) {
    return SINGLE_CAPABILITY_CHECKING_COPY[participatingCapabilities[0]!] ?? 'Checking what matters';
  }
  return 'Checking what matters';
}
