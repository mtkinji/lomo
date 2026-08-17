import {
  openPersonalScreenTimeRuleBuilder,
  usePersonalRuleBuilderDrawerStore,
} from './usePersonalRuleBuilderDrawerStore';

describe('usePersonalRuleBuilderDrawerStore', () => {
  beforeEach(() => {
    usePersonalRuleBuilderDrawerStore.getState().close();
  });

  it('opens with a fresh request identity and replaces an earlier request', () => {
    openPersonalScreenTimeRuleBuilder({
      entry: 'contextual',
      suggestedKind: 'focus',
      setupIntent: 'focus_sessions',
      entrySurface: 'focus_drawer',
    });
    const first = usePersonalRuleBuilderDrawerStore.getState().request;

    openPersonalScreenTimeRuleBuilder({ entry: 'inventory' });
    const second = usePersonalRuleBuilderDrawerStore.getState().request;

    expect(first).toEqual(expect.objectContaining({
      params: expect.objectContaining({ suggestedKind: 'focus' }),
    }));
    expect(second).toEqual(expect.objectContaining({ params: { entry: 'inventory' } }));
    expect(second?.id).toBeGreaterThan(first?.id ?? 0);
  });

  it('clears the active request when closed', () => {
    openPersonalScreenTimeRuleBuilder({ entry: 'inventory' });

    usePersonalRuleBuilderDrawerStore.getState().close();

    expect(usePersonalRuleBuilderDrawerStore.getState().request).toBeNull();
  });
});
