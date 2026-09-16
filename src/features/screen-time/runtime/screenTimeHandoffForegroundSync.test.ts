jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  Linking: { openURL: jest.fn(async () => undefined) },
}));

jest.mock('../../../services/appleEcosystem/screenTimeProtection', () => ({
  consumePendingScreenTimeShieldHandoff: jest.fn(),
}));

import { AppState, Linking } from 'react-native';
import { consumePendingScreenTimeShieldHandoff } from '../../../services/appleEcosystem/screenTimeProtection';
import { useScreenTimeHandoffStore } from './screenTimeHandoffStore';
import {
  startScreenTimeHandoffForegroundSync,
  stopScreenTimeHandoffForegroundSyncForTests,
} from './screenTimeHandoffForegroundSync';

const mockConsume = consumePendingScreenTimeShieldHandoff as jest.Mock;

describe('screenTimeHandoffForegroundSync', () => {
  beforeEach(() => {
    stopScreenTimeHandoffForegroundSyncForTests();
    useScreenTimeHandoffStore.getState().resetForTests();
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1_786_291_200_000);
  });

  afterEach(() => jest.restoreAllMocks());

  it('captures a shield handoff without replacing the current navigation route', async () => {
    mockConsume.mockResolvedValue({
      requestedAtMs: 1_786_291_200_000,
      reason: 'meaningful_first_locked',
      restrictions: [],
    });

    startScreenTimeHandoffForegroundSync();
    await Promise.resolve();
    await Promise.resolve();

    expect(useScreenTimeHandoffStore.getState().visible).toBe(true);
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it('holds automatic prompts until the launch handoff check completes', async () => {
    let resolveCheck!: (value: null) => void;
    mockConsume.mockReturnValue(new Promise((resolve) => { resolveCheck = resolve; }));

    startScreenTimeHandoffForegroundSync();
    expect(useScreenTimeHandoffStore.getState().foregroundCheckStatus).toBe('checking');
    resolveCheck(null);
    await Promise.resolve();
    await Promise.resolve();
    expect(useScreenTimeHandoffStore.getState().foregroundCheckStatus).toBe('clear');
  });

  it('suppresses kickoff after dismissal until a later foreground has no handoff', async () => {
    mockConsume.mockResolvedValueOnce({
      requestedAtMs: Date.now(), reason: 'personal_composite_rule', restrictions: [],
    }).mockResolvedValue(null);
    startScreenTimeHandoffForegroundSync();
    await Promise.resolve();
    await Promise.resolve();
    useScreenTimeHandoffStore.getState().dismiss();
    expect(useScreenTimeHandoffStore.getState().foregroundCheckStatus).toBe('handoff');

    const onAppState = (AppState.addEventListener as jest.Mock).mock.calls.at(-1)[1];
    onAppState('background');
    expect(useScreenTimeHandoffStore.getState().foregroundCheckStatus).toBe('checking');
    onAppState('active');
    expect(useScreenTimeHandoffStore.getState().foregroundCheckStatus).toBe('checking');
    await Promise.resolve();
    await Promise.resolve();
    expect(useScreenTimeHandoffStore.getState().foregroundCheckStatus).toBe('clear');
  });

  it('does not let a delayed background check release prompts in a newer foreground', async () => {
    let resolveLaunch!: (value: null) => void;
    let resolveReturn!: (value: null) => void;
    mockConsume
      .mockReturnValueOnce(new Promise((resolve) => { resolveLaunch = resolve; }))
      .mockReturnValueOnce(new Promise((resolve) => { resolveReturn = resolve; }));
    startScreenTimeHandoffForegroundSync();
    const onAppState = (AppState.addEventListener as jest.Mock).mock.calls.at(-1)[1];
    onAppState('background');
    onAppState('active');
    resolveLaunch(null);
    await Promise.resolve();
    await Promise.resolve();
    expect(useScreenTimeHandoffStore.getState().foregroundCheckStatus).toBe('checking');
    resolveReturn(null);
    await Promise.resolve();
    await Promise.resolve();
    expect(useScreenTimeHandoffStore.getState().foregroundCheckStatus).toBe('clear');
  });

  it('does not suppress an ordinary launch for a stale handoff or failed native read', async () => {
    mockConsume.mockResolvedValueOnce({
      requestedAtMs: Date.now() - 120_001, reason: 'personal_composite_rule', restrictions: [],
    }).mockRejectedValueOnce(new Error('native unavailable'));
    startScreenTimeHandoffForegroundSync();
    await Promise.resolve();
    await Promise.resolve();
    expect(useScreenTimeHandoffStore.getState().foregroundCheckStatus).toBe('clear');
    const onAppState = (AppState.addEventListener as jest.Mock).mock.calls.at(-1)[1];
    onAppState('background');
    onAppState('active');
    await Promise.resolve();
    await Promise.resolve();
    expect(useScreenTimeHandoffStore.getState().foregroundCheckStatus).toBe('clear');
  });

  it('waits for an older native read even when the newer foreground read has no handoff', async () => {
    let resolveLaunch!: (value: { requestedAtMs: number; reason: string; restrictions: [] }) => void;
    mockConsume
      .mockReturnValueOnce(new Promise((resolve) => { resolveLaunch = resolve; }))
      .mockResolvedValueOnce(null);
    startScreenTimeHandoffForegroundSync();
    const onAppState = (AppState.addEventListener as jest.Mock).mock.calls.at(-1)[1];
    onAppState('background');
    onAppState('active');
    await Promise.resolve();
    await Promise.resolve();
    expect(useScreenTimeHandoffStore.getState().foregroundCheckStatus).toBe('checking');

    resolveLaunch({ requestedAtMs: Date.now(), reason: 'personal_composite_rule', restrictions: [] });
    await Promise.resolve();
    await Promise.resolve();
    expect(useScreenTimeHandoffStore.getState().foregroundCheckStatus).toBe('handoff');
    expect(useScreenTimeHandoffStore.getState().visible).toBe(true);
  });
});
