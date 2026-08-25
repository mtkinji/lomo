import { Pressable } from '@/src/ui/HapticPressable';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radii, spacing } from '../../../theme';
import { useToastStore } from '../../../store/useToastStore';
import { BottomDrawer, BottomDrawerScrollView } from '../../../ui/BottomDrawer';
import { Button, IconButton } from '../../../ui/Button';
import { EmptyState } from '../../../ui/EmptyState';
import { Icon } from '../../../ui/Icon';
import {
  BottomDrawerHeader,
  BottomDrawerHeaderClose,
} from '../../../ui/layout/BottomDrawerHeader';
import { Heading, Text } from '../../../ui/primitives';
import type { ChoreRewardsProjection } from '../domain/choreLearning';

const REWARDS_EMPTY_ILLUSTRATION = require('../assets/rewards-empty.png');

type Props = {
  visible: boolean;
  rewards: ChoreRewardsProjection[];
  isCaregiver: boolean;
  onRequestRedemption: (tokenAmount: number) => void;
  onCancelRedemption: (payoutId: string) => void;
  onSettlePayouts: (payoutIds: string[]) => void;
  onClose: () => void;
};

function money(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function tokenLabel(value: number): string {
  return `${value} token${value === 1 ? '' : 's'}`;
}

export function ChoreRewardsDrawer({
  visible,
  rewards,
  isCaregiver,
  onRequestRedemption,
  onCancelRedemption,
  onSettlePayouts,
  onClose,
}: Props) {
  const childRewards = rewards[0];
  const [amount, setAmount] = useState(1);
  const [childStep, setChildStep] = useState<'overview' | 'redeem' | 'pending'>('overview');
  useEffect(() => {
    if (visible && childRewards) {
      setAmount(Math.max(1, Math.min(4, childRewards.availableTokens)));
    }
  }, [childRewards?.availableTokens, visible]);
  useEffect(() => {
    if (!visible) setChildStep('overview');
  }, [visible]);
  const pendingPayments = useMemo(
    () => rewards.filter((projection) => projection.pendingPayouts.length > 0).map((projection) => ({
      payoutIds: projection.pendingPayouts.map((payout) => payout.payoutId),
      memberName: projection.member.displayName,
      tokenAmount: projection.pendingPayouts.reduce((total, payout) => total + payout.tokenAmount, 0),
      moneyAmountCents: projection.pendingPayouts.reduce(
        (total, payout) => total + payout.moneyAmountCents,
        0,
      ),
    })),
    [rewards],
  );
  const childPending = childRewards?.pendingPayouts ?? [];
  const hasAvailableTokens = Boolean(childRewards && childRewards.availableTokens > 0);
  const isPristineEmpty = Boolean(
    childRewards
    && childRewards.availableTokens === 0
    && childPending.length === 0
    && childRewards.payouts.length === 0,
  );
  const requestMoneyAmount = childRewards
    ? amount * childRewards.exchangeRateCentsPerToken
    : 0;
  const childAction = !isCaregiver && childRewards && hasAvailableTokens
    ? childStep === 'overview' ? (
      <Button
        fullWidth
        accessibilityLabel="Redeem tokens"
        onPress={() => setChildStep('redeem')}
      >Redeem tokens</Button>
    ) : childStep === 'redeem' ? (
      <Button
        fullWidth
        accessibilityLabel={`Redeem ${tokenLabel(amount)} for ${money(requestMoneyAmount)}`}
        onPress={() => {
          onRequestRedemption(amount);
          setChildStep('overview');
        }}
      >{`Redeem ${tokenLabel(amount)} for ${money(requestMoneyAmount)}`}</Button>
    ) : undefined
    : undefined;
  const childHeader = childStep !== 'overview' ? (
    <BottomDrawerHeader
      variant="navbar"
      title={childStep === 'redeem' ? 'Redeem tokens' : 'Waiting to be paid'}
      leftAction={(
        <IconButton
          variant="ghost"
          accessibilityLabel="Back to rewards"
          onPress={() => setChildStep('overview')}
        >
          <Icon name="arrowLeft" size={18} color={colors.textPrimary} />
        </IconButton>
      )}
      rightAction={(
        <BottomDrawerHeaderClose onPress={onClose} accessibilityLabel="Close rewards" />
      )}
    />
  ) : (
    <BottomDrawerHeader
      variant="withClose"
      title="Rewards"
      onClose={onClose}
      closeAccessibilityLabel="Close rewards"
    />
  );

  return (
    <BottomDrawer
      visible={visible}
      onClose={onClose}
      snapPoints={isCaregiver ? ['72%', '92%'] : ['92%']}
      initialSnapIndex={0}
      dynamicSizing={!isCaregiver}
      bottomAccessory={childAction}
      bottomAccessoryPlacement="phoneFloating"
    >
      <BottomDrawerScrollView
        testID="chores.rewards.drawer"
        contentContainerStyle={[
          styles.content,
          !isCaregiver && childStep !== 'redeem' ? styles.childOverviewContent : null,
        ]}
      >
        {isCaregiver ? (
          <BottomDrawerHeader
            variant="withClose"
            title="Rewards"
            onClose={onClose}
            closeAccessibilityLabel="Close rewards"
          />
        ) : childHeader}

        {isCaregiver ? (
          pendingPayments.length ? (
            <>
              <View style={styles.intro}>
                <Heading variant="sm">Waiting to be paid</Heading>
                <Text tone="secondary">Pay outside Kwilt, then record it here.</Text>
              </View>
              {pendingPayments.map((payment) => (
              <View key={payment.payoutIds.join(':')} style={styles.card}>
                <View style={styles.cardCopy}>
                  <Text variant="label">{money(payment.moneyAmountCents)} for {payment.memberName}</Text>
                  <Text tone="secondary">{tokenLabel(payment.tokenAmount)} set aside</Text>
                </View>
                <Button
                  accessibilityLabel={`Mark ${money(payment.moneyAmountCents)} paid to ${payment.memberName}`}
                  onPress={() => {
                    onSettlePayouts(payment.payoutIds);
                    useToastStore.getState().showToast({
                      message: `All set — ${money(payment.moneyAmountCents)} for ${payment.memberName} is marked paid.`,
                      variant: 'success',
                      behaviorDuringSuppression: 'show',
                    });
                  }}
                >{`Paid ${money(payment.moneyAmountCents)}`}</Button>
              </View>
              ))}
            </>
          ) : (
            <EmptyState
              variant="compact"
              illustration={REWARDS_EMPTY_ILLUSTRATION}
              title="All paid up"
              instructions="New redemption requests will show up here."
              style={styles.caregiverEmptyState}
              imageStyle={styles.emptyImage}
            />
          )
        ) : childRewards && isPristineEmpty && childStep === 'overview' ? (
          <EmptyState
            variant="compact"
            illustration={REWARDS_EMPTY_ILLUSTRATION}
            title="No tokens yet"
            instructions="Finish a chore with a token reward to earn your first one."
            style={styles.emptyState}
            imageStyle={styles.emptyImage}
          />
        ) : childRewards && childStep === 'redeem' && hasAvailableTokens ? (
          <>
            <View style={styles.ledgerRow}>
              <Text tone="secondary">Available</Text>
              <Text variant="label">{tokenLabel(childRewards.availableTokens)}</Text>
            </View>
            <View style={styles.stepper}>
              <Button
                variant="secondary"
                accessibilityLabel="Redeem one fewer token"
                disabled={amount <= 1}
                onPress={() => setAmount((current) => Math.max(1, current - 1))}
              >−</Button>
              <View style={styles.stepperValue}>
                <Heading variant="sm">{tokenLabel(amount)}</Heading>
                <Text tone="secondary">{money(requestMoneyAmount)}</Text>
              </View>
              <Button
                variant="secondary"
                accessibilityLabel="Redeem one more token"
                disabled={amount >= childRewards.availableTokens}
                onPress={() => setAmount((current) => Math.min(childRewards.availableTokens, current + 1))}
              >+</Button>
            </View>
          </>
        ) : childRewards && childStep === 'pending' ? (
          <>
            {childPending.map((payout, index) => (
              <View
                key={payout.payoutId}
                style={[styles.requestSurface, index > 0 ? styles.requestRowDivider : null]}
              >
                <View style={styles.ledgerRow}>
                  <Text>{tokenLabel(payout.tokenAmount)}</Text>
                  <Text variant="label">{money(payout.moneyAmountCents)}</Text>
                </View>
                <View style={styles.pendingActionRow}>
                  <Text tone="secondary">Waiting for caregiver</Text>
                  <Button
                    variant="ghost"
                    size="inline"
                    accessibilityLabel={`Cancel ${money(payout.moneyAmountCents)} redemption`}
                    onPress={() => {
                      onCancelRedemption(payout.payoutId);
                      setChildStep('overview');
                    }}
                  >
                    Cancel
                  </Button>
                </View>
              </View>
            ))}
          </>
        ) : childRewards ? (
          <>
            <View style={styles.balanceSection}>
              {childPending.length > 0 ? (
                <Pressable
                  testID="rewards-pending-summary"
                  accessibilityRole="button"
                  accessibilityLabel={`View ${tokenLabel(childRewards.reservedTokens)} waiting to be paid`}
                  onPress={() => setChildStep('pending')}
                  style={({ pressed }) => [styles.pendingSummaryWell, pressed ? styles.rowPressed : null]}
                >
                  <Text tone="secondary">Waiting to be paid</Text>
                  <View style={styles.pendingSummaryValue}>
                    <Text
                      testID="rewards-pending-token-count"
                      variant="label"
                      style={styles.sentenceCaseLabel}
                    >
                      {tokenLabel(childRewards.reservedTokens)}
                    </Text>
                    <Icon name="chevronRight" size={16} color={colors.textSecondary} />
                  </View>
                </Pressable>
              ) : null}
              <View style={styles.ledger}>
                <View style={styles.ledgerRow}>
                  <Text tone="secondary">Tokens</Text>
                  <Text variant="label">{childRewards.availableTokens}</Text>
                </View>
                <View style={styles.ledgerRow}>
                  <Text tone="secondary">Value</Text>
                  <Text variant="label">{money(childRewards.availableMoneyAmountCents)}</Text>
                </View>
              </View>
            </View>

            {!hasAvailableTokens && childPending.length === 0 ? (
              <View style={styles.noAvailable}>
                <Text tone="secondary">No tokens to redeem</Text>
              </View>
            ) : null}
          </>
        ) : null}
      </BottomDrawerScrollView>
    </BottomDrawer>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingHorizontal: spacing.lg, paddingBottom: spacing['3xl'] },
  childOverviewContent: { paddingBottom: spacing.md },
  intro: { gap: spacing.xs },
  balanceSection: { gap: spacing.lg },
  ledger: { gap: spacing.md },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  pendingSummaryWell: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.compactCard,
    backgroundColor: colors.gray100,
  },
  pendingSummaryValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sentenceCaseLabel: { textTransform: 'none' },
  rowPressed: { opacity: 0.7 },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
  },
  emptyCard: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radii.card,
    backgroundColor: colors.gray100,
  },
  cardCopy: { gap: spacing.xs },
  emptyState: { marginTop: spacing.sm },
  caregiverEmptyState: { marginTop: spacing.lg },
  emptyImage: { width: 140, height: 140 },
  requestSurface: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.card,
    backgroundColor: colors.gray100,
  },
  pendingActionRow: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  requestRowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  noAvailable: { gap: spacing.xs },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepperValue: { flex: 1, alignItems: 'center', gap: 2 },
});
