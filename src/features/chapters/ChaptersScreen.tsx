import React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { colors, spacing, typography } from '../../theme';
import { VStack, Text, EmptyState } from '../../ui/primitives';
import { Card } from '../../ui/Card';
import {
  createDefaultWeeklyReflectionTemplate,
  createDefaultMonthlyReflectionTemplate,
  createDefaultYearlyReflectionTemplate,
  createDefaultManualReflectionTemplate,
  fetchMyChapters,
  triggerChapterGeneration,
  type ChapterRow,
} from '../../services/chapters';
import type { MoreStackParamList } from '../../navigation/RootNavigator';
import { ensureSignedInWithPrompt } from '../../services/backend/auth';
import { useToastStore } from '../../store/useToastStore';
import { useAppStore } from '../../store/useAppStore';
import { ChapterGenerateDrawer, type ChapterPeriodChoice, type ChapterCadenceChoice } from './ChapterGenerateDrawer';

export function ChaptersScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList, 'MoreChapters'>>();
  const route = useRoute<RouteProp<MoreStackParamList, 'MoreChapters'>>();
  const showToast = useToastStore((s) => s.showToast);
  const authIdentity = useAppStore((state) => state.authIdentity);
  const userProfile = useAppStore((state) => state.userProfile);
  const avatarName = authIdentity?.name?.trim() || userProfile?.fullName?.trim() || 'Kwilter';
  const avatarUrl = authIdentity?.avatarUrl || userProfile?.avatarUrl;
  const [refreshing, setRefreshing] = React.useState(false);
  const [chapters, setChapters] = React.useState<ChapterRow[]>([]);
  const [drawerVisible, setDrawerVisible] = React.useState(false);
  const [cadence, setCadence] = React.useState<ChapterCadenceChoice>('weekly');
  const [periodChoice, setPeriodChoice] = React.useState<ChapterPeriodChoice>('lastComplete');
  const [overwrite, setOverwrite] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const manualRangeEnabled = true;
  const [manualStartDate, setManualStartDate] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  });
  const [manualEndDate, setManualEndDate] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1); // exclusive end; default "through today"
    return d;
  });

  const latest = chapters[0] ?? null;
  const history = chapters.slice(1);

  const formatShortDate = (iso: string) => {
    try {
      const ms = Date.parse(iso);
      if (!Number.isFinite(ms)) return iso;
      return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(ms));
    } catch {
      return iso;
    }
  };

  const refresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      // Best-effort fetch: we don't want to force an auth prompt just to view the page.
      const rows = await fetchMyChapters({ limit: 30 });
      setChapters(rows);
    } catch {
      // Best-effort: keep placeholder UI if user cancels sign-in or network fails.
      setChapters([]);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      // OOTB template: create in the background if signed in, without prompting.
      void createDefaultWeeklyReflectionTemplate().catch(() => null);
      void refresh();
      return () => {};
    }, [refresh]),
  );

  // Global + button entrypoint: open the Generate Chapter drawer.
  React.useEffect(() => {
    if (!route.params?.openCreateChapter) return;
    setDrawerVisible(true);
    navigation.setParams({ openCreateChapter: false });
  }, [navigation, route.params?.openCreateChapter]);

  React.useEffect(() => {
    if (cadence !== 'weekly' && periodChoice === 'prev3') {
      setPeriodChoice('lastComplete');
    }
    if (cadence === 'manual' && periodChoice !== 'custom') {
      setPeriodChoice('custom');
    }
  }, [cadence, periodChoice]);

  const formatLocalYmd = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const onPressGenerate = React.useCallback(async () => {
    if (generating) return;
    setGenerating(true);
    try {
      await ensureSignedInWithPrompt('settings');
      const template =
        cadence === 'manual'
          ? await createDefaultManualReflectionTemplate()
          : cadence === 'yearly'
            ? await createDefaultYearlyReflectionTemplate()
            : cadence === 'monthly'
              ? await createDefaultMonthlyReflectionTemplate()
              : await createDefaultWeeklyReflectionTemplate();
      if (!template?.id) {
        showToast({ message: 'Unable to access template', variant: 'danger', durationMs: 2600 });
        return;
      }

      const periodOffset =
        periodChoice === 'lastComplete'
          ? 0
          : periodChoice === 'prev1'
            ? 1
            : periodChoice === 'prev3'
              ? 3
              : 0;
      const result =
        cadence === 'manual' || periodChoice === 'custom'
          ? await triggerChapterGeneration({
              templateId: template.id,
              force: overwrite,
              start: formatLocalYmd(manualStartDate),
              end: formatLocalYmd(manualEndDate),
            })
          : await triggerChapterGeneration({
              templateId: template.id,
              force: overwrite,
              periodOffset,
            });

      await refresh();

      if (!result) {
        showToast({ message: 'Unable to generate Chapter', variant: 'danger', durationMs: 2600 });
        return;
      }
      if (result.action === 'generated') {
        const label = result.periodKey ? `Generated Chapter (${result.periodKey})` : 'Generated Chapter';
        showToast({ message: label, variant: 'success', durationMs: 2200 });
        setDrawerVisible(false);
        return;
      }
      if (result.action === 'skipped') {
        const label = result.periodKey ? `Already exists (${result.periodKey})` : 'Already exists';
        showToast({ message: label, variant: 'default', durationMs: 2400 });
        return;
      }
      const msg = result.error ? `Chapter generation failed: ${result.error}` : 'Chapter generation failed';
      showToast({ message: msg, variant: 'danger', durationMs: 3200 });
    } catch {
      showToast({ message: 'Unable to generate Chapter', variant: 'danger', durationMs: 2600 });
    } finally {
      setGenerating(false);
    }
  }, [cadence, generating, overwrite, periodChoice, refresh, showToast]);

  return (
    <AppShell>
      <PageHeader
        title="Chapters"
        onPressAvatar={() => (navigation as any).navigate('Settings', { screen: 'SettingsHome' })}
        avatarName={avatarName}
        avatarUrl={avatarUrl}
      />
      <ChapterGenerateDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        cadence={cadence}
        onChangeCadence={setCadence}
        periodChoice={periodChoice}
        onChangePeriodChoice={setPeriodChoice}
        manualRangeEnabled={manualRangeEnabled}
        manualStartDate={manualStartDate}
        manualEndDate={manualEndDate}
        onChangeManualStartDate={setManualStartDate}
        onChangeManualEndDate={setManualEndDate}
        overwrite={overwrite}
        onChangeOverwrite={setOverwrite}
        onPressGenerate={onPressGenerate}
        generating={generating}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <VStack space="lg">
          {latest ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open latest chapter"
                onPress={() => navigation.navigate('MoreChapterDetail', { chapterId: latest.id })}
              >
                <Card style={styles.card} marginTop="lg">
                  <VStack space="xs">
                    <Text style={styles.cardTitle}>
                      {typeof latest?.output_json?.title === 'string' ? latest.output_json.title : 'Latest Chapter'}
                    </Text>
                    {typeof latest?.output_json?.dek === 'string' && latest.output_json.dek.trim() ? (
                      <Text style={styles.cardMeta}>{latest.output_json.dek}</Text>
                    ) : null}
                    <Text style={styles.cardMeta}>
                      {formatShortDate(latest.period_start)} – {formatShortDate(latest.period_end)}
                    </Text>
                    <View style={styles.cardRow}>
                      <Text style={styles.cardStat}>
                        {typeof latest?.metrics?.activities?.completed_count === 'number'
                          ? `${latest.metrics.activities.completed_count} completed`
                          : `${latest.status}`}
                      </Text>
                      <Text style={styles.cardStat}>
                        {typeof latest?.metrics?.time_shape?.active_days_count === 'number'
                          ? `${latest.metrics.time_shape.active_days_count} active days`
                          : ''}
                      </Text>
                    </View>
                  </VStack>
                </Card>
              </Pressable>

              {history.length > 0 ? (
                <VStack space="sm">
                  <Text style={styles.sectionTitle}>History</Text>
                  {history.map((c) => (
                    <Pressable
                      key={c.id}
                      accessibilityRole="button"
                      accessibilityLabel="Open chapter"
                      onPress={() => navigation.navigate('MoreChapterDetail', { chapterId: c.id })}
                    >
                      <Card padding="sm" style={styles.card} marginVertical="xs">
                        <VStack space="xs">
                          <Text style={styles.historyTitle}>
                            {typeof c?.output_json?.title === 'string' ? c.output_json.title : `Chapter ${c.period_key}`}
                          </Text>
                          <Text style={styles.cardMeta}>
                            {formatShortDate(c.period_start)} – {formatShortDate(c.period_end)}
                          </Text>
                        </VStack>
                      </Card>
                    </Pressable>
                  ))}
                </VStack>
              ) : null}
            </>
          ) : (
            <EmptyState
              title="No chapters yet"
              iconName="chapters"
              instructions="Tap the green + button to generate your first Chapter."
              style={styles.emptyState}
            />
          )}
        </VStack>
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    marginTop: spacing['2xl'],
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  card: {
    width: '100%',
  },
  cardTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  historyTitle: {
    ...typography.body,
    color: colors.textPrimary,
  },
  sectionTitle: {
    ...typography.titleSm,
    color: colors.textSecondary,
    marginTop: spacing.lg,
  },
  cardMeta: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: spacing.md,
    marginTop: spacing.xs,
  },
  cardStat: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  emptyTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
});


