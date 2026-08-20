import * as React from 'react';
import { Image, StyleSheet } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { colors, radii, spacing } from '../../../theme';
import { useToastStore } from '../../../store/useToastStore';
import { BottomDrawer } from '../../../ui/BottomDrawer';
import type {
  ChoreRewardPayout,
  ChoreRewardsProjection,
} from '../domain/choreLearning';
import { createChoreLearningRecord } from '../domain/choreLearning';
import { ChoreRewardsDrawer } from './ChoreRewardsDrawer';

const child = createChoreLearningRecord().members.find((member) => member.role === 'child')!;

function payout(overrides: Partial<ChoreRewardPayout> = {}): ChoreRewardPayout {
  return {
    payoutId: 'payout-one',
    memberId: child.id,
    tokenAmount: 2,
    moneyAmountCents: 100,
    exchangeRateCentsPerToken: 50,
    convertedAtIso: '2026-08-18T16:00:00.000Z',
    settledAtIso: null,
    settledByMemberId: null,
    cancelledAtIso: null,
    ...overrides,
  };
}

function projection(overrides: Partial<ChoreRewardsProjection> = {}): ChoreRewardsProjection {
  return {
    member: child,
    availableTokens: 2,
    reservedTokens: 0,
    totalTokens: 2,
    availableMoneyAmountCents: 150,
    exchangeRateCentsPerToken: 75,
    pendingPayouts: [],
    payouts: [],
    events: [],
    ...overrides,
  };
}

function renderDrawer(
  rewards: ChoreRewardsProjection,
  overrides: Partial<React.ComponentProps<typeof ChoreRewardsDrawer>> = {},
) {
  return renderWithProviders(
    <ChoreRewardsDrawer
      visible
      rewards={[rewards]}
      isCaregiver={false}
      onRequestRedemption={jest.fn()}
      onCancelRedemption={jest.fn()}
      onSettlePayouts={jest.fn()}
      onClose={jest.fn()}
      {...overrides}
    />,
  );
}

describe('ChoreRewardsDrawer child hierarchy', () => {
  it('keeps redemption proximal to the balance and reveals the converter only after entry', () => {
    const onRequestRedemption = jest.fn();
    const screen = renderDrawer(projection(), { onRequestRedemption });
    let drawer = screen.UNSAFE_getAllByType(BottomDrawer).find((item) => item.props.visible);

    expect(drawer?.props.dynamicSizing).toBe(true);
    expect(drawer?.props.snapPoints).toEqual(['92%']);
    expect(drawer?.props.bottomAccessory).toBeTruthy();
    expect(drawer?.props.bottomAccessoryPlacement).toBe('phoneFloating');
    expect(screen.getByText('Tokens')).toBeTruthy();
    expect(screen.getByText('Value')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('$1.50')).toBeTruthy();
    expect(screen.queryByLabelText('Redeem one fewer token')).toBeNull();

    fireEvent.press(screen.getByLabelText('Redeem tokens'));
    drawer = screen.UNSAFE_getAllByType(BottomDrawer).find((item) => item.props.visible);

    expect(screen.getByText('Available')).toBeTruthy();
    expect(screen.getByLabelText('Back to rewards')).toBeTruthy();
    expect(screen.getByLabelText('Redeem one fewer token')).toBeTruthy();
    expect(drawer?.props.bottomAccessory).toBeTruthy();
    expect(drawer?.props.bottomAccessoryPlacement).toBe('phoneFloating');
    fireEvent.press(screen.getByLabelText('Redeem 2 tokens for $1.50'));
    expect(onRequestRedemption).toHaveBeenCalledWith(2);
  });

  it('shows the illustrated pristine empty state without dead redemption controls', () => {
    const screen = renderDrawer(projection({
      availableTokens: 0,
      totalTokens: 0,
      availableMoneyAmountCents: 0,
    }));
    const drawer = screen.UNSAFE_getAllByType(BottomDrawer).find((item) => item.props.visible);

    expect(screen.getByText('No tokens yet')).toBeTruthy();
    expect(screen.getByText('Finish a chore with a token reward to earn your first one.')).toBeTruthy();
    expect(screen.UNSAFE_getAllByType(Image)).toHaveLength(1);
    expect(screen.queryByText('Tokens')).toBeNull();
    expect(screen.queryByLabelText('Redeem tokens')).toBeNull();
    expect(screen.queryByLabelText('Redeem one more token')).toBeNull();
    expect(drawer?.props.bottomAccessory).toBeUndefined();
  });

  it('leads with the request when every token is waiting for a caregiver', () => {
    const pending = payout();
    const onCancelRedemption = jest.fn();
    const screen = renderDrawer(projection({
      availableTokens: 0,
      reservedTokens: 2,
      totalTokens: 2,
      availableMoneyAmountCents: 0,
      pendingPayouts: [pending],
      payouts: [pending],
    }), { onCancelRedemption });

    expect(screen.getByText('Waiting to be paid')).toBeTruthy();
    expect(screen.getByText('2 tokens')).toBeTruthy();
    expect(screen.getByText('Tokens')).toBeTruthy();
    expect(screen.getByText('0')).toBeTruthy();
    expect(screen.getByText('$0.00')).toBeTruthy();
    expect(screen.queryByLabelText('Redeem tokens')).toBeNull();
    fireEvent.press(screen.getByLabelText('View 2 tokens waiting to be paid'));
    expect(screen.getByText('$1.00')).toBeTruthy();
    expect(screen.getByText('Waiting for caregiver')).toBeTruthy();
    expect(screen.queryByText('Your tokens are still yours while you wait.')).toBeNull();

    fireEvent.press(screen.getByLabelText('Cancel $1.00 redemption'));
    expect(onCancelRedemption).toHaveBeenCalledWith(pending.payoutId);
  });

  it('keeps pending status secondary to redemption and omits partial payout history', () => {
    const pending = payout();
    const settled = payout({
      payoutId: 'payout-settled',
      tokenAmount: 1,
      moneyAmountCents: 50,
      convertedAtIso: '2026-08-17T16:00:00.000Z',
      settledAtIso: '2026-08-18T17:00:00.000Z',
      settledByMemberId: 'member-andrew',
    });
    const screen = renderDrawer(projection({
      reservedTokens: 2,
      totalTokens: 4,
      pendingPayouts: [pending],
      payouts: [pending, settled],
    }));

    expect(screen.getByText('Tokens')).toBeTruthy();
    expect(screen.getByText('Waiting to be paid')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('rewards-pending-token-count').props.style)).toMatchObject({
      textTransform: 'none',
    });
    expect(StyleSheet.flatten(screen.getByTestId('rewards-pending-summary').props.style)).toMatchObject({
      backgroundColor: colors.gray100,
      borderRadius: radii.compactCard,
      marginHorizontal: -spacing.md,
      paddingHorizontal: spacing.md,
    });
    expect(screen.getByLabelText('View 2 tokens waiting to be paid')).toBeTruthy();
    expect(screen.getByLabelText('Redeem tokens')).toBeTruthy();
    expect(screen.queryByText('Last paid')).toBeNull();
    expect(screen.queryByText('$0.50')).toBeNull();
    expect(screen.queryByText('Waiting for caregiver')).toBeNull();
  });
});

describe('ChoreRewardsDrawer caregiver obligations', () => {
  beforeEach(() => {
    useToastStore.setState({
      message: '',
      suppressionKeys: {},
      queuedToasts: [],
    });
  });

  it('merges a child’s pending redemptions into one payable obligation', () => {
    const onSettlePayouts = jest.fn();
    const first = payout({
      payoutId: 'payout-one',
      tokenAmount: 2,
      moneyAmountCents: 150,
      exchangeRateCentsPerToken: 75,
    });
    const second = payout({
      payoutId: 'payout-two',
      tokenAmount: 2,
      moneyAmountCents: 100,
      convertedAtIso: '2026-08-18T16:05:00.000Z',
    });
    const screen = renderDrawer(projection({
      availableTokens: 4,
      reservedTokens: 4,
      totalTokens: 8,
      pendingPayouts: [first, second],
      payouts: [first, second],
    }), {
      isCaregiver: true,
      onSettlePayouts,
    });

    expect(screen.getByText('$2.50 for Charlie')).toBeTruthy();
    expect(screen.getByText('4 tokens set aside')).toBeTruthy();
    expect(screen.queryByText('$1.50 for Charlie')).toBeNull();
    expect(screen.queryByText('$1.00 for Charlie')).toBeNull();

    fireEvent.press(screen.getByLabelText('Mark $2.50 paid to Charlie'));
    expect(onSettlePayouts).toHaveBeenCalledWith(['payout-one', 'payout-two']);
    expect(useToastStore.getState()).toMatchObject({
      message: 'All set — $2.50 for Charlie is marked paid.',
      variant: 'success',
      behaviorDuringSuppression: 'show',
    });
  });

  it('replaces the empty status card with a quiet illustrated state', () => {
    const screen = renderDrawer(projection(), { isCaregiver: true });

    expect(screen.getByText('All paid up')).toBeTruthy();
    expect(screen.getByText('New redemption requests will show up here.')).toBeTruthy();
    expect(screen.UNSAFE_getAllByType(Image)).toHaveLength(1);
    expect(screen.queryByText('Nothing is waiting')).toBeNull();
    expect(screen.queryByText('Pay outside Kwilt, then record it here.')).toBeNull();
  });
});
