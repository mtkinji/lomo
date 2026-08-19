import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { spacing } from '../../../theme';
import { BottomDrawer, BottomDrawerScrollView } from '../../../ui/BottomDrawer';
import { SettingsToggleRow } from '../../../ui/SettingsSurface';
import { BottomDrawerHeader } from '../../../ui/layout/BottomDrawerHeader';
import { Button, Input, Text } from '../../../ui/primitives';
import {
  formatChoreRewardRateInput,
  parseChoreRewardRateInput,
} from '../domain/choreRewardRate';

type Props = {
  visible: boolean;
  tokensEnabled: boolean;
  rewardExchangeRateCentsPerToken: number;
  onChangeTokens: (enabled: boolean) => void;
  onChangeRewardExchangeRate: (exchangeRateCentsPerToken: number) => void;
  onClose: () => void;
};

export function ChoreSettingsDrawer({
  visible,
  tokensEnabled,
  rewardExchangeRateCentsPerToken,
  onChangeTokens,
  onChangeRewardExchangeRate,
  onClose,
}: Props) {
  const [rateInput, setRateInput] = useState(() => (
    formatChoreRewardRateInput(rewardExchangeRateCentsPerToken)
  ));

  useEffect(() => {
    if (visible) setRateInput(formatChoreRewardRateInput(rewardExchangeRateCentsPerToken));
  }, [rewardExchangeRateCentsPerToken, visible]);

  const parsedRate = parseChoreRewardRateInput(rateInput);
  const invalidRate = rateInput.trim().length > 0 && parsedRate === null;
  const rateChanged = parsedRate !== null
    && parsedRate !== rewardExchangeRateCentsPerToken;

  return (
    <BottomDrawer
      visible={visible}
      onClose={onClose}
      snapPoints={tokensEnabled ? ['58%'] : ['36%']}
      keyboardBehavior="extend"
    >
      <BottomDrawerScrollView
        testID="chores.settings.drawer"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.content}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
      >
        <BottomDrawerHeader
          variant="withClose"
          title="Chore settings"
          onClose={onClose}
          closeAccessibilityLabel="Close chore settings"
        />
        <SettingsToggleRow
          title="Use digital rewards"
          enabled={tokensEnabled}
          onPress={() => onChangeTokens(!tokensEnabled)}
        />
        <Text tone="secondary" style={styles.description}>
          Track tokens in Kwilt and let children set them aside for an outside-app payout. Chores still work the same when this is off.
        </Text>
        {tokensEnabled ? (
          <View style={styles.rateSection}>
            <Input
              label="Dollars per token"
              value={rateInput}
              onChangeText={setRateInput}
              keyboardType="decimal-pad"
              inputMode="decimal"
              returnKeyType="done"
              errorText={invalidRate
                ? 'Enter an amount greater than $0 with up to two decimal places.'
                : undefined}
              helperText={invalidRate ? undefined : `1 token = $${formatChoreRewardRateInput(parsedRate ?? rewardExchangeRateCentsPerToken)}`}
              trailingElement={<Text tone="secondary">USD</Text>}
            />
            <Text tone="secondary">
              New redemptions use this value. Existing payouts stay the same.
            </Text>
            <Button
              fullWidth
              disabled={!rateChanged}
              onPress={() => {
                if (parsedRate === null) return;
                onChangeRewardExchangeRate(parsedRate);
              }}
            >
              Save token value
            </Button>
          </View>
        ) : null}
      </BottomDrawerScrollView>
    </BottomDrawer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  description: {
    paddingHorizontal: spacing.md,
  },
  rateSection: {
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
});
