import { act, fireEvent, render } from '@testing-library/react-native';
import { RefreshControl, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HapticsService } from '../../../services/HapticsService';
import { MoneyScreenFrame } from './MoneyScreenFrame';

const mockRefresh = jest.fn(async () => undefined);
const mockUseMoneyData = jest.fn();
const mockUseCapabilityShell = jest.fn(() => ({ openMenu: jest.fn() }));

jest.mock('../../../services/HapticsService', () => ({
  HapticsService: { trigger: jest.fn(async () => undefined) },
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));
jest.mock('../../../navigation/CapabilityShellContext', () => ({
  useCapabilityShell: () => mockUseCapabilityShell(),
}));
jest.mock('../data/MoneyDataContext', () => ({
  useMoneyData: () => mockUseMoneyData(),
}));

function moneyState(overrides: Record<string, unknown>) {
  return {
    error: null,
    pendingAppControlReviewCategoryId: null,
    refresh: mockRefresh,
    refreshing: false,
    snapshot: null,
    status: 'loading',
    ...overrides,
  };
}

describe('MoneyScreenFrame recovery states', () => {
  beforeEach(() => {
    mockRefresh.mockClear();
    mockUseCapabilityShell.mockReset().mockReturnValue({ openMenu: jest.fn() });
    jest.mocked(HapticsService.trigger).mockClear();
  });

  const renderFrame = () => render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, right: 0, bottom: 34, left: 0 },
      }}
    >
      <MoneyScreenFrame title="Budget"><Text>Budget content</Text></MoneyScreenFrame>
    </SafeAreaProvider>,
  );

  it('keeps the recognizable Budget structure visible while the first snapshot loads', () => {
    mockUseMoneyData.mockReturnValue(moneyState({ status: 'loading' }));

    const screen = renderFrame();

    expect(screen.getByTestId('money-loading-preview')).toBeTruthy();
    expect(screen.getByText('Getting your budget ready')).toBeTruthy();
    expect(screen.queryByText('Budget content')).toBeNull();
  });

  it('offers recovery inside the Budget structure when no trustworthy snapshot is available', () => {
    mockUseMoneyData.mockReturnValue(moneyState({
      error: 'Money data could not be loaded.',
      status: 'error',
    }));

    const screen = renderFrame();

    expect(screen.getByTestId('money-unavailable-preview')).toBeTruthy();
    expect(screen.getByText('Your budget is still here')).toBeTruthy();
    expect(screen.getByText('Kwilt couldn’t refresh it right now. Your plan and transaction data haven’t been changed.')).toBeTruthy();
    fireEvent.press(screen.getByText('Try again'));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('keeps the last trustworthy Budget content visible when a refresh fails', () => {
    mockUseMoneyData.mockReturnValue(moneyState({
      error: 'Network unavailable',
      snapshot: { generatedAt: 'earlier' },
      status: 'ready',
    }));

    const screen = renderFrame();

    expect(screen.getByText('Budget content')).toBeTruthy();
    expect(screen.getByText('Showing the last successful update')).toBeTruthy();
  });

  it('acknowledges a committed pull with one selection haptic', () => {
    mockUseMoneyData.mockReturnValue(moneyState({
      snapshot: { generatedAt: 'now' },
      status: 'ready',
    }));

    const screen = renderFrame();
    act(() => {
      screen.UNSAFE_getByType(RefreshControl).props.onRefresh();
    });

    expect(HapticsService.trigger).toHaveBeenCalledTimes(1);
    expect(HapticsService.trigger).toHaveBeenCalledWith('canvas.selection');
  });

  it('renders a back-owned frame without requiring the global capability shell', () => {
    mockUseMoneyData.mockReturnValue(moneyState({
      snapshot: { generatedAt: 'now' },
      status: 'ready',
    }));
    mockUseCapabilityShell.mockImplementation(() => {
      throw new Error('Capability shell should not be read for a back-owned frame.');
    });

    const screen = render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <MoneyScreenFrame title="Accounts" onPressBack={jest.fn()}>
          <Text>Account content</Text>
        </MoneyScreenFrame>
      </SafeAreaProvider>,
    );

    expect(screen.getByText('Account content')).toBeTruthy();
    expect(mockUseCapabilityShell).not.toHaveBeenCalled();
  });
});
