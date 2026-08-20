import { act, fireEvent, within } from '@testing-library/react-native';

import { renderWithProviders } from '../../test/renderWithProviders';
import { CapabilityOnboardingPager } from './CapabilityOnboardingPager';
import { getCapabilityOnboardingDoors } from './capabilityOnboardingContracts';

describe('CapabilityOnboardingPager', () => {
  const doors = getCapabilityOnboardingDoors('development');

  function renderPager(initialPageId: 'welcome' | (typeof doors)[number]['id'] = 'welcome') {
    const onExplore = jest.fn();
    const onPageChanged = jest.fn();
    const onStartDoor = jest.fn();
    const screen = renderWithProviders(
      <CapabilityOnboardingPager
        doors={doors}
        initialPageId={initialPageId}
        onExplore={onExplore}
        onPageChanged={onPageChanged}
        onStartDoor={onStartDoor}
      />,
    );
    act(() => {
      fireEvent(screen.getByTestId('capabilityOnboarding.pager'), 'layout', {
        nativeEvent: { layout: { width: 393, height: 852, x: 0, y: 0 } },
      });
    });
    return { screen, onExplore, onPageChanged, onStartDoor };
  }

  it('renders Welcome and the four ranked doors without instruction chrome', () => {
    const { screen } = renderPager();
    expect(screen.getByText('Welcome to Kwilt')).toBeTruthy();
    for (const door of doors) {
      expect(screen.getByText(door.story.headline, { includeHiddenElements: true })).toBeTruthy();
      expect(
        screen.getByTestId(`capabilityOnboarding.primaryActionIcon.${door.id}`, {
          includeHiddenElements: true,
        }),
      ).toBeTruthy();
    }
    expect(screen.queryByText('Continue')).toBeNull();
    expect(screen.queryByText(/swipe to choose/i)).toBeNull();
    expect(screen.getByLabelText('Go to page 1 of 5')).toBeTruthy();
    expect(screen.getAllByTestId('capabilityOnboarding.pageIndicator')).toHaveLength(1);
    expect(screen.getAllByLabelText('Kwilt', { includeHiddenElements: true })).toHaveLength(1);
    expect(
      screen.getAllByRole('button', {
        name: 'Skip onboarding and open Kwilt',
        includeHiddenElements: true,
      }),
    ).toHaveLength(1);
    const stationaryChrome = screen.getByTestId('capabilityOnboarding.stationaryChrome');
    expect(within(stationaryChrome).getByLabelText('Kwilt')).toBeTruthy();
    expect(
      within(screen.getByTestId('capabilityOnboarding.pager')).queryByLabelText('Kwilt', {
        includeHiddenElements: true,
      }),
    ).toBeNull();
  });

  it('uses one native horizontal paging surface above every scrollable page', () => {
    const { screen } = renderPager();
    const pager = screen.getByTestId('capabilityOnboarding.pager');

    expect(pager.props.horizontal).toBe(true);
    expect(pager.props.pagingEnabled).toBe(true);
    expect(pager.props.directionalLockEnabled).toBe(true);
    expect(typeof pager.props.onScroll).toBe('function');
    expect(
      typeof screen.getByTestId('capabilityOnboarding.welcomePage').props.scrollEnabled,
    ).toBe('boolean');
    expect(
      typeof screen.getByTestId(
        'capabilityOnboarding.door.budget-app-controls',
        { includeHiddenElements: true },
      ).props.scrollEnabled,
    ).toBe('boolean');
  });

  it('starts from a persisted door and exposes page accessibility actions', () => {
    const { screen } = renderPager('make-progress');
    const pager = screen.getByTestId('capabilityOnboarding.pager');
    expect(pager.props.accessibilityLabel).toBe('Onboarding page 4 of 5');
    expect(pager.props.accessibilityActions).toEqual([
      { name: 'increment', label: 'Next page' },
      { name: 'decrement', label: 'Previous page' },
    ]);
  });

  it('starts a door and explores through explicit actions', () => {
    const { screen, onExplore, onStartDoor } = renderPager('budget-app-controls');
    const moneyPage = screen.getByTestId('capabilityOnboarding.door.budget-app-controls');
    fireEvent.press(
      within(moneyPage).getByRole('button', { name: 'Set app controls' }),
    );
    fireEvent.press(screen.getByRole('button', { name: 'Skip onboarding and open Kwilt' }));
    expect(onStartDoor).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'budget-app-controls' }),
    );
    expect(onExplore).toHaveBeenCalledWith('button');
  });
});
