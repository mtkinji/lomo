import { fireEvent, render, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { colors } from '../../../theme';
import { Card } from '../../../ui/Card';
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
      periodId: '2026-07', planVersionId: 'version-1', policyVersion: 'money-plan-limit-v3',
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
    expect(within(header).getByRole('button', { name: 'About flexible spending' })).toBeTruthy();
    expect(screen.queryByText('Flexible spending this month')).toBeNull();
    expect(screen.getByTestId('money-limit-currency-symbol').props.children).toBe('$');
    expect(screen.getByTestId('money-limit-amount-number').props.children).toBe('343');
    expect(screen.getByTestId('money-limit-amount-row').props.accessibilityLabel).toBe('$343 left');
    expect(screen.getByTestId('money-limit-amount-row').props.accessible).toBe(true);
    expect(screen.queryByText('$342.96')).toBeNull();
    expect(screen.getByText('left')).toBeTruthy();
    expect(screen.queryByText('$342.96 left')).toBeNull();
    expect(screen.queryByText('Current budget $1,360')).toBeNull();
    expect(screen.queryByText('$1,017.04 of $1,360 spent')).toBeNull();
    const explanation = screen.getByRole('button', { name: 'About flexible spending' });
    expect(explanation.props.accessibilityState).toMatchObject({ expanded: false });
    fireEvent.press(explanation);
    expect(onExplain).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Spending you can adjust month to month, after bills and money set aside.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'About flexible spending' }).props.accessibilityState).toMatchObject({ expanded: true });
    fireEvent.press(screen.getByRole('button', { name: 'About flexible spending' }));
    expect(screen.queryByText('Spending you can adjust month to month, after bills and money set aside.')).toBeNull();
    expect(onExplain).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'See calculation' })).toBeNull();
    expect(screen.queryByText(/left for flexible spending this month/i)).toBeNull();
    expect(screen.queryByText(/confidence/i)).toBeNull();
    expect(screen.UNSAFE_getByType(Card).props.style).toEqual(expect.arrayContaining([
      expect.objectContaining({ borderWidth: 0 }),
      expect.objectContaining({ backgroundColor: colors.fieldFill }),
    ]));
    expect(StyleSheet.flatten(screen.getByTestId('money-limit-amount-number').props.style).fontSize).toBe(38);
  });

  it('reduces flexible overspending to one direct amount', () => {
    const base = answer('supported');
    const onReviewOverages = jest.fn();
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
      onReviewOverages={onReviewOverages}
    />);

    expect(screen.getByTestId('money-limit-currency-symbol').props.children).toBe('$');
    expect(screen.getByTestId('money-limit-amount-number').props.children).toBe('2,386');
    expect(screen.getByText('over budget')).toBeTruthy();
    expect(screen.getByTestId('money-limit-amount-row').props.accessibilityLabel).toBe('$2,386 over budget');
    expect(screen.queryByText('Current budget $3,745')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Review overages' }));
    expect(onReviewOverages).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('$6,131.62 of $3,745.19 spent')).toBeNull();
    expect(screen.queryByText(/beyond the room/i)).toBeNull();
    expect(screen.UNSAFE_getByType(Card).props.style).toEqual(expect.arrayContaining([
      expect.objectContaining({ borderWidth: 0 }),
      expect.objectContaining({ backgroundColor: colors.fieldFill }),
    ]));
    expect(StyleSheet.flatten(screen.getByTestId('money-limit-amount-number').props.style).color).toBe(colors.destructive);
    expect(StyleSheet.flatten(screen.getByText('over budget').props.style).color).toBe(colors.destructive);
  });

  it('keeps actual flexible room primary when the monthly plan is above target', () => {
    const base = answer('supported');
    const onAdjustPlan = jest.fn();
    const screen = render(<MoneyPlanLimitAnswer
      answer={{
        ...base,
        state: 'over_limit',
        headlineAmountCents: 8400,
        facts: {
          ...base.facts,
          plannedCents: 344400,
          overLimitCents: 8400,
        },
      }}
      freshness="Updated just now"
      onAdjustPlan={onAdjustPlan}
      onExplain={jest.fn()}
      onReviewIncome={jest.fn()}
      onReviewOverages={jest.fn()}
    />);

    expect(within(screen.getByTestId('money-limit-header')).getByText('Flexible spending')).toBeTruthy();
    expect(screen.getByTestId('money-limit-amount-row').props.accessibilityLabel).toBe('$343 left');
    expect(screen.queryByText('over limit')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Review overages' })).toBeNull();
    const planNotice = screen.getByTestId('money-plan-target-notice');
    expect(within(planNotice).getByText('Plan is $84 above target')).toBeTruthy();
    expect(within(planNotice).getByText('$3,444 planned · 70% target $3,360')).toBeTruthy();
    fireEvent.press(within(planNotice).getByRole('button', { name: 'Adjust monthly plan' }));
    expect(onAdjustPlan).toHaveBeenCalledTimes(1);
  });

  it('offers actual overage review separately from an above-target plan', () => {
    const base = answer('supported');
    const onReviewOverages = jest.fn();
    const screen = render(<MoneyPlanLimitAnswer
      answer={{
        ...base,
        state: 'over_limit',
        headlineAmountCents: 8400,
        facts: {
          ...base.facts,
          plannedCents: 344400,
          overLimitCents: 8400,
          countedFlexibleSpendCents: 374643,
          flexibleRoomCents: -238643,
        },
      }}
      freshness="Updated just now"
      onAdjustPlan={jest.fn()}
      onExplain={jest.fn()}
      onReviewIncome={jest.fn()}
      onReviewOverages={onReviewOverages}
    />);

    expect(screen.getByTestId('money-limit-amount-row').props.accessibilityLabel).toBe('$2,386 over budget');
    fireEvent.press(screen.getByRole('button', { name: 'Review overages' }));
    expect(onReviewOverages).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Plan is $84 above target')).toBeTruthy();
  });

  it('keeps committed overspending out of the fixed flexible budget', () => {
    const base = answer('supported');
    const screen = render(<MoneyPlanLimitAnswer
      answer={{
        ...base,
        state: 'over_flexible_room',
        facts: {
          ...base.facts,
          protectedOverageCents: 21_253,
          flexibleCapacityCents: 374_519,
          countedFlexibleSpendCents: 622_515,
          flexibleRoomCents: -247_996,
        },
      }}
      freshness="Updated just now"
      onExplain={jest.fn()}
      onReviewIncome={jest.fn()}
    />);

    expect(screen.getByTestId('money-limit-amount-row').props.accessibilityLabel).toBe('$2,480 over budget');
    expect(screen.queryByText('Current budget $3,745')).toBeNull();
    expect(screen.queryByText(/shifted to committed spending/i)).toBeNull();
  });

  it('uses a watch surface when committed costs leave no flexible room', () => {
    const screen = render(<MoneyPlanLimitAnswer
      answer={answer('no_flexible_room', { headlineAmountCents: 0 })}
      freshness="Updated just now"
      onExplain={jest.fn()}
      onReviewIncome={jest.fn()}
    />);

    expect(screen.getByTestId('money-limit-amount-row').props.accessibilityLabel).toBe('$0 left');
    expect(screen.getByText('Protected costs use your full living limit')).toBeTruthy();
    expect(screen.UNSAFE_getByType(Card).props.style).toEqual(expect.arrayContaining([
      expect.objectContaining({ borderWidth: 0 }),
      expect.objectContaining({ backgroundColor: colors.fieldFill }),
    ]));
  });

  it('keeps an unavailable calculation visually neutral', () => {
    const screen = render(<MoneyPlanLimitAnswer
      answer={answer('needs_one_answer', { headlineAmountCents: null })}
      freshness="Updated just now"
      onExplain={jest.fn()}
      onReviewIncome={jest.fn()}
    />);

    expect(screen.getByText('Update unavailable')).toBeTruthy();
    expect(screen.UNSAFE_getByType(Card).props.style).toEqual(expect.arrayContaining([
      expect.objectContaining({ borderWidth: 0 }),
      expect.objectContaining({ backgroundColor: colors.fieldFill }),
    ]));
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
    expect(screen.getByTestId('money-limit-amount-number').props.children).toBe('343');
    expect(screen.getByText('left')).toBeTruthy();
    expect(screen.queryByText('Current budget $1,360')).toBeNull();
    expect(screen.queryByText(/transactions need/i)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Open connected accounts' })).toBeNull();
    expect(screen.getByRole('button', { name: 'About flexible spending' })).toBeTruthy();
  });
});
