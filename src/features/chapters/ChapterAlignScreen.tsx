// Phase 6 of docs/chapters-plan.md — Chapter Next Steps "Align" surface.
//
// Lightweight confirmation screen for applying an Align suggestion: the
// server emits a cluster of untagged activities that look like an
// existing Goal's work, and this screen lets the user tag them in one
// step. Design decisions:
//
//   * Read-only review + single apply — no freeform editing of the
//     proposed target Goal. If the user wants a different Goal, they
//     can tap an activity to open its detail screen and tag it there.
//   * Activities are all selected by default. The user can uncheck any
//     they don't want to tag; only the selected ones are updated.
//     Activities that are already tagged (shouldn't happen for a
//     server-fresh recommendation, but guards a stale cache) or have
//     been deleted are skipped silently.
//   * On apply we fire `chapter_next_step_cta_tapped` with
//     `result: 'align_applied'` + an `activities_tagged` count, then
//     dismiss the recommendation (sleeps the card) and navigate back.
//   * If the target Goal no longer exists (archived, deleted) we render
//     an empty-state CTA back to the Chapter detail instead of silently
//     tagging activities to a null Goal.
//
// This screen intentionally does NOT gate on paywall — Align is about
// organizing existing activities, not creating new structure, so it's
// always free for all tiers.

import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { VStack, Text } from '../../ui/primitives';
import { Icon } from '../../ui/Icon';
import { colors, spacing, typography } from '../../theme';
import type { MoreStackParamList } from '../../navigation/RootNavigator';
import { useAppStore } from '../../store/useAppStore';
import { useAnalytics } from '../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../services/analytics/events';
import { useToastStore } from '../../store/useToastStore';
import { dismissRecommendation } from './chapterRecommendationDismissals';
import { recordChapterRecommendationEvent } from '../../services/chapters';

type Route = RouteProp<MoreStackParamList, 'MoreChapterAlign'>;
type Nav = NativeStackNavigationProp<MoreStackParamList, 'MoreChapterAlign'>;

export function ChapterAlignScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const {
    chapterId,
    recommendationId,
    goalId,
    goalTitle,
    arcTitle,
    activityIds,
  } = route.params;
  const { capture } = useAnalytics();
  const showToast = useToastStore((s) => s.showToast);

  const activities = useAppStore((s) => s.activities);
  const goals = useAppStore((s) => s.goals);
  const updateActivity = useAppStore((s) => s.updateActivity);

  const targetGoal = React.useMemo(
    () => goals.find((g) => g.id === goalId) ?? null,
    [goals, goalId],
  );

  // Only render activities that still exist + are still untagged. An
  // untagged activity whose `goalId` changed between server generation
  // and now has effectively opted out of the suggestion (the user
  // already tagged it somewhere else), so we hide it rather than
  // offering to overwrite that choice.
  const candidateActivities = React.useMemo(() => {
    const ids = new Set(activityIds);
    return activities
      .filter((a) => ids.has(a.id))
      .filter((a) => !a.goalId || a.goalId === goalId);
  }, [activities, activityIds, goalId]);

  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(() => {
    // All server-suggested activities start selected so the default
    // "Tag N activities" action reflects what the suggestion was for.
    return new Set(activityIds);
  });

  // If activities load asynchronously, keep the selection in sync with
  // the candidate set (drop ids that aren't candidates anymore).
  React.useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set<string>();
      for (const a of candidateActivities) {
        if (prev.has(a.id)) next.add(a.id);
      }
      return next;
    });
  }, [candidateActivities]);

  const toggle = React.useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleApply = React.useCallback(() => {
    if (!targetGoal) return;
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    for (const id of ids) {
      updateActivity(id, (a) => ({ ...a, goalId: targetGoal.id }));
    }

    capture(AnalyticsEvent.ChapterNextStepCtaTapped, {
      chapter_id: chapterId,
      recommendation_id: recommendationId,
      kind: 'align',
      result: 'align_applied',
      activities_tagged: ids.length,
    });

    // Sleep the recommendation so the card doesn't re-surface on the
    // Chapter detail after the user has acted on it.
    void dismissRecommendation(recommendationId);

    // Phase 8 of docs/chapters-plan.md — persist the outcome so the
    // next Chapter's generator can cite it ("last week you tagged 4
    // activities against the Sleep Goal"). The resulting_object_id is
    // the Goal the activities were tagged onto; the individual
    // activity ids live in the recommendation's payload and aren't
    // needed for continuity copy.
    void recordChapterRecommendationEvent({
      chapterId,
      recommendationId,
      kind: 'align',
      action: 'acted_on',
      resultingObjectId: targetGoal.id,
    });

    const goalLabel = targetGoal.title ?? 'Goal';
    showToast({
      message:
        ids.length === 1
          ? `Tagged 1 activity to ${goalLabel}`
          : `Tagged ${ids.length} activities to ${goalLabel}`,
      variant: 'success',
      durationMs: 2400,
    });

    if (navigation.canGoBack()) navigation.goBack();
  }, [
    capture,
    chapterId,
    navigation,
    recommendationId,
    selectedIds,
    showToast,
    targetGoal,
    updateActivity,
  ]);

  const targetMissing = !targetGoal;

  return (
    <AppShell>
      <PageHeader
        title="Tag activities"
        onPressBack={() => {
          if (navigation.canGoBack()) navigation.goBack();
        }}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <VStack space="lg">
          <View style={styles.headerBlock}>
            <Text style={styles.kicker}>ALIGN WITH AN EXISTING GOAL</Text>
            <Text style={styles.headline} numberOfLines={3}>
              {goalTitle || targetGoal?.title || 'Goal'}
            </Text>
            {arcTitle ? (
              <Text style={styles.subhead} numberOfLines={1}>
                Under {arcTitle}
              </Text>
            ) : null}
            <Text style={styles.body}>
              Kwilt noticed these activities look like{' '}
              <Text style={styles.bodyEmphasis}>{goalTitle || 'this Goal'}</Text>{' '}
              work. Tag them to sharpen next week&apos;s signal.
            </Text>
          </View>

          {targetMissing ? (
            <View style={styles.emptyStateBlock}>
              <Text style={styles.body}>
                The suggested Goal is no longer available. It may have been
                archived or deleted.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back to Chapter"
                onPress={() => {
                  if (navigation.canGoBack()) navigation.goBack();
                }}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonLabel}>Back to Chapter</Text>
              </Pressable>
            </View>
          ) : candidateActivities.length === 0 ? (
            <View style={styles.emptyStateBlock}>
              <Text style={styles.body}>
                These activities have already been tagged or removed. You&apos;re
                all set.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back to Chapter"
                onPress={() => {
                  if (navigation.canGoBack()) navigation.goBack();
                }}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonLabel}>Back to Chapter</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <VStack space="xs">
                {candidateActivities.map((a) => {
                  const checked = selectedIds.has(a.id);
                  return (
                    <Pressable
                      key={a.id}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked }}
                      accessibilityLabel={
                        checked
                          ? `Deselect ${a.title ?? 'activity'}`
                          : `Select ${a.title ?? 'activity'}`
                      }
                      onPress={() => toggle(a.id)}
                      style={[styles.row, checked && styles.rowSelected]}
                    >
                      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                        {checked ? (
                          <Icon name="check" size={14} color={colors.canvas} />
                        ) : null}
                      </View>
                      <Text style={styles.rowTitle} numberOfLines={2}>
                        {a.title ?? 'Untitled activity'}
                      </Text>
                    </Pressable>
                  );
                })}
              </VStack>

              <View style={styles.footer}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    selectedIds.size === 1
                      ? 'Tag 1 activity'
                      : `Tag ${selectedIds.size} activities`
                  }
                  disabled={selectedIds.size === 0}
                  onPress={handleApply}
                  style={[
                    styles.primaryButton,
                    selectedIds.size === 0 && styles.primaryButtonDisabled,
                  ]}
                >
                  <Text style={styles.primaryButtonLabel}>
                    {selectedIds.size === 0
                      ? 'Select at least one'
                      : selectedIds.size === 1
                        ? 'Tag 1 activity'
                        : `Tag ${selectedIds.size} activities`}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </VStack>
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  headerBlock: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  kicker: {
    ...typography.bodySm,
    color: colors.textSecondary,
    letterSpacing: 1.2,
  },
  headline: {
    ...typography.titleLg,
    color: colors.textPrimary,
  },
  subhead: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  body: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  bodyEmphasis: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  emptyStateBlock: {
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.sm,
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
  },
  rowSelected: {
    borderColor: colors.pine700,
    backgroundColor: colors.pine100,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
  },
  checkboxChecked: {
    backgroundColor: colors.pine700,
    borderColor: colors.pine700,
  },
  rowTitle: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  footer: {
    marginTop: spacing.md,
  },
  primaryButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 999,
    backgroundColor: colors.pine700,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.4,
  },
  primaryButtonLabel: {
    ...typography.body,
    color: colors.canvas,
    fontWeight: '700',
  },
});
