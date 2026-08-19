import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radii, spacing } from '../../../theme';
import { BottomDrawer, BottomDrawerScrollView } from '../../../ui/BottomDrawer';
import { Button } from '../../../ui/Button';
import { BottomDrawerHeader } from '../../../ui/layout/BottomDrawerHeader';
import { Heading, Text } from '../../../ui/primitives';
import type { ChoreRewardsProjection } from '../domain/choreLearning';

type Props = {
  visible: boolean;
  rewards: ChoreRewardsProjection[];
  isCaregiver: boolean;
  onRequestRedemption: (tokenAmount: number) => void;
  onCancelRedemption: (payoutId: string) => void;
  onSettlePayout: (payoutId: string) => void;
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
  onSettlePayout,
  onClose,
}: Props) {
  const childRewards = rewards[0];
  const [amount, setAmount] = useState(1);
  useEffect(() => {
    if (visible && childRewards) {
      setAmount(Math.max(1, Math.min(4, childRewards.availableTokens)));
    }
  }, [childRewards?.availableTokens, visible]);
  const pending = useMemo(
    () => rewards.flatMap((projection) => projection.pendingPayouts.map((payout) => ({
      payout,
      memberName: projection.member.displayName,
    }))),
    [rewards],
  );

  return (
    <BottomDrawer visible={visible} onClose={onClose} snapPoints={['72%', '92%']} initialSnapIndex={0}>
      <BottomDrawerScrollView testID="chores.rewards.drawer" contentContainerStyle={styles.content}>
        <BottomDrawerHeader
          variant="withClose"
          title="Rewards"
          onClose={onClose}
          closeAccessibilityLabel="Close rewards"
        />

        {isCaregiver ? (
          <>
            <View style={styles.intro}>
              <Heading variant="sm">Waiting to be paid</Heading>
              <Text tone="secondary">Pay outside Kwilt, then record it here.</Text>
            </View>
            {pending.length ? pending.map(({ payout, memberName }) => (
              <View key={payout.payoutId} style={styles.card}>
                <View style={styles.cardCopy}>
                  <Text variant="label">{money(payout.moneyAmountCents)} for {memberName}</Text>
                  <Text tone="secondary">{tokenLabel(payout.tokenAmount)} set aside</Text>
                </View>
                <Button
                  accessibilityLabel={`Mark ${money(payout.moneyAmountCents)} paid to ${memberName}`}
                  onPress={() => onSettlePayout(payout.payoutId)}
                >{`Paid ${money(payout.moneyAmountCents)}`}</Button>
              </View>
            )) : (
              <View style={styles.emptyCard}>
                <Text variant="label">Nothing is waiting</Text>
                <Text tone="secondary">A child’s redemption will appear here until it is paid.</Text>
              </View>
            )}
          </>
        ) : childRewards ? (
          <>
            <View style={styles.balanceCard}>
              <Text tone="secondary">Available</Text>
              <Heading variant="lg">{tokenLabel(childRewards.availableTokens)}</Heading>
              <Text tone="secondary">Worth {money(childRewards.availableMoneyAmountCents)}</Text>
              {childRewards.reservedTokens > 0 ? (
                <Text variant="label">{tokenLabel(childRewards.reservedTokens)} set aside · {tokenLabel(childRewards.totalTokens)} total</Text>
              ) : null}
            </View>

            {pending.map(({ payout }) => (
              <View key={payout.payoutId} style={styles.card}>
                <View style={styles.cardCopy}>
                  <Text variant="label">Waiting for {money(payout.moneyAmountCents)}</Text>
                  <Text tone="secondary">{tokenLabel(payout.tokenAmount)} are still yours and set aside.</Text>
                </View>
                <Button
                  variant="secondary"
                  accessibilityLabel={`Cancel redemption for ${tokenLabel(payout.tokenAmount)}`}
                  onPress={() => onCancelRedemption(payout.payoutId)}
                >
                  Cancel
                </Button>
              </View>
            ))}

            <View style={styles.redeemSection}>
              <View style={styles.intro}>
                <Heading variant="sm">Redeem tokens</Heading>
                <Text tone="secondary">
                  Your tokens are set aside until a caregiver pays you.
                </Text>
              </View>
              <View style={styles.stepper}>
                <Button
                  variant="secondary"
                  accessibilityLabel="Redeem one fewer token"
                  disabled={amount <= 1}
                  onPress={() => setAmount((current) => Math.max(1, current - 1))}
                >−</Button>
                <View style={styles.stepperValue}>
                  <Text variant="label">{tokenLabel(amount)}</Text>
                  <Text tone="secondary">{money(amount * childRewards.exchangeRateCentsPerToken)}</Text>
                </View>
                <Button
                  variant="secondary"
                  accessibilityLabel="Redeem one more token"
                  disabled={amount >= childRewards.availableTokens}
                  onPress={() => setAmount((current) => Math.min(childRewards.availableTokens, current + 1))}
                >+</Button>
              </View>
              <Button
                fullWidth
                disabled={childRewards.availableTokens < 1}
                accessibilityLabel={`Set aside ${tokenLabel(amount)} for ${money(amount * childRewards.exchangeRateCentsPerToken)}`}
                onPress={() => onRequestRedemption(amount)}
              >{`Set aside ${tokenLabel(amount)} for ${money(amount * childRewards.exchangeRateCentsPerToken)}`}</Button>
            </View>
          </>
        ) : null}
      </BottomDrawerScrollView>
    </BottomDrawer>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingHorizontal: spacing.lg, paddingBottom: spacing['3xl'] },
  intro: { gap: spacing.xs },
  balanceCard: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radii.card,
    backgroundColor: colors.gray100,
  },
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
  redeemSection: { gap: spacing.md },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepperValue: { flex: 1, alignItems: 'center', gap: 2 },
});
