import { useCheckinNudgeStore } from './useCheckinNudgeStore';

describe('useCheckinNudgeStore partner prompts', () => {
  beforeEach(() => {
    useCheckinNudgeStore.getState().reset();
  });

  it('allows the first-todo-added prompt for an unshared goal by default', () => {
    expect(
      useCheckinNudgeStore.getState().shouldShowPartnerPrompt('goal-1', 'first_todo_added'),
    ).toBe(true);
  });

  it('never shows partner prompts on a goal that has been shared', () => {
    useCheckinNudgeStore.getState().markGoalShared('goal-1');

    expect(
      useCheckinNudgeStore.getState().shouldShowPartnerPrompt('goal-1', 'first_todo_added'),
    ).toBe(false);
    expect(
      useCheckinNudgeStore.getState().shouldShowPartnerPrompt('goal-1', 'first_progress_alone'),
    ).toBe(false);
    expect(
      useCheckinNudgeStore.getState().shouldShowPartnerPrompt('goal-1', 'partners_tab_empty'),
    ).toBe(false);
  });

  it('does not refire the same (goal, trigger) once recorded as shown', () => {
    useCheckinNudgeStore
      .getState()
      .recordPartnerPromptShown('goal-1', 'first_todo_added');

    expect(
      useCheckinNudgeStore.getState().shouldShowPartnerPrompt('goal-1', 'first_todo_added'),
    ).toBe(false);
  });

  it('keeps a separate trigger eligible after a different trigger was shown', () => {
    useCheckinNudgeStore
      .getState()
      .recordPartnerPromptShown('goal-1', 'first_todo_added');

    // The global 60s throttle blocks the very next prompt; bypass by simulating
    // an older shown timestamp on the throttle field.
    useCheckinNudgeStore.setState({
      partnerPromptLastShownAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    });

    expect(
      useCheckinNudgeStore.getState().shouldShowPartnerPrompt('goal-1', 'first_progress_alone'),
    ).toBe(true);
  });

  it('honors the per-goal dismissal cooldown and does not bleed across goals', () => {
    useCheckinNudgeStore
      .getState()
      .dismissPartnerPrompt('goal-1', 'first_todo_added');

    expect(
      useCheckinNudgeStore.getState().shouldShowPartnerPrompt('goal-1', 'first_todo_added'),
    ).toBe(false);
    expect(
      useCheckinNudgeStore.getState().shouldShowPartnerPrompt('goal-2', 'first_todo_added'),
    ).toBe(true);
  });

  it('lets a different trigger fire on the same goal after one trigger is dismissed', () => {
    useCheckinNudgeStore
      .getState()
      .dismissPartnerPrompt('goal-1', 'first_todo_added');

    expect(
      useCheckinNudgeStore.getState().shouldShowPartnerPrompt('goal-1', 'first_progress_alone'),
    ).toBe(true);
  });

  it('applies a global throttle so prompts cannot stack across rapid navigation', () => {
    useCheckinNudgeStore
      .getState()
      .recordPartnerPromptShown('goal-1', 'first_todo_added');

    // Same instant, a different goal should not be allowed to fire its prompt.
    expect(
      useCheckinNudgeStore.getState().shouldShowPartnerPrompt('goal-2', 'first_todo_added'),
    ).toBe(false);
  });

  it('still allows partners_tab_empty without global throttle (destination card)', () => {
    useCheckinNudgeStore
      .getState()
      .recordPartnerPromptShown('goal-1', 'first_todo_added');

    expect(
      useCheckinNudgeStore.getState().shouldShowPartnerPrompt('goal-2', 'partners_tab_empty'),
    ).toBe(true);
  });

  it('records first progress alone only while unshared and only once', () => {
    const store = useCheckinNudgeStore.getState();

    store.markFirstProgressAlone('goal-1');
    expect(store.hasRecordedFirstProgressAlone('goal-1')).toBe(true);

    const firstAt = useCheckinNudgeStore.getState().firstProgressAloneAt['goal-1'];

    store.markFirstProgressAlone('goal-1');
    const secondAt = useCheckinNudgeStore.getState().firstProgressAloneAt['goal-1'];
    expect(secondAt).toBe(firstAt);
  });

  it('does not record first progress alone after a goal is already shared', () => {
    const store = useCheckinNudgeStore.getState();
    store.markGoalShared('goal-1');
    store.markFirstProgressAlone('goal-1');

    expect(store.hasRecordedFirstProgressAlone('goal-1')).toBe(false);
  });
});
