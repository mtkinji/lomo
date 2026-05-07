import { fireEvent } from '@testing-library/react-native';

// ---------------------------------------------------------------------------
// Heavy child mocks. PlanScreen composes many full-screen/native subviews that
// aren't relevant for verifying screen-level behaviors.
// ---------------------------------------------------------------------------
jest.mock('./PlanPager', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    PlanPager: ({ entryPoint, recommendationsSheetSnapIndex }: any) =>
      React.createElement(View, {
        testID: 'mock-plan-pager',
        accessibilityValue: {
          text: `entry=${entryPoint};snap=${recommendationsSheetSnapIndex}`,
        },
      }),
  };
});

jest.mock('./PlanDateStrip', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    PlanDateStrip: () =>
      React.createElement(View, { testID: 'mock-plan-date-strip' }),
  };
});

jest.mock('./StreakWeeklyRecapCard', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    StreakWeeklyRecapCard: ({ onDismiss }: any) =>
      React.createElement(
        Pressable,
        { onPress: onDismiss, accessibilityLabel: 'Weekly recap card' },
        React.createElement(Text, null, 'WEEKLY_RECAP'),
      ),
  };
});

jest.mock('../../ui/layout/AppShell', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    AppShell: ({ children }: any) =>
      React.createElement(View, { testID: 'app-shell' }, children),
  };
});

jest.mock('../../ui/layout/PageHeader', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    PageHeader: ({ title, avatarName }: any) =>
      React.createElement(
        View,
        { testID: 'page-header' },
        React.createElement(Text, null, title),
        React.createElement(Text, { testID: 'page-header-avatar-name' }, avatarName),
      ),
  };
});

jest.mock('../../ui/DropdownMenu', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Pass = ({ children }: any) => React.createElement(View, null, children);
  return {
    DropdownMenu: Pass,
    DropdownMenuTrigger: Pass,
    DropdownMenuContent: Pass,
    DropdownMenuItem: Pass,
  };
});

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  const setParams = jest.fn();
  const navigate = jest.fn();
  let routeParams: Record<string, unknown> | undefined = undefined;
  return {
    ...actual,
    useNavigation: () => ({ setParams, navigate }),
    useRoute: () => ({ params: routeParams }),
    __setRouteParams: (p: Record<string, unknown> | undefined) => {
      routeParams = p;
    },
    __navMocks: { setParams, navigate },
  };
});

import { renderWithProviders } from '../../test/renderWithProviders';
import { resetAllStores } from '../../test/storeFixtures';
import { useAppStore } from '../../store/useAppStore';
import { PlanScreen } from './PlanScreen';

const navModule = require('@react-navigation/native') as {
  __setRouteParams: (p: Record<string, unknown> | undefined) => void;
  __navMocks: { setParams: jest.Mock; navigate: jest.Mock };
};

describe('PlanScreen avatar/display name fallback', () => {
  beforeEach(() => {
    resetAllStores();
    navModule.__setRouteParams(undefined);
    navModule.__navMocks.setParams.mockReset();
    navModule.__navMocks.navigate.mockReset();
  });

  it('uses the auth identity name when available', () => {
    useAppStore.setState({
      authIdentity: { name: 'Alice Auth', avatarUrl: null },
    } as any);
    const { getByTestId } = renderWithProviders(<PlanScreen />);
    expect(getByTestId('page-header-avatar-name').props.children).toBe('Alice Auth');
  });

  it('falls back to the user profile fullName when no auth identity', () => {
    useAppStore.setState({
      authIdentity: null,
      userProfile: { id: 'u', createdAt: '', updatedAt: '', fullName: 'Bob Profile' },
    } as any);
    const { getByTestId } = renderWithProviders(<PlanScreen />);
    expect(getByTestId('page-header-avatar-name').props.children).toBe('Bob Profile');
  });

  it('falls back to "Kwilter" when neither name is provided', () => {
    useAppStore.setState({
      authIdentity: null,
      userProfile: { id: 'u', createdAt: '', updatedAt: '' },
    } as any);
    const { getByTestId } = renderWithProviders(<PlanScreen />);
    expect(getByTestId('page-header-avatar-name').props.children).toBe('Kwilter');
  });
});

describe('PlanScreen openRecommendations route param', () => {
  beforeEach(() => {
    resetAllStores();
    navModule.__navMocks.setParams.mockReset();
  });

  it('opens the recommendations sheet and clears the route param when openRecommendations is true', () => {
    navModule.__setRouteParams({ openRecommendations: true });
    const { getByTestId } = renderWithProviders(<PlanScreen />);
    const pager = getByTestId('mock-plan-pager');
    expect(pager.props.accessibilityValue.text).toBe('entry=kickoff;snap=1');
    expect(navModule.__navMocks.setParams).toHaveBeenCalledWith({
      openRecommendations: undefined,
    });
  });

  it('defaults to the closed sheet state when openRecommendations is missing', () => {
    navModule.__setRouteParams(undefined);
    const { getByTestId } = renderWithProviders(<PlanScreen />);
    const pager = getByTestId('mock-plan-pager');
    expect(pager.props.accessibilityValue.text).toBe('entry=manual;snap=0');
    expect(navModule.__navMocks.setParams).not.toHaveBeenCalled();
  });
});

describe('PlanScreen weekly recap behavior', () => {
  beforeEach(() => {
    resetAllStores();
  });

  function deriveWeekKey(now: Date): string {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const yearStart = new Date(d.getFullYear(), 0, 4);
    const weekNum = Math.ceil(
      ((d.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() + 1) / 7,
    );
    return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
  }

  it('does not show the recap card on weekdays', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 3, 15, 9, 0, 0)); // Wednesday

    const { queryByText } = renderWithProviders(<PlanScreen />);
    expect(queryByText('WEEKLY_RECAP')).toBeNull();

    jest.useRealTimers();
  });

  it('shows the recap card on Sunday and dismisses to write the week key into the store', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 3, 12, 9, 0, 0)); // Sunday

    const { getByText, getByLabelText } = renderWithProviders(<PlanScreen />);
    expect(getByText('WEEKLY_RECAP')).toBeTruthy();

    fireEvent.press(getByLabelText('Weekly recap card'));
    expect(useAppStore.getState().lastWeeklyRecapDismissedWeekKey).toBe(
      deriveWeekKey(new Date()),
    );

    jest.useRealTimers();
  });

  it('hides the recap card after the week has been dismissed', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 3, 12, 9, 0, 0)); // Sunday
    useAppStore.setState({
      lastWeeklyRecapDismissedWeekKey: deriveWeekKey(new Date()),
    } as any);

    const { queryByText } = renderWithProviders(<PlanScreen />);
    expect(queryByText('WEEKLY_RECAP')).toBeNull();

    jest.useRealTimers();
  });
});
