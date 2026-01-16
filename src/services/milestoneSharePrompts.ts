export type MilestonePromptTier = 'TierA' | 'TierB' | 'TierC';

export type MilestoneShareKind = 'showup_streak';

export type MilestoneShareMeta = {
  kind: MilestoneShareKind;
  value: number;
  /**
   * Stable identifier for batching and queue updates.
   * Must be stable across object cloning.
   */
  key: string;
  tier: MilestonePromptTier;
  /**
   * True when this milestone represents a new personal best (PB).
   * PB is treated as TierA.
   */
  isPersonalBest?: boolean;
  /**
   * Set by the celebration queue batching logic to indicate this milestone is the
   * best candidate to receive an auto prompt (still subject to cooldown/session caps later).
   */
  wantsAutoPrompt?: boolean;
};

export function milestoneShareKey(kind: MilestoneShareKind, value: number): string {
  return `${kind}:${String(value)}`;
}

export function getShowUpStreakPromptTier(params: {
  days: number;
  isPersonalBest?: boolean;
}): MilestonePromptTier {
  const days = params.days;
  if (params.isPersonalBest) return 'TierA';

  // TierA: classic “big” milestones.
  if (days === 7 || days === 30 || days === 100 || days === 365) return 'TierA';

  // TierB: mid milestones + every 25 after 100 (excluding 100 which is TierA).
  if (days === 14 || days === 50) return 'TierB';
  if (days > 100 && days <= 365 && days % 25 === 0) return 'TierB';

  return 'TierC';
}

function tierScore(tier: MilestonePromptTier): number {
  switch (tier) {
    case 'TierA':
      return 3;
    case 'TierB':
      return 2;
    case 'TierC':
      return 1;
  }
}

/**
 * Compare two milestone share candidates to decide which should “win” if only one
 * can receive an auto prompt in a batch.
 *
 * Priority order:
 * - TierA > TierB > TierC
 * - PB > non-PB
 * - Higher value > lower value
 */
export function compareMilestoneShareCandidates(a: MilestoneShareMeta, b: MilestoneShareMeta): number {
  const tierDelta = tierScore(b.tier) - tierScore(a.tier);
  if (tierDelta !== 0) return tierDelta;

  const pbA = Boolean(a.isPersonalBest);
  const pbB = Boolean(b.isPersonalBest);
  if (pbA !== pbB) return pbB ? 1 : -1;

  if (a.value !== b.value) return b.value - a.value;

  return 0;
}


