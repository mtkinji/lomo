import {
  getPersonalRuleBuilderCopy,
  getPersonalRuleBuilderStep,
  personalRuleBehaviorLabel,
  personalRuleSentence,
} from './personalRuleBuilderModel';

describe('personalRuleBuilderModel', () => {
  it('starts an inventory rule with the missing app selection', () => {
    expect(getPersonalRuleBuilderStep({ kind: null, targetCount: 0, appsConfirmed: false })).toBe('apps');
    expect(getPersonalRuleBuilderCopy({ entry: 'inventory', kind: null, step: 'apps' }).question)
      .toBe('Which apps should this rule manage?');
  });

  it('asks for behavior only after an inventory target is known', () => {
    expect(getPersonalRuleBuilderStep({ kind: null, targetCount: 1, appsConfirmed: false })).toBe('apps');
    expect(getPersonalRuleBuilderStep({ kind: null, targetCount: 1, appsConfirmed: true })).toBe('behavior');
    expect(getPersonalRuleBuilderCopy({
      entry: 'inventory',
      kind: null,
      step: 'behavior',
      targetLabel: 'Games',
    }).question).toBe('When should Games be available?');
  });

  it('uses contextual Focus intent without asking for behavior again', () => {
    expect(getPersonalRuleBuilderStep({ kind: 'focus', targetCount: 0, appsConfirmed: false })).toBe('apps');
    expect(getPersonalRuleBuilderCopy({ entry: 'contextual', kind: 'focus', step: 'apps' })).toEqual({
      title: 'Protect Focus',
      question: 'Which apps should pause during Focus?',
      support: 'They’ll be available again when Focus ends.',
    });
    expect(getPersonalRuleBuilderStep({ kind: 'focus', targetCount: 2, appsConfirmed: true })).toBe('review');
  });

  it('uses contextual real-step intent without asking for behavior again', () => {
    expect(getPersonalRuleBuilderCopy({ entry: 'contextual', kind: 'real_step', step: 'apps' })).toEqual({
      title: 'Complete something in Kwilt first',
      question: 'Which apps should unlock afterward?',
      support: 'They’ll unlock after you complete a to-do, record progress, or finish Focus.',
    });
  });

  it('turns the final step into a receipt instead of repeating an earlier question', () => {
    expect(getPersonalRuleBuilderCopy({
      entry: 'inventory',
      kind: 'real_step',
      step: 'review',
      targetLabel: 'Games',
    })).toEqual({
      title: 'Add rule',
      question: 'Your rule is ready.',
      support: 'You can change either answer before adding it.',
    });
  });

  it('formats stable behavior receipts and sentences', () => {
    expect(personalRuleBehaviorLabel('focus')).toBe('Pause until Focus ends');
    expect(personalRuleBehaviorLabel('real_step')).toBe('Unlock after a to-do, progress update, or Focus');
    expect(personalRuleSentence('focus', 'Instagram + 1'))
      .toBe('Instagram + 1 will pause while Focus is running.');
    expect(personalRuleSentence('real_step', 'Games'))
      .toBe('Games will unlock after you complete a to-do, record progress, or finish Focus.');
    expect(personalRuleBehaviorLabel('daily_limit', 10)).toBe('Pause after 10 minutes each day');
    expect(personalRuleSentence('daily_limit', 'Instagram', 10))
      .toBe('Instagram will pause after 10 minutes of use each day.');
  });

  it('preserves a contextual daily limit while asking only for private app selection', () => {
    expect(getPersonalRuleBuilderCopy({
      entry: 'contextual', kind: 'daily_limit', step: 'apps', limitMinutes: 10,
      suggestedAppLabel: 'Instagram',
    })).toEqual({
      title: 'Set a daily app limit',
      question: 'Choose Instagram in Screen Time',
      support: 'It will pause after 10 minutes of use each day.',
    });
  });
});
