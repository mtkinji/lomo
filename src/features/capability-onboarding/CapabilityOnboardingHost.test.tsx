import React from 'react';
import { act, fireEvent, within } from '@testing-library/react-native';

import { renderWithProviders } from '../../test/renderWithProviders';
import { CapabilityOnboardingHost } from './CapabilityOnboardingHost';
import { useCapabilityOnboardingStore } from './useCapabilityOnboardingStore';
import { AnalyticsEvent } from '../../services/analytics/events';

const mockCapture = jest.fn();
jest.mock('../../services/analytics/useAnalytics', () => ({
  useAnalytics: () => ({ capture: mockCapture }),
}));

describe('CapabilityOnboardingHost', () => {
  beforeEach(() => {
    mockCapture.mockClear();
    useCapabilityOnboardingStore.setState({ recordsByUserId: {}, hydrated: true });
  });

  function renderHost(overrides: Partial<React.ComponentProps<typeof CapabilityOnboardingHost>> = {}) {
    const onStartPath = jest.fn();
    const onExploreKwilt = jest.fn();
    const screen = renderWithProviders(
      <CapabilityOnboardingHost
        visible
        userId="user-a"
        surface="development"
        onStartPath={onStartPath}
        onExploreKwilt={onExploreKwilt}
        {...overrides}
      />,
    );
    const pager = screen.queryByTestId('capabilityOnboarding.pager');
    if (pager) {
      act(() => {
        fireEvent(pager, 'layout', {
          nativeEvent: { layout: { width: 393, height: 852, x: 0, y: 0 } },
        });
      });
    }
    return { screen, onStartPath, onExploreKwilt };
  }

  it('opens the reel on the balanced Welcome', () => {
    const { screen } = renderHost();

    expect(screen.getByText('Welcome to Kwilt')).toBeTruthy();
    expect(screen.getByLabelText('A warm Kwilt welcome')).toBeTruthy();
    expect(screen.getByText(
      'Life has a lot of moving parts. Kwilt helps you set goals, manage money, plan meals, share chores, and make time to play. See a few ways to start, then choose what would help most today.',
    )).toBeTruthy();
    expect(screen.getByLabelText('Go to page 1 of 5')).toBeTruthy();
    expect(screen.queryByText('Continue')).toBeNull();
    expect(screen.queryByText(/swipe to choose/i)).toBeNull();
    expect(screen.queryByText('What do you want help with?')).toBeNull();
  });

  it('persists a viewed door without selecting it', () => {
    const { screen } = renderHost();
    act(() => fireEvent.press(screen.getByLabelText('Go to page 2 of 5')));

    expect(useCapabilityOnboardingStore.getState().recordForUser('user-a')).toMatchObject({
      universalState: 'reel',
      activePageId: 'budget-app-controls',
      selectedPathId: null,
    });
  });

  it('records each settled page once per visible session', () => {
    const { screen } = renderHost();
    act(() => fireEvent.press(screen.getByLabelText('Go to page 2 of 5')));
    act(() => fireEvent.press(screen.getByLabelText('Go to page 1 of 5')));
    act(() => fireEvent.press(screen.getByLabelText('Go to page 2 of 5')));

    const pageViews = mockCapture.mock.calls.filter(
      ([event]) => event === AnalyticsEvent.CapabilityOnboardingPageViewed,
    );
    expect(pageViews).toEqual([
      [AnalyticsEvent.CapabilityOnboardingPageViewed, expect.objectContaining({
        page_id: 'welcome', page_index: 0, page_count: 5, entry: 'fresh',
      })],
      [AnalyticsEvent.CapabilityOnboardingPageViewed, expect.objectContaining({
        page_id: 'budget-app-controls', page_index: 1, page_count: 5, entry: 'fresh',
      })],
    ]);
  });

  it('selects Money and delegates to its real capability handoff', () => {
    const { screen, onStartPath } = renderHost();
    act(() => fireEvent.press(screen.getByLabelText('Go to page 2 of 5')));
    const page = screen.getByTestId('capabilityOnboarding.door.budget-app-controls');
    fireEvent.press(
      within(page).getByRole('button', { name: 'Set up Money' }),
    );

    expect(onStartPath).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'budget-app-controls',
        handoff: { kind: 'money-app-control' },
      }),
    );
    expect(useCapabilityOnboardingStore.getState().recordForUser('user-a')).toMatchObject({
      universalState: 'chosen',
      selectedPathId: 'budget-app-controls',
    });
    expect(mockCapture).toHaveBeenCalledWith(
      AnalyticsEvent.CapabilityOnboardingDoorStarted,
      expect.objectContaining({ path_id: 'budget-app-controls', rank: 1, input: 'button' }),
    );
  });

  it('teaches the Meals promise before opening native Recipes', () => {
    const { screen, onStartPath } = renderHost();
    act(() => fireEvent.press(screen.getByLabelText('Go to page 3 of 5')));
    const page = screen.getByTestId('capabilityOnboarding.door.make-meals-easier');
    fireEvent.press(within(page).getByRole('button', { name: 'Choose meal' }));

    expect(screen.getByText('Find meals everyone can get behind.')).toBeTruthy();
    expect(onStartPath).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole('button', { name: 'Next' }));
    fireEvent.press(screen.getByRole('button', { name: 'Browse recipes' }));

    expect(onStartPath).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'make-meals-easier', handoff: { kind: 'food-meal-loop' } }),
    );
    expect(useCapabilityOnboardingStore.getState().recordForUser('user-a')).toMatchObject({
      universalState: 'chosen',
      selectedPathId: 'make-meals-easier',
      checkpoint: 'browsing-recipes',
    });
  });

  it('uses Skip tour as one finite shell exit', () => {
    const { screen, onExploreKwilt } = renderHost();
    act(() => fireEvent.press(screen.getByLabelText('Go to page 2 of 5')));
    fireEvent.press(screen.getByRole('button', { name: 'Skip onboarding and open Kwilt' }));

    expect(onExploreKwilt).toHaveBeenCalledTimes(1);
    expect(useCapabilityOnboardingStore.getState().recordForUser('user-a').universalState).toBe(
      'explored',
    );
    expect(mockCapture).toHaveBeenCalledWith(
      AnalyticsEvent.CapabilityOnboardingExplored,
      expect.objectContaining({ page_id: 'budget-app-controls', input: 'button' }),
    );
  });

  it('offers finite recovery after an interrupted Meals walkthrough', () => {
    useCapabilityOnboardingStore.getState().dispatch('user-a', {
      type: 'select-path', pathId: 'make-meals-easier', now: 1,
    });
    useCapabilityOnboardingStore.getState().dispatch('user-a', {
      type: 'checkpoint', checkpoint: 'follow-through', now: 2,
    });
    const { screen } = renderHost();

    expect(screen.getByText('Continue where you left off?')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Choose another starting point' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Explore Kwilt' })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Continue where I left off' }));
    expect(screen.getByText('Plan it. Shop it. Cook it.')).toBeTruthy();
  });
});
