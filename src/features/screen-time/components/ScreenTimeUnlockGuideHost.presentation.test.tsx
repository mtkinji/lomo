import React from 'react';
import { act, render } from '@testing-library/react-native';
import { ScreenTimeUnlockGuideHost } from './ScreenTimeUnlockGuideHost';
import { useScreenTimeHandoffStore } from '../runtime/screenTimeHandoffStore';

let mockResolveHousehold: (value: unknown) => void;
const mockGuide = jest.fn((_props: { visible: boolean }) => null);
const mockCapture = jest.fn();
jest.mock('./ScreenTimeUnlockGuide', () => ({ ScreenTimeUnlockGuide: (props: { visible: boolean }) => mockGuide(props) }));
jest.mock('../../household/data/household', () => ({ getHouseholdSnapshot: () => new Promise((resolve) => { mockResolveHousehold = resolve; }) }));
jest.mock('../../household/screenTime/data/familyScreenTime', () => ({ fetchFamilyScreenTimeSnapshot: jest.fn(), projectFamilyScreenTimeRule: jest.fn() }));
jest.mock('../../../services/backend/supabaseClient', () => ({ getSupabaseClient: () => ({}) }));
jest.mock('../../../store/useAppStore', () => ({ useAppStore: (selector: (state: unknown) => unknown) => selector({ screenTimeProtection: {} }) }));
jest.mock('../../../services/analytics/useAnalytics', () => ({ useAnalytics: () => ({ capture: mockCapture }) }));
jest.mock('../domain/screenTimeHandoffProjection', () => ({ projectRulesForScreenTimeHandoff: () => ({ rules: [], unresolvedRestrictions: [] }) }));
jest.mock('../../workflow-feedback', () => ({ requestWorkflowFeedback: () => ({ cancel: jest.fn() }) }));

it('opens once authority is resolved, and does not reuse the previous handoff context', async () => {
  useScreenTimeHandoffStore.getState().resetForTests();
  const now = Date.now();
  useScreenTimeHandoffStore.getState().capture({ requestedAtMs: now, reason: null, restrictions: [] }, now);
  render(<ScreenTimeUnlockGuideHost />);
  expect(mockGuide.mock.lastCall?.[0].visible).toBe(false);
  await act(async () => { mockResolveHousehold(null); });
  expect(mockGuide.mock.lastCall?.[0].visible).toBe(true);
  act(() => {
    useScreenTimeHandoffStore.getState().capture({ requestedAtMs: now + 1, reason: null, restrictions: [] }, now + 1);
  });
  expect(mockGuide.mock.lastCall?.[0].visible).toBe(false);
  await act(async () => { mockResolveHousehold(null); });
  expect(mockGuide.mock.lastCall?.[0].visible).toBe(true);
});
