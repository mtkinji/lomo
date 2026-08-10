import { useScreenTimeHandoffStore } from './screenTimeHandoffStore';

const handoff = {
  requestedAtMs: 1_786_291_200_000,
  reason: 'meaningful_first_locked',
  restrictions: [],
};

describe('screenTimeHandoffStore', () => {
  beforeEach(() => useScreenTimeHandoffStore.getState().resetForTests());

  it('keeps one fresh handoff visible until it is explicitly dismissed', () => {
    expect(useScreenTimeHandoffStore.getState().capture(handoff, handoff.requestedAtMs)).toBe(true);
    expect(useScreenTimeHandoffStore.getState()).toMatchObject({ pending: handoff, visible: true });

    useScreenTimeHandoffStore.getState().dismiss();
    expect(useScreenTimeHandoffStore.getState()).toMatchObject({ pending: null, visible: false });
  });

  it('rejects stale, future, and replayed handoffs', () => {
    expect(useScreenTimeHandoffStore.getState().capture(handoff, handoff.requestedAtMs + 120_001)).toBe(false);
    expect(useScreenTimeHandoffStore.getState().capture(handoff, handoff.requestedAtMs - 1)).toBe(false);
    expect(useScreenTimeHandoffStore.getState().capture(handoff, handoff.requestedAtMs)).toBe(true);
    expect(useScreenTimeHandoffStore.getState().capture(handoff, handoff.requestedAtMs)).toBe(false);
  });
});

