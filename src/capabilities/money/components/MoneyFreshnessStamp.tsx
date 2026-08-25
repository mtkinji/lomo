import { Pressable } from '@/src/ui/HapticPressable';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, typography } from '../../../theme';
import { Icon } from '../../../ui/Icon';
import { formatMoneyFreshness } from '../data/moneySnapshot';

const FRESHNESS_TICK_MS = 60_000;

export function MoneyFreshnessStamp({
  lastSyncedAt,
  onPress,
}: {
  lastSyncedAt: string;
  onPress?: () => void;
}) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    setNowMs(Date.now());
    const interval = setInterval(() => setNowMs(Date.now()), FRESHNESS_TICK_MS);
    return () => clearInterval(interval);
  }, [lastSyncedAt]);

  const formattedLabel = formatMoneyFreshness(lastSyncedAt, new Date(nowMs));
  const accessibilityLabel = formattedLabel === 'Updated yesterday'
    ? 'Updated 1 day ago'
    : formattedLabel;
  const label = compactFreshnessLabel(accessibilityLabel);

  const content = (
    <View style={styles.container}>
      <Icon
        accessible={false}
        color={colors.muted}
        name="clock"
        size={12}
        testID="money-freshness-clock-icon"
      />
      <Text
        accessibilityLabel={`Bank data ${accessibilityLabel.toLowerCase()}`}
        accessibilityLiveRegion="polite"
        maxFontSizeMultiplier={1.3}
        numberOfLines={1}
        style={styles.label}
      >
        {label}
      </Text>
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      accessibilityLabel="Open accounts and connection status"
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => pressed ? styles.pressed : undefined}
    >
      {content}
    </Pressable>
  );
}

function compactFreshnessLabel(label: string) {
  if (label === 'Updated just now') return 'Just now';
  return label
    .replace(/^Updated\s+/, '')
    .replace(/\s+min\s+ago$/, 'm ago')
    .replace(/\s+hr\s+ago$/, 'h ago')
    .replace(/\s+days?\s+ago$/, 'd ago');
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  label: {
    ...typography.caption,
    color: colors.muted,
    fontFamily: fonts.regular,
    textAlign: 'right',
  },
  pressed: { opacity: 0.62 },
});
