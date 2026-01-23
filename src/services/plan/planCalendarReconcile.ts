import type { Activity } from '../../domain/types';
import type { CalendarEvent } from './calendarApi';

export type KwiltBlock = {
  activity: Activity;
  start: Date;
  end: Date;
};

export type ReconciledPlanCalendar = {
  /**
   * External events that should render on the Plan timeline (with Kwilt-linked duplicates removed).
   */
  externalEvents: CalendarEvent[];
  /**
   * External events that were considered duplicates of Kwilt blocks.
   * Keys are `${provider}:${accountId}:${calendarId}:${eventId}`.
   */
  matchedExternalEventKeys: Set<string>;
};

function eventKey(e: Pick<CalendarEvent, 'provider' | 'accountId' | 'calendarId' | 'eventId'>): string {
  return `${e.provider}:${e.accountId}:${e.calendarId}:${e.eventId}`;
}

function activityEventKey(a: Activity): string | null {
  if (
    !a.scheduledProvider ||
    !a.scheduledProviderAccountId ||
    !a.scheduledProviderCalendarId ||
    !a.scheduledProviderEventId
  ) {
    return null;
  }
  return `${a.scheduledProvider}:${a.scheduledProviderAccountId}:${a.scheduledProviderCalendarId}:${a.scheduledProviderEventId}`;
}

function normalizeTitle(s: string | null | undefined): string {
  const raw = typeof s === 'string' ? s : '';
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isTitleSimilar(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  // Substring match for common cases like "Standup" vs "Team Standup".
  if (a.length >= 4 && b.includes(a)) return true;
  if (b.length >= 4 && a.includes(b)) return true;
  return false;
}

function parseDateSafe(iso: string): Date | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function isSameTimeWindow(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  const tolMs = 2 * 60 * 1000;
  const startDiff = Math.abs(aStart.getTime() - bStart.getTime());
  const endDiff = Math.abs(aEnd.getTime() - bEnd.getTime());
  if (startDiff <= tolMs && endDiff <= tolMs) return true;

  // Fallback: strong overlap with near-equal duration.
  const overlapMs = Math.max(0, Math.min(aEnd.getTime(), bEnd.getTime()) - Math.max(aStart.getTime(), bStart.getTime()));
  const aDur = Math.max(1, aEnd.getTime() - aStart.getTime());
  const bDur = Math.max(1, bEnd.getTime() - bStart.getTime());
  const overlapRatio = overlapMs / Math.min(aDur, bDur);
  const durDiff = Math.abs(aDur - bDur);
  return overlapRatio >= 0.85 && durDiff <= 5 * 60 * 1000;
}

/**
 * Reconcile duplicate timeline items where a Kwilt scheduled Activity and an external calendar event
 * represent the same underlying real-world event.
 *
 * This most commonly happens when:
 * - Kwilt created a calendar event (we have provider+event ids on the Activity), and we later read it back.
 * - The user already had an external event, and also created/scheduled a matching Kwilt Activity.
 */
export function reconcilePlanCalendarEvents(params: {
  externalEvents: CalendarEvent[];
  kwiltBlocks: KwiltBlock[];
}): ReconciledPlanCalendar {
  const external = Array.isArray(params.externalEvents) ? params.externalEvents : [];
  const blocks = Array.isArray(params.kwiltBlocks) ? params.kwiltBlocks : [];

  const byKey = new Map<string, CalendarEvent>();
  for (const e of external) {
    if (!e?.provider || !e?.accountId || !e?.calendarId || !e?.eventId) continue;
    byKey.set(eventKey(e), e);
  }

  const matchedKeys = new Set<string>();
  const matchedIdxs = new Set<number>();

  // 1) Exact match via provider event ids stored on the Activity.
  for (const b of blocks) {
    const key = activityEventKey(b.activity);
    if (!key) continue;
    if (byKey.has(key)) matchedKeys.add(key);
  }

  // 2) Heuristic match (time + title similarity) to catch "two versions of the same event".
  // Only apply to timed events.
  const externalParsed: Array<{ idx: number; e: CalendarEvent; start: Date; end: Date; titleNorm: string }> = [];
  for (let i = 0; i < external.length; i++) {
    const e = external[i];
    if (e?.isAllDay) continue;
    const s = e?.start ? parseDateSafe(e.start) : null;
    const en = e?.end ? parseDateSafe(e.end) : null;
    if (!s || !en) continue;
    externalParsed.push({ idx: i, e, start: s, end: en, titleNorm: normalizeTitle(e.title) });
  }

  for (const b of blocks) {
    // If we already have an exact key match for this block, no need for heuristics.
    if (activityEventKey(b.activity) && matchedKeys.has(activityEventKey(b.activity) as string)) continue;

    const activityTitle = normalizeTitle(b.activity.title);
    if (!activityTitle) continue;

    let best: { idx: number; key: string } | null = null;
    let bestScore = Infinity;

    for (const candidate of externalParsed) {
      const key = eventKey(candidate.e);
      if (matchedKeys.has(key) || matchedIdxs.has(candidate.idx)) continue;
      if (!isSameTimeWindow(b.start, b.end, candidate.start, candidate.end)) continue;
      if (!isTitleSimilar(activityTitle, candidate.titleNorm)) continue;

      const score =
        Math.abs(b.start.getTime() - candidate.start.getTime()) + Math.abs(b.end.getTime() - candidate.end.getTime());
      if (score < bestScore) {
        bestScore = score;
        best = { idx: candidate.idx, key };
      }
    }

    if (best) {
      matchedIdxs.add(best.idx);
      matchedKeys.add(best.key);
    }
  }

  const externalEvents = external.filter((e) => !matchedKeys.has(eventKey(e)));
  return { externalEvents, matchedExternalEventKeys: matchedKeys };
}


