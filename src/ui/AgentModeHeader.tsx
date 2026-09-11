import { Pressable } from '@/src/ui/HapticPressable';
import React from 'react';
import { StyleSheet } from 'react-native';
import { HStack, Text } from './primitives';
import { colors, spacing, typography } from '../theme';
import { SegmentedControl } from './SegmentedControl';
import { Icon } from './Icon';
import { BottomDrawerHeader, BottomDrawerHeaderClose } from './layout/BottomDrawerHeader';

export type AgentMode = 'ai' | 'manual';

type AgentModeHeaderProps = {
  activeMode: AgentMode;
  onChangeMode: (next: AgentMode) => void;
  onClose: () => void;
  closeAccessibilityLabel?: string;
  /**
   * Object label used to build the AI tab copy, e.g. "Arc", "Goals", "Activities".
   * Rendered as "{objectLabel} AI" next to the lightning icon.
   */
  objectLabel: string;
  /**
   * Optional override for the AI tab label content.
   * Use this when you want a non-"{objectLabel} AI" label (e.g. just "Coach").
   */
  aiLabel?: React.ReactNode;
  /**
   * Optional handler for the info icon on the AI tab. When omitted, the info
   * icon is hidden.
   */
  onPressInfo?: () => void;
  /**
   * Optional accessibility label for the info icon.
   */
  infoAccessibilityLabel?: string;
  /**
   * Optional override for the Manual tab label. Defaults to "Manual".
   */
  manualLabel?: React.ReactNode;
};

export function AgentModeHeader({
  activeMode,
  onChangeMode,
  onClose,
  closeAccessibilityLabel = 'Close',
  objectLabel,
  aiLabel,
  onPressInfo,
  infoAccessibilityLabel,
  manualLabel,
}: AgentModeHeaderProps) {
  const aiContent = (
    <>
      <Icon
        name="sparkles"
        size={14}
        color={activeMode === 'ai' ? colors.accent : colors.textSecondary}
      />
      <Text
        style={[
          styles.segmentedOptionLabel,
          activeMode === 'ai' && styles.segmentedOptionLabelActive,
        ]}
      >
        {aiLabel ?? `${objectLabel} AI`}
      </Text>
      {onPressInfo ? (
        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            onPressInfo();
          }}
          accessibilityRole="button"
          accessibilityLabel={infoAccessibilityLabel ?? 'Show context'}
        >
          <Icon
            name="info"
            size={14}
            color={colors.textSecondary}
            style={styles.infoIcon}
          />
        </Pressable>
      ) : null}
    </>
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
    <BottomDrawerHeader
      title={
        <SegmentedControl
          size="compact"
          value={activeMode}
          onChange={onChangeMode}
          options={[
            {
              value: 'ai',
              accessibilityLabel: `${objectLabel} AI`,
              label: <HStack style={styles.segmentedOptionContent} alignItems="center" space="xs">{aiContent}</HStack>,
            },
            {
              value: 'manual',
              accessibilityLabel: 'Manual',
              label: <HStack style={styles.segmentedOptionContent} alignItems="center" space="xs">{manualContent}</HStack>,
            },
          ]}
        />
      }
      rightAction={
        <BottomDrawerHeaderClose
          onPress={onClose}
          accessibilityLabel={closeAccessibilityLabel}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
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
  infoIcon: {
    marginLeft: spacing.sm,
  },
});
