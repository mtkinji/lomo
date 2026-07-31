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
    const screen = render(<MoneyPlanLimitAnswer answer={answer('supported')} onExplain={onExplain} onReview={jest.fn()} />);

    expect(screen.getByText('$343 left for flexible spending')).toBeTruthy();
    expect(screen.getByText('Within your 70% living limit of $3,360.')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'How this works' }));
    expect(onExplain).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('money-limit-card')).toBeNull();
    expect(screen.queryByText(/confidence/i)).toBeNull();
  });

  it('rounds a qualified estimate and labels it About', () => {
    const screen = render(<MoneyPlanLimitAnswer answer={answer('estimated', { headlineAmountCents: 32296 })} onExplain={jest.fn()} onReview={jest.fn()} />);
    expect(screen.getByText('About $320 left for flexible spending')).toBeTruthy();
  });

  it('turns materially branching uncertainty into one review entry', () => {
    const onReview = jest.fn();
    const screen = render(<MoneyPlanLimitAnswer answer={answer('needs_one_answer', { headlineAmountCents: null, reviewTransactionIds: ['one', 'two'] })} onExplain={jest.fn()} onReview={onReview} />);

    expect(screen.getByText('Kwilt needs one answer')).toBeTruthy();
    expect(screen.getByText('Two purchases could change what is left inside your 70% living limit.')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Review purchases' }));
    expect(onReview).toHaveBeenCalledTimes(1);
  });

  it('never turns missing income evidence into a zero-dollar answer', () => {
    const screen = render(<MoneyPlanLimitAnswer answer={answer('missing_income_basis', { headlineAmountCents: null, limitLine: null })} onExplain={jest.fn()} onReview={jest.fn()} />);
    expect(screen.getByText('Kwilt needs your monthly income')).toBeTruthy();
    expect(screen.queryByText(/\$0/)).toBeNull();
  });
});
