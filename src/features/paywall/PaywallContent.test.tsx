import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../test/renderWithProviders';
import { resetAllStores, setProEntitlement } from '../../test/storeFixtures';
import { PaywallContent } from './PaywallDrawer';
import { useAppStore } from '../../store/useAppStore';
import { getMonthKey } from '../../domain/generativeCredits';

jest.mock('../../services/paywall', () => {
  const actual = jest.requireActual('../../services/paywall');
  return {
    ...actual,
    openPaywallPurchaseEntry: jest.fn(),
  };
});

describe('PaywallContent', () => {
  beforeEach(() => {
    resetAllStores();
  });

  it('renders quota copy for generative_quota_exceeded reason as a free user', () => {
    const monthKey = getMonthKey(new Date());
    useAppStore.setState({
      generativeCredits: { monthKey, usedThisMonth: 50 },
    } as any);
    const { getByText } = renderWithProviders(
      <PaywallContent
        reason="generative_quota_exceeded"
        source="goals_create_ai"
        onClose={() => undefined}
      />,
    );
    expect(getByText('You’re out of AI credits')).toBeTruthy();
    // Subtitle includes the credit usage block
    expect(getByText(/AI credits for this month/)).toBeTruthy();
    // Upsell CTA is visible for free users
    expect(getByText('Upgrade')).toBeTruthy();
  });

  it('renders limit_goals_per_arc copy', () => {
    const { getByText } = renderWithProviders(
      <PaywallContent
        reason="limit_goals_per_arc"
        source="goals_create_manual"
        onClose={() => undefined}
      />,
    );
    expect(getByText('Make room for the goals that matter right now')).toBeTruthy();
  });

  it('renders limit_arcs_total copy', () => {
    const { getByText } = renderWithProviders(
      <PaywallContent
        reason="limit_arcs_total"
        source="arcs_create"
        onClose={() => undefined}
      />,
    );
    expect(getByText('Make room for more than one direction')).toBeTruthy();
  });

  it('invokes onClose when the Close paywall button is pressed', () => {
    const onClose = jest.fn();
    const { getByLabelText } = renderWithProviders(
      <PaywallContent
        reason="limit_arcs_total"
        source="arcs_create"
        onClose={onClose}
      />,
    );
    fireEvent.press(getByLabelText('Close paywall'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows a Close button (no Upgrade) for Pro users and hides the value list', () => {
    setProEntitlement(true);
    const { queryByText, getByLabelText } = renderWithProviders(
      <PaywallContent
        reason="limit_goals_per_arc"
        source="goals_create_manual"
        onClose={() => undefined}
      />,
    );
    expect(queryByText('Upgrade')).toBeNull();
    expect(getByLabelText('Close')).toBeTruthy();
    expect(queryByText('What Pro adds')).toBeNull();
  });

  it('shows the "What Pro adds" benefits list for free users', () => {
    const { getByText } = renderWithProviders(
      <PaywallContent
        reason="limit_arcs_total"
        source="arcs_create"
        onClose={() => undefined}
      />,
    );
    expect(getByText('What Pro adds')).toBeTruthy();
    expect(getByText('1,000 AI credits / month')).toBeTruthy();
    expect(getByText('Unlimited arcs + goals')).toBeTruthy();
  });

  it('Upgrade button calls onUpgrade override when provided', () => {
    const onClose = jest.fn();
    const onUpgrade = jest.fn();
    const { getByLabelText } = renderWithProviders(
      <PaywallContent
        reason="limit_arcs_total"
        source="arcs_create"
        onClose={onClose}
        onUpgrade={onUpgrade}
      />,
    );
    fireEvent.press(getByLabelText('Upgrade to Pro'));
    expect(onUpgrade).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });
});
