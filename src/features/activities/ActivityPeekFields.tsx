import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../theme';
import { HStack, Text, ThreeColumnRow } from '../../ui/primitives';
import { Badge } from '../../ui/Badge';
import { LongTextField } from '../../ui/LongTextField';
import { styles as activityDetailStyles } from './activityDetailStyles';
import { Icon } from '../../ui/Icon';
import type { Activity, ActivityStep } from '../../domain/types';

export function ActivityPeekNotes({ notes }: { notes?: string | null }) {
  const value = (notes ?? '').trim();
  if (!value) return null;

  return (
    <View style={styles.section}>
      <Text style={activityDetailStyles.inputLabel}>NOTES</Text>
      <LongTextField
        label="Notes"
        hideLabel
        surfaceVariant="filled"
        value={value}
        // Read-only: keep the surface purely informational in the peek.
        disabled
        onChange={() => {}}
      />
    </View>
  );
}

export function ActivityPeekTags({ tags }: { tags?: string[] | null }) {
  const list = Array.isArray(tags) ? tags.filter(Boolean) : [];
  if (list.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={activityDetailStyles.inputLabel}>TAGS</Text>
      <View style={activityDetailStyles.tagsFieldContainer}>
        <View style={activityDetailStyles.tagsFieldInner}>
          {list.slice(0, 12).map((tag) => (
            <Badge key={tag} variant="outline" style={activityDetailStyles.tagChip}>
              <Text style={activityDetailStyles.tagChipText}>{tag}</Text>
            </Badge>
          ))}
        </View>
      </View>
    </View>
  );
}

export function ActivityPeekSteps({
  activity,
  linkedActivityById,
  onToggleStepComplete,
  onOpenLinkedActivity,
}: {
  activity: Activity;
  linkedActivityById: Record<string, Activity | null | undefined>;
  onToggleStepComplete: (stepId: string) => void;
  onOpenLinkedActivity: (activityId: string) => void;
}) {
  const steps = Array.isArray(activity.steps) ? activity.steps : [];
  if (steps.length === 0) return null;

  const totalStepsCount = steps.length;
  const completedStepsCount = steps.reduce((acc, step) => {
    const linkedId = (step as any)?.linkedActivityId ?? null;
    if (linkedId) {
      const linked = linkedActivityById[linkedId] ?? null;
      const linkedDone = Boolean(linked && (linked.status === 'done' || linked.completedAt));
      return acc + (linkedDone ? 1 : 0);
    }
    return acc + (step.completedAt ? 1 : 0);
  }, 0);

  return (
    <View style={styles.section}>
      <View style={styles.stepsHeaderRow}>
        <HStack alignItems="center" justifyContent="space-between">
          <Text style={activityDetailStyles.stepsHeaderLabel}>STEPS</Text>
          <Text style={styles.stepsCountText}>
            {completedStepsCount}/{totalStepsCount}
          </Text>
        </HStack>
      </View>

      <View>
        {steps.slice(0, 6).map((step: ActivityStep) => {
          const linkedActivityId = (step as any)?.linkedActivityId ?? null;
          const linkedActivity = linkedActivityId ? (linkedActivityById[linkedActivityId] ?? null) : null;
          const isLinked = Boolean(linkedActivityId);
          const isLinkedDone = Boolean(linkedActivity && (linkedActivity.status === 'done' || linkedActivity.completedAt));
          const isChecked = isLinked ? isLinkedDone : !!step.completedAt;
          const primaryTitle = isLinked ? (linkedActivity?.title ?? step.title) : step.title;

          return (
            <View key={step.id}>
              <ThreeColumnRow
                style={activityDetailStyles.stepRow}
                contentStyle={activityDetailStyles.stepRowContent}
                left={
                  isLinked ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={linkedActivity ? `Open linked activity: ${primaryTitle}` : 'Linked activity missing'}
                      disabled={!linkedActivityId || !linkedActivity}
                      hitSlop={8}
                      onPress={() => {
                        if (!linkedActivityId) return;
                        onOpenLinkedActivity(linkedActivityId);
                      }}
                      style={({ pressed }) => [pressed ? { opacity: 0.7 } : null]}
                    >
                      <View style={activityDetailStyles.stepLeftIconBox}>
                        <View
                          style={[
                            activityDetailStyles.checkboxBase,
                            isChecked ? activityDetailStyles.linkedCheckboxCompleted : activityDetailStyles.linkedCheckboxPlanned,
                            activityDetailStyles.stepCheckbox,
                          ]}
                        >
                          <Icon name="link" size={12} color={isChecked ? colors.linkedForeground : colors.linked} />
                        </View>
                      </View>
                    </Pressable>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={isChecked ? 'Mark step as not done' : 'Mark step as done'}
                      hitSlop={8}
                      onPress={() => onToggleStepComplete(step.id)}
                    >
                      <View style={activityDetailStyles.stepLeftIconBox}>
                        <View
                          style={[
                            activityDetailStyles.checkboxBase,
                            isChecked ? activityDetailStyles.checkboxCompleted : activityDetailStyles.checkboxPlanned,
                            activityDetailStyles.stepCheckbox,
                          ]}
                        >
                          {isChecked ? <Icon name="check" size={12} color={colors.primaryForeground} /> : null}
                        </View>
                      </View>
                    </Pressable>
                  )
                }
                right={null}
              >
                <Text style={styles.stepTitle} numberOfLines={2} ellipsizeMode="tail">
                  {primaryTitle}
                </Text>
              </ThreeColumnRow>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.lg,
  },
  stepsHeaderRow: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  stepsCountText: {
    ...activityDetailStyles.stepsHeaderLabel,
    color: colors.textSecondary,
  },
  stepTitle: {
    color: colors.textPrimary,
    flexShrink: 1,
  },
});


