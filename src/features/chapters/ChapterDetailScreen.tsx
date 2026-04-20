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
  updateChapterUserNote,
  recordChapterRecommendationEvent,
  CHAPTER_USER_NOTE_MAX_LENGTH,
  type ChapterRow,
  type ChapterFeedbackRating,
  type ChapterFeedbackRow,
  type ChapterRecommendationEventKind,
} from '../../services/chapters';
import { useAnalytics } from '../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../services/analytics/events';
import { consumeChapterOpenHint, recordChapterOpenHint } from './chapterOpenSource';
import { markChapterRead } from './chapterReadState';
import {
  dismissRecommendation,
  getRecommendationDismissalMap,
  isRecommendationDismissed,
  subscribeRecommendationDismissalChanges,
} from './chapterRecommendationDismissals';
import { useToastStore } from '../../store/useToastStore';
import { useAppStore } from '../../store/useAppStore';
import { useEntitlementsStore } from '../../store/useEntitlementsStore';
import { canCreateArc, canCreateGoalInArc } from '../../domain/limits';
import { openPaywallInterstitial } from '../../services/paywall';
import { rootNavigationRef } from '../../navigation/rootNavigationRef';

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

/**
 * Phase 3.3 arc-lane formatting. Input is an arc entry from
 * `metrics.arcs[]` (server-augmented with a `delta` block by
 * `augmentArcsWithDeltas` in `supabase/functions/chapters-generate`). We show
 * the headline "{N} completed" (or "{N} active" if nothing closed this week)
 * as the primary, and a short delta line as a secondary. Missing deltas
 * render as empty strings so pre-Phase-3 chapters degrade gracefully.
 */
function formatArcLanePrimary(arc: any): string {
  const completed = typeof arc?.completed_count === 'number' ? arc.completed_count : null;
  const total = typeof arc?.activity_count_total === 'number' ? arc.activity_count_total : null;
  if (completed != null && completed > 0) {
    return `${completed} completed`;
  }
  if (total != null && total > 0) {
    return `${total} active`;
  }
  return 'Quiet this period';
}

function formatArcLaneDelta(arc: any, cadence: 'weekly' | 'monthly' | 'yearly' | 'manual'): string {
  const delta = arc?.delta ?? null;
  if (!delta || typeof delta !== 'object') return '';
  const periodWord = cadence === 'weekly' ? 'week' : cadence === 'monthly' ? 'month' : cadence === 'yearly' ? 'year' : 'period';
  if (delta.new_or_first === true) {
    return `New this ${periodWord}`;
  }
  const completedDelta = typeof delta.completed_delta === 'number' ? delta.completed_delta : null;
  if (completedDelta == null) return '';
  if (completedDelta === 0) {
    const activeDelta = typeof delta.active_days_delta === 'number' ? delta.active_days_delta : null;
    if (activeDelta != null && activeDelta !== 0) {
      const arrow = activeDelta > 0 ? '+' : '';
      return `${arrow}${activeDelta} active day${Math.abs(activeDelta) === 1 ? '' : 's'} vs last ${periodWord}`;
    }
    return `Steady vs last ${periodWord}`;
  }
  const arrow = completedDelta > 0 ? '+' : '';
  return `${arrow}${completedDelta} completed vs last ${periodWord}`;
}

// Phase 7.1: short "Apr 9" style attribution for the user-note
// pull-quote. Intentionally terse — the goal is to cue "this is the
// user's own voice, from this moment" without stealing visual weight
// from the note itself.
function formatUserNoteAttributionDate(iso: string | null): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  try {
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(ms));
  } catch {
    return null;
  }
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
  // Phase 3.3: the article body is now behind a "Read the full story"
  // disclosure. Default collapsed so the signal-first layout stays
  // signal-first. Instrumented so we can see the tap-through rate relative
  // to `chapter_viewed`.
  const [storyExpanded, setStoryExpanded] = React.useState(false);
  const [detailsExpanded, setDetailsExpanded] = React.useState(false);
  const [neighbors, setNeighbors] = React.useState<{ previous: { id: string } | null; next: { id: string } | null }>({
    previous: null,
    next: null,
  });
  const [feedback, setFeedback] = React.useState<ChapterFeedbackRow | null>(null);
  const [feedbackNoteVisible, setFeedbackNoteVisible] = React.useState(false);
  const [feedbackNote, setFeedbackNote] = React.useState('');
  // Phase 7.1: first-class "add a line" user note. `userNoteEditing`
  // controls whether the input is expanded; when collapsed we show
  // either the saved note as a pull-quote or the CTA ("Anything we
  // missed?"). `userNoteSaving` guards the in-flight RPC so we can
  // disable Save and show a subtle state while persisting.
  const [userNoteEditing, setUserNoteEditing] = React.useState(false);
  const [userNoteDraft, setUserNoteDraft] = React.useState('');
  const [userNoteSaving, setUserNoteSaving] = React.useState(false);
  const userNoteInputRef = React.useRef<TextInput | null>(null);
  const userNoteDeepLinkRef = React.useRef(false);
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
        setUserNoteDraft(row?.user_note ?? '');
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

  // Phase 7.3: `?addLine=1` deep link from the digest email's secondary
  // CTA opens the Chapter straight into the add-a-line affordance. We
  // fire once per mount (ref-guarded) after the chapter loads so the
  // TextInput exists and can receive focus. The guard also prevents
  // the param from re-triggering when the user taps "Cancel" and the
  // component re-renders.
  const addLineParam = route.params?.addLine === true;
  React.useEffect(() => {
    if (!addLineParam) return;
    if (userNoteDeepLinkRef.current) return;
    if (!chapter) return;
    userNoteDeepLinkRef.current = true;
    setUserNoteEditing(true);
    capture(AnalyticsEvent.ChapterUserNoteCtaTapped, {
      chapter_id: chapterId,
      period_key: chapter.period_key ?? null,
      source: 'deep_link',
    });
    // Give the input a tick to mount before focusing so the keyboard
    // animation doesn't race the scroll/layout pass.
    const t = setTimeout(() => {
      userNoteInputRef.current?.focus();
    }, 150);
    return () => clearTimeout(t);
  }, [addLineParam, capture, chapter, chapterId]);

  const outputJson = chapter?.output_json ?? null;
  const title = asString(outputJson?.title) ?? 'Chapter';
  const rawDek = asString(outputJson?.dek) ?? null;
  const dek =
    rawDek && !/^this chapter\b/i.test(rawDek.trim()) && !/^this (week|month|year)\b/i.test(rawDek.trim()) ? rawDek : null;
  const periodStart = chapter?.period_start ?? '';
  const periodEnd = chapter?.period_end ?? '';
  const kicker = buildCadenceKicker(chapter, periodStart, periodEnd);
  const cadenceForCopy = detectCadence(chapter);

  // Phase 3.1/3.3: the caption is the primary above-the-fold hook on the
  // detail screen. When present we hide the dek here (it'd duplicate the
  // same story); legacy chapters without a caption still see the dek.
  const caption = asString(pickSection(outputJson, 'signal')?.caption) ?? null;
  const story = asString(pickSection(outputJson, 'story')?.body) ?? null;
  const readingMinutes = estimateReadingMinutes(story);
  const whereTimeWent = (asArray(pickSection(outputJson, 'where_time_went')?.bullets).filter((x) => typeof x === 'string') as string[]).slice(0, 6);
  const highlights = (asArray(pickSection(outputJson, 'highlights')?.bullets).filter((x) => typeof x === 'string') as string[]).slice(0, 6);
  const patterns = (asArray(pickSection(outputJson, 'patterns')?.bullets).filter((x) => typeof x === 'string') as string[]).slice(0, 6);
  const nextExperiments = (asArray(pickSection(outputJson, 'next_experiments')?.bullets).filter((x) => typeof x === 'string') as string[]).slice(0, 6);
  const forcesItems = (asArray(pickSection(outputJson, 'forces')?.items).filter((x) => x && typeof x === 'object') as any[]).slice(0, 6);

  const metrics = chapter?.metrics ?? null;
  // Phase 3.3 arc lanes: up to 4 top arcs by activity, each with its delta
  // block (populated by `augmentArcsWithDeltas` on the server). We surface
  // lanes even when deltas are missing (pre-Phase-3 chapters) — the lane
  // still communicates weight.
  const arcLanes = Array.isArray(metrics?.arcs) ? (metrics.arcs as any[]).slice(0, 4) : [];

  // Phase 5.2 of docs/chapters-plan.md: Next Steps surface. Recommendations
  // are emitted server-side by `_shared/chapterRecommendations.ts` and
  // live under `output_json.recommendations`. We filter out dismissed ids
  // (AsyncStorage-backed 90-day sleep) before rendering.
  const rawRecommendations = React.useMemo(() => {
    const raw = (outputJson as any)?.recommendations;
    if (!Array.isArray(raw)) return [] as any[];
    return raw.filter((r) => r && typeof r === 'object' && typeof r.kind === 'string');
  }, [outputJson]);
  const [dismissalNonce, setDismissalNonce] = React.useState(0);
  React.useEffect(() => {
    void getRecommendationDismissalMap();
    const unsub = subscribeRecommendationDismissalChanges(() =>
      setDismissalNonce((n) => n + 1),
    );
    return unsub;
  }, []);
  const visibleRecommendations = React.useMemo(() => {
    return rawRecommendations.filter((r: any) => !isRecommendationDismissed(String(r.id ?? '')));
    // dismissalNonce forces a recompute when the dismissal map mutates.
  }, [rawRecommendations, dismissalNonce]);

  // Arc-limit gate — mirrors `ArcsScreen.handleOpenNewArc`. Free-tier users
  // at the 1-Arc cap are routed to the paywall with contextual attribution;
  // Pro-tier users deep-link into the manual Arc creation modal with the
  // nominated title prefilled.
  const arcs = useAppStore((s) => s.arcs);
  const goals = useAppStore((s) => s.goals);
  const isPro = useEntitlementsStore((s) => s.isPro);

  // Fire `chapter_next_step_shown` once per (chapter, recommendation_id)
  // rendered. We keep a ref so re-renders from dismissal/nav don't re-log.
  const shownRecIdsRef = React.useRef<Set<string>>(new Set());
  React.useEffect(() => {
    if (!chapter) return;
    for (const r of visibleRecommendations) {
      const id = String((r as any).id ?? '');
      if (!id) continue;
      const seenKey = `${chapterId}::${id}`;
      if (shownRecIdsRef.current.has(seenKey)) continue;
      shownRecIdsRef.current.add(seenKey);
      capture(AnalyticsEvent.ChapterNextStepShown, {
        chapter_id: chapterId,
        period_key: chapter.period_key ?? null,
        recommendation_id: id,
        kind: (r as any).kind ?? null,
      });
    }
  }, [capture, chapter, chapterId, visibleRecommendations]);

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

  // Phase 5.2 + Phase 6: Next Steps CTA handlers. One dispatcher routes
  // each recommendation `kind` to the right follow-up flow + paywall
  // gate. Align is never gated (it's reorganizing existing activities,
  // not creating new structure).
  const handleNextStepCtaTap = React.useCallback(
    (rec: {
      id?: string;
      kind?: string;
      payload?: {
        title?: string;
        arcId?: string;
        arcTitle?: string;
        goalId?: string;
        goalTitle?: string;
        activityIds?: string[];
      };
    }) => {
      const recommendationId = typeof rec?.id === 'string' ? rec.id : '';
      const kind = rec?.kind;

      if (kind === 'arc') {
        const nominated = typeof rec?.payload?.title === 'string' ? rec.payload.title.trim() : '';
        const gate = canCreateArc({ isPro, arcs });
        if (!gate.ok) {
          capture(AnalyticsEvent.ChapterNextStepCtaTapped, {
            chapter_id: chapterId,
            period_key: chapter?.period_key ?? null,
            recommendation_id: recommendationId,
            kind,
            result: 'paywall',
          });
          openPaywallInterstitial({
            reason: 'limit_arcs_total',
            source: 'chapter_arc_nomination',
          });
          return;
        }
        capture(AnalyticsEvent.ChapterNextStepCtaTapped, {
          chapter_id: chapterId,
          period_key: chapter?.period_key ?? null,
          recommendation_id: recommendationId,
          kind,
          result: 'create_flow',
        });
        if (!rootNavigationRef.isReady()) return;
        rootNavigationRef.navigate('ArcsStack', {
          screen: 'ArcsList',
          params: {
            openCreateArc: true,
            prefilledArcName: nominated || undefined,
            // Phase 8: thread the recommendation context through the
            // Arc-creation flow so the NewArcModal can record an
            // `acted_on` event once the Arc is actually created.
            // Recording here (on CTA tap) would over-count users who
            // bail before creating the Arc.
            chapterRecommendation: recommendationId
              ? { chapterId, recommendationId }
              : undefined,
          },
        } as any);
        return;
      }

      if (kind === 'goal') {
        const nominated = typeof rec?.payload?.title === 'string' ? rec.payload.title.trim() : '';
        const targetArcId = typeof rec?.payload?.arcId === 'string' ? rec.payload.arcId : '';
        if (!targetArcId) return;
        const gate = canCreateGoalInArc({ isPro, goals, arcId: targetArcId });
        if (!gate.ok) {
          capture(AnalyticsEvent.ChapterNextStepCtaTapped, {
            chapter_id: chapterId,
            period_key: chapter?.period_key ?? null,
            recommendation_id: recommendationId,
            kind,
            result: 'paywall',
          });
          openPaywallInterstitial({
            reason: 'limit_goals_per_arc',
            source: 'chapter_goal_nomination',
          });
          return;
        }
        capture(AnalyticsEvent.ChapterNextStepCtaTapped, {
          chapter_id: chapterId,
          period_key: chapter?.period_key ?? null,
          recommendation_id: recommendationId,
          kind,
          result: 'create_flow',
        });
        if (!rootNavigationRef.isReady()) return;
        // Deep-link into ArcDetail with prefilled Goal title + manual tab.
        // The MoreArcs stack is the canonical host under the More tab,
        // matching the navigation shape used elsewhere in the app.
        rootNavigationRef.navigate('MainTabs', {
          screen: 'MoreTab',
          params: {
            screen: 'MoreArcs',
            params: {
              screen: 'ArcDetail',
              params: {
                arcId: targetArcId,
                openGoalCreation: true,
                prefilledGoalTitle: nominated || undefined,
                goalCreationInitialTab: 'manual',
                // Phase 8: carry the recommendation context into the
                // Goal-creation flow so ArcDetailScreen can record an
                // `acted_on` event (with the new goalId) once the
                // drawer completes.
                chapterRecommendation: recommendationId
                  ? { chapterId, recommendationId }
                  : undefined,
              },
            },
          },
        } as any);
        return;
      }

      if (kind === 'align') {
        const targetGoalId = typeof rec?.payload?.goalId === 'string' ? rec.payload.goalId : '';
        const targetGoalTitle =
          typeof rec?.payload?.goalTitle === 'string' ? rec.payload.goalTitle : '';
        const targetArcId =
          typeof rec?.payload?.arcId === 'string' ? rec.payload.arcId : null;
        const targetArcTitle =
          typeof rec?.payload?.arcTitle === 'string' ? rec.payload.arcTitle : null;
        const ids = Array.isArray(rec?.payload?.activityIds)
          ? rec.payload.activityIds.filter((x) => typeof x === 'string')
          : [];
        if (!targetGoalId || ids.length === 0) return;
        capture(AnalyticsEvent.ChapterNextStepCtaTapped, {
          chapter_id: chapterId,
          period_key: chapter?.period_key ?? null,
          recommendation_id: recommendationId,
          kind,
          result: 'align_flow',
        });
        if (!rootNavigationRef.isReady()) return;
        rootNavigationRef.navigate('MainTabs', {
          screen: 'MoreTab',
          params: {
            screen: 'MoreChapterAlign',
            params: {
              chapterId,
              recommendationId,
              goalId: targetGoalId,
              goalTitle: targetGoalTitle,
              arcId: targetArcId,
              arcTitle: targetArcTitle,
              activityIds: ids,
            },
          },
        } as any);
        return;
      }
    },
    [arcs, capture, chapter?.period_key, chapterId, goals, isPro],
  );

  const handleNextStepDismiss = React.useCallback(
    (rec: { id?: string; kind?: string }) => {
      const recommendationId = typeof rec?.id === 'string' ? rec.id : '';
      if (!recommendationId) return;
      capture(AnalyticsEvent.ChapterNextStepDismissed, {
        chapter_id: chapterId,
        period_key: chapter?.period_key ?? null,
        recommendation_id: recommendationId,
        kind: rec.kind ?? null,
      });
      void dismissRecommendation(recommendationId);
      // Phase 8 of docs/chapters-plan.md — persist the dismissal
      // server-side so the next Chapter's generator can (a) suppress
      // the same recommendation id for 90 days across devices and (b)
      // stay silent about it in the continuity opening.
      const kind = rec.kind;
      if (
        kind === 'arc' ||
        kind === 'goal' ||
        kind === 'align' ||
        kind === 'activity'
      ) {
        void recordChapterRecommendationEvent({
          chapterId,
          recommendationId,
          kind: kind as ChapterRecommendationEventKind,
          action: 'dismissed',
        });
      }
    },
    [capture, chapter?.period_key, chapterId],
  );

  // Phase 7.1 callbacks. `openUserNoteEditor` is the entry point from
  // the CTA (no saved note yet) or the edit affordance (note exists).
  // `saveUserNote` persists or clears the note via the
  // `update_kwilt_chapter_user_note` RPC. Empty drafts clear the note.
  const openUserNoteEditor = React.useCallback(() => {
    setUserNoteEditing(true);
    capture(AnalyticsEvent.ChapterUserNoteCtaTapped, {
      chapter_id: chapterId,
      period_key: chapter?.period_key ?? null,
      source: 'detail',
    });
    const t = setTimeout(() => {
      userNoteInputRef.current?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [capture, chapter?.period_key, chapterId]);

  const cancelUserNoteEditor = React.useCallback(() => {
    setUserNoteEditing(false);
    setUserNoteDraft(chapter?.user_note ?? '');
  }, [chapter?.user_note]);

  const saveUserNote = React.useCallback(async () => {
    if (userNoteSaving) return;
    const raw = userNoteDraft;
    const trimmed = raw.trim();
    const previous = chapter?.user_note ?? null;
    // No-op if nothing changed — avoids a pointless RPC + toast churn.
    if ((trimmed.length === 0 && !previous) || trimmed === (previous ?? '')) {
      setUserNoteEditing(false);
      return;
    }
    setUserNoteSaving(true);
    try {
      const updated = await updateChapterUserNote({
        chapterId,
        note: trimmed.length > 0 ? trimmed : null,
      });
      if (!updated) {
        showToast({
          message: 'Could not save your line',
          variant: 'danger',
          durationMs: 2400,
        });
        return;
      }
      setChapter(updated);
      setUserNoteDraft(updated.user_note ?? '');
      setUserNoteEditing(false);
      if (trimmed.length > 0) {
        capture(AnalyticsEvent.ChapterUserNoteSaved, {
          chapter_id: chapterId,
          period_key: chapter?.period_key ?? null,
          length: trimmed.length,
          source: userNoteDeepLinkRef.current ? 'deep_link' : 'detail',
        });
        showToast({ message: 'Your line was added', variant: 'success', durationMs: 1800 });
      } else {
        capture(AnalyticsEvent.ChapterUserNoteCleared, {
          chapter_id: chapterId,
          period_key: chapter?.period_key ?? null,
        });
        showToast({ message: 'Your line was cleared', variant: 'default', durationMs: 1800 });
      }
    } finally {
      setUserNoteSaving(false);
    }
  }, [capture, chapter?.period_key, chapter?.user_note, chapterId, showToast, userNoteDraft, userNoteSaving]);

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
            {/* Phase 3.3: caption is the signal-first hero. Dek is only
                rendered as fallback for legacy chapters without a caption. */}
            {caption ? (
              <Text style={styles.caption}>{caption}</Text>
            ) : dek ? (
              <Text style={styles.dek}>{dek}</Text>
            ) : null}
            {loading ? <Text style={styles.meta}>Loading…</Text> : null}
            {!loading && !chapter ? <Text style={styles.meta}>Not found.</Text> : null}
          </View>

          {chapter ? (
            <>
              {arcLanes.length > 0 ? (
                <View style={styles.arcLanesBlock} accessibilityLabel="Arcs reflected in this chapter">
                  <Text style={styles.sectionLabel}>Arcs this {cadenceForCopy === 'weekly' ? 'week' : cadenceForCopy === 'monthly' ? 'month' : cadenceForCopy === 'yearly' ? 'year' : 'period'}</Text>
                  <VStack space="xs">
                    {arcLanes.map((arc, idx) => {
                      const arcTitle = asString(arc?.arc_title) ?? null;
                      if (!arcTitle) return null;
                      const primary = formatArcLanePrimary(arc);
                      const delta = formatArcLaneDelta(arc, cadenceForCopy);
                      return (
                        <View key={`arc-lane-${idx}`} style={styles.arcLaneRow}>
                          <Text style={styles.arcLaneTitle} numberOfLines={1}>{arcTitle}</Text>
                          <View style={styles.arcLaneMetaCol}>
                            <Text style={styles.arcLanePrimary} numberOfLines={1}>{primary}</Text>
                            {delta ? (
                              <Text style={styles.arcLaneDelta} numberOfLines={1}>{delta}</Text>
                            ) : null}
                          </View>
                        </View>
                      );
                    })}
                  </VStack>
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

              {visibleRecommendations.length > 0 ? (
                <View style={styles.nextStepsBlock} accessibilityLabel="Next steps suggested by this chapter">
                  <Text style={styles.sectionLabel}>Next steps</Text>
                  <VStack space="sm">
                    {visibleRecommendations.map((rec: any, idx: number) => {
                      const kind = rec?.kind;
                      if (kind !== 'arc' && kind !== 'goal' && kind !== 'align') return null;
                      const reason = asString(rec?.reason) ?? '';
                      const key = asString(rec?.id) ?? `rec-${idx}`;
                      let cardTitle: string | null = null;
                      let primaryLabel: string;

                      if (kind === 'arc') {
                        const title = asString(rec?.payload?.title) ?? null;
                        cardTitle = title ? `${title} Arc` : null;
                        const gate = canCreateArc({ isPro, arcs });
                        primaryLabel = gate.ok
                          ? title
                            ? `Create "${title}" Arc`
                            : 'Create this Arc'
                          : 'Unlock more Arcs';
                      } else if (kind === 'goal') {
                        const title = asString(rec?.payload?.title) ?? null;
                        const arcTitle = asString(rec?.payload?.arcTitle) ?? null;
                        // "Climbing Goal under Fitness" — keeps the Arc
                        // context visible at a glance so the user isn't
                        // surprised when the form opens on that Arc.
                        cardTitle = title
                          ? arcTitle
                            ? `${title} Goal · ${arcTitle}`
                            : `${title} Goal`
                          : null;
                        const targetArcId =
                          typeof rec?.payload?.arcId === 'string' ? rec.payload.arcId : '';
                        const gate = targetArcId
                          ? canCreateGoalInArc({ isPro, goals, arcId: targetArcId })
                          : { ok: true as const, activeCount: 0, limit: 0 };
                        primaryLabel = gate.ok
                          ? title
                            ? `Create "${title}" Goal`
                            : 'Create this Goal'
                          : 'Unlock more Goals';
                      } else {
                        // kind === 'align'
                        const goalTitle = asString(rec?.payload?.goalTitle) ?? null;
                        const arcTitle = asString(rec?.payload?.arcTitle) ?? null;
                        const ids = Array.isArray(rec?.payload?.activityIds)
                          ? rec.payload.activityIds.filter(
                              (x: unknown) => typeof x === 'string',
                            )
                          : [];
                        cardTitle = goalTitle
                          ? arcTitle
                            ? `Tag activities · ${goalTitle} (${arcTitle})`
                            : `Tag activities · ${goalTitle}`
                          : 'Tag activities';
                        primaryLabel =
                          ids.length === 1
                            ? 'Tag 1 activity'
                            : `Tag ${ids.length} activities`;
                      }

                      return (
                        <View key={key} style={styles.nextStepCard}>
                          {cardTitle ? (
                            <Text style={styles.nextStepTitle} numberOfLines={2}>
                              {cardTitle}
                            </Text>
                          ) : null}
                          {reason ? (
                            <Text style={styles.nextStepReason}>{reason}</Text>
                          ) : null}
                          <View style={styles.nextStepActions}>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={primaryLabel}
                              onPress={() => handleNextStepCtaTap(rec)}
                              style={styles.nextStepPrimary}
                            >
                              <Text style={styles.nextStepPrimaryLabel}>{primaryLabel}</Text>
                            </Pressable>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel="Not now"
                              onPress={() => handleNextStepDismiss(rec)}
                              style={styles.nextStepSecondary}
                            >
                              <Text style={styles.nextStepSecondaryLabel}>Not now</Text>
                            </Pressable>
                          </View>
                        </View>
                      );
                    })}
                  </VStack>
                </View>
              ) : null}

              {/* Phase 7.1: first-class "add a line" user note. Sits
                  between Next Steps and the full-story disclosure so
                  it reads above the fold — the user's own voice beside
                  the signal the generator just surfaced. Collapsed
                  states: saved note renders as a pull-quote; empty
                  state renders the CTA. Expanded state: multiline
                  input + Save/Cancel (OS dictation works out of the
                  box in a TextInput, so voice capture is free). */}
              {chapter.status === 'ready' ? (
                <View style={styles.userNoteWrap} accessibilityLabel="Add your own line to this chapter">
                  {userNoteEditing ? (
                    <>
                      <Text style={styles.userNotePrompt}>Anything we missed? Add a line.</Text>
                      <TextInput
                        ref={userNoteInputRef}
                        value={userNoteDraft}
                        onChangeText={setUserNoteDraft}
                        placeholder={`What stood out to you this ${
                          cadenceForCopy === 'weekly'
                            ? 'week'
                            : cadenceForCopy === 'monthly'
                              ? 'month'
                              : cadenceForCopy === 'yearly'
                                ? 'year'
                                : 'period'
                        }?`}
                        placeholderTextColor={colors.textSecondary}
                        style={styles.userNoteInput}
                        multiline
                        maxLength={CHAPTER_USER_NOTE_MAX_LENGTH}
                        autoCorrect
                        editable={!userNoteSaving}
                      />
                      <View style={styles.userNoteActions}>
                        <Text style={styles.userNoteCount}>
                          {`${userNoteDraft.trim().length}/${CHAPTER_USER_NOTE_MAX_LENGTH}`}
                        </Text>
                        <View style={styles.userNoteActionButtons}>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Cancel adding a line"
                            onPress={cancelUserNoteEditor}
                            disabled={userNoteSaving}
                            style={styles.userNoteCancel}
                          >
                            <Text style={styles.userNoteCancelLabel}>Cancel</Text>
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Save your line"
                            onPress={() => void saveUserNote()}
                            disabled={userNoteSaving}
                            style={[styles.userNoteSave, userNoteSaving && styles.userNoteSaveDisabled]}
                          >
                            <Text style={styles.userNoteSaveLabel}>
                              {userNoteSaving ? 'Saving…' : 'Save'}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    </>
                  ) : chapter.user_note ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Edit your line"
                      onPress={openUserNoteEditor}
                      style={styles.userNoteQuoteTouchable}
                    >
                      <View style={styles.userNoteQuote}>
                        <Text style={styles.userNoteQuoteText}>{`“${chapter.user_note}”`}</Text>
                        <Text style={styles.userNoteQuoteAttribution}>
                          {`— you${
                            formatUserNoteAttributionDate(chapter.user_note_updated_at)
                              ? `, ${formatUserNoteAttributionDate(chapter.user_note_updated_at)}`
                              : ''
                          } · tap to edit`}
                        </Text>
                      </View>
                    </Pressable>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Anything we missed? Add a line."
                      onPress={openUserNoteEditor}
                      style={styles.userNoteCta}
                    >
                      <Icon name="plus" size={16} color={colors.pine700} />
                      <Text style={styles.userNoteCtaLabel}>Anything we missed? Add a line.</Text>
                    </Pressable>
                  )}
                </View>
              ) : null}

              {/* Phase 3.3: article body is now the secondary read, behind
                  a "Read the full story" disclosure. Failed / pending states
                  still render inline since there's no long-form to hide. */}
              {story ? (
                <View style={styles.articleWrap}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={storyExpanded ? 'Hide the full story' : 'Read the full story'}
                    onPress={() =>
                      setStoryExpanded((v) => {
                        const next = !v;
                        if (next) {
                          capture(AnalyticsEvent.ChapterSectionExpanded, {
                            section: 'story',
                            period_key: chapter?.period_key ?? null,
                          });
                        }
                        return next;
                      })
                    }
                  >
                    <View style={styles.storyDiscloseRow}>
                      <Text style={styles.storyDiscloseLabel}>
                        {storyExpanded ? 'Hide the full story' : 'Read the full story'}
                      </Text>
                      <Text style={styles.storyDiscloseMeta}>{`${readingMinutes} min`}</Text>
                    </View>
                  </Pressable>
                  {storyExpanded ? (
                    <VStack space="sm" style={styles.storyBody}>
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
                  ) : null}
                </View>
              ) : (
                <View style={styles.articleWrap}>
                  {chapter.status === 'failed' ? (
                    <Text style={styles.articleBody}>
                      We couldn&apos;t write this week&apos;s chapter. Your data is safe; we just hit a
                      snag assembling the story. We&apos;ll try again next week.
                    </Text>
                  ) : (
                    <Text style={styles.articleBody}>
                      Your chapter is being written. This usually takes under a minute — pull to refresh if it doesn&apos;t appear shortly.
                    </Text>
                  )}
                </View>
              )}

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
  caption: {
    ...typography.body,
    color: colors.textPrimary,
    textAlign: 'left',
    marginTop: spacing.xs,
    lineHeight: 24,
  },
  // Phase 3.3 arc lanes — a stacked list of Arc × delta rows. Designed to
  // read as the primary above-the-fold signal, not a chip garnish. Rows use
  // a two-column layout (title left, metric stack right) so longer Arc
  // titles can wrap while the numbers stay right-aligned.
  arcLanesBlock: {
    width: '100%',
  },
  sectionLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  arcLaneRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    columnGap: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  arcLaneTitle: {
    ...typography.body,
    color: colors.textPrimary,
    flexShrink: 1,
    flexGrow: 1,
  },
  arcLaneMetaCol: {
    alignItems: 'flex-end',
    flexShrink: 0,
    maxWidth: '55%',
  },
  arcLanePrimary: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  arcLaneDelta: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  storyDiscloseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  storyDiscloseLabel: {
    ...typography.bodySm,
    color: colors.pine700,
    fontWeight: '700',
  },
  storyDiscloseMeta: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  storyBody: {
    marginTop: spacing.md,
  },
  nextStepsBlock: {
    width: '100%',
    gap: spacing.sm,
  },
  nextStepCard: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.pine100,
    backgroundColor: colors.canvas,
    padding: spacing.md,
    gap: spacing.xs,
  },
  nextStepTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  nextStepReason: {
    ...typography.bodySm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  nextStepActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  nextStepPrimary: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.pine700,
  },
  nextStepPrimaryLabel: {
    ...typography.bodySm,
    color: colors.canvas,
    fontWeight: '700',
  },
  nextStepSecondary: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  nextStepSecondaryLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    fontWeight: '600',
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
  // Phase 7.1 add-a-line note styles. The pull-quote form uses a left
  // accent border + italic body to cue "this is the user's own voice"
  // without competing with the AI prose above/below.
  userNoteWrap: {
    width: '100%',
    marginTop: spacing.xs,
  },
  userNoteCta: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
  },
  userNoteCtaLabel: {
    ...typography.bodySm,
    color: colors.pine700,
    fontWeight: '600',
  },
  userNoteQuoteTouchable: {
    width: '100%',
  },
  userNoteQuote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.pine700,
    paddingLeft: spacing.md,
    paddingVertical: spacing.xs,
  },
  userNoteQuoteText: {
    ...typography.body,
    color: colors.textPrimary,
    fontStyle: 'italic',
    lineHeight: 24,
  },
  userNoteQuoteAttribution: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  userNotePrompt: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  userNoteInput: {
    ...typography.body,
    color: colors.textPrimary,
    minHeight: 72,
    padding: spacing.sm,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    textAlignVertical: 'top',
  },
  userNoteActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    columnGap: spacing.sm,
  },
  userNoteCount: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  userNoteActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.sm,
  },
  userNoteCancel: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  userNoteCancelLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  userNoteSave: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.pine700,
  },
  userNoteSaveDisabled: {
    opacity: 0.6,
  },
  userNoteSaveLabel: {
    ...typography.bodySm,
    color: colors.canvas,
    fontWeight: '700',
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
