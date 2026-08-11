import {
  CONVERSATION_PROGRESS_CUES,
  chooseConversationProgressCue,
  resolveConversationProgressFamily,
} from './conversationProgressCue';

describe('conversation progress cues', () => {
  it.each([
    [{ planningStrategy: 'fast_direct', requestClass: 'general', capabilityIds: [], informationNeed: 'stable' }, null],
    [{ planningStrategy: 'full', requestClass: 'general', capabilityIds: [], informationNeed: 'current' }, 'current_lookup'],
    [{ planningStrategy: 'full', requestClass: 'capability_question', capabilityIds: ['plan'], informationNeed: 'stable' }, 'kwilt_lookup'],
    [{ planningStrategy: 'full', requestClass: 'capability_question', capabilityIds: ['plan', 'goals'], informationNeed: 'stable' }, 'multi_source'],
    [{ planningStrategy: 'full', requestClass: 'capability_action', capabilityIds: ['todos'], informationNeed: 'stable' }, 'prepare_review'],
    [{ planningStrategy: 'full', requestClass: 'general', capabilityIds: [], informationNeed: 'stable', workKind: 'compare_or_calculate' }, 'compare_or_calculate'],
    [{ planningStrategy: 'full', requestClass: 'general', capabilityIds: [], informationNeed: 'stable', workKind: 'thoughtful_reasoning' }, 'thoughtful_reasoning'],
    [{ planningStrategy: 'full', requestClass: 'general', capabilityIds: [], informationNeed: 'stable', recoveryKind: 'retry' }, 'retry_or_recover'],
    [{ planningStrategy: 'full', requestClass: 'general', capabilityIds: [], informationNeed: 'stable' }, 'general_work'],
  ] as const)('maps authorized work to a truthful family', (input, expected) => {
    expect(resolveConversationProgressFamily(input)).toBe(expected);
  });

  it('keeps a fixed 24-phrase vocabulary with a rare thoughtful style', () => {
    expect(Object.values(CONVERSATION_PROGRESS_CUES).map((cue) => cue.text)).toEqual([
      'Checking the latest.',
      'Looking that up now.',
      'Getting the current details.',
      'Checking what’s in Kwilt.',
      'Looking in Kwilt now.',
      'Pulling up the details.',
      'Checking a few things.',
      'Putting that together.',
      'Looking across the details.',
      'Preparing that for review.',
      'Getting that ready.',
      'Preparing the proposed change.',
      'Working that out.',
      'Comparing those now.',
      'Checking how those compare.',
      'Hmm. Let me think that through.',
      'That needs a little thought.',
      'Let me work through that.',
      'Trying that again.',
      'Taking another pass.',
      'Giving that another try.',
      'Working on that.',
      'Taking a closer look.',
      'Getting that together.',
    ]);
    expect(Object.values(CONVERSATION_PROGRESS_CUES)
      .filter((cue) => cue.styleId === 'thoughtful_progress')).toHaveLength(3);
  });

  it('uses all three family variants before repeating one', () => {
    const recentCueIds: string[] = [];
    const selected = ['turn-1', 'turn-2', 'turn-3'].map((turnId) => {
      const cueId = chooseConversationProgressCue({
        family: 'current_lookup',
        turnId,
        recentCueIds,
      });
      recentCueIds.push(cueId);
      return cueId;
    });
    expect(new Set(selected).size).toBe(3);
  });

  it('is deterministic for the same turn and recent history', () => {
    const input = {
      family: 'general_work',
      turnId: 'turn-42',
      recentCueIds: ['general_work_01'],
    } as const;
    expect(chooseConversationProgressCue(input)).toBe(chooseConversationProgressCue(input));
  });

  it('keeps private capability names out of spoken text', () => {
    const privateTerms = /money|screen time|relationship|person|budget/i;
    expect(Object.values(CONVERSATION_PROGRESS_CUES).map((cue) => cue.text).join(' '))
      .not.toMatch(privateTerms);
  });
});
