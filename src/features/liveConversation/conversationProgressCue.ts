import type { UnifiedChatRequestClass } from '../unifiedChat/requestPolicy';

export type ConversationProgressFamily =
  | 'current_lookup'
  | 'kwilt_lookup'
  | 'multi_source'
  | 'prepare_review'
  | 'compare_or_calculate'
  | 'thoughtful_reasoning'
  | 'retry_or_recover'
  | 'general_work';

export type ConversationProgressStyleId = 'attentive_progress' | 'thoughtful_progress';

type ConversationProgressCue = {
  family: ConversationProgressFamily;
  text: string;
  assetFilename: string;
  styleId: ConversationProgressStyleId;
};

const FAMILY_ASSET_SLUG: Record<ConversationProgressFamily, string> = {
  current_lookup: 'current-lookup',
  kwilt_lookup: 'kwilt-lookup',
  multi_source: 'multi-source',
  prepare_review: 'prepare-review',
  compare_or_calculate: 'compare-calculate',
  thoughtful_reasoning: 'thoughtful-reasoning',
  retry_or_recover: 'retry-recover',
  general_work: 'general-work',
};

const cue = (
  family: ConversationProgressFamily,
  sequence: 1 | 2 | 3,
  text: string,
  styleId: ConversationProgressStyleId = 'attentive_progress',
): ConversationProgressCue => ({
  family,
  text,
  assetFilename: `${FAMILY_ASSET_SLUG[family]}-${String(sequence).padStart(2, '0')}.mp3`,
  styleId,
});

export const CONVERSATION_PROGRESS_CUES = {
  current_lookup_01: cue('current_lookup', 1, 'Checking the latest.'),
  current_lookup_02: cue('current_lookup', 2, 'Looking that up now.'),
  current_lookup_03: cue('current_lookup', 3, 'Getting the current details.'),
  kwilt_lookup_01: cue('kwilt_lookup', 1, 'Checking what’s in Kwilt.'),
  kwilt_lookup_02: cue('kwilt_lookup', 2, 'Looking in Kwilt now.'),
  kwilt_lookup_03: cue('kwilt_lookup', 3, 'Pulling up the details.'),
  multi_source_01: cue('multi_source', 1, 'Checking a few things.'),
  multi_source_02: cue('multi_source', 2, 'Putting that together.'),
  multi_source_03: cue('multi_source', 3, 'Looking across the details.'),
  prepare_review_01: cue('prepare_review', 1, 'Preparing that for review.'),
  prepare_review_02: cue('prepare_review', 2, 'Getting that ready.'),
  prepare_review_03: cue('prepare_review', 3, 'Preparing the proposed change.'),
  compare_or_calculate_01: cue('compare_or_calculate', 1, 'Working that out.'),
  compare_or_calculate_02: cue('compare_or_calculate', 2, 'Comparing those now.'),
  compare_or_calculate_03: cue('compare_or_calculate', 3, 'Checking how those compare.'),
  thoughtful_reasoning_01: cue(
    'thoughtful_reasoning',
    1,
    'Hmm. Let me think that through.',
    'thoughtful_progress',
  ),
  thoughtful_reasoning_02: cue(
    'thoughtful_reasoning',
    2,
    'That needs a little thought.',
    'thoughtful_progress',
  ),
  thoughtful_reasoning_03: cue(
    'thoughtful_reasoning',
    3,
    'Let me work through that.',
    'thoughtful_progress',
  ),
  retry_or_recover_01: cue('retry_or_recover', 1, 'Trying that again.'),
  retry_or_recover_02: cue('retry_or_recover', 2, 'Taking another pass.'),
  retry_or_recover_03: cue('retry_or_recover', 3, 'Giving that another try.'),
  general_work_01: cue('general_work', 1, 'Working on that.'),
  general_work_02: cue('general_work', 2, 'Taking a closer look.'),
  general_work_03: cue('general_work', 3, 'Getting that together.'),
} as const;

export type ConversationProgressCueId = keyof typeof CONVERSATION_PROGRESS_CUES;

export type ConversationProgressWorkFacts = {
  planningStrategy: 'fast_direct' | 'full';
  requestClass: UnifiedChatRequestClass;
  capabilityIds: readonly string[];
  informationNeed: 'stable' | 'current';
  workKind?: 'compare_or_calculate' | 'thoughtful_reasoning';
  recoveryKind?: 'retry' | 'fallback';
};

export function resolveConversationProgressFamily(
  input: ConversationProgressWorkFacts,
): ConversationProgressFamily | null {
  if (input.planningStrategy === 'fast_direct' || input.requestClass === 'better_served_elsewhere') {
    return null;
  }
  if (input.recoveryKind) return 'retry_or_recover';
  if (input.requestClass === 'capability_action') return 'prepare_review';
  if (input.informationNeed === 'current') return 'current_lookup';
  if (input.capabilityIds.length > 1) return 'multi_source';
  if (input.capabilityIds.length === 1) return 'kwilt_lookup';
  if (input.workKind === 'compare_or_calculate') return 'compare_or_calculate';
  if (input.workKind === 'thoughtful_reasoning') return 'thoughtful_reasoning';
  return 'general_work';
}

function stableHash(value: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

export function chooseConversationProgressCue(input: {
  family: ConversationProgressFamily;
  turnId: string;
  recentCueIds: readonly string[];
}): ConversationProgressCueId {
  const familyIds = (Object.keys(CONVERSATION_PROGRESS_CUES) as ConversationProgressCueId[])
    .filter((id) => CONVERSATION_PROGRESS_CUES[id].family === input.family);
  const excluded = new Set(input.recentCueIds
    .filter((id): id is ConversationProgressCueId => (
      id in CONVERSATION_PROGRESS_CUES &&
      CONVERSATION_PROGRESS_CUES[id as ConversationProgressCueId].family === input.family
    ))
    .slice(-2));
  const start = stableHash(input.turnId) % familyIds.length;
  for (let offset = 0; offset < familyIds.length; offset += 1) {
    const candidate = familyIds[(start + offset) % familyIds.length];
    if (!excluded.has(candidate)) return candidate;
  }
  return familyIds[start];
}
