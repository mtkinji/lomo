import React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { colors, spacing, typography } from '../../theme';
import { VStack, Text, EmptyState } from '../../ui/primitives';
import { Card } from '../../ui/Card';
import { Coachmark } from '../../ui/Coachmark';
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
  getWeeklyDigestSettings,
  updateWeeklyDigestSettings,
  WEEKLY_CHAPTER_DELIVERY_WEEKDAYS,
  type WeeklyChapterDeliveryWeekday,
  type WeeklyDigestSettings,
  type ChapterRow,
} from '../../services/chapters';
import type { MoreStackParamList } from '../../navigation/RootNavigator';
import { useAppStore } from '../../store/useAppStore';
import { useShowedUpToday, useRepairWindowActive } from '../../store/useShowedUpToday';
import { useAnalytics } from '../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../services/analytics/events';
import { recordChapterOpenHint } from './chapterOpenSource';
import { getChapterHistorySnippet } from './chapterSnippet';
import { useCapabilityShellOptional } from '../../navigation/CapabilityShellContext';
import {
  getChapterReadMap,
  getChapterReadMapSync,
  subscribeChapterReadChanges,
} from './chapterReadState';

const CHAPTER_SETTINGS_COACHMARK_KEY = 'kwilt:chapters-settings-coachmark:v1';

function getWeekdayLabel(day: WeeklyChapterDeliveryWeekday | null): string {
  return WEEKLY_CHAPTER_DELIVERY_WEEKDAYS.find((item) => item.value === day)?.label ?? 'Monday';
}

function buildFirstChapterArrival(deliveryWeekday: WeeklyChapterDeliveryWeekday | null): string {
  // Scheduled weekly chapters are generated once the ISO week closes, so the
  // first chapter lands on the configured delivery day. We surface a human ETA +
  // the lookback range so the empty state reads like a promise, not a blank.
  try {
    const now = new Date();
    const dow = now.getDay(); // 0=Sun..6=Sat
    const targetJsDay = deliveryWeekday === 7 ? 0 : deliveryWeekday ?? 1;
    const daysUntilDelivery = ((targetJsDay - dow + 7) % 7) || 7;
    const nextDelivery = new Date(now);
    nextDelivery.setDate(now.getDate() + daysUntilDelivery);
    const weekStart = new Date(nextDelivery);
    weekStart.setDate(nextDelivery.getDate() - 7);
    const weekEnd = new Date(nextDelivery);
    weekEnd.setDate(nextDelivery.getDate() - 1);
    const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'long' });
    const shortFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
    return `First one arrives next ${dayFmt.format(nextDelivery)} for ${shortFmt.format(weekStart)}–${shortFmt.format(weekEnd)}.`;
  } catch {
    return `First one arrives next ${getWeekdayLabel(deliveryWeekday)}.`;
  }
}

export function ChaptersScreen() {
  const capabilityShell = useCapabilityShellOptional();
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList, 'MoreChapters'>>();
  const { capture } = useAnalytics();
  const listViewTrackedRef = React.useRef(false);
  const moreMenuTargetRef = React.useRef<View | null>(null);
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
  const [hasLoadedChapters, setHasLoadedChapters] = React.useState(false);
  const [chaptersLoadFailed, setChaptersLoadFailed] = React.useState(false);
  const [chapters, setChapters] = React.useState<ChapterRow[]>([]);
  const [weeklySettings, setWeeklySettings] = React.useState<WeeklyDigestSettings | null>(null);
  const [settingsSaving, setSettingsSaving] = React.useState(false);
  const [settingsCoachmarkDismissed, setSettingsCoachmarkDismissed] = React.useState(true);
  const [readMap, setReadMap] = React.useState<Record<string, string>>(() => getChapterReadMapSync());
  const hasLoadedChaptersRef = React.useRef(false);
  const chapterSettingsMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger accessibilityLabel="Chapter options">
        <View ref={moreMenuTargetRef} style={styles.moreMenuButton}>
          <Icon name="more" size={20} color={colors.textPrimary} />
        </View>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" sideOffset={6} align="end">
        <DropdownMenuItem
          onPress={() => navigation.navigate('MoreChapterDigestSettings')}
          accessibilityLabel="Open Weekly Chapters settings"
        >
          <Text style={styles.menuItemText}>Weekly Chapters</Text>
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

  React.useEffect(() => {
    let mounted = true;
    void AsyncStorage.getItem(CHAPTER_SETTINGS_COACHMARK_KEY)
      .then((value) => {
        if (mounted) setSettingsCoachmarkDismissed(value === 'seen');
      })
      .catch(() => {
        if (mounted) setSettingsCoachmarkDismissed(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const latest = chapters[0] ?? null;
  const history = chapters.slice(1);
  const chaptersEnabled = weeklySettings?.enabled ?? false;
  const deliveryWeekday = weeklySettings?.deliveryWeekday ?? null;
  const showSettingsCoachmark = !latest && weeklySettings !== null && !settingsCoachmarkDismissed;
  const isInitialChaptersLoad = !hasLoadedChapters;

  const formatShortDate = (iso: string) => {
    try {
      const ms = Date.parse(iso);
      if (!Number.isFinite(ms)) return iso;
      return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(ms));
    } catch {
      return iso;
    }
  };

  const refresh = React.useCallback(async (mode: 'background' | 'pull' = 'background') => {
    if (mode === 'pull') setRefreshing(true);
    try {
      // Best-effort fetch: we don't want to force an auth prompt just to view the page.
      const rows = await fetchMyChapters({ limit: 30, throwOnError: true });
      setChapters(rows);
      setChaptersLoadFailed(false);
      hasLoadedChaptersRef.current = true;
      setHasLoadedChapters(true);
      if (!listViewTrackedRef.current) {
        listViewTrackedRef.current = true;
        capture(AnalyticsEvent.ChapterListViewed, { chapter_count: rows.length });
      }
    } catch {
      setChaptersLoadFailed(true);
      if (!hasLoadedChaptersRef.current) {
        setChapters([]);
        hasLoadedChaptersRef.current = true;
        setHasLoadedChapters(true);
      }
    } finally {
      if (mode === 'pull') setRefreshing(false);
    }
  }, [capture]);

  const loadWeeklySettings = React.useCallback(async () => {
    try {
      const settings = await getWeeklyDigestSettings();
      setWeeklySettings(settings);
    } catch {
      setWeeklySettings(null);
    }
  }, []);

  const handleEnableWeeklyChapters = React.useCallback(async () => {
    if (settingsSaving) return;
    setSettingsSaving(true);
    try {
      const updated = await updateWeeklyDigestSettings({ enabled: true });
      if (updated) setWeeklySettings(updated);
    } finally {
      setSettingsSaving(false);
    }
  }, [settingsSaving]);

  const dismissSettingsCoachmark = React.useCallback(() => {
    setSettingsCoachmarkDismissed(true);
    void AsyncStorage.setItem(CHAPTER_SETTINGS_COACHMARK_KEY, 'seen').catch(() => undefined);
  }, []);

  const openChapterSettingsFromCoachmark = React.useCallback(() => {
    dismissSettingsCoachmark();
    navigation.navigate('MoreChapterDigestSettings');
  }, [dismissSettingsCoachmark, navigation]);

  useFocusEffect(
    React.useCallback(() => {
      // OOTB template: create in the background if signed in, without prompting.
      // Phase 2.1 + 2.5: we only ever create the weekly template; monthly /
      // yearly / manual factories are cut. The cron does the rest.
      void createDefaultWeeklyReflectionTemplate().catch(() => null);
      void loadWeeklySettings();
      void refresh('background');
      return () => {};
    }, [loadWeeklySettings, refresh]),
  );

  return (
    <AppShell>
      <PageHeader
        title="Chapters"
        onPressMenu={capabilityShell?.openMenu}
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh('pull')} />}
      >
        <VStack space="lg" style={styles.contentStack}>
          {isInitialChaptersLoad ? (
            <View style={styles.loadingState}>
              <Text style={styles.loadingText}>Loading chapters…</Text>
            </View>
          ) : latest ? (
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
          ) : chaptersLoadFailed ? (
            <EmptyState
              title="Couldn’t load chapters"
              iconName="emptyBox"
              instructions="Pull down to try again."
              style={styles.emptyState}
            />
          ) : (
            <EmptyState
              title={chaptersEnabled ? 'Your first weekly chapter is on its way' : 'Turn on weekly chapters'}
              iconName="emptyBox"
              instructions={
                chaptersEnabled
                  ? `A short recap of what moved this week. ${buildFirstChapterArrival(deliveryWeekday)}`
                  : 'Get a weekly recap of what moved, with patterns and next steps.'
              }
              primaryAction={
                chaptersEnabled
                  ? undefined
                  : {
                      label: 'Turn on chapters',
                      disabled: settingsSaving,
                      onPress: () => void handleEnableWeeklyChapters(),
                    }
              }
              style={styles.emptyState}
            />
          )}
        </VStack>
      </ScrollView>
      <Coachmark
        visible={showSettingsCoachmark}
        targetRef={moreMenuTargetRef}
        scrimToken="subtle"
        spotlight="hole"
        spotlightPadding={spacing.xs}
        spotlightRadius="auto"
        offset={spacing.xs}
        title={<Text style={styles.coachmarkTitle}>Chapter settings live here</Text>}
        body={
          <Text style={styles.coachmarkBody}>
            Use this menu to change the schedule, email, and Apple Health later.
          </Text>
        }
        actions={[
          { id: 'dismiss', label: 'Got it', variant: 'outline' },
          { id: 'settings', label: 'Open settings', variant: 'accent' },
        ]}
        onAction={(actionId) => {
          if (actionId === 'settings') {
            openChapterSettingsFromCoachmark();
            return;
          }
          dismissSettingsCoachmark();
        }}
        onDismiss={dismissSettingsCoachmark}
        placement="below"
      />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    marginTop: 0,
    paddingBottom: 120,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingBottom: 120,
  },
  contentStack: {
    flex: 1,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 120,
  },
  loadingText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
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
  coachmarkTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  coachmarkBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
});
