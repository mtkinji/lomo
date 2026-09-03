import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../test/renderWithProviders';
import { resetAllStores, setProEntitlement } from '../../test/storeFixtures';
import { PaywallContent } from './PaywallDrawer';
import { useAppStore } from '../../store/useAppStore';
import { getMonthKey } from '../../domain/generativeCredits';
import type { ContextualCommercialOffer } from '../account/subscriptionPricing';

const mockCapture = jest.fn();

jest.mock('../../services/analytics/useAnalytics', () => ({
  useAnalytics: () => ({ capture: mockCapture }),
}));

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
    jest.restoreAllMocks();
    mockCapture.mockClear();
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
    // The action truthfully opens plan choice; it does not purchase immediately.
    expect(getByText('View Pro plans')).toBeTruthy();
  });

  it('does not turn a retired Free capability into an offer', () => {
    const { queryByText } = renderWithProviders(
      <PaywallContent
        reason="limit_goals_per_arc"
        source="goals_create_manual"
        onClose={() => undefined}
      />,
    );
    expect(queryByText('View Pro plans')).toBeNull();
  });

  it('invokes onClose when the Close paywall button is pressed', () => {
    const onClose = jest.fn();
    const { getByLabelText } = renderWithProviders(
      <PaywallContent
        reason="pro_money_budgets"
        source="money_connect_account"
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
        reason="pro_money_budgets"
        source="money_connect_account"
        onClose={() => undefined}
      />,
    );
    expect(queryByText('View Pro plans')).toBeNull();
    expect(getByLabelText('Close')).toBeTruthy();
    expect(queryByText('What Pro adds')).toBeNull();
  });

  it('turns the Money paywall into one visual promise instead of a feature list', () => {
    const { getByText, getByLabelText, queryByText } = renderWithProviders(
      <PaywallContent
        reason="pro_money_budgets"
        source="money_onboarding_add_institution"
        onClose={() => undefined}
      />,
    );
    expect(getByText('Know what’s left. Stay in control.')).toBeTruthy();
    expect(getByText('Kwilt keeps your plan current and can pause selected spending apps until you decide.')).toBeTruthy();
    expect(getByLabelText('A parent checking their phone before a household purchase')).toBeTruthy();
    expect(getByText('Spending app paused')).toBeTruthy();
    expect(queryByText('Kwilt Money')).toBeNull();
    expect(getByLabelText('Upgrade to Pro')).toBeTruthy();
    expect(queryByText('Not now')).toBeNull();
    expect(queryByText('With Pro')).toBeNull();
    expect(queryByText('Real transactions keep your plan up to date')).toBeNull();
  });

  it('presents the verified trial and annual savings without adding another action', () => {
    const moneyCommercialOffer: ContextualCommercialOffer = {
      text: 'One month free. Save up to 56% with annual.',
      cta: 'Try Pro free',
      trialAdvertised: true,
      maximumAnnualSavingsPercent: 56,
      offerState: 'trial_and_annual_savings',
    };
    const { getByText, getByLabelText, queryByText } = renderWithProviders(
      <PaywallContent
        reason="pro_money_budgets"
        source="money_connect_account"
        onClose={() => undefined}
        moneyCommercialOffer={moneyCommercialOffer}
      />,
    );

    expect(getByText('One month free. Save up to 56% with annual.')).toBeTruthy();
    expect(getByLabelText('Try Pro free')).toBeTruthy();
    expect(queryByText('Price unavailable')).toBeNull();
    expect(queryByText('Not now')).toBeNull();
    expect(queryByText('Terms of Use (EULA)')).toBeNull();
  });

  it('uses the standard upgrade action when only annual savings is available', () => {
    const moneyCommercialOffer: ContextualCommercialOffer = {
      text: 'Save up to 56% with annual.',
      cta: 'Upgrade to Pro',
      trialAdvertised: false,
      maximumAnnualSavingsPercent: 56,
      offerState: 'annual_savings',
    };
    const { getByText, getByLabelText, queryByText } = renderWithProviders(
      <PaywallContent
        reason="pro_money_budgets"
        source="money_connect_account"
        onClose={() => undefined}
        moneyCommercialOffer={moneyCommercialOffer}
      />,
    );

    expect(getByText('Save up to 56% with annual.')).toBeTruthy();
    expect(getByLabelText('Upgrade to Pro')).toBeTruthy();
    expect(queryByText('One month free.')).toBeNull();
  });

  it('records one Money paywall view after the offer state resolves', () => {
    const moneyCommercialOffer: ContextualCommercialOffer = {
      text: 'One month free. Save up to 56% with annual.',
      cta: 'Try Pro free',
      trialAdvertised: true,
      maximumAnnualSavingsPercent: 56,
      offerState: 'trial_and_annual_savings',
    };
    const { rerender } = renderWithProviders(
      <PaywallContent
        reason="pro_money_budgets"
        source="money_connect_account"
        onClose={() => undefined}
        moneyOfferResolved={false}
      />,
    );
    expect(mockCapture).not.toHaveBeenCalledWith('paywall_viewed', expect.anything());

    rerender(
      <PaywallContent
        reason="pro_money_budgets"
        source="money_connect_account"
        onClose={() => undefined}
        moneyCommercialOffer={moneyCommercialOffer}
        moneyOfferResolved
      />,
    );
    rerender(
      <PaywallContent
        reason="pro_money_budgets"
        source="money_connect_account"
        onClose={() => undefined}
        moneyCommercialOffer={moneyCommercialOffer}
        moneyOfferResolved
      />,
    );

    expect(mockCapture).toHaveBeenCalledTimes(1);
    expect(mockCapture).toHaveBeenCalledWith('paywall_viewed', {
      reason: 'pro_money_budgets',
      source: 'money_connect_account',
      variant: 'money_contextual_template_v1',
      offer_state: 'trial_and_annual_savings',
    });
  });

  it('describes the exact conditions unlocked by an advanced Screen Time paywall', () => {
    const { getByText } = renderWithProviders(
      <PaywallContent
        reason="pro_advanced_screen_time_rules"
        source="screen_time_add_condition"
        onClose={() => undefined}
      />,
    );

    expect(getByText('Make Screen Time fit the rule you need')).toBeTruthy();
    expect(getByText('Schedule when selected apps pause or open')).toBeTruthy();
    expect(getByText('Combine Focus and daily app use when one condition is not enough')).toBeTruthy();
    expect(getByText('Require a completed step or budget review')).toBeTruthy();
  });

  it.each([
    {
      reason: 'pro_family_screen_time' as const,
      source: 'screen_time_family' as const,
      title: 'Make Screen Time a family agreement',
      proof: 'See whether each device received the latest rule',
    },
    {
      reason: 'pro_advanced_cloud_ai' as const,
      source: 'goals_create_ai' as const,
      title: 'Plan across more than one part of life',
      proof: 'Get 1,000 cloud AI credits each month',
    },
    {
      reason: 'pro_ai_attachment_analysis' as const,
      source: 'activity_detail_ai' as const,
      title: 'Turn this file into a useful next step',
      proof: 'Review the result before anything changes',
    },
    {
      reason: 'pro_ai_scheduling' as const,
      source: 'goals_create_ai' as const,
      title: 'Give this work a place in your week',
      proof: 'Approve the schedule before it is saved',
    },
    {
      reason: 'pro_background_ai' as const,
      source: 'goals_create_ai' as const,
      title: 'Let Kwilt finish while you move on',
      proof: 'Review the result before anything changes',
    },
    {
      reason: 'pro_external_agent' as const,
      source: 'settings' as const,
      title: 'Bring Kwilt into the AI tools you use',
      proof: 'Review changes before they are applied',
    },
  ])('gives $reason an outcome, mechanism, and control', ({ reason, source, title, proof }) => {
    const { getByText } = renderWithProviders(
      <PaywallContent reason={reason} source={source} onClose={() => undefined} />,
    );

    expect(getByText(title)).toBeTruthy();
    expect(getByText(proof)).toBeTruthy();
    expect(getByText('View Pro plans')).toBeTruthy();
  });

  it('the Money upgrade CTA calls onUpgrade override when provided', () => {
    const onClose = jest.fn();
    const onUpgrade = jest.fn();
    const { getByLabelText } = renderWithProviders(
      <PaywallContent
        reason="pro_money_budgets"
        source="money_connect_account"
        onClose={onClose}
        onUpgrade={onUpgrade}
      />,
    );
    fireEvent.press(getByLabelText('Upgrade to Pro'));
    expect(onUpgrade).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('can leave the Money upgrade action to its owning drawer footer', () => {
    const { queryByLabelText } = renderWithProviders(
      <PaywallContent
        reason="pro_money_budgets"
        source="money_connect_account"
        onClose={() => undefined}
        showAction={false}
      />,
    );

    expect(queryByLabelText('Upgrade to Pro')).toBeNull();
  });

  it('leaves Terms and Privacy for the plan-selection surface', () => {
    const { queryByText } = renderWithProviders(
      <PaywallContent
        reason="pro_money_budgets"
        source="money_connect_account"
        onClose={() => undefined}
      />,
    );

    expect(queryByText('Terms of Use (EULA)')).toBeNull();
    expect(queryByText('Privacy Policy')).toBeNull();
  });
});
