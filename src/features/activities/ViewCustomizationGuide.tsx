import React, { useState, useCallback } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Keyboard,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HStack, VStack, Text, Textarea } from '../../ui/primitives';
import { Icon, type IconName } from '../../ui/Icon';
import { Button } from '../../ui/Button';
import { ButtonLabel } from '../../ui/Typography';
import { BottomGuide } from '../../ui/BottomGuide';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { HapticsService } from '../../services/HapticsService';
import type { ActivityView, FilterGroup, SortCondition } from '../../domain/types';
import { useKeyboardHeight } from '../../ui/hooks/useKeyboardHeight';

export type ViewPreset = {
  id: string;
  label: string;
  icon: IconName;
  filters?: FilterGroup[];
  sorts?: SortCondition[];
  showCompleted?: boolean;
};

/**
 * Preset configurations for quick view customization
 */
export const VIEW_PRESETS: ViewPreset[] = [
  {
    id: 'preset-today',
    label: '📅 Due today',
    icon: 'today',
    filters: [
      {
        logic: 'and',
        conditions: [
          { id: 'due-today', field: 'scheduledDate', operator: 'eq', value: 'today' },
        ],
      },
    ],
    sorts: [{ field: 'priority', direction: 'desc' }],
    showCompleted: false,
  },
  {
    id: 'preset-past-due',
    label: '⚠️ Past due',
    icon: 'today',
    filters: [
      {
        logic: 'and',
        conditions: [
          { id: 'past-due', field: 'scheduledDate', operator: 'lt', value: 'today' },
        ],
      },
    ],
    sorts: [{ field: 'scheduledDate', direction: 'asc' }],
    showCompleted: false,
  },
  {
    id: 'preset-priority',
    label: 'Starred only',
    icon: 'starFilled',
    filters: [
      {
        logic: 'and',
        conditions: [
          { id: 'high-pri', field: 'priority', operator: 'eq', value: 1 },
        ],
      },
    ],
    sorts: [{ field: 'scheduledDate', direction: 'asc' }],
  },
  {
    id: 'preset-upcoming',
    label: 'Due in the next 7 days',
    icon: 'today',
    filters: [
      {
        logic: 'and',
        conditions: [
          { id: 'upcoming', field: 'scheduledDate', operator: 'lte', value: '+7days' },
        ],
      },
    ],
    sorts: [{ field: 'scheduledDate', direction: 'asc' }],
    showCompleted: false,
  },
  {
    id: 'preset-by-date',
    label: 'Sort by due date',
    icon: 'sortCalendarAsc',
    sorts: [{ field: 'scheduledDate', direction: 'asc' }],
  },
];

export type ViewCustomizationGuideProps = {
  visible: boolean;
  onClose: () => void;
  /** The view that was just created */
  view: ActivityView | null;
  /** Apply a preset to the view */
  onApplyPreset: (viewId: string, preset: ViewPreset) => void;
  /** Apply AI-generated customization */
  onApplyAiCustomization?: (viewId: string, prompt: string) => void;
  /** Whether AI is loading */
  isAiLoading?: boolean;
};

/**
 * PresetRow - A tappable row for a preset option
 */
function PresetPill({
  preset,
  onPress,
}: {
  preset: ViewPreset;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.presetPill,
        pressed && styles.presetPillPressed,
      ]}
      onPress={onPress}
    >
      <HStack alignItems="center" space="xs">
        <Icon name={preset.icon} size={16} color={colors.textSecondary} />
        <Text style={styles.presetPillLabel}>{preset.label}</Text>
      </HStack>
    </Pressable>
  );
}

/**
 * ViewCustomizationGuide - BottomGuide shown after view creation
 * offering presets and AI customization
 */
export function ViewCustomizationGuide({
  visible,
  onClose,
  view,
  onApplyPreset,
  onApplyAiCustomization,
  isAiLoading = false,
}: ViewCustomizationGuideProps) {
  const [aiPrompt, setAiPrompt] = useState('');
  const insets = useSafeAreaInsets();
  const { keyboardHeight } = useKeyboardHeight();

  // iOS keyboard height typically includes bottom safe area; BottomDrawer already accounts for insets.
  const adjustedKeyboardHeight =
    Platform.OS === 'ios' ? Math.max(0, keyboardHeight - insets.bottom) : keyboardHeight;

  const handleSelectPreset = useCallback(
    (preset: ViewPreset) => {
      if (!view) return;
      void HapticsService.trigger('canvas.selection');
      onApplyPreset(view.id, preset);
      onClose();
    },
    [view, onApplyPreset, onClose],
  );

  const handleAiSubmit = useCallback(() => {
    if (!view || !onApplyAiCustomization) return;
    const trimmed = aiPrompt.trim();
    if (!trimmed) return;

    Keyboard.dismiss();
    void HapticsService.trigger('canvas.selection');
    onApplyAiCustomization(view.id, trimmed);
    setAiPrompt('');
  }, [view, aiPrompt, onApplyAiCustomization]);

  const hasAiSupport = !!onApplyAiCustomization;

  if (!view) return null;

  return (
    <BottomGuide
      visible={visible}
      onClose={onClose}
      // This guide manages keyboard space via snap points + internal padding.
      // Avoid BottomDrawer's keyboard avoidance to prevent double lifting.
      keyboardAvoidanceEnabled={false}
      snapPoints={adjustedKeyboardHeight > 0 ? ['92%'] : ['75%']}
      scrim="light"
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.container,
          // Ensure the bottom portion can scroll above the keyboard.
          { paddingBottom: spacing.lg + adjustedKeyboardHeight },
        ]}
      >
        <VStack space="lg">
          <VStack space="xs">
            <Text style={styles.title}>Add filters or sorting</Text>
          </VStack>

          {/* Quick picks */}
          <VStack space="sm">
            <Text style={styles.sectionLabel}>Quick picks</Text>
            <View style={styles.presetPillsWrap}>
              {VIEW_PRESETS.map((preset) => (
                <PresetPill
                  key={preset.id}
                  preset={preset}
                  onPress={() => handleSelectPreset(preset)}
                />
              ))}
            </View>
          </VStack>

          {/* AI input */}
          {hasAiSupport && (
            <VStack space="xs">
              <HStack alignItems="center" space="xs">
                <Icon name="sparkles" size={16} color={colors.accent} />
                <Text style={styles.aiLabel}>AI quick setup (optional)</Text>
              </HStack>
              <Textarea
                value={aiPrompt}
                onChangeText={setAiPrompt}
                placeholder="Describe what to show + how to sort…"
                multiline
                multilineMinHeight={88}
                multilineMaxHeight={140}
                editable={!isAiLoading}
                trailingElement={
                  isAiLoading ? (
                    <ActivityIndicator size="small" color={colors.accent} />
                  ) : aiPrompt.trim().length > 0 ? (
                    <Pressable
                      onPress={handleAiSubmit}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      accessibilityRole="button"
                      accessibilityLabel="Apply AI customization"
                    >
                      <Icon name="arrowUp" size={20} color={colors.accent} />
                    </Pressable>
                  ) : undefined
                }
              />
            </VStack>
          )}

          {/* Continue button */}
          <Button
            variant="ghost"
            size="small"
            onPress={onClose}
            style={styles.continueButton}
          >
            <ButtonLabel size="md">Done</ButtonLabel>
          </Button>
        </VStack>
      </ScrollView>
    </BottomGuide>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  kicker: {
    ...typography.label,
    color: colors.muted,
  },
  title: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.muted,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  presetPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  presetPill: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.fieldFill,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetPillPressed: {
    backgroundColor: colors.fieldFillPressed,
  },
  presetPillLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  aiLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  aiHint: {
    ...typography.caption,
    color: colors.muted,
  },
  continueButton: {
    alignSelf: 'center',
  },
});

