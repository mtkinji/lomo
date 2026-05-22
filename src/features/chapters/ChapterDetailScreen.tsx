import React from 'react';
import { Image, Pressable, Share, ScrollView, StyleSheet, View, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Line, Path, Text as SvgText } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppShell } from '../../ui/layout/AppShell';
import { HeaderActionPill } from '../../ui/layout/ObjectPageHeader';
import { VStack, Text } from '../../ui/primitives';
import { Card } from '../../ui/Card';
import { Icon } from '../../ui/Icon';
import { colors, spacing, typography } from '../../theme';
import type { MoreStackParamList } from '../../navigation/RootNavigator';
import {
  fetchMyChapterById,
  fetchMyChapters,
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
import { rootNavigationRef } from '../../navigation/rootNavigationRef';
import { getEffectiveThumbnailUrl } from '../../domain/getEffectiveThumbnailUrl';
import type { Activity } from '../../domain/types';
import {
  getHealthKitAvailability,
  requestHealthKitReadPermission,
  syncYesterdayHealthDailyToSupabase,
} from '../../services/health/healthKit';

type Route = RouteProp<MoreStackParamList, 'MoreChapterDetail'>;
type Nav = NativeStackNavigationProp<MoreStackParamList, 'MoreChapterDetail'>;
type RichTextSegment = { text: string; bold?: boolean; italic?: boolean };
type GoalStoryPlate = { id: string; title: string; imageUrl?: string };
type ChapterGradientColors = [string, string, ...string[]];
type TodoFlow = {
  carriedIn: number;
  added: number;
  completed: number;
  estimatedLeft: number;
  netAdded: number;
};
type TodoFlowEvent = {
  kind: 'added' | 'completed';
  at: number;
};
type TodoFlowChartPoint = {
  x: number;
  y: number;
  value: number;
  label: string;
};
type CanonicalForceId =
  | 'force-activity'
  | 'force-connection'
  | 'force-mastery'
  | 'force-spirituality';

const CANONICAL_FORCE_ORDER: CanonicalForceId[] = [
  'force-activity',
  'force-connection',
  'force-mastery',
  'force-spirituality',
];

const CANONICAL_FORCE_COLORS: Record<CanonicalForceId, string> = {
  'force-activity': colors.pine500,
  'force-connection': colors.madder500,
  'force-mastery': colors.quiltBlue500,
  'force-spirituality': colors.turmeric500,
};

const FORCE_ALIAS_TO_ID: Record<string, CanonicalForceId> = {
  activity: 'force-activity',
  'to-do': 'force-activity',
  todo: 'force-activity',
  connection: 'force-connection',
  mastery: 'force-mastery',
  spirituality: 'force-spirituality',
  spiritual: 'force-spirituality',
};

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

function splitInlineDecorations(text: string): RichTextSegment[] {
  const segments: RichTextSegment[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) != null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index) });
    }
    const token = match[0];
    if (token.startsWith('**')) {
      segments.push({ text: token.slice(2, -2), bold: true });
    } else {
      segments.push({ text: token.slice(1, -1), italic: true });
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) segments.push({ text: text.slice(lastIndex) });
  return segments.length > 0 ? segments : [{ text }];
}

function RichArticleText(props: { text: string; style: any; emphasizeFirstWord?: boolean }) {
  const firstWordMatch = props.emphasizeFirstWord ? props.text.match(/^(\S+)(\s+[\s\S]*)?$/) : null;
  const decoratedText = firstWordMatch ? firstWordMatch[2] ?? '' : props.text;
  return (
    <Text style={props.style}>
      {firstWordMatch ? (
        <Text style={[props.style, styles.inlineLeadWord]}>{firstWordMatch[1]}</Text>
      ) : null}
      {splitInlineDecorations(decoratedText).map((segment, idx) => (
        <Text
          key={`${idx}-${segment.text.slice(0, 8)}`}
          style={[
            props.style,
            segment.bold && styles.inlineBold,
            segment.italic && styles.inlineItalic,
          ]}
        >
          {segment.text}
        </Text>
      ))}
    </Text>
  );
}

function goalMentionedInText(text: string, goalTitle: string): boolean {
  const normalizedText = text.toLowerCase();
  const normalizedTitle = goalTitle.trim().toLowerCase();
  if (!normalizedTitle) return false;
  if (normalizedText.includes(normalizedTitle)) return true;
  const words = normalizedTitle.split(/\s+/).filter((w) => w.length >= 5);
  return words.length >= 2 && words.every((word) => normalizedText.includes(word));
}

function normalizeForceKey(value: unknown): string {
  return typeof value === 'string'
    ? value
        .trim()
        .toLowerCase()
        .replace(/^.*?:\s*/, '')
    : '';
}

function canonicalForceIdFrom(value: unknown): CanonicalForceId | null {
  const key = normalizeForceKey(value);
  if (CANONICAL_FORCE_ORDER.includes(key as CanonicalForceId)) return key as CanonicalForceId;
  return FORCE_ALIAS_TO_ID[key] ?? null;
}

function colorForMetricForce(force: any, forceId: CanonicalForceId): string {
  const provided = typeof force?.force_color === 'string' && /^#[0-9a-f]{6}$/i.test(force.force_color)
    ? force.force_color
    : null;
  return provided ?? CANONICAL_FORCE_COLORS[forceId];
}

function buildChapterGradientColors(metrics: any, forcesItems: any[]): ChapterGradientColors {
  const weightedByForce = new Map<CanonicalForceId, { color: string; weight: number }>();
  const metricForces = Array.isArray(metrics?.forces) ? metrics.forces : [];

  for (const force of metricForces) {
    const forceId = canonicalForceIdFrom(force?.force_id) ?? canonicalForceIdFrom(force?.force_label);
    if (!forceId) continue;
    const weight =
      typeof force?.level_sum === 'number'
        ? force.level_sum
        : typeof force?.activity_count === 'number'
          ? force.activity_count
          : 1;
    if (weight <= 0) continue;
    weightedByForce.set(forceId, {
      color: colorForMetricForce(force, forceId),
      weight: (weightedByForce.get(forceId)?.weight ?? 0) + weight,
    });
  }

  if (weightedByForce.size === 0) {
    for (const item of forcesItems) {
      const forceId = canonicalForceIdFrom(item?.force);
      if (forceId) weightedByForce.set(forceId, { color: CANONICAL_FORCE_COLORS[forceId], weight: 1 });
    }
  }

  const weighted = CANONICAL_FORCE_ORDER
    .map((forceId) => weightedByForce.get(forceId))
    .filter((entry): entry is { color: string; weight: number } => Boolean(entry && entry.weight > 0));

  if (weighted.length === 0) {
    return [colors.pine700, colors.quiltBlue500, colors.turmeric500];
  }

  if (weighted.length === 1) {
    return [weighted[0].color, weighted[0].color];
  }

  const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  const stopBudget = 12;
  const gradientColors: string[] = weighted.flatMap((entry) => {
    const count = Math.max(1, Math.round((entry.weight / totalWeight) * stopBudget));
    return Array.from({ length: count }, () => entry.color);
  });
  return gradientColors as [string, string, ...string[]];
}

const TODO_FLOW_CHART = {
  width: 320,
  height: 192,
  left: 40,
  right: 0,
  top: 18,
  bottom: 10,
};

const DAY_MS = 24 * 60 * 60 * 1000;

function formatChapterDayLabel(periodStart: string, dayIndex: number, dayCount: number): string {
  const startMs = Date.parse(periodStart);
  if (!Number.isFinite(startMs)) return `Day ${dayIndex + 1}`;
  const date = new Date(startMs + dayIndex * DAY_MS);
  try {
    if (dayCount > 8) {
      return new Intl.DateTimeFormat(undefined, { day: 'numeric' }).format(date);
    }
    return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date);
  } catch {
    return `Day ${dayIndex + 1}`;
  }
}

function buildTodoFlowSamplePositions(dayCount: number): number[] {
  const stride = dayCount >= 6 ? 2 : 1;
  const positions: number[] = [];
  for (let day = 0; day < dayCount; day += stride) {
    positions.push(day);
  }
  const finalDay = dayCount - 1;
  if (positions[positions.length - 1] !== finalDay) {
    positions.push(finalDay);
  }
  return positions;
}

function buildSmoothPath(points: TodoFlowChartPoint[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  const smoothness = 0.18;
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[Math.max(0, index - 1)];
    const current = points[index];
    const next = points[index + 1];
    const afterNext = points[Math.min(points.length - 1, index + 2)];
    const cp1x = current.x + (next.x - previous.x) * smoothness;
    const cp1y = current.y + (next.y - previous.y) * smoothness;
    const cp2x = next.x - (afterNext.x - current.x) * smoothness;
    const cp2y = next.y - (afterNext.y - current.y) * smoothness;
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
  }
  return path;
}

function formatTodoFlowAxisLabel(value: number): string {
  return String(Math.round(value));
}

function buildFallbackTodoFlowEvents(todoFlow: TodoFlow, dayCount: number): TodoFlowEvent[] {
  const addEvents = Array.from({ length: todoFlow.added }, (_, idx) => ({
    kind: 'added' as const,
    at: dayCount <= 1 ? 0 : ((idx + 1) / Math.max(1, todoFlow.added + 1)) * Math.max(1, dayCount - 1) * 0.55,
  }));
  const completedEvents = Array.from({ length: todoFlow.completed }, (_, idx) => ({
    kind: 'completed' as const,
    at:
      dayCount <= 1
        ? 0
        : Math.max(1, dayCount - 1) * 0.55 +
          ((idx + 1) / Math.max(1, todoFlow.completed + 1)) * Math.max(1, dayCount - 1) * 0.45,
  }));
  return [...addEvents, ...completedEvents].sort((a, b) => a.at - b.at);
}

function buildTodoFlowEventsFromActivities(params: {
  todoFlow: TodoFlow;
  activities: Activity[];
  periodStart: string;
  periodEnd: string;
  dayCount: number;
}): TodoFlowEvent[] {
  const { todoFlow, activities, periodStart, periodEnd, dayCount } = params;
  const startMs = Date.parse(periodStart);
  const endMs = Date.parse(periodEnd);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return buildFallbackTodoFlowEvents(todoFlow, dayCount);
  }

  const toPosition = (iso: string | null | undefined) => {
    if (!iso) return null;
    const ms = Date.parse(iso);
    if (!Number.isFinite(ms) || ms < startMs || ms >= endMs) return null;
    return Math.max(0, Math.min(Math.max(0, dayCount - 1), ((ms - startMs) / (endMs - startMs)) * Math.max(0, dayCount - 1)));
  };

  const addedEvents = activities
    .map((activity) => toPosition(activity.createdAt))
    .filter((at): at is number => at != null)
    .map((at) => ({ kind: 'added' as const, at }));
  const completedEvents = activities
    .map((activity) => toPosition(activity.completedAt))
    .filter((at): at is number => at != null)
    .map((at) => ({ kind: 'completed' as const, at }));

  if (addedEvents.length !== todoFlow.added || completedEvents.length !== todoFlow.completed) {
    return buildFallbackTodoFlowEvents(todoFlow, dayCount);
  }

  return [...addedEvents, ...completedEvents].sort((a, b) => {
    if (a.at !== b.at) return a.at - b.at;
    return a.kind === b.kind ? 0 : a.kind === 'added' ? -1 : 1;
  });
}

function buildTodoFlowChart(params: {
  todoFlow: TodoFlow;
  activities: Activity[];
  periodStart: string;
  periodEnd: string;
  periodDays: number | null;
}) {
  const { todoFlow, activities, periodStart, periodEnd, periodDays } = params;
  const dayCount = Math.max(2, Math.min(14, Math.floor(periodDays ?? 7)));
  const events = buildTodoFlowEventsFromActivities({ todoFlow, activities, periodStart, periodEnd, dayCount });
  const samplePositions = buildTodoFlowSamplePositions(dayCount);
  const valueAt = (position: number) => {
    if (position >= dayCount - 1) return todoFlow.estimatedLeft;
    return events.reduce(
      (value, event) => (event.at <= position ? value + (event.kind === 'added' ? 1 : -1) : value),
      todoFlow.carriedIn,
    );
  };
  const lineValues = samplePositions.map(valueAt);
  const rawMinValue = Math.min(...lineValues);
  const rawMaxValue = Math.max(...lineValues);
  const rawRange = Math.max(1, rawMaxValue - rawMinValue);
  const paddedRange = Math.max(6, rawRange * 1.7, rawMaxValue * 0.12);
  const valueCenter = (rawMinValue + rawMaxValue) / 2;
  let minValue = Math.max(0, valueCenter - paddedRange / 2);
  let maxValue = minValue + paddedRange;
  if (maxValue < rawMaxValue + 1) {
    maxValue = rawMaxValue + 1;
    minValue = Math.max(0, maxValue - paddedRange);
  }
  const chartWidth = TODO_FLOW_CHART.width - TODO_FLOW_CHART.left - TODO_FLOW_CHART.right;
  const chartHeight = TODO_FLOW_CHART.height - TODO_FLOW_CHART.top - TODO_FLOW_CHART.bottom;
  const pointFor = (value: number, index: number) => {
    const x = TODO_FLOW_CHART.left + (chartWidth * index) / Math.max(1, samplePositions.length - 1);
    const y = TODO_FLOW_CHART.top + ((maxValue - value) / Math.max(1, maxValue - minValue)) * chartHeight;
    return { x, y };
  };
  const points: TodoFlowChartPoint[] = samplePositions.map((position, index) => {
    const value = valueAt(position);
    return {
      ...pointFor(value, index),
      value,
      label: formatChapterDayLabel(periodStart, position, dayCount),
    };
  });
  const linePath = buildSmoothPath(points);
  const baseY = TODO_FLOW_CHART.top + chartHeight;
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${baseY} L ${points[0].x} ${baseY} Z`;
  const gridValues = [maxValue, minValue + (maxValue - minValue) * 0.75, minValue + (maxValue - minValue) * 0.5, minValue + (maxValue - minValue) * 0.25, minValue];
  const grid = gridValues.map((value) => {
    const y = TODO_FLOW_CHART.top + ((maxValue - value) / Math.max(1, maxValue - minValue)) * chartHeight;
    return { y, value };
  });
  const yAxisLabels = [grid[0], grid[2], grid[4]].map((item) => ({
    y: item.y,
    label: formatTodoFlowAxisLabel(item.value),
  }));
  return { points, linePath, areaPath, grid, yAxisLabels };
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

function formatWholeNumber(value: number): string {
  try {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
  } catch {
    return String(Math.round(value));
  }
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${formatWholeNumber(count)} ${count === 1 ? singular : plural}`;
}

function chapterWeeklyVelocity(chapter: ChapterRow | null): number | null {
  const completed =
    typeof chapter?.metrics?.activities?.completed_count === 'number'
      ? chapter.metrics.activities.completed_count
      : null;
  const periodDays =
    typeof chapter?.metrics?.period_days === 'number'
      ? chapter.metrics.period_days
      : null;
  if (completed == null || periodDays == null || periodDays <= 0) return null;
  return completed / (periodDays / 7);
}

function allTimeWeeklyVelocity(chapters: ChapterRow[]): number | null {
  let completedTotal = 0;
  let weekTotal = 0;
  for (const c of chapters) {
    if (c.status !== 'ready') continue;
    const completed =
      typeof c.metrics?.activities?.completed_count === 'number'
        ? c.metrics.activities.completed_count
        : null;
    const periodDays =
      typeof c.metrics?.period_days === 'number'
        ? c.metrics.period_days
        : null;
    if (completed == null || periodDays == null || periodDays <= 0) continue;
    completedTotal += completed;
    weekTotal += periodDays / 7;
  }
  return weekTotal > 0 ? completedTotal / weekTotal : null;
}

function formatVelocity(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatPercent(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${Math.round(value * 100)}%`;
}

function averageBacklogDaysForCompletedActivities(params: {
  activities: Activity[];
  periodStart: string;
  periodEnd: string;
}): number | null {
  const startMs = Date.parse(params.periodStart);
  const endMs = Date.parse(params.periodEnd);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return null;

  const ages = params.activities
    .map((activity) => {
      const createdMs = Date.parse(activity.createdAt);
      const completedMs = activity.completedAt ? Date.parse(activity.completedAt) : NaN;
      if (!Number.isFinite(createdMs) || !Number.isFinite(completedMs)) return null;
      if (completedMs < startMs || completedMs >= endMs || completedMs < createdMs) return null;
      return (completedMs - createdMs) / DAY_MS;
    })
    .filter((age): age is number => age != null);

  if (ages.length === 0) return null;
  return ages.reduce((sum, age) => sum + age, 0) / ages.length;
}

function formatBacklogAgeDays(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  if (value < 1) return '<1';
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatTodoFlowInsight(todoFlow: TodoFlow): string {
  if (todoFlow.netAdded === 0) return 'Backlog held steady this period';
  if (todoFlow.netAdded > 0) {
    return `Backlog rose by ${todoFlow.netAdded} this period`;
  }
  return `Backlog fell by ${Math.abs(todoFlow.netAdded)} this period`;
}

function buildHealthSummaryRows(health: any): Array<{ label: string; value: string; detail?: string }> {
  if (!health || typeof health !== 'object') return [];
  const rows: Array<{ label: string; value: string; detail?: string }> = [];

  if (typeof health.active_days_count === 'number') {
    rows.push({
      label: 'Movement',
      value: pluralize(health.active_days_count, 'active day'),
      detail:
        typeof health.total_active_minutes === 'number' && health.total_active_minutes > 0
          ? `${pluralize(health.total_active_minutes, 'active minute')} total`
          : undefined,
    });
  }

  if (typeof health.total_steps === 'number' && health.total_steps > 0) {
    rows.push({
      label: 'Steps',
      value: `${formatWholeNumber(health.total_steps)} total`,
      detail:
        typeof health.avg_steps_per_active_day === 'number' && health.avg_steps_per_active_day > 0
          ? `${formatWholeNumber(health.avg_steps_per_active_day)} per active day`
          : undefined,
    });
  }

  if (typeof health.workouts_count === 'number') {
    rows.push({
      label: 'Workouts',
      value: pluralize(health.workouts_count, 'workout'),
    });
  }

  if (typeof health.avg_sleep_hours === 'number' && health.sleep_nights_count > 0) {
    rows.push({
      label: 'Sleep',
      value: `${health.avg_sleep_hours.toFixed(1)} hr average`,
      detail: `Across ${pluralize(health.sleep_nights_count, 'night')}`,
    });
  }

  if (typeof health.mindfulness_minutes === 'number') {
    rows.push({
      label: 'Mindfulness',
      value: pluralize(health.mindfulness_minutes, 'minute'),
    });
  }

  return rows;
}

export function ChapterDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const chapterId = route.params?.chapterId ?? '';
  const showToast = useToastStore((s) => s.showToast);

  const [loading, setLoading] = React.useState(true);
  const [chapter, setChapter] = React.useState<ChapterRow | null>(null);
  const [allTimeVelocity, setAllTimeVelocity] = React.useState<number | null>(null);
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
        const history = await fetchMyChapters({ limit: 100 });
        if (!mounted) return;
        setAllTimeVelocity(allTimeWeeklyVelocity(history));
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
  const periodStart = chapter?.period_start ?? '';
  const periodEnd = chapter?.period_end ?? '';
  const kicker = buildCadenceKicker(chapter, periodStart, periodEnd);
  const cadenceForCopy = detectCadence(chapter);

  const story = asString(pickSection(outputJson, 'story')?.body) ?? null;
  const readingMinutes = estimateReadingMinutes(story);
  const whereTimeWent = (asArray(pickSection(outputJson, 'where_time_went')?.bullets).filter((x) => typeof x === 'string') as string[]).slice(0, 6);
  const highlights = (asArray(pickSection(outputJson, 'highlights')?.bullets).filter((x) => typeof x === 'string') as string[]).slice(0, 6);
  const patterns = (asArray(pickSection(outputJson, 'patterns')?.bullets).filter((x) => typeof x === 'string') as string[]).slice(0, 6);
  const forcesItems = (asArray(pickSection(outputJson, 'forces')?.items).filter((x) => x && typeof x === 'object') as any[]).slice(0, 6);
  const forceStoryInset = React.useMemo(() => {
    const first = forcesItems[0];
    if (!first || typeof first !== 'object') return null;
    const force = asString(first.force) ?? 'Forces';
    const body = asString(first.body);
    if (!body) return null;
    return { label: `Vectors in play: ${force}`, text: body };
  }, [forcesItems]);

  const metrics = chapter?.metrics ?? null;
  const chapterGradientColors = React.useMemo(
    () => buildChapterGradientColors(metrics, forcesItems),
    [forcesItems, metrics],
  );
  const activitiesForFlow = useAppStore((s) => s.activities);
  const goalsById = useAppStore((s) => s.goals);
  const goalStoryPlates = React.useMemo<GoalStoryPlate[]>(() => {
    const goalMetrics = Array.isArray(metrics?.goals) ? metrics.goals : [];
    return goalMetrics
      .map((goalMetric: any) => {
        const id = typeof goalMetric?.goal_id === 'string' ? goalMetric.goal_id : '';
        if (!id) return null;
        const localGoal = goalsById.find((goal) => goal.id === id);
        const title = asString(localGoal?.title) ?? asString(goalMetric?.goal_title) ?? null;
        if (!title) return null;
        const imageUrl = localGoal ? getEffectiveThumbnailUrl(localGoal) : undefined;
        return { id, title, imageUrl };
      })
      .filter(Boolean)
      .slice(0, 4) as GoalStoryPlate[];
  }, [goalsById, metrics?.goals]);
  const healthSummaryRows = buildHealthSummaryRows(metrics?.health);
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
  const actionableRecommendations = React.useMemo(() => {
    return visibleRecommendations.filter((r: any) => r?.kind === 'align');
  }, [visibleRecommendations]);

  const healthPreferences = useAppStore((s) => s.healthPreferences);
  const setHealthPreferences = useAppStore((s) => s.setHealthPreferences);
  const [healthPromptBusy, setHealthPromptBusy] = React.useState(false);

  // Fire `chapter_next_step_shown` once per (chapter, recommendation_id)
  // rendered. We keep a ref so re-renders from dismissal/nav don't re-log.
  const shownRecIdsRef = React.useRef<Set<string>>(new Set());
  React.useEffect(() => {
    if (!chapter) return;
    for (const r of actionableRecommendations) {
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
  }, [actionableRecommendations, capture, chapter, chapterId]);

  const completed = typeof metrics?.activities?.completed_count === 'number' ? metrics.activities.completed_count : null;
  const activeDays = typeof metrics?.time_shape?.active_days_count === 'number' ? metrics.time_shape.active_days_count : null;
  const streak = typeof metrics?.time_shape?.longest_active_streak_days === 'number' ? metrics.time_shape.longest_active_streak_days : null;
  const periodDays = typeof metrics?.period_days === 'number' ? metrics.period_days : null;
  const currentVelocity = chapterWeeklyVelocity(chapter);
  const velocityDelta =
    currentVelocity != null && allTimeVelocity != null ? currentVelocity - allTimeVelocity : null;
  const velocityValueColor =
    velocityDelta == null || Math.abs(velocityDelta) < 0.05
      ? colors.textPrimary
      : velocityDelta > 0
        ? colors.success
        : colors.madder600;

  const primaryStats = [
    { value: completed, label: 'to-dos' },
    { value: activeDays, label: 'active days' },
    { value: streak, label: 'day streak' },
  ];

  const createdCount = typeof metrics?.activities?.created_count === 'number' ? metrics.activities.created_count : null;
  const carriedCount = typeof metrics?.activities?.carried_forward_count === 'number' ? metrics.activities.carried_forward_count : null;
  const todoFlow =
    completed != null && createdCount != null && carriedCount != null
      ? {
          carriedIn: carriedCount,
          added: createdCount,
          completed,
          estimatedLeft: Math.max(0, carriedCount + createdCount - completed),
          netAdded: createdCount - completed,
        } satisfies TodoFlow
      : null;
  const availableTodoCount = todoFlow ? todoFlow.carriedIn + todoFlow.added : null;
  const completionRate =
    completed != null && availableTodoCount != null && availableTodoCount > 0
      ? completed / availableTodoCount
      : null;
  const averageBacklogDays = averageBacklogDaysForCompletedActivities({
    activities: activitiesForFlow,
    periodStart,
    periodEnd,
  });
  const topArcMetric = arcLanes[0] ?? null;
  const topArcTitle = asString(topArcMetric?.arc_title);
  const topArcCompleted =
    typeof topArcMetric?.completed_count === 'number' ? topArcMetric.completed_count : null;
  const topArcTotal =
    typeof topArcMetric?.activity_count_total === 'number' ? topArcMetric.activity_count_total : null;
  const topFocusCount = topArcCompleted != null && topArcCompleted > 0 ? topArcCompleted : topArcTotal;
  const insightMetrics = [
    completionRate != null
      ? {
          title: 'Closed',
          value: formatPercent(completionRate),
          unit: `${completed ?? 0} of ${availableTodoCount ?? 0} available to-dos`,
        }
      : null,
    averageBacklogDays != null
      ? {
          title: 'Avg. time to finish',
          value: formatBacklogAgeDays(averageBacklogDays),
          unit: 'days from add to done',
        }
      : null,
    topArcTitle && topFocusCount != null
      ? {
          title: topArcTitle,
          value: formatWholeNumber(topFocusCount),
          unit: topArcCompleted != null && topArcCompleted > 0 ? 'to-dos completed' : 'to-dos touched',
        }
      : null,
  ].filter(Boolean).slice(0, 2) as Array<{ title: string; value: string; unit: string }>;
  const todoFlowChart = todoFlow
    ? buildTodoFlowChart({
        todoFlow,
        activities: activitiesForFlow,
        periodStart,
        periodEnd,
        periodDays,
      })
    : null;
  const todoFlowInsight = todoFlow ? formatTodoFlowInsight(todoFlow) : null;

  // Follow-up CTA handlers. The Chapter surface now only renders concrete
  // cleanup actions (`align`) so it doesn't ask the user to create vague
  // new structure from a token cluster.
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
    [capture, chapter?.period_key, chapterId],
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

  const hasDetails = Boolean(todoFlow) || insightMetrics.length > 0 || patterns.length > 0 || whereTimeWent.length > 0;
  const showHealthPrompt =
    chapter?.status === 'ready' &&
    !healthPreferences.enabled &&
    healthPreferences.osPermissionStatus === 'notRequested' &&
    !healthPreferences.promptDismissedAtIso &&
    !neighbors.previous;

  const handleEnableHealthPrompt = React.useCallback(async () => {
    if (healthPromptBusy) return;
    setHealthPromptBusy(true);
    try {
      const availability = await getHealthKitAvailability();
      if (!availability.available) {
        setHealthPreferences((current) => ({
          ...current,
          enabled: false,
          osPermissionStatus: availability.permissionStatus,
          promptDismissedAtIso: new Date().toISOString(),
        }));
        return;
      }
      const permission = await requestHealthKitReadPermission();
      setHealthPreferences((current) => ({
        ...current,
        enabled: permission.granted,
        osPermissionStatus: permission.permissionStatus,
        promptDismissedAtIso: permission.granted ? null : new Date().toISOString(),
      }));
      if (permission.granted) {
        void syncYesterdayHealthDailyToSupabase();
      }
    } finally {
      setHealthPromptBusy(false);
    }
  }, [healthPromptBusy, setHealthPreferences]);

  const handleDismissHealthPrompt = React.useCallback(() => {
    setHealthPreferences((current) => ({
      ...current,
      promptDismissedAtIso: new Date().toISOString(),
    }));
  }, [setHealthPreferences]);

  return (
    <AppShell fullBleedCanvas>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.chapterHero}>
          <LinearGradient
            colors={chapterGradientColors}
            start={{ x: 0.05, y: 0.05 }}
            end={{ x: 0.95, y: 0.95 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
            <LinearGradient
              colors={['rgba(255,255,255,0.04)', 'rgba(0,0,0,0.22)']}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
          </View>
          <View style={[styles.chapterHeroControls, { paddingTop: insets.top + spacing.md }]}>
            <View style={styles.chapterHeroControlsRow}>
              <HeaderActionPill
                accessibilityLabel="Back to chapters"
                onPress={() => {
                  if (navigation.canGoBack()) navigation.goBack();
                  else navigation.navigate('MoreChapters');
                }}
                size={48}
              >
                <Icon name="arrowLeft" size={24} color={colors.textPrimary} />
              </HeaderActionPill>
              <HeaderActionPill
                accessibilityLabel="Share this chapter"
                onPress={() => void handleShare()}
                size={48}
              >
                <Icon name="share" size={21} color={colors.textPrimary} />
              </HeaderActionPill>
            </View>
          </View>
        </View>

        <VStack space="lg" style={styles.contentStack}>
          <View style={styles.headerBlock}>
            <Text style={styles.headline}>{title}</Text>
            {kicker ? (
              <Text style={styles.articleMeta}>
                {story ? `${kicker} · ${readingMinutes} min read` : kicker}
              </Text>
            ) : null}
            {loading ? <Text style={styles.meta}>Loading…</Text> : null}
            {!loading && !chapter ? <Text style={styles.meta}>Not found.</Text> : null}
          </View>

          {chapter ? (
            <>
              <View style={styles.keyFiguresWrap}>
                <Text style={styles.achievementsLabel}>Achievements</Text>
                <View style={styles.metricsRow}>
                  {primaryStats.map((s, idx) => (
                    <View
                      key={`p-${idx}`}
                      style={[styles.metricPill, idx < primaryStats.length - 1 && styles.metricPillDivider]}
                    >
                      <Text style={styles.metricValue}>{s.value == null ? '—' : String(s.value)}</Text>
                      <Text style={styles.metricLabel}>{s.label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {healthSummaryRows.length > 0 ? (
                <View style={styles.healthSummaryBlock}>
                  <VStack space="sm">
                    <View>
                      <Text style={styles.sectionLabel}>Apple Health</Text>
                      <Text style={styles.healthSummaryIntro}>
                        Summaries Kwilt read for this Chapter period.
                      </Text>
                    </View>
                    <View style={styles.healthSummaryGrid}>
                      {healthSummaryRows.map((row) => (
                        <View key={row.label} style={styles.healthSummaryRow}>
                          <Text style={styles.healthSummaryLabel}>{row.label}</Text>
                          <View style={styles.healthSummaryValueWrap}>
                            <Text style={styles.healthSummaryValue}>{row.value}</Text>
                            {row.detail ? (
                              <Text style={styles.healthSummaryDetail}>{row.detail}</Text>
                            ) : null}
                          </View>
                        </View>
                      ))}
                    </View>
                  </VStack>
                </View>
              ) : null}

              {story ? (
                <View style={styles.articleWrap}>
                  <VStack space="md" style={styles.storyBody}>
                    {(() => {
                      const renderedGoalIds = new Set<string>();
                      let paragraphIndex = 0;
                      const blocks = splitArticleBlocks(story);
                      const firstGoalBlockIndex = blocks.findIndex(
                        (block) =>
                          block.kind === 'p' &&
                          goalStoryPlates.some((goal) => goalMentionedInText(block.text, goal.title)),
                      );
                      return blocks.map((b, idx) => {
                        const paragraphOrdinal = b.kind === 'p' ? paragraphIndex++ : -1;
                        const beforeGoalThreads = firstGoalBlockIndex === -1 || idx < firstGoalBlockIndex;
                        const goalPlate =
                          b.kind === 'p'
                            ? goalStoryPlates.find((goal) => !renderedGoalIds.has(goal.id) && goalMentionedInText(b.text, goal.title)) ?? null
                            : null;
                        if (goalPlate) renderedGoalIds.add(goalPlate.id);
                        const inset =
                          b.kind === 'p' && beforeGoalThreads && paragraphOrdinal === 0 && forceStoryInset
                            ? forceStoryInset
                            : b.kind === 'p' && firstGoalBlockIndex === -1 && paragraphOrdinal === 1 && highlights.length > 0
                              ? { label: 'Notable', text: highlights[0] }
                              : b.kind === 'p' && firstGoalBlockIndex === -1 && paragraphOrdinal === 2 && whereTimeWent.length > 0
                                ? { label: 'Work thread', text: whereTimeWent[0] }
                                : b.kind === 'p' && firstGoalBlockIndex === -1 && paragraphOrdinal === 3 && arcLanes.length > 0
                                  ? {
                                      label: 'Arc in frame',
                                      text: `${asString(arcLanes[0]?.arc_title) ?? 'An Arc'}: ${formatArcLanePrimary(arcLanes[0])}`,
                                    }
                                  : null;
                        return (
                          <React.Fragment key={`story-${idx}`}>
                            {goalPlate ? (
                              <View style={styles.goalStoryPlate}>
                                {goalPlate.imageUrl ? (
                                  <Image source={{ uri: goalPlate.imageUrl }} style={styles.goalStoryImage} />
                                ) : (
                                  <View style={styles.goalStoryImageFallback}>
                                    <Icon name="target" size={18} color={colors.pine700} />
                                  </View>
                                )}
                                <View style={styles.goalStoryText}>
                                  <Text style={styles.storyInsetLabel}>Goal thread</Text>
                                  <Text style={styles.goalStoryTitle} numberOfLines={2}>{goalPlate.title}</Text>
                                </View>
                              </View>
                            ) : null}
                            {b.kind === 'h2' ? (
                              <RichArticleText text={b.text} style={styles.articleSubhead} />
                            ) : (
                              <RichArticleText
                                text={b.text}
                                style={styles.articleBody}
                                emphasizeFirstWord={paragraphOrdinal === 0}
                              />
                            )}
                            {inset ? (
                              <View style={styles.storyInset}>
                                <Text style={styles.storyInsetLabel}>{inset.label}</Text>
                                <RichArticleText text={inset.text} style={styles.storyInsetText} />
                              </View>
                            ) : null}
                          </React.Fragment>
                        );
                      });
                    })()}
                  </VStack>
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

              {/* Phase 7.1: first-class "add a line" user note. Collapsed
                  states: saved note renders as a pull-quote; empty state
                  renders the CTA. Expanded state: multiline input +
                  Save/Cancel (OS dictation works out of the box in a
                  TextInput, so voice capture is free). */}
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
                <View style={styles.detailsBlock}>
                  <Text style={styles.sectionLabel}>Details</Text>
                  <VStack space="sm" style={styles.detailsCards}>
                    {currentVelocity != null || allTimeVelocity != null ? (
                      <View style={styles.bigMetricRow}>
                        <Card padding="sm" marginVertical={0} elevation="none" style={styles.bigMetricCard}>
                          <Text style={styles.detailCardTitle}>Velocity</Text>
                          <View style={styles.bigMetricBody}>
                            <Text style={[styles.bigMetricValue, { color: velocityValueColor }]}>{formatVelocity(currentVelocity)}</Text>
                            <Text style={styles.bigMetricUnit}>to-dos / week</Text>
                          </View>
                        </Card>
                        <Card padding="sm" marginVertical={0} elevation="none" style={styles.bigMetricCard}>
                          <Text style={styles.detailCardTitle}>All-time avg</Text>
                          <View style={styles.bigMetricBody}>
                            <Text style={styles.bigMetricValue}>{formatVelocity(allTimeVelocity)}</Text>
                            <Text style={styles.bigMetricUnit}>to-dos / week</Text>
                          </View>
                        </Card>
                      </View>
                    ) : null}

                    {todoFlow && todoFlowChart ? (
                      <Card padding="sm" marginVertical={0} elevation="none" style={styles.detailCard}>
                        <View style={styles.todoFlowBlock}>
                          <Text style={styles.detailCardTitle}>To-do flow</Text>
                          <Text style={styles.detailCardDescription}>
                            Showing backlog movement across this Chapter.
                          </Text>
                          <View style={styles.todoFlowChartWrap}>
                            <Svg
                              width="100%"
                              height={TODO_FLOW_CHART.height}
                              viewBox={`0 0 ${TODO_FLOW_CHART.width} ${TODO_FLOW_CHART.height}`}
                              accessibilityLabel="To-do burn-down chart"
                            >
                              {todoFlowChart.grid.map((line, idx) => (
                                <Line
                                  key={`grid-${idx}`}
                                  x1={TODO_FLOW_CHART.left}
                                  x2={TODO_FLOW_CHART.width - TODO_FLOW_CHART.right}
                                  y1={line.y}
                                  y2={line.y}
                                  stroke={colors.sumi200}
                                  strokeWidth={1}
                                />
                              ))}
                              {todoFlowChart.yAxisLabels.map((axisLabel, idx) => (
                                <SvgText
                                  key={`y-axis-${idx}`}
                                  x={0}
                                  y={axisLabel.y + 5}
                                  fill={colors.textSecondary}
                                  fontFamily={typography.bodySm.fontFamily}
                                  fontSize={typography.bodySm.fontSize}
                                  textAnchor="start"
                                >
                                  {axisLabel.label}
                                </SvgText>
                              ))}
                              <Path d={todoFlowChart.areaPath} fill={colors.quiltBlue500} opacity={0.14} />
                              <Path
                                d={todoFlowChart.linePath}
                                fill="none"
                                stroke={colors.quiltBlue500}
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </Svg>
                          </View>
                          <View style={styles.todoFlowChartLabels}>
                            {todoFlowChart.points.map((point, idx) => (
                              <Text key={`${point.label}-${idx}`} style={styles.todoFlowChartLabel}>
                                {point.label}
                              </Text>
                            ))}
                          </View>
                          <View style={styles.todoFlowFooter}>
                            <View style={styles.todoFlowFooterTitleRow}>
                              <Text style={styles.todoFlowFooterTitle}>
                                {todoFlowInsight ?? 'Backlog held steady this period'}
                              </Text>
                              {todoFlow.netAdded !== 0 ? (
                                <Icon
                                  name={todoFlow.netAdded > 0 ? 'trendUp' : 'trendDown'}
                                  size={16}
                                  color={colors.textPrimary}
                                />
                              ) : null}
                            </View>
                            <Text style={styles.todoFlowFooterText}>
                              {kicker || 'Chapter period'}
                            </Text>
                          </View>
                        </View>
                      </Card>
                    ) : null}

                    {insightMetrics.length > 0 ? (
                      <View style={styles.bigMetricRow}>
                        {insightMetrics.map((metric) => (
                          <Card key={metric.title} padding="sm" marginVertical={0} elevation="none" style={styles.bigMetricCard}>
                            <Text style={styles.detailCardTitle}>{metric.title}</Text>
                            <View style={styles.bigMetricBody}>
                              <Text style={styles.bigMetricValue}>{metric.value}</Text>
                              <Text style={styles.bigMetricUnit}>{metric.unit}</Text>
                            </View>
                          </Card>
                        ))}
                      </View>
                    ) : null}
                  </VStack>

                  {whereTimeWent.length > 0 ? (
                    <VStack space="xs" style={styles.detailList}>
                      <Text style={styles.appendixHeading}>Where the work landed</Text>
                      {whereTimeWent.slice(1, 4).map((line, idx) => (
                        <Text key={`wtw-${idx}`} style={styles.detailLine}>{line}</Text>
                      ))}
                    </VStack>
                  ) : null}

                  {patterns.length > 0 ? (
                    <VStack space="xs" style={styles.detailList}>
                      <Text style={styles.appendixHeading}>Patterns</Text>
                      {patterns.slice(0, 3).map((line, idx) => (
                        <Text key={`pat-${idx}`} style={styles.detailLine}>{line}</Text>
                      ))}
                    </VStack>
                  ) : null}

                </View>
              ) : null}

              {actionableRecommendations.length > 0 ? (
                <View style={styles.nextStepsBlock} accessibilityLabel="Chapter follow-up actions">
                  <Text style={styles.sectionLabel}>Loose ends</Text>
                  <VStack space="sm">
                    {actionableRecommendations.map((rec: any, idx: number) => {
                      const reason = asString(rec?.reason) ?? '';
                      const key = asString(rec?.id) ?? `rec-${idx}`;
                      const goalTitle = asString(rec?.payload?.goalTitle) ?? null;
                      const arcTitle = asString(rec?.payload?.arcTitle) ?? null;
                      const ids = Array.isArray(rec?.payload?.activityIds)
                        ? rec.payload.activityIds.filter((x: unknown) => typeof x === 'string')
                        : [];
                      const cardTitle = goalTitle
                        ? arcTitle
                          ? `${goalTitle} (${arcTitle})`
                          : goalTitle
                        : 'Tag loose to-dos';
                      const primaryLabel = ids.length === 1 ? 'Tag 1 to-do' : `Tag ${ids.length} to-dos`;

                      return (
                        <View key={key} style={styles.nextStepCard}>
                          <Text style={styles.nextStepEyebrow}>Optional cleanup</Text>
                          <Text style={styles.nextStepTitle} numberOfLines={2}>{cardTitle}</Text>
                          {reason ? <Text style={styles.nextStepReason} numberOfLines={3}>{reason}</Text> : null}
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

              {showHealthPrompt ? (
                <View style={styles.healthPromptCard}>
                  <Text style={styles.healthPromptTitle}>
                    Add Apple Health to next week&apos;s Chapter?
                  </Text>
                  <Text style={styles.healthPromptBody}>
                    Kwilt can read Apple Health summaries for movement, workouts, sleep, and
                    mindfulness, then show them in future Weekly Chapters. You can change this
                    anytime in Weekly Chapters settings.
                  </Text>
                  <View style={styles.healthPromptActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Not now"
                      onPress={handleDismissHealthPrompt}
                      disabled={healthPromptBusy}
                      style={styles.healthPromptSecondary}
                    >
                      <Text style={styles.healthPromptSecondaryLabel}>Not now</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Enable Apple Health summaries"
                      onPress={() => void handleEnableHealthPrompt()}
                      disabled={healthPromptBusy}
                      style={[
                        styles.healthPromptPrimary,
                        healthPromptBusy && styles.healthPromptPrimaryDisabled,
                      ]}
                    >
                      <Text style={styles.healthPromptPrimaryLabel}>
                        {healthPromptBusy ? 'Checking…' : 'Enable'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
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
    paddingBottom: spacing['2xl'],
  },
  chapterHero: {
    height: 230,
    width: '100%',
    overflow: 'hidden',
    backgroundColor: colors.pine700,
  },
  chapterHeroControls: {
    paddingHorizontal: spacing.lg,
  },
  chapterHeroControlsRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contentStack: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  headerBlock: {
    width: '100%',
  },
  headline: {
    ...typography.titleLg,
    color: colors.textPrimary,
    textAlign: 'left',
  },
  articleMeta: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
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
    marginTop: spacing.lg,
    marginBottom: spacing.md,
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
  storyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  storyDiscloseMeta: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  storyBody: {
    marginTop: 0,
  },
  nextStepsBlock: {
    width: '100%',
    gap: spacing.sm,
  },
  nextStepCard: {
    width: '100%',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  nextStepEyebrow: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
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
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    width: '100%',
  },
  achievementsLabel: {
    ...typography.bodyXs,
    color: colors.sumi400,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  metricPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  metricValue: {
    ...typography.titleMd,
    color: colors.sumi900,
    fontWeight: '600',
  },
  metricLabel: {
    ...typography.bodySm,
    color: colors.sumi500,
    marginTop: 2,
    textAlign: 'center',
  },
  metricPillDivider: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.sumi200,
  },
  healthSummaryBlock: {
    width: '100%',
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  healthSummaryIntro: {
    ...typography.bodySm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  healthSummaryGrid: {
    gap: spacing.xs,
  },
  healthSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  healthSummaryLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    flex: 1,
  },
  healthSummaryValueWrap: {
    flex: 1.4,
    alignItems: 'flex-end',
  },
  healthSummaryValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '700',
    textAlign: 'right',
  },
  healthSummaryDetail: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 2,
  },
  articleWrap: {
    width: '100%',
    marginTop: spacing.sm,
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
    color: colors.sumi800,
    lineHeight: 25,
  },
  articleSubhead: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  storyInset: {
    marginVertical: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.pine700,
    backgroundColor: 'rgba(49,85,69,0.035)',
  },
  storyInsetLabel: {
    ...typography.bodySm,
    color: colors.pine700,
    fontWeight: '700',
    marginBottom: 2,
  },
  storyInsetText: {
    ...typography.bodySm,
    color: colors.sumi700,
    lineHeight: 20,
  },
  inlineBold: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  inlineLeadWord: {
    fontFamily: typography.bodyBold.fontFamily,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  inlineItalic: {
    fontStyle: 'italic',
  },
  goalStoryPlate: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  goalStoryImage: {
    width: 76,
    height: 58,
    borderRadius: 8,
    backgroundColor: colors.pine50,
  },
  goalStoryImageFallback: {
    width: 76,
    height: 58,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.pine50,
  },
  goalStoryText: {
    flex: 1,
  },
  goalStoryTitle: {
    ...typography.body,
    color: colors.sumi900,
    fontWeight: '600',
  },
  detailsBlock: {
    width: '100%',
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailsCards: {
    width: '100%',
    marginTop: spacing.xs,
  },
  detailCard: {
    width: '100%',
  },
  bigMetricRow: {
    flexDirection: 'row',
    columnGap: spacing.sm,
    width: '100%',
  },
  bigMetricCard: {
    flex: 1,
    minHeight: 178,
    alignItems: 'stretch',
  },
  bigMetricBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  bigMetricValue: {
    ...typography.titleXl,
    fontSize: 40,
    lineHeight: 46,
    color: colors.textPrimary,
    fontWeight: '700',
    textAlign: 'center',
  },
  bigMetricUnit: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  todoFlowBlock: {
    width: '100%',
  },
  detailCardTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  detailCardDescription: {
    ...typography.bodySm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  detailSupportingText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  todoFlowChartWrap: {
    width: '100%',
    height: TODO_FLOW_CHART.height,
    marginTop: spacing['2xl'],
  },
  todoFlowChartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: TODO_FLOW_CHART.left,
    paddingRight: TODO_FLOW_CHART.right,
    marginTop: spacing.xs,
  },
  todoFlowChartLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    flex: 1,
    textAlign: 'center',
  },
  todoFlowFooter: {
    marginTop: spacing['2xl'],
  },
  todoFlowFooterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.xs,
  },
  todoFlowFooterTitle: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontFamily: typography.bodyBold.fontFamily,
    fontWeight: '700',
    flexShrink: 1,
  },
  todoFlowFooterText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    fontWeight: '400',
    marginTop: 2,
  },
  detailStatGrid: {
    marginTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  detailStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  detailStatLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  detailStatValue: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  detailList: {
    marginTop: spacing.md,
  },
  detailLine: {
    ...typography.bodySm,
    color: colors.textPrimary,
    lineHeight: 20,
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
  healthPromptCard: {
    width: '100%',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.canvas,
  },
  healthPromptTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  healthPromptBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  healthPromptActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.sm,
  },
  healthPromptPrimary: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.pine700,
  },
  healthPromptPrimaryDisabled: {
    opacity: 0.6,
  },
  healthPromptPrimaryLabel: {
    ...typography.bodySm,
    color: colors.canvas,
    fontWeight: '700',
  },
  healthPromptSecondary: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  healthPromptSecondaryLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    fontWeight: '600',
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
