import type { PartnerPromptTrigger } from '../../store/useCheckinNudgeStore';
import { selectGoalPartnerPromptTrigger } from './goalPartnerPromptDecision';

function createInput() {
  return {
    goalId: 'goal-1',
    isFocused: true,
    isSharedGoal: false,
    sharingRemindersMuted: false,
    showFirstGoalCelebration: false,
    shareDrawerVisible: false,
    membersSheetVisible: false,
    todoCount: 1,
    completedCount: 0,
    isMomentAllowed: jest.fn(() => true),
    shouldShowPrompt: jest.fn((_trigger: PartnerPromptTrigger) => true),
  };
}

describe('selectGoalPartnerPromptTrigger', () => {
  it.each([
    ['missing goal', { goalId: '' }],
    ['unfocused screen', { isFocused: false }],
    ['shared goal', { isSharedGoal: true }],
    ['muted reminders', { sharingRemindersMuted: true }],
    ['goal celebration', { showFirstGoalCelebration: true }],
    ['share drawer', { shareDrawerVisible: true }],
    ['members sheet', { membersSheetVisible: true }],
    ['blank goal', { todoCount: 0 }],
  ])('suppresses the prompt for %s', (_label, overrides) => {
    const input = { ...createInput(), ...overrides };

    expect(selectGoalPartnerPromptTrigger(input)).toBeNull();
    expect(input.isMomentAllowed).not.toHaveBeenCalled();
    expect(input.shouldShowPrompt).not.toHaveBeenCalled();
  });

  it('stops before prompt eligibility when the moment is blocked', () => {
    const input = createInput();
    input.isMomentAllowed.mockReturnValue(false);

    expect(selectGoalPartnerPromptTrigger(input)).toBeNull();
    expect(input.isMomentAllowed).toHaveBeenCalledTimes(1);
    expect(input.shouldShowPrompt).not.toHaveBeenCalled();
  });

  it('prefers first progress alone when a completed to-do makes it eligible', () => {
    const input = { ...createInput(), completedCount: 1 };

    expect(selectGoalPartnerPromptTrigger(input)).toBe('first_progress_alone');
    expect(input.shouldShowPrompt).toHaveBeenCalledTimes(1);
    expect(input.shouldShowPrompt).toHaveBeenCalledWith('first_progress_alone');
  });

  it('falls back to the first-to-do prompt when progress is ineligible', () => {
    const input = { ...createInput(), completedCount: 1 };
    input.shouldShowPrompt.mockImplementation((trigger) => trigger === 'first_todo_added');

    expect(selectGoalPartnerPromptTrigger(input)).toBe('first_todo_added');
    expect(input.shouldShowPrompt.mock.calls).toEqual([
      ['first_progress_alone'],
      ['first_todo_added'],
    ]);
  });

  it('checks only the first-to-do prompt before any progress is complete', () => {
    const input = createInput();
    input.shouldShowPrompt.mockReturnValue(false);

    expect(selectGoalPartnerPromptTrigger(input)).toBeNull();
    expect(input.shouldShowPrompt.mock.calls).toEqual([['first_todo_added']]);
  });
});
