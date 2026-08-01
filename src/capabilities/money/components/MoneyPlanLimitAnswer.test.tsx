import { fireEvent, render } from '@testing-library/react-native';
import type { MoneyPlanLimitAnswer as Answer } from '../domain/moneyPlanLimitAnswer';
import { MoneyPlanLimitAnswer } from './MoneyPlanLimitAnswer';

function answer(state: Answer['state'], overrides: Partial<Answer> = {}): Answer {
  return {
    state,
    headlineAmountCents: 34296,
    limitLine: { livingPercent: 70, livingLimitCents: 336000 },
    qualification: null,
    recoveryAction: null,
    reviewTransactionIds: [],
    facts: {
      periodId: '2026-07', planVersionId: 'version-1', policyVersion: 'money-plan-limit-v1',
      resourceBasisCents: 480000, resourceBasisKind: 'detected_income', resourceBasisUpdatedAtIso: '2026-07-24T12:00:00Z',
      livingPercent: 70, livingLimitCents: 336000, protectedPlanCents: 200000, flexibleCapacityCents: 136000,
      countedFlexibleSpendCents: 101704, flexibleRoomCents: 34296, flexibleRoomLowCents: 34296,
      flexibleRoomHighCents: 34296, unresolvedInScopeCents: 0, plannedCents: 336000,
      unassignedCents: 0, overLimitCents: 0, freshness: 'fresh', confidence: 'supported', qualificationReason: null,
    },
    ...overrides,
  };
}

describe('MoneyPlanLimitAnswer', () => {
  it('renders the exact answer with only its limit and disclosure control', () => {
    const onExplain = jest.fn();
    const screen = render(<MoneyPlanLimitAnswer answer={answer('supported')} freshness="Updated just now" onExplain={onExplain} onReviewIncome={jest.fn()} />);

    expect(screen.getByText('$342.96 left for flexible spending this month')).toBeTruthy();
    expect(screen.getByText('$1,017.04 of $1,360 used')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'See monthly plan' }));
    expect(onExplain).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('money-limit-card')).toBeNull();
    expect(screen.queryByText(/confidence/i)).toBeNull();
  });

  it('turns genuinely missing income into one compact recovery card', () => {
    const onReviewIncome = jest.fn();
    const screen = render(<MoneyPlanLimitAnswer answer={answer('missing_income_basis', { headlineAmountCents: null, limitLine: null })} freshness="Updated just now" onExplain={jest.fn()} onReviewIncome={onReviewIncome} />);
    expect(screen.getByTestId('money-limit-recovery-card')).toBeTruthy();
    expect(screen.getByText('Finish your monthly plan')).toBeTruthy();
    expect(screen.getByText('Add your monthly income so Kwilt can calculate flexible money.')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Finish plan' }));
    expect(onReviewIncome).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('How this works')).toBeNull();
    expect(screen.queryByText(/\$0/)).toBeNull();
  });

  it('keeps stale maintenance out of the user flow', () => {
    const screen = render(<MoneyPlanLimitAnswer answer={answer('stale')} freshness="Updated 4 days ago" onExplain={jest.fn()} onReviewIncome={jest.fn()} />);
    expect(screen.queryByTestId('money-limit-recovery-card')).toBeNull();
    expect(screen.getByText('$342.96 left for flexible spending this month')).toBeTruthy();
    expect(screen.getByText('$1,017.04 of $1,360 used')).toBeTruthy();
    expect(screen.queryByText(/transactions need/i)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Open connected accounts' })).toBeNull();
    expect(screen.getByRole('button', { name: 'See monthly plan' })).toBeTruthy();
  });
});
