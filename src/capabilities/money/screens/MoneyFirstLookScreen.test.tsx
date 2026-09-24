import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { MoneyFirstLookScreen } from './MoneyFirstLookScreen';

jest.mock('../../../features/capability-onboarding/OnboardingShorelineBackdrop', () => ({ OnboardingShorelineBackdrop: () => null }));

describe('MoneyFirstLookScreen', () => {
  it('shows scoped evidence and lets the person inspect, continue, or leave', () => {
    const onInspect = jest.fn(); const onContinue = jest.fn(); const onExplore = jest.fn();
    const screen = renderWithProviders(<MoneyFirstLookScreen finding={{ amountCents: 2800, currencyCode: 'USD', transactionIds: ['one', 'two'], startDate: '2026-09-01', endDate: '2026-09-07' }} onContinue={onContinue} onExplore={onExplore} onInspect={onInspect} />);
    expect(screen.getByText('$28')).toBeTruthy();
    expect(screen.getByText(/before refunds and credits/)).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Review these transactions' }));
    expect(onInspect).toHaveBeenCalledTimes(1);
    expect(onContinue).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole('button', { name: 'Continue to budget' }));
    fireEvent.press(screen.getByRole('button', { name: 'Go to Money' }));
    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onExplore).toHaveBeenCalledTimes(1);
  });
  it('does not display a made-up zero or evidence button with insufficient data', () => {
    const screen = renderWithProviders(<MoneyFirstLookScreen finding={null} onContinue={jest.fn()} onExplore={jest.fn()} onInspect={jest.fn()} />);
    expect(screen.getByText(/isn’t enough posted activity/)).toBeTruthy();
    expect(screen.queryByText('$0')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Review these transactions' })).toBeNull();
  });
});
