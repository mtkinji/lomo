import React from 'react';
import { Pressable, ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, fonts, spacing, typography } from '../theme';
import { HStack, VStack, Text } from './primitives';

export type GoalProgressSignal = {
  id: string;
  value: string;
  label: string;
  accessibilityLabel?: string;
  onPress?: () => void;
  valueColor?: string;
  labelColor?: string;
};

type GoalProgressSignalsRowProps = {
  signals: GoalProgressSignal[];
  style?: StyleProp<ViewStyle>;
};

export function GoalProgressSignalsRow({ signals, style }: GoalProgressSignalsRowProps) {
  const visibleSignals = signals.filter((signal) => signal.value.trim().length > 0).slice(0, 4);
  if (visibleSignals.length === 0) return null;

  return (
    <View style={[styles.container, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <HStack style={styles.row} alignItems="stretch" justifyContent="center">
          {visibleSignals.map((signal, index) => {
            const a11yLabel = signal.accessibilityLabel ?? `${signal.label}: ${signal.value}`;
            const isTappable = Boolean(signal.onPress);
            return (
              <React.Fragment key={signal.id}>
                {isTappable ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={a11yLabel}
                    onPress={signal.onPress}
                    style={({ pressed }) => [styles.cell, pressed ? styles.cellPressed : null]}
                    hitSlop={10}
                  >
                    <VStack space="xs" alignItems="center">
                      <Text
                        numberOfLines={1}
                        style={[styles.valueText, signal.valueColor ? { color: signal.valueColor } : null]}
                      >
                        {signal.value}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[styles.labelText, signal.labelColor ? { color: signal.labelColor } : null]}
                      >
                        {signal.label}
                      </Text>
                    </VStack>
                  </Pressable>
                ) : (
                  <View accessibilityRole="text" accessibilityLabel={a11yLabel} style={styles.cell}>
                    <VStack space="xs" alignItems="center">
                      <Text
                        numberOfLines={1}
                        style={[styles.valueText, signal.valueColor ? { color: signal.valueColor } : null]}
                      >
                        {signal.value}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[styles.labelText, signal.labelColor ? { color: signal.labelColor } : null]}
                      >
                        {signal.label}
                      </Text>
                    </VStack>
                  </View>
                )}
                {index < visibleSignals.length - 1 ? (
                  <View style={styles.dividerGutter}>
                    <View style={styles.divider} />
                  </View>
                ) : null}
              </React.Fragment>
            );
          })}
        </HStack>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  row: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  cell: {
    minWidth: 72,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    justifyContent: 'center',
  },
  cellPressed: {
    opacity: 0.65,
  },
  valueText: {
    ...typography.bodySm,
    fontFamily: fonts.semibold,
    color: colors.textPrimary,
  },
  labelText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    lineHeight: 14,
    color: colors.gray500,
  },
  dividerGutter: {
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 34,
    backgroundColor: colors.gray300,
    opacity: 0.6,
  },
});


