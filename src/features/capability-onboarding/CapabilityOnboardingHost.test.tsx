import React from 'react';
import { ScrollView } from 'react-native';
import { act, fireEvent, within } from '@testing-library/react-native';

import { renderWithProviders } from '../../test/renderWithProviders';
import { CapabilityOnboardingHost } from './CapabilityOnboardingHost';
import { useCapabilityOnboardingStore } from './useCapabilityOnboardingStore';
import { AnalyticsEvent } from '../../services/analytics/events';

const mockCapture = jest.fn();
jest.mock('./OnboardingShorelineBackdrop', () => ({ OnboardingShorelineBackdrop: () => null }));
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

  it.each([
    ['Make a plan for your money', 'Set up Money', 'budget-app-controls', 'money'],
    ['Make room for less screen time', 'Set up Screen Time', 'screen-time-controls', 'screen'],
    ['Plan meals together', 'Plan a meal', 'make-meals-easier', 'household'],
    ['Plan meals together', 'Start with chores', 'household-chores', 'household'],
    ['Set goals and get help reaching them', 'Create a goal', 'make-progress', 'goals'],
  ])('shows an illustrated invitation for %s before handing off %s', (label, action, id, illustration) => {
    const { screen, onStartPath } = renderHost({ presentation: 'editorial' });
    expect(screen.queryByTestId('capabilityOnboarding.pager')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Get started' }));
    fireEvent.press(screen.getByRole('button', { name: label }));
    const artwork = screen.getByTestId(`onboarding.illustration.${illustration}`, { includeHiddenElements: true });
    // Decorative scenes must not move with the copy's accessibility overflow.
    let ancestor = artwork.parent;
    while (ancestor) {
      expect(ancestor.type).not.toBe(ScrollView);
      ancestor = ancestor.parent;
    }
    expect(screen.queryByText('Example · not your data')).toBeNull();
    expect(onStartPath).not.toHaveBeenCalled();
    expect(useCapabilityOnboardingStore.getState().recordForUser('user-a').selectedPathId).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: action }));
    expect(onStartPath).toHaveBeenCalledTimes(1);
    expect(onStartPath).toHaveBeenCalledWith(expect.objectContaining({ id }));
  });

  it('exits the signed-in starter without selecting or creating work', () => {
    const { screen, onStartPath, onExploreKwilt } = renderHost({ presentation: 'editorial' });
    fireEvent.press(screen.getByRole('button', { name: 'Get started' }));
    fireEvent.press(screen.getByRole('button', { name: 'Skip' }));
    expect(onStartPath).not.toHaveBeenCalled();
    expect(onExploreKwilt).toHaveBeenCalledTimes(1);
  });

  it('lets someone return from an example and choose a different start without creating work', () => {
    const { screen, onStartPath } = renderHost({ presentation: 'editorial' });
    fireEvent.press(screen.getByRole('button', { name: 'Get started' }));
    fireEvent.press(screen.getByRole('button', { name: 'Make a plan for your money' }));
    fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('Let’s get your house in order.')).toBeTruthy();
    expect(screen.getByText('We can start with just one thing.')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('Built to help you get—and keep—your house in order.')).toBeTruthy();
    expect(onStartPath).not.toHaveBeenCalled();
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

  it('opens native Recipes immediately and checkpoints the guided first cycle', () => {
    const { screen, onStartPath } = renderHost();
    act(() => fireEvent.press(screen.getByLabelText('Go to page 3 of 5')));
    const page = screen.getByTestId('capabilityOnboarding.door.make-meals-easier');
    fireEvent.press(within(page).getByRole('button', { name: 'Choose meal' }));

    expect(onStartPath).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'make-meals-easier', handoff: { kind: 'food-meal-loop' } }),
    );
    expect(useCapabilityOnboardingStore.getState().recordForUser('user-a')).toMatchObject({
      universalState: 'chosen',
      selectedPathId: 'make-meals-easier',
      checkpoint: 'food-guide:choose-recipe',
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
      type: 'checkpoint', checkpoint: 'food-guide:add-to-plan', now: 2,
    });
    const { screen, onStartPath } = renderHost();

    expect(screen.getByText('Continue where you left off?')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Choose another starting point' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Explore Kwilt' })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Continue where I left off' }));
    expect(onStartPath).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'make-meals-easier' }),
    );
  });
});
