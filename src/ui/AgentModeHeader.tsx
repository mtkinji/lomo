import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { BrandLockup } from './BrandLockup';
import { HStack, Text } from './primitives';
import { colors, spacing, typography } from '../theme';

export type AgentMode = 'ai' | 'manual';

type AgentModeHeaderProps = {
  activeMode: AgentMode;
  onChangeMode: (next: AgentMode) => void;
  /**
   * Custom content for the AI side label, e.g. "{sparkles} Goals AI {info}".
   * When omitted, a simple "AI" text label is used.
   */
  aiLabel?: React.ReactNode;
  /**
   * Optional override for the Manual tab label. Defaults to "Manual".
   */
  manualLabel?: React.ReactNode;
};

export function AgentModeHeader({
  activeMode,
  onChangeMode,
  aiLabel,
  manualLabel,
}: AgentModeHeaderProps) {
  const aiContent =
    aiLabel ??
    (
      <Text
        style={[
          styles.segmentedOptionLabel,
          activeMode === 'ai' && styles.segmentedOptionLabelActive,
        ]}
      >
        AI
      </Text>
    );

  const manualContent =
    manualLabel ??
    (
      <Text
        style={[
          styles.segmentedOptionLabel,
          activeMode === 'manual' && styles.segmentedOptionLabelActive,
        ]}
      >
        Manual
      </Text>
    );

  return (
    <View style={styles.headerRow}>
      <BrandLockup logoSize={32} wordmarkSize="sm" />
      <View style={styles.headerSideRight}>
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="Use AI mode"
            style={[
              styles.segmentedOption,
              activeMode === 'ai' && styles.segmentedOptionActive,
            ]}
            onPress={() => onChangeMode('ai')}
          >
            <HStack style={styles.segmentedOptionContent} alignItems="center" space="xs">
              {aiContent}
            </HStack>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="Use manual mode"
            style={[
              styles.segmentedOption,
              activeMode === 'manual' && styles.segmentedOptionActive,
            ]}
            onPress={() => onChangeMode('manual')}
          >
            <HStack style={styles.segmentedOptionContent} alignItems="center" space="xs">
              {manualContent}
            </HStack>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  headerSideRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  segmentedControl: {
    flexDirection: 'row',
    padding: spacing.xs / 2,
    borderRadius: 999,
    backgroundColor: colors.shellAlt,
  },
  segmentedOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  segmentedOptionActive: {
    backgroundColor: colors.canvas,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  segmentedOptionLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  segmentedOptionLabelActive: {
    color: colors.textPrimary,
    fontFamily: typography.titleSm.fontFamily,
  },
  segmentedOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.xs,
  },
});


