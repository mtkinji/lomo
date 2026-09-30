import React from 'react';
import { render } from '@testing-library/react-native';
import { FirstRunCapabilityHost } from './FirstRunCapabilityHost';
import type { CapabilityOnboardingContract } from './capabilityOnboardingContracts';

const mockHost = jest.fn((_props: unknown) => null);
const mockFinish = jest.fn();
const mockStartGoal = jest.fn();
const mockNavigate = jest.fn();
jest.mock('./CapabilityOnboardingHost', () => ({ CapabilityOnboardingHost: (props: unknown) => mockHost(props) }));
jest.mock('../../store/useAppStore', () => ({ useAppStore: { getState: () => ({ setHasCompletedFirstTimeOnboarding: mockFinish }) } }));
jest.mock('../../store/useFirstTimeUxStore', () => ({ useFirstTimeUxStore: { getState: () => ({ startFlow: mockStartGoal }) } }));
jest.mock('../../navigation/rootNavigationRef', () => ({ navigateWhenReady: (...args: unknown[]) => mockNavigate(...args) }));

describe('FirstRunCapabilityHost', () => {
  beforeEach(() => jest.clearAllMocks());
  function open() {
    render(<FirstRunCapabilityHost visible userId="new-user" />);
    return (mockHost.mock.calls[0] as unknown as [{ paths: CapabilityOnboardingContract[]; onStartPath: (path: CapabilityOnboardingContract) => void; onExploreKwilt: () => void }])[0];
  }
  it('offers the four approved paths without promoting other catalog entries', () => {
    expect(open().paths.map(path => path.id).sort()).toEqual([
      'budget-app-controls', 'make-meals-easier', 'make-progress', 'screen-time-controls',
    ]);
  });
  it('leaves completion with the Goals flow until the user finishes it', () => {
    const host = open();
    host.onStartPath(host.paths.find(path => path.id === 'make-progress')!);
    expect(mockStartGoal).toHaveBeenCalledTimes(1);
    expect(mockFinish).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
  it('opens the real recipe picker after completing only the introduction', () => {
    const host = open();
    host.onStartPath(host.paths.find(path => path.id === 'make-meals-easier')!);
    expect(mockFinish).toHaveBeenCalledWith(true);
    expect(mockNavigate).toHaveBeenCalledWith('Food', { screen: 'RecipeLibrary', params: { onboarding: 'pick-meal' } });
    expect(mockStartGoal).not.toHaveBeenCalled();
  });
  it('preserves the standalone Focus choice without entering Money or Goals', () => {
    const host = open();
    host.onStartPath({ ...host.paths.find(path => path.id === 'screen-time-controls')!, handoff: { kind: 'screen-time-setup', suggestedKind: 'focus' } });
    expect(mockNavigate).toHaveBeenCalledWith('Settings', { screen: 'SettingsScreenTimeRuleBuilder', params: { entry: 'contextual', suggestedKind: 'focus' } });
    expect(mockStartGoal).not.toHaveBeenCalled();
  });
  it('lets users skip the introduction without creating anything', () => {
    open().onExploreKwilt();
    expect(mockFinish).toHaveBeenCalledWith(true);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockStartGoal).not.toHaveBeenCalled();
  });
});
