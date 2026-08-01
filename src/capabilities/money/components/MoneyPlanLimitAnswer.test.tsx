import { fireEvent, render, within } from '@testing-library/react-native';
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
      periodId: '2026-07', planVersionId: 'version-1', policyVersion: 'money-plan-limit-v2',
      resourceBasisCents: 480000, resourceBasisKind: 'detected_income', resourceBasisUpdatedAtIso: '2026-07-24T12:00:00Z',
      livingPercent: 70, livingLimitCents: 336000, protectedPlanCents: 200000, protectedOverageCents: 0, flexibleCapacityCents: 136000,
      countedFlexibleSpendCents: 101704, flexibleRoomCents: 34296, flexibleRoomLowCents: 34296,
      flexibleRoomHighCents: 34296, unresolvedInScopeCents: 0, plannedCents: 336000,
      unassignedCents: 0, overLimitCents: 0, freshness: 'fresh', confidence: 'supported', qualificationReason: null,
    },
    ...overrides,
  };
}

describe('MoneyPlanLimitAnswer', () => {
  it('renders the exact answer in one compact card', () => {
    const onExplain = jest.fn();
    const screen = render(<MoneyPlanLimitAnswer answer={answer('supported')} freshness="Updated just now" onExplain={onExplain} onReviewIncome={jest.fn()} />);

    expect(screen.getByTestId('money-limit-card')).toBeTruthy();
    const header = screen.getByTestId('money-limit-header');
    expect(within(header).getByText('Flexible spending')).toBeTruthy();
    expect(within(header).getByRole('button', { name: 'What’s included?' })).toBeTruthy();
    expect(screen.queryByText('Flexible spending this month')).toBeNull();
    expect(screen.getByTestId('money-limit-currency-symbol').props.children).toBe('$');
    expect(screen.getByTestId('money-limit-amount-number').props.children).toBe('342.96');
    expect(screen.getByTestId('money-limit-amount-row').props.accessibilityLabel).toBe('$342.96 left');
    expect(screen.getByTestId('money-limit-amount-row').props.accessible).toBe(true);
    expect(screen.queryByText('$342.96')).toBeNull();
    expect(screen.getByText('left')).toBeTruthy();
    expect(screen.queryByText('$342.96 left')).toBeNull();
    expect(screen.getByText('out of $1,360')).toBeTruthy();
    expect(screen.queryByText('$1,017.04 of $1,360 spent')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'What’s included?' }));
    expect(onExplain).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'See calculation' })).toBeNull();
    expect(screen.queryByText(/left for flexible spending this month/i)).toBeNull();
    expect(screen.queryByText(/confidence/i)).toBeNull();
  });

  it('reduces flexible overspending to one direct amount', () => {
    const base = answer('supported');
    const screen = render(<MoneyPlanLimitAnswer
      answer={{
        ...base,
        state: 'over_flexible_room',
        headlineAmountCents: 238643,
        facts: {
          ...base.facts,
          flexibleCapacityCents: 374519,
          countedFlexibleSpendCents: 613162,
          flexibleRoomCents: -238643,
        },
      }}
      freshness="Updated just now"
      onExplain={jest.fn()}
      onReviewIncome={jest.fn()}
    />);

    expect(screen.getByTestId('money-limit-currency-symbol').props.children).toBe('$');
    expect(screen.getByTestId('money-limit-amount-number').props.children).toBe('2,386.43');
    expect(screen.getByText('over')).toBeTruthy();
    expect(screen.getByText('out of $3,745.19')).toBeTruthy();
    expect(screen.queryByText('$6,131.62 of $3,745.19 spent')).toBeNull();
    expect(screen.queryByText(/beyond the room/i)).toBeNull();
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
    expect(screen.getByTestId('money-limit-currency-symbol').props.children).toBe('$');
    expect(screen.getByTestId('money-limit-amount-number').props.children).toBe('342.96');
    expect(screen.getByText('left')).toBeTruthy();
    expect(screen.getByText('out of $1,360')).toBeTruthy();
    expect(screen.queryByText(/transactions need/i)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Open connected accounts' })).toBeNull();
    expect(screen.getByRole('button', { name: 'What’s included?' })).toBeTruthy();
  });
});
