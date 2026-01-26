import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { VStack, Text, Heading } from '../../ui/primitives';
import { Card } from '../../ui/Card';
import { colors, spacing, typography } from '../../theme';
import type { MoreStackParamList } from '../../navigation/RootNavigator';
import { fetchMyChapterById, type ChapterRow } from '../../services/chapters';

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

export function ChapterDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const chapterId = route.params?.chapterId ?? '';

  const [loading, setLoading] = React.useState(true);
  const [chapter, setChapter] = React.useState<ChapterRow | null>(null);
  const [detailsExpanded, setDetailsExpanded] = React.useState(false);

  const formatShortDate = (iso: string) => {
    try {
      const ms = Date.parse(iso);
      if (!Number.isFinite(ms)) return iso;
      return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(ms));
    } catch {
      return iso;
    }
  };

  React.useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      try {
        const row = await fetchMyChapterById(chapterId);
        if (!mounted) return;
        setChapter(row);
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

  const outputJson = chapter?.output_json ?? null;
  const title = asString(outputJson?.title) ?? 'Chapter';
  const rawDek = asString(outputJson?.dek) ?? null;
  const dek =
    rawDek && !/^this chapter\b/i.test(rawDek.trim()) && !/^this (week|month|year)\b/i.test(rawDek.trim()) ? rawDek : null;
  const periodLabel = asString(outputJson?.period?.label) ?? null;
  const periodStart = chapter?.period_start ? formatShortDate(chapter.period_start) : '';
  const periodEnd = chapter?.period_end ? formatShortDate(chapter.period_end) : '';

  const story = asString(pickSection(outputJson, 'story')?.body) ?? null;
  const whereTimeWent = (asArray(pickSection(outputJson, 'where_time_went')?.bullets).filter((x) => typeof x === 'string') as string[]).slice(0, 6);
  const highlights = (asArray(pickSection(outputJson, 'highlights')?.bullets).filter((x) => typeof x === 'string') as string[]).slice(0, 6);
  const patterns = (asArray(pickSection(outputJson, 'patterns')?.bullets).filter((x) => typeof x === 'string') as string[]).slice(0, 6);
  const nextExperiments = (asArray(pickSection(outputJson, 'next_experiments')?.bullets).filter((x) => typeof x === 'string') as string[]).slice(0, 6);
  const forcesItems = (asArray(pickSection(outputJson, 'forces')?.items).filter((x) => x && typeof x === 'object') as any[]).slice(0, 6);

  const metrics = chapter?.metrics ?? null;
  const topArcs = Array.isArray(metrics?.arcs) ? (metrics.arcs as any[]).slice(0, 3) : [];

  const primaryStats = [
    { value: typeof metrics?.activities?.completed_count === 'number' ? metrics.activities.completed_count : null, label: 'Completed' },
    { value: typeof metrics?.activities?.created_count === 'number' ? metrics.activities.created_count : null, label: 'Created' },
    { value: typeof metrics?.activities?.carried_forward_count === 'number' ? metrics.activities.carried_forward_count : null, label: 'Carried' },
  ];
  const secondaryStats = [
    { value: typeof metrics?.time_shape?.active_days_count === 'number' ? metrics.time_shape.active_days_count : null, label: 'Active days' },
    { value: typeof metrics?.time_shape?.longest_active_streak_days === 'number' ? metrics.time_shape.longest_active_streak_days : null, label: 'Streak' },
    {
      value:
        typeof metrics?.activities?.started_not_completed_count === 'number' ? metrics.activities.started_not_completed_count : null,
      label: 'In progress',
    },
  ];

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
            <Text style={styles.kicker}>KWILT REPORT</Text>
            <Text style={styles.headline}>{title}</Text>
            {dek ? <Text style={styles.dek}>{dek}</Text> : null}
            {periodLabel ? <Text style={styles.byline}>{`Filed for ${periodLabel}`}</Text> : null}
            {!periodLabel && (periodStart || periodEnd) ? (
              <Text style={styles.byline}>
                {`Filed for ${periodStart}${periodStart && periodEnd ? ' – ' : ''}${periodEnd}`}
              </Text>
            ) : null}
            {loading ? <Text style={styles.meta}>Loading…</Text> : null}
            {!loading && !chapter ? <Text style={styles.meta}>Not found.</Text> : null}
          </View>

          {chapter ? (
            <>
              <View style={styles.keyFiguresWrap}>
                <Text style={styles.sectionLabel}>KEY FIGURES</Text>
                <View style={styles.metricsBand}>
                  {primaryStats.map((s, idx) => (
                    <View key={`p-${idx}`} style={[styles.metricsBandCol, idx < primaryStats.length - 1 && styles.metricsBandColDivider]}>
                      <Text style={styles.metricsBandValue}>{s.value == null ? '—' : String(s.value)}</Text>
                      <Text style={styles.metricsBandLabel}>{s.label}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.metricsSubRow}>
                  {secondaryStats.map((s, idx) => (
                    <View key={`s-${idx}`} style={styles.metricsSubCol}>
                      <Text style={styles.metricsSubValue}>{s.value == null ? '—' : String(s.value)}</Text>
                      <Text style={styles.metricsSubLabel}>{s.label}</Text>
                    </View>
                  ))}
                </View>
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
                ) : (
                  <Text style={styles.articleBody}>
                    {chapter.status === 'failed' ? 'Chapter generation failed.' : 'Chapter content is coming next.'}
                  </Text>
                )}
              </View>

              {(whereTimeWent.length > 0 || highlights.length > 0 || nextExperiments.length > 0) ? (
                <Card padding="md" style={styles.card}>
                  <VStack space="md">
                    <Heading style={styles.sectionHeading}>Key points</Heading>

                    {whereTimeWent.length > 0 ? (
                      <VStack space="xs">
                        <Text style={styles.appendixHeading}>Where the work landed</Text>
                        {whereTimeWent.map((line, idx) => (
                          <Text key={`wtw-${idx}`} style={styles.body}>{`\u2022 ${line}`}</Text>
                        ))}
                      </VStack>
                    ) : null}

                    {highlights.length > 0 ? (
                      <VStack space="xs">
                        <Text style={styles.appendixHeading}>Highlights</Text>
                        {highlights.map((line, idx) => (
                          <Text key={`hi-${idx}`} style={styles.body}>{`\u2022 ${line}`}</Text>
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

                    {(forcesItems.length > 0 || patterns.length > 0) ? (
                      <Text
                        style={styles.detailsToggle}
                        accessibilityRole="button"
                        onPress={() => setDetailsExpanded((v) => !v)}
                      >
                        {detailsExpanded ? 'Hide details' : 'Show details'}
                      </Text>
                    ) : null}

                    {detailsExpanded ? (
                      <VStack space="md">
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
    paddingBottom: spacing.xl,
  },
  headerBlock: {
    marginTop: spacing.md,
    width: '100%',
  },
  kicker: {
    ...typography.bodySm,
    color: colors.textSecondary,
    letterSpacing: 1.2,
    marginBottom: spacing.xs,
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
  byline: {
    ...typography.bodySm,
    color: colors.textSecondary,
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
  sectionLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    letterSpacing: 1.1,
    marginBottom: spacing.xs,
  },
  keyFiguresWrap: {
    width: '100%',
    marginTop: spacing.sm,
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
    paddingHorizontal: spacing.md,
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
  },
  metricsSubRow: {
    width: '100%',
    marginTop: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    flexDirection: 'row',
    paddingVertical: spacing.sm,
  },
  metricsSubCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  metricsSubValue: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  metricsSubLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  articleWrap: {
    width: '100%',
    marginTop: spacing.lg,
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
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});


