// Human-readable period labels for chapter digests and other email surfaces.
//
// The chapter generator stores period boundaries as ISO timestamps + a machine
// key like `2026-W15`. We never want to render the machine key in user-facing
// copy. This helper centralizes the conversion so subject/preheader/body all
// stay in sync.
//
// Cadence values mirror the generator: 'weekly' | 'monthly' | 'yearly' |
// 'custom' | 'manual'. `'manual'` is treated as `'custom'` for label purposes.
//
// Usage from a Deno edge function:
//   import { formatHumanPeriodLabel } from '../_shared/periodLabels.ts';
//   const label = formatHumanPeriodLabel({
//     cadence: 'weekly',
//     startIso: period.start.toISO(),
//     endIso: period.end.toISO(),
//     timezone: tz,
//   });

export type PeriodCadence = 'weekly' | 'monthly' | 'yearly' | 'custom' | 'manual';

export type FormatPeriodLabelInput = {
  cadence: PeriodCadence;
  startIso: string;
  /** Exclusive end timestamp (DB convention — period.end is the start of the next period). */
  endIso: string;
  /** IANA timezone, e.g. `America/Los_Angeles`. Defaults to UTC if missing/invalid. */
  timezone?: string | null;
};

const MONTH_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function safeTimezone(tz: string | null | undefined): string {
  const candidate = (tz ?? '').trim();
  if (!candidate) return 'UTC';
  try {
    // Throws RangeError on invalid identifiers in modern Node/Deno.
    new Intl.DateTimeFormat('en-US', { timeZone: candidate });
    return candidate;
  } catch {
    return 'UTC';
  }
}

/** Decompose an instant into its calendar parts in the given timezone. */
function partsInZone(date: Date, timeZone: string): { y: number; mo: number; d: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = parts.find((p) => p.type === type);
    return part ? Number.parseInt(part.value, 10) : Number.NaN;
  };
  return { y: get('year'), mo: get('month'), d: get('day') };
}

function formatRange(startParts: { y: number; mo: number; d: number }, endParts: { y: number; mo: number; d: number }): string {
  const sameMonth = startParts.y === endParts.y && startParts.mo === endParts.mo;
  const sameYear = startParts.y === endParts.y;
  const startMonth = MONTH_SHORT[startParts.mo - 1] ?? '';
  const endMonth = MONTH_SHORT[endParts.mo - 1] ?? '';
  if (sameMonth) {
    return `${startMonth} ${startParts.d}\u2013${endParts.d}, ${endParts.y}`;
  }
  if (sameYear) {
    return `${startMonth} ${startParts.d} \u2013 ${endMonth} ${endParts.d}, ${endParts.y}`;
  }
  return `${startMonth} ${startParts.d}, ${startParts.y} \u2013 ${endMonth} ${endParts.d}, ${endParts.y}`;
}

/**
 * Render a human-friendly label for a chapter period.
 *
 * Cadence-specific shapes (mirroring `docs/email-system-ga-plan.md` Phase 3.5.2):
 * - weekly  → `"the week of Apr 13"` (uses week-start in the user's tz)
 * - monthly → `"April 2026"`
 * - yearly  → `"2026"`
 * - custom / manual → `"Apr 13 – Apr 20"` (or full year if it spans years)
 *
 * If timestamps are unparseable, falls back to a best-effort string built from
 * the cadence so we never leak `2026-W15`-style keys into copy.
 */
export function formatHumanPeriodLabel(input: FormatPeriodLabelInput): string {
  const { cadence } = input;
  const tz = safeTimezone(input.timezone);

  const startMs = Date.parse(input.startIso);
  const endMs = Date.parse(input.endIso);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    // Defensive: return a stable, generic phrase rather than bubbling a key.
    if (cadence === 'weekly') return 'this week';
    if (cadence === 'monthly') return 'this month';
    if (cadence === 'yearly') return 'this year';
    return 'this period';
  }

  const startDate = new Date(startMs);
  // The DB stores period.end as an exclusive boundary (start of the next
  // period). For display we use the inclusive last day, i.e. end - 1ms.
  const inclusiveEndDate = new Date(endMs - 1);

  const startParts = partsInZone(startDate, tz);
  const endParts = partsInZone(inclusiveEndDate, tz);

  switch (cadence) {
    case 'weekly': {
      // "the week of Apr 13"
      const month = MONTH_SHORT[startParts.mo - 1] ?? '';
      return `the week of ${month} ${startParts.d}`;
    }
    case 'monthly': {
      // "April 2026" (use the inclusive end's month so a period nominally
      // labelled "March 2026" but stored as [2026-03-01, 2026-04-01) renders as
      // "March 2026", not "April 2026").
      const month = MONTH_LONG[endParts.mo - 1] ?? '';
      return `${month} ${endParts.y}`;
    }
    case 'yearly': {
      return String(endParts.y);
    }
    case 'custom':
    case 'manual':
    default: {
      return formatRange(startParts, endParts);
    }
  }
}
