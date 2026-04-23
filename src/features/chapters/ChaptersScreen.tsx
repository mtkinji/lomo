import React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { colors, spacing, typography } from '../../theme';
import { VStack, Text, EmptyState } from '../../ui/primitives';
import { Card } from '../../ui/Card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/DropdownMenu';
import { Icon } from '../../ui/Icon';
import {
  createDefaultWeeklyReflectionTemplate,
  fetchMyChapters,
  type ChapterRow,
} from '../../services/chapters';
import type { MoreStackParamList } from '../../navigation/RootNavigator';
import { useAppStore } from '../../store/useAppStore';
import { useShowedUpToday, useRepairWindowActive } from '../../store/useShowedUpToday';
import { useAnalytics } from '../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../services/analytics/events';
import { recordChapterOpenHint } from './chapterOpenSource';
import { getChapterHistorySnippet } from './chapterSnippet';
import {
  getChapterReadMap,
  getChapterReadMapSync,
  subscribeChapterReadChanges,
} from './chapterReadState';

function buildFirstChapterEta(): string {
  // Scheduled weekly chapters are generated once the ISO week closes, so the
  // first chapter lands next Monday (local time). We surface a human ETA +
  // the lookback range so the empty state reads like a promise, not a blank.
  try {
    const now = new Date();
    const dow = now.getDay(); // 0=Sun..6=Sat
    // Days until next Monday (1..7). If today is Monday, "next Monday" is 7d out.
    const daysUntilMonday = ((1 - dow + 7) % 7) || 7;
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + daysUntilMonday);
    const weekStart = new Date(nextMonday);
    weekStart.setDate(nextMonday.getDate() - 7);
    const weekEnd = new Date(nextMonday);
    weekEnd.setDate(nextMonday.getDate() - 1);
    const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'long' });
    const shortFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
    return `Your first chapter arrives next ${dayFmt.format(nextMonday)}. It'll recap ${shortFmt.format(weekStart)}–${shortFmt.format(weekEnd)} using the Arcs you're showing up for.`;
  } catch {
    return "Your first chapter arrives next Monday. It'll recap the past week using the Arcs you're showing up for.";
  }
}

export function ChaptersScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList, 'MoreChapters'>>();
  const { capture } = useAnalytics();
  const listViewTrackedRef = React.useRef(false);
  const authIdentity = useAppStore((state) => state.authIdentity);
  const userProfile = useAppStore((state) => state.userProfile);
  const avatarName = authIdentity?.name?.trim() || userProfile?.fullName?.trim() || 'Kwilter';
  const avatarUrl = authIdentity?.avatarUrl || userProfile?.avatarUrl;
  const currentShowUpStreak = useAppStore((state) => state.currentShowUpStreak);
  const lastShowUpDate = useAppStore((state) => state.lastShowUpDate);
  const streakGrace = useAppStore((state) => state.streakGrace);
  const streakBreakState = useAppStore((state) => state.streakBreakState);
  const showedUpToday = useShowedUpToday(lastShowUpDate);
  const shieldCount = (streakGrace?.freeDaysRemaining ?? 0) + (streakGrace?.shieldsAvailable ?? 0);
  const repairWindowActive = useRepairWindowActive(streakBreakState);
  const [refreshing, setRefreshing] = React.useState(false);
  const [chapters, setChapters] = React.useState<ChapterRow[]>([]);
  const [readMap, setReadMap] = React.useState<Record<string, string>>(() => getChapterReadMapSync());
  const chapterSettingsMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger accessibilityLabel="Chapter options">
        <View style={styles.moreMenuButton}>
          <Icon name="more" size={20} color={colors.textPrimary} />
        </View>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" sideOffset={6} align="end">
        <DropdownMenuItem
          onPress={() => navigation.navigate('MoreChapterDigestSettings')}
          accessibilityLabel="Open Chapter Settings"
        >
          <Text style={styles.menuItemText}>Chapter Settings</Text>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  React.useEffect(() => {
    let mounted = true;
    void getChapterReadMap().then((map) => {
      if (mounted) setReadMap({ ...map });
    });
    const unsub = subscribeChapterReadChanges(() => {
      if (mounted) setReadMap({ ...getChapterReadMapSync() });
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, []);

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
      if (!listViewTrackedRef.current) {
        listViewTrackedRef.current = true;
        capture(AnalyticsEvent.ChapterListViewed, { chapter_count: rows.length });
      }
    } catch {
      // Best-effort: keep placeholder UI if user cancels sign-in or network fails.
      setChapters([]);
    } finally {
      setRefreshing(false);
    }
  }, [capture]);

  useFocusEffect(
    React.useCallback(() => {
      // OOTB template: create in the background if signed in, without prompting.
      // Phase 2.1 + 2.5: we only ever create the weekly template; monthly /
      // yearly / manual factories are cut. The cron does the rest.
      void createDefaultWeeklyReflectionTemplate().catch(() => null);
      void refresh();
      return () => {};
    }, [refresh]),
  );

  return (
    <AppShell>
      <PageHeader
        title="Chapters"
        onPressAvatar={() => (navigation as any).navigate('Settings', { screen: 'SettingsHome' })}
        avatarName={avatarName}
        avatarUrl={avatarUrl}
        streakCount={currentShowUpStreak ?? 0}
        streakShowedUpToday={showedUpToday}
        shieldCount={shieldCount}
        repairWindowActive={repairWindowActive}
        moreMenu={chapterSettingsMenu}
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
                accessibilityLabel={readMap[latest.id] ? 'Open latest chapter' : 'Open latest chapter (unread)'}
                onPress={() => {
                  recordChapterOpenHint(latest.id, 'list');
                  navigation.navigate('MoreChapterDetail', { chapterId: latest.id });
                }}
              >
                <Card style={styles.card} marginTop="lg">
                  <VStack space="xs">
                    <View style={styles.cardTitleRow}>
                      {!readMap[latest.id] ? (
                        <View style={styles.unreadDot} accessibilityElementsHidden importantForAccessibility="no" />
                      ) : null}
                      <Text style={[styles.cardTitle, styles.cardTitleText]}>
                        {typeof latest?.output_json?.title === 'string' ? latest.output_json.title : 'Latest Chapter'}
                      </Text>
                    </View>
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
                  {history.map((c) => {
                    const snippet = getChapterHistorySnippet(c.output_json);
                    const unread = !readMap[c.id];
                    return (
                      <Pressable
                        key={c.id}
                        accessibilityRole="button"
                        accessibilityLabel={unread ? 'Open chapter (unread)' : 'Open chapter'}
                        onPress={() => {
                          recordChapterOpenHint(c.id, 'list');
                          navigation.navigate('MoreChapterDetail', { chapterId: c.id });
                        }}
                      >
                        <Card padding="sm" style={styles.card} marginVertical="xs">
                          <VStack space="xs">
                            <View style={styles.cardTitleRow}>
                              {unread ? (
                                <View style={styles.unreadDot} accessibilityElementsHidden importantForAccessibility="no" />
                              ) : null}
                              <Text style={[styles.historyTitle, styles.cardTitleText]}>
                                {typeof c?.output_json?.title === 'string' ? c.output_json.title : `Chapter ${c.period_key}`}
                              </Text>
                            </View>
                            <Text style={styles.cardMeta}>
                              {formatShortDate(c.period_start)} – {formatShortDate(c.period_end)}
                            </Text>
                            {snippet ? (
                              <Text style={styles.cardSnippet} numberOfLines={2}>
                                {snippet}
                              </Text>
                            ) : null}
                          </VStack>
                        </Card>
                      </Pressable>
                    );
                  })}
                </VStack>
              ) : null}
            </>
          ) : (
            <EmptyState
              title="Your first chapter is on its way"
              iconName="chapters"
              instructions={buildFirstChapterEta()}
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
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.xs,
  },
  cardTitleText: {
    flexShrink: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginRight: spacing.xs,
  },
  historyTitle: {
    ...typography.body,
    color: colors.textPrimary,
  },
  cardSnippet: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
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
  moreMenuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  menuItemText: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
});
