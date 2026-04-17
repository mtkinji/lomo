import React from 'react';
import { Pressable, Share, ScrollView, StyleSheet, View, TextInput } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { VStack, Text, Heading } from '../../ui/primitives';
import { Card } from '../../ui/Card';
import { Icon } from '../../ui/Icon';
import { colors, spacing, typography } from '../../theme';
import type { MoreStackParamList } from '../../navigation/RootNavigator';
import {
  fetchMyChapterById,
  fetchMyChapterNeighbors,
  fetchMyChapterFeedback,
  submitChapterFeedback,
  type ChapterRow,
  type ChapterFeedbackRating,
  type ChapterFeedbackRow,
} from '../../services/chapters';
import { useAnalytics } from '../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../services/analytics/events';
import { consumeChapterOpenHint, recordChapterOpenHint } from './chapterOpenSource';
import { markChapterRead } from './chapterReadState';
import { useToastStore } from '../../store/useToastStore';

type Route = RouteProp<MoreStackParamList, 'MoreChapterDetail'>;
type Nav = NativeStackNavigationProp<MoreStackParamList, 'MoreChapterDetail'>;

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function pickSection(outputJson: any, key: string): any | null {
  const sections = Array.isArray(outputJson?.sections) ? outputJson.sections : [];
  const found = sections.find((s: any) => s && typeof s === 'object' && s.key === key);
  return found && typeof found === 'object' ? found : null;
}

function splitArticleBlocks(text: string): Array<{ kind: 'h2' | 'p'; text: string }> {
  const lines = text.split(/\r?\n/);
  const blocks: Array<{ kind: 'h2' | 'p'; text: string }> = [];
  let buf: string[] = [];
  const flush = () => {
    const joined = buf.join(' ').replace(/\s+/g, ' ').trim();
    if (joined) blocks.push({ kind: 'p', text: joined });
    buf = [];
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    if (line.startsWith('## ')) {
      flush();
      const h = line.slice(3).trim();
      if (h) blocks.push({ kind: 'h2', text: h });
      continue;
    }
    buf.push(line);
  }
  flush();
  return blocks;
}

// Approx reading time at 220 wpm; we show whole minutes with a 1-min floor.
function estimateReadingMinutes(text: string | null): number {
  if (!text) return 1;
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (wordCount === 0) return 1;
  return Math.max(1, Math.round(wordCount / 220));
}

function detectCadence(chapter: ChapterRow | null): 'weekly' | 'monthly' | 'yearly' | 'manual' {
  const key = typeof chapter?.period_key === 'string' ? chapter.period_key : '';
  if (/\bW\d{2}\b/.test(key)) return 'weekly';
  if (/^\d{4}-\d{2}$/.test(key)) return 'monthly';
  if (/^\d{4}$/.test(key)) return 'yearly';
  const days = typeof chapter?.metrics?.period_days === 'number' ? chapter.metrics.period_days : 0;
  if (days > 0 && days <= 10) return 'weekly';
  if (days >= 26 && days <= 35) return 'monthly';
  if (days >= 360) return 'yearly';
  return 'manual';
}

function buildCadenceKicker(chapter: ChapterRow | null, periodStart: string, periodEnd: string): string {
  const cadence = detectCadence(chapter);
  const formatShort = (iso: string) => {
    const ms = Date.parse(iso);
    if (!Number.isFinite(ms)) return iso;
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(ms));
  };
  const formatYear = (iso: string) => {
    const ms = Date.parse(iso);
    if (!Number.isFinite(ms)) return iso;
    return new Intl.DateTimeFormat(undefined, { year: 'numeric' }).format(new Date(ms));
  };
  const formatMonth = (iso: string) => {
    const ms = Date.parse(iso);
    if (!Number.isFinite(ms)) return iso;
    return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date(ms));
  };
  if (cadence === 'yearly' && periodStart) return formatYear(periodStart);
  if (cadence === 'monthly' && periodStart) return formatMonth(periodStart);
  // weekly / manual / fallback: short date range
  if (periodStart && periodEnd) {
    // periodEnd is exclusive in the backend, so show end - 1 day-equivalent.
    const endDisplayMs = Date.parse(periodEnd) - 24 * 60 * 60 * 1000;
    const endIso = Number.isFinite(endDisplayMs) ? new Date(endDisplayMs).toISOString() : periodEnd;
    return `${formatShort(periodStart)} – ${formatShort(endIso)}`;
  }
  return '';
}

export function ChapterDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const chapterId = route.params?.chapterId ?? '';
  const showToast = useToastStore((s) => s.showToast);

  const [loading, setLoading] = React.useState(true);
  const [chapter, setChapter] = React.useState<ChapterRow | null>(null);
  const [detailsExpanded, setDetailsExpanded] = React.useState(false);
  const [neighbors, setNeighbors] = React.useState<{ previous: { id: string } | null; next: { id: string } | null }>({
    previous: null,
    next: null,
  });
  const [feedback, setFeedback] = React.useState<ChapterFeedbackRow | null>(null);
  const [feedbackNoteVisible, setFeedbackNoteVisible] = React.useState(false);
  const [feedbackNote, setFeedbackNote] = React.useState('');
  const { capture } = useAnalytics();
  const viewedTrackedRef = React.useRef(false);

  React.useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      try {
        const row = await fetchMyChapterById(chapterId);
        if (!mounted) return;
        setChapter(row);
        if (row?.template_id && row?.period_start) {
          const n = await fetchMyChapterNeighbors({
            chapterId,
            templateId: row.template_id,
            periodStart: row.period_start,
          });
          if (!mounted) return;
          setNeighbors({ previous: n.previous, next: n.next });
        }
        const fb = await fetchMyChapterFeedback(chapterId);
        if (!mounted) return;
        setFeedback(fb);
        setFeedbackNote(fb?.note ?? '');
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };
    void run();
    return () => {
      mounted = false;
    };
  }, [chapterId]);

  React.useEffect(() => {
    if (viewedTrackedRef.current) return;
    if (!chapter) return;
    viewedTrackedRef.current = true;
    const hint = consumeChapterOpenHint(chapterId);
    capture(AnalyticsEvent.ChapterViewed, {
      period_key: chapter.period_key ?? null,
      from: hint?.source ?? 'list',
      utm_campaign: hint?.utmCampaign ?? null,
    });
    void markChapterRead(chapterId);
  }, [capture, chapter, chapterId]);

  const outputJson = chapter?.output_json ?? null;
  const title = asString(outputJson?.title) ?? 'Chapter';
  const rawDek = asString(outputJson?.dek) ?? null;
  const dek =
    rawDek && !/^this chapter\b/i.test(rawDek.trim()) && !/^this (week|month|year)\b/i.test(rawDek.trim()) ? rawDek : null;
  const periodStart = chapter?.period_start ?? '';
  const periodEnd = chapter?.period_end ?? '';
  const kicker = buildCadenceKicker(chapter, periodStart, periodEnd);
  const cadenceForCopy = detectCadence(chapter);

  const story = asString(pickSection(outputJson, 'story')?.body) ?? null;
  const readingMinutes = estimateReadingMinutes(story);
  const whereTimeWent = (asArray(pickSection(outputJson, 'where_time_went')?.bullets).filter((x) => typeof x === 'string') as string[]).slice(0, 6);
  const highlights = (asArray(pickSection(outputJson, 'highlights')?.bullets).filter((x) => typeof x === 'string') as string[]).slice(0, 6);
  const patterns = (asArray(pickSection(outputJson, 'patterns')?.bullets).filter((x) => typeof x === 'string') as string[]).slice(0, 6);
  const nextExperiments = (asArray(pickSection(outputJson, 'next_experiments')?.bullets).filter((x) => typeof x === 'string') as string[]).slice(0, 6);
  const forcesItems = (asArray(pickSection(outputJson, 'forces')?.items).filter((x) => x && typeof x === 'object') as any[]).slice(0, 6);

  const metrics = chapter?.metrics ?? null;
  const topArcs = Array.isArray(metrics?.arcs) ? (metrics.arcs as any[]).slice(0, 3) : [];

  const completed = typeof metrics?.activities?.completed_count === 'number' ? metrics.activities.completed_count : null;
  const activeDays = typeof metrics?.time_shape?.active_days_count === 'number' ? metrics.time_shape.active_days_count : null;
  const streak = typeof metrics?.time_shape?.longest_active_streak_days === 'number' ? metrics.time_shape.longest_active_streak_days : null;
  const periodDays = typeof metrics?.period_days === 'number' ? metrics.period_days : null;

  const primaryStats = [
    { value: completed, label: 'Completed' },
    { value: activeDays, label: periodDays ? `Active days · ${periodDays}` : 'Active days' },
    { value: streak, label: 'Streak' },
  ];

  const createdCount = typeof metrics?.activities?.created_count === 'number' ? metrics.activities.created_count : null;
  const carriedCount = typeof metrics?.activities?.carried_forward_count === 'number' ? metrics.activities.carried_forward_count : null;
  const inProgressCount = typeof metrics?.activities?.started_not_completed_count === 'number' ? metrics.activities.started_not_completed_count : null;

  const handleShare = React.useCallback(async () => {
    if (!outputJson) return;
    const shareTitle = asString(outputJson.title) ?? 'My Kwilt chapter';
    const shareDek = asString(outputJson.dek) ?? '';
    const message = shareDek ? `${shareTitle}\n\n${shareDek}` : shareTitle;
    try {
      await Share.share({ title: shareTitle, message });
      capture(AnalyticsEvent.ChapterShared, {
        method: 'system_share',
        period_key: chapter?.period_key ?? null,
      });
    } catch {
      // User dismissed the share sheet; no-op.
    }
  }, [capture, chapter?.period_key, outputJson]);

  const onSubmitFeedback = React.useCallback(
    async (rating: ChapterFeedbackRating, note?: string | null) => {
      const previous = feedback;
      const optimistic: ChapterFeedbackRow = {
        id: previous?.id ?? 'local',
        user_id: previous?.user_id ?? '',
        chapter_id: chapterId,
        rating,
        reason_tags: previous?.reason_tags ?? [],
        note: typeof note === 'string' ? note : previous?.note ?? null,
        created_at: previous?.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setFeedback(optimistic);
      const saved = await submitChapterFeedback({ chapterId, rating, note: note ?? null });
      if (saved) {
        setFeedback(saved);
        capture(AnalyticsEvent.ChapterFeedbackSubmitted, {
          period_key: chapter?.period_key ?? null,
          rating,
          has_note: typeof note === 'string' && note.trim().length > 0,
        });
        if (rating === 'down' && !feedbackNoteVisible && !saved.note) {
          setFeedbackNoteVisible(true);
        }
      } else {
        setFeedback(previous);
        showToast({ message: 'Could not save feedback', variant: 'danger', durationMs: 2400 });
      }
    },
    [capture, chapter?.period_key, chapterId, feedback, feedbackNoteVisible, showToast],
  );

  const goToNeighbor = React.useCallback(
    (direction: 'prev' | 'next') => {
      const target = direction === 'prev' ? neighbors.previous : neighbors.next;
      if (!target) return;
      capture(AnalyticsEvent.ChapterPrevNextTapped, {
        direction,
        from_period_key: chapter?.period_key ?? null,
      });
      recordChapterOpenHint(target.id, 'list');
      navigation.replace('MoreChapterDetail', { chapterId: target.id });
    },
    [capture, chapter?.period_key, navigation, neighbors],
  );

  const hasDetails = forcesItems.length > 0 || patterns.length > 0 || nextExperiments.length > 0 || whereTimeWent.length > 0;

  return (
    <AppShell>
      <PageHeader
        title="Chapter"
        onPressBack={() => {
          if (navigation.canGoBack()) navigation.goBack();
          else navigation.navigate('MoreChapters');
        }}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <VStack space="lg">
          <View style={styles.headerBlock}>
            {kicker ? (
              <View style={styles.kickerRow}>
                <Text style={styles.kicker}>{kicker.toUpperCase()}</Text>
                {story ? (
                  <Text style={styles.kickerMeta}>{`${readingMinutes} min read`}</Text>
                ) : null}
              </View>
            ) : null}
            <Text style={styles.headline}>{title}</Text>
            {dek ? <Text style={styles.dek}>{dek}</Text> : null}
            {loading ? <Text style={styles.meta}>Loading…</Text> : null}
            {!loading && !chapter ? <Text style={styles.meta}>Not found.</Text> : null}
          </View>

          {chapter ? (
            <>
              {topArcs.length > 0 ? (
                <View style={styles.topArcsRow} accessibilityLabel="Arcs reflected in this chapter">
                  {topArcs.map((arc, idx) => {
                    const arcTitle = asString(arc?.arc_title) ?? null;
                    if (!arcTitle) return null;
                    const count = typeof arc?.activity_count_total === 'number' ? arc.activity_count_total : null;
                    return (
                      <View key={`arc-${idx}`} style={styles.topArcChip}>
                        <Text style={styles.topArcChipText} numberOfLines={1}>
                          {count != null ? `${arcTitle} · ${count}` : arcTitle}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : null}

              <View style={styles.keyFiguresWrap}>
                <View style={styles.metricsBand}>
                  {primaryStats.map((s, idx) => (
                    <View key={`p-${idx}`} style={[styles.metricsBandCol, idx < primaryStats.length - 1 && styles.metricsBandColDivider]}>
                      <Text style={styles.metricsBandValue}>{s.value == null ? '—' : String(s.value)}</Text>
                      <Text style={styles.metricsBandLabel}>{s.label}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.metricsFootnote} numberOfLines={2}>
                  {[
                    createdCount != null ? `${createdCount} created` : null,
                    carriedCount != null ? `${carriedCount} carried forward` : null,
                    inProgressCount != null ? `${inProgressCount} still in progress` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || ''}
                </Text>
              </View>

              <View style={styles.articleWrap}>
                {story ? (
                  <VStack space="sm">
                    {splitArticleBlocks(story).map((b, idx) =>
                      b.kind === 'h2' ? (
                        <Text key={`h-${idx}`} style={styles.articleSubhead}>
                          {b.text}
                        </Text>
                      ) : (
                        <Text key={`p-${idx}`} style={styles.articleBody}>
                          {b.text}
                        </Text>
                      ),
                    )}
                  </VStack>
                ) : chapter.status === 'failed' ? (
                  <VStack space="sm">
                    <Text style={styles.articleBody}>
                      We couldn&apos;t write this week&apos;s chapter. Your data is safe; we just hit a
                      snag assembling the story. We&apos;ll try again next week.
                    </Text>
                  </VStack>
                ) : (
                  <Text style={styles.articleBody}>
                    Your chapter is being written. This usually takes under a minute — pull to refresh if it doesn&apos;t appear shortly.
                  </Text>
                )}
              </View>

              {highlights.length > 0 ? (
                <VStack space="xs" style={styles.highlightsBlock}>
                  <Text style={styles.appendixHeading}>Highlights</Text>
                  {highlights.map((line, idx) => (
                    <Text key={`hi-${idx}`} style={styles.body}>{`\u2022 ${line}`}</Text>
                  ))}
                </VStack>
              ) : null}

              {story ? (
                <View style={styles.feedbackWrap}>
                  <Text style={styles.feedbackPrompt}>
                    Did this capture your {cadenceForCopy === 'weekly'
                      ? 'week'
                      : cadenceForCopy === 'monthly'
                        ? 'month'
                        : cadenceForCopy === 'yearly'
                          ? 'year'
                          : 'period'}?
                  </Text>
                  <View style={styles.feedbackButtons}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Yes, this captures it"
                      onPress={() => void onSubmitFeedback('up')}
                      style={[styles.feedbackButton, feedback?.rating === 'up' && styles.feedbackButtonActiveUp]}
                    >
                      <Icon name="thumbsUp" size={18} color={feedback?.rating === 'up' ? colors.canvas : colors.textSecondary} />
                      <Text style={[styles.feedbackButtonLabel, feedback?.rating === 'up' && styles.feedbackButtonLabelActive]}>Yes</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="No, this is off"
                      onPress={() => void onSubmitFeedback('down')}
                      style={[styles.feedbackButton, feedback?.rating === 'down' && styles.feedbackButtonActiveDown]}
                    >
                      <Icon name="thumbsDown" size={18} color={feedback?.rating === 'down' ? colors.canvas : colors.textSecondary} />
                      <Text style={[styles.feedbackButtonLabel, feedback?.rating === 'down' && styles.feedbackButtonLabelActive]}>Off</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Share this chapter"
                      onPress={() => void handleShare()}
                      style={styles.feedbackButton}
                    >
                      <Icon name="share" size={18} color={colors.textSecondary} />
                      <Text style={styles.feedbackButtonLabel}>Share</Text>
                    </Pressable>
                  </View>
                  {(feedbackNoteVisible || (feedback?.rating === 'down' && !feedback?.note)) ? (
                    <View style={styles.feedbackNoteWrap}>
                      <TextInput
                        value={feedbackNote}
                        onChangeText={setFeedbackNote}
                        placeholder="What was off? (optional)"
                        placeholderTextColor={colors.textSecondary}
                        style={styles.feedbackNoteInput}
                        multiline
                        maxLength={500}
                      />
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Save feedback note"
                        onPress={() => {
                          const note = feedbackNote.trim();
                          if (!note) {
                            setFeedbackNoteVisible(false);
                            return;
                          }
                          void onSubmitFeedback(feedback?.rating ?? 'down', note);
                          setFeedbackNoteVisible(false);
                        }}
                      >
                        <Text style={styles.feedbackNoteSave}>Save</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {hasDetails ? (
                <Card padding="md" style={styles.card}>
                  <VStack space="xs">
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={detailsExpanded ? 'Hide chapter details' : 'Show chapter details'}
                      onPress={() =>
                        setDetailsExpanded((v) => {
                          const next = !v;
                          if (next) {
                            capture(AnalyticsEvent.ChapterSectionExpanded, {
                              section: 'details',
                              period_key: chapter?.period_key ?? null,
                            });
                          }
                          return next;
                        })
                      }
                    >
                      <View style={styles.detailsHeaderRow}>
                        <Heading style={styles.sectionHeading}>Details</Heading>
                        <Text style={styles.detailsToggle}>{detailsExpanded ? 'Hide' : 'Show'}</Text>
                      </View>
                    </Pressable>

                    {detailsExpanded ? (
                      <VStack space="md">
                        {whereTimeWent.length > 0 ? (
                          <VStack space="xs">
                            <Text style={styles.appendixHeading}>Where the work landed</Text>
                            {whereTimeWent.map((line, idx) => (
                              <Text key={`wtw-${idx}`} style={styles.body}>{`\u2022 ${line}`}</Text>
                            ))}
                          </VStack>
                        ) : null}

                        {nextExperiments.length > 0 ? (
                          <VStack space="xs">
                            <Text style={styles.appendixHeading}>Next experiments</Text>
                            {nextExperiments.map((line, idx) => (
                              <Text key={`nx-${idx}`} style={styles.body}>{`\u2022 ${line}`}</Text>
                            ))}
                          </VStack>
                        ) : null}

                        {forcesItems.length > 0 ? (
                          <VStack space="xs">
                            <Text style={styles.appendixHeading}>Forces</Text>
                            {forcesItems.map((it, idx) => {
                              const force = asString(it?.force) ?? 'Force';
                              const body = asString(it?.body) ?? '';
                              const line = body ? `${force}: ${body}` : force;
                              return (
                                <Text key={`forces-${idx}`} style={styles.body}>
                                  {`\u2022 ${line}`}
                                </Text>
                              );
                            })}
                          </VStack>
                        ) : null}

                        {patterns.length > 0 ? (
                          <VStack space="xs">
                            <Text style={styles.appendixHeading}>Patterns</Text>
                            {patterns.map((line, idx) => (
                              <Text key={`pat-${idx}`} style={styles.body}>{`\u2022 ${line}`}</Text>
                            ))}
                          </VStack>
                        ) : null}
                      </VStack>
                    ) : null}
                  </VStack>
                </Card>
              ) : null}

              {(neighbors.previous || neighbors.next) ? (
                <View style={styles.neighborsRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Previous chapter"
                    disabled={!neighbors.previous}
                    onPress={() => goToNeighbor('prev')}
                    style={[styles.neighborButton, !neighbors.previous && styles.neighborButtonDisabled]}
                  >
                    <Icon name="chevronLeft" size={18} color={neighbors.previous ? colors.textPrimary : colors.textSecondary} />
                    <Text style={styles.neighborButtonLabel}>Previous</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Next chapter"
                    disabled={!neighbors.next}
                    onPress={() => goToNeighbor('next')}
                    style={[styles.neighborButton, !neighbors.next && styles.neighborButtonDisabled]}
                  >
                    <Text style={styles.neighborButtonLabel}>Next</Text>
                    <Icon name="chevronRight" size={18} color={neighbors.next ? colors.textPrimary : colors.textSecondary} />
                  </Pressable>
                </View>
              ) : null}
            </>
          ) : null}
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
    width: '100%',
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  kicker: {
    ...typography.bodySm,
    color: colors.textSecondary,
    letterSpacing: 1.2,
  },
  kickerMeta: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  headline: {
    ...typography.titleLg,
    color: colors.textPrimary,
    textAlign: 'left',
  },
  dek: {
    ...typography.body,
    color: colors.textPrimary,
    textAlign: 'left',
    marginTop: spacing.xs,
  },
  meta: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'left',
    marginTop: spacing.xs,
  },
  card: {
    width: '100%',
  },
  keyFiguresWrap: {
    width: '100%',
  },
  topArcsRow: {
    width: '100%',
    marginTop: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.xs,
    rowGap: spacing.xs,
  },
  topArcChip: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    maxWidth: '100%',
  },
  topArcChipText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  metricsBand: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: colors.pine700,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  metricsBandCol: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricsBandColDivider: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.25)',
  },
  metricsBandValue: {
    ...typography.titleLg,
    color: colors.canvas,
  },
  metricsBandLabel: {
    ...typography.bodySm,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    textAlign: 'center',
  },
  metricsFootnote: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  articleWrap: {
    width: '100%',
    marginTop: spacing.sm,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sectionHeading: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  appendixHeading: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  body: {
    ...typography.body,
    color: colors.textPrimary,
  },
  articleBody: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  articleSubhead: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  detailsToggle: {
    ...typography.bodySm,
    color: colors.pine700,
  },
  detailsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  highlightsBlock: {
    paddingTop: spacing.xs,
  },
  feedbackWrap: {
    width: '100%',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  feedbackPrompt: {
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  feedbackButtons: {
    flexDirection: 'row',
    columnGap: spacing.sm,
    flexWrap: 'wrap',
    rowGap: spacing.sm,
  },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
  },
  feedbackButtonActiveUp: {
    backgroundColor: colors.pine700,
    borderColor: colors.pine700,
  },
  feedbackButtonActiveDown: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  feedbackButtonLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  feedbackButtonLabelActive: {
    color: colors.canvas,
  },
  feedbackNoteWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    columnGap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  feedbackNoteInput: {
    flex: 1,
    ...typography.bodySm,
    color: colors.textPrimary,
    minHeight: 40,
    paddingVertical: 4,
  },
  feedbackNoteSave: {
    ...typography.bodySm,
    color: colors.pine700,
    fontWeight: '700',
    paddingTop: 6,
  },
  neighborsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    columnGap: spacing.sm,
    marginTop: spacing.sm,
  },
  neighborButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
  },
  neighborButtonDisabled: {
    opacity: 0.4,
  },
  neighborButtonLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
