/**
 * Check-in draft policy and helpers for shared goals.
 *
 * This module defines the data contract for "share drafts": persistent,
 * per-goal collections of completed work the user can review and approve
 * before sending a single check-in to their partner circle.
 *
 * The draft layer sits between completion events (activity done, focus
 * session done, goal completed) and the existing `submitCheckin` service.
 * It does not write to Supabase directly — the local store persists drafts
 * on-device, and `Send` ultimately calls `submitCheckin` which writes the
 * `goal_checkins` row plus the `kwilt_feed_events` event.
 *
 * Policy summary:
 *
 * - Drafts are keyed by `goalId + partnerCircleKey`. They span days; we do
 *   not create a new draft just because the date changes.
 * - Check-in-worthy triggers: completed activity, completed goal, meaningful
 *   completed focus session tied to a shared goal. Captured-but-not-completed
 *   to-dos never enter a draft.
 * - `Send` writes one `checkin_submitted` event and archives the draft.
 * - `Skip` clears the draft and queued items, but never deletes completed
 *   work from Kwilt. Confirm before clearing multi-item or multi-day drafts.
 * - User can edit final draft text, remove individual queued items, or both.
 *   If item-level edits and text edits diverge, sending preserves the exact
 *   approved text.
 * - Prompt cooldowns prevent immediate re-prompting and nightly nagging.
 * - Partner-circle changes refresh `partnerCircleKey`. Material changes
 *   require re-approval before send.
 *
 * @see docs/feature-briefs/goal-partners-post-share-experience.md
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type CheckinDraftStatus = 'active' | 'sent' | 'skipped';

export type CheckinDraftItemSource =
  | 'activity'
  | 'goal'
  | 'focus_session'
  | 'manual';

export type CheckinDraftItem = {
  /** Stable id for the queued item; used for item-level remove. */
  id: string;
  sourceType: CheckinDraftItemSource;
  /** Source object id (activity id, goal id, focus session id, etc.). */
  sourceId: string;
  /** Display title of the completed thing. */
  title: string;
  /** ISO timestamp when the source object was completed. */
  completedAt: string;
  /** ISO timestamp when this item was queued into the draft. */
  addedAt: string;
  /** Whether this item should be included in the next send. */
  includeInDraft: boolean;
  /** Optional duration in minutes for focus sessions. */
  durationMinutes?: number | null;
};

export type CheckinDraft = {
  id: string;
  goalId: string;
  /**
   * Opaque key representing the active partner audience for this draft.
   * Changes when partners are added/removed in a material way. When this
   * changes while a draft is `active`, the draft enters a re-approval state.
   */
  partnerCircleKey: string;
  items: CheckinDraftItem[];
  /** User-approved or auto-generated text. May be edited before send. */
  draftText: string;
  status: CheckinDraftStatus;
  createdAt: string;
  updatedAt: string;
  /** Last time we showed an immediate or end-of-day prompt for this draft. */
  lastPromptedAt: string | null;
  /** Last time the user dismissed a prompt for this draft. */
  lastDismissedAt: string | null;
  /** Set when the draft is sent. */
  sentAt: string | null;
  /** Set when the draft is skipped. */
  skippedAt: string | null;
  /**
   * Set when the partner circle changes mid-draft. Until the user reviews,
   * we should not auto-send and should refresh the audience copy.
   */
  needsReapprovalAt: string | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Constants and policy values
// ─────────────────────────────────────────────────────────────────────────────

/** Cooldown after the user dismisses a check-in prompt. Default: 6 hours. */
export const DRAFT_DISMISSAL_COOLDOWN_MS = 6 * 60 * 60 * 1000;

/** Minimum gap between owner reminders for the same active draft. Default: 18 hours. */
export const DRAFT_REMINDER_MIN_GAP_MS = 18 * 60 * 60 * 1000;

/** When a draft becomes "multi-day" for labeling. Default: 30 hours. */
export const DRAFT_MULTI_DAY_THRESHOLD_MS = 30 * 60 * 60 * 1000;

/** Item threshold at which "A few wins collected" labeling kicks in. */
export const DRAFT_MANY_ITEMS_THRESHOLD = 3;

/** Default end-of-day local hour for the rescue review (24h). */
export const END_OF_DAY_REVIEW_HOUR = 20;

// ─────────────────────────────────────────────────────────────────────────────
// Partner circle key
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a partner circle key from member user ids. Order-independent and
 * stable so adding the same set of partners always produces the same key.
 *
 * The owner can be included or excluded; the key only matters for detecting
 * material change. Empty/null arrays yield `solo`.
 */
export function buildPartnerCircleKey(memberUserIds: ReadonlyArray<string | null | undefined>): string {
  const ids = (memberUserIds ?? [])
    .map((id) => (typeof id === 'string' ? id.trim() : ''))
    .filter((id) => id.length > 0);
  if (ids.length === 0) return 'solo';
  const sorted = Array.from(new Set(ids)).sort();
  return sorted.join('|');
}

// ─────────────────────────────────────────────────────────────────────────────
// Draft creation
// ─────────────────────────────────────────────────────────────────────────────

export type CreateDraftParams = {
  goalId: string;
  partnerCircleKey: string;
  initialItem?: CheckinDraftItem;
  now?: Date;
  draftId?: string;
};

function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export function createDraft(params: CreateDraftParams): CheckinDraft {
  const now = (params.now ?? new Date()).toISOString();
  const draft: CheckinDraft = {
    id: params.draftId ?? newId('checkin_draft'),
    goalId: params.goalId,
    partnerCircleKey: params.partnerCircleKey,
    items: params.initialItem ? [params.initialItem] : [],
    draftText: '',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    lastPromptedAt: null,
    lastDismissedAt: null,
    sentAt: null,
    skippedAt: null,
    needsReapprovalAt: null,
  };
  draft.draftText = composeDraftText(draft, params.now);
  return draft;
}

// ─────────────────────────────────────────────────────────────────────────────
// Item operations
// ─────────────────────────────────────────────────────────────────────────────

export type DraftItemInput = Omit<CheckinDraftItem, 'id' | 'addedAt' | 'includeInDraft'> & {
  id?: string;
  addedAt?: string;
  includeInDraft?: boolean;
};

export function makeDraftItem(input: DraftItemInput, now: Date = new Date()): CheckinDraftItem {
  return {
    id: input.id ?? newId('checkin_item'),
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    title: input.title.trim(),
    completedAt: input.completedAt,
    addedAt: input.addedAt ?? now.toISOString(),
    includeInDraft: input.includeInDraft ?? true,
    durationMinutes: input.durationMinutes ?? null,
  };
}

/**
 * Append an item to an active draft. Deduplicates by `sourceType + sourceId`
 * so flipping an activity done/undone/done doesn't create duplicates.
 *
 * Returns a new draft object (caller is responsible for persistence).
 */
export function appendItem(
  draft: CheckinDraft,
  item: CheckinDraftItem,
  now: Date = new Date()
): CheckinDraft {
  const existing = draft.items.find(
    (i) => i.sourceType === item.sourceType && i.sourceId === item.sourceId
  );
  let nextItems: CheckinDraftItem[];
  if (existing) {
    nextItems = draft.items.map((i) =>
      i.id === existing.id
        ? {
            ...i,
            title: item.title,
            completedAt: item.completedAt,
            includeInDraft: true,
            durationMinutes: item.durationMinutes ?? i.durationMinutes ?? null,
          }
        : i
    );
  } else {
    nextItems = [...draft.items, item];
  }
  const next: CheckinDraft = {
    ...draft,
    items: nextItems,
    updatedAt: now.toISOString(),
  };
  next.draftText = composeDraftText(next, now);
  return next;
}

/** Remove a queued item by id. Caller decides what to do if the draft becomes empty. */
export function removeItem(
  draft: CheckinDraft,
  itemId: string,
  now: Date = new Date()
): CheckinDraft {
  const nextItems = draft.items.filter((i) => i.id !== itemId);
  const next: CheckinDraft = {
    ...draft,
    items: nextItems,
    updatedAt: now.toISOString(),
  };
  next.draftText = composeDraftText(next, now);
  return next;
}

/**
 * Remove an item by its source identity. Useful when the underlying activity
 * is deleted or undone and the user has not yet sent the draft.
 */
export function removeBySource(
  draft: CheckinDraft,
  sourceType: CheckinDraftItemSource,
  sourceId: string,
  now: Date = new Date()
): CheckinDraft {
  const filtered = draft.items.filter(
    (i) => !(i.sourceType === sourceType && i.sourceId === sourceId)
  );
  if (filtered.length === draft.items.length) return draft;
  const next: CheckinDraft = {
    ...draft,
    items: filtered,
    updatedAt: now.toISOString(),
  };
  next.draftText = composeDraftText(next, now);
  return next;
}

/** Toggle inclusion of an item without removing it from the draft. */
export function toggleItemInclusion(
  draft: CheckinDraft,
  itemId: string,
  now: Date = new Date()
): CheckinDraft {
  const nextItems = draft.items.map((i) =>
    i.id === itemId ? { ...i, includeInDraft: !i.includeInDraft } : i
  );
  const next: CheckinDraft = {
    ...draft,
    items: nextItems,
    updatedAt: now.toISOString(),
  };
  next.draftText = composeDraftText(next, now);
  return next;
}

// ─────────────────────────────────────────────────────────────────────────────
// Draft text composition
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a specific, low-friction draft message from queued items.
 *
 * - One item: `I finished {title}.`
 * - Same day, 2-3 items: `Today I finished A, B, and C.`
 * - Multi-day or 4+ items: short list.
 *
 * Returns an empty string when the draft has no included items.
 */
export function composeDraftText(draft: CheckinDraft, now: Date = new Date()): string {
  const included = draft.items.filter((i) => i.includeInDraft);
  if (included.length === 0) return '';

  if (included.length === 1) {
    return formatSingleItem(included[0]);
  }

  const sameDay = areItemsSameLocalDay(included, now);
  const useList = included.length >= 4 || !sameDay;
  const prefix = sameDay ? 'Today I finished' : 'This week I finished';

  if (useList) {
    const lines = included.map((i) => titleForItem(i));
    return `${prefix}:\n${lines.map((l) => `• ${l}`).join('\n')}`;
  }

  const titles = included.map((i) => titleForItem(i));
  return `${prefix} ${joinList(titles)}.`;
}

function formatSingleItem(item: CheckinDraftItem): string {
  if (item.sourceType === 'goal') {
    return `I completed ${item.title}.`;
  }
  if (item.sourceType === 'focus_session') {
    const minutes = item.durationMinutes ?? null;
    if (minutes && minutes > 0) {
      return `I spent ${formatDuration(minutes)} on ${item.title}.`;
    }
    return `I worked on ${item.title}.`;
  }
  return `I finished ${item.title}.`;
}

function titleForItem(item: CheckinDraftItem): string {
  if (item.sourceType === 'focus_session' && item.durationMinutes && item.durationMinutes > 0) {
    return `${formatDuration(item.durationMinutes)} on ${item.title}`;
  }
  return item.title;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (rem === 0) return hours === 1 ? '1 hour' : `${hours} hours`;
  return `${hours}h ${rem}m`;
}

function joinList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  const head = items.slice(0, -1).join(', ');
  const tail = items[items.length - 1];
  return `${head}, and ${tail}`;
}

function areItemsSameLocalDay(items: CheckinDraftItem[], now: Date): boolean {
  if (items.length === 0) return true;
  const dayKeys = items.map((i) => localDayKey(new Date(i.completedAt)));
  const nowKey = localDayKey(now);
  return dayKeys.every((k) => k === nowKey || k === dayKeys[0]) && dayKeys[0] === nowKey;
}

function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompt cooldowns and labeling
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Whether we should show an immediate approval prompt for this draft right
 * now. Respects `lastDismissedAt` so we don't re-prompt on every completion.
 */
export function shouldShowImmediatePrompt(draft: CheckinDraft, now: Date = new Date()): boolean {
  if (draft.status !== 'active') return false;
  if (draft.lastDismissedAt) {
    const sinceDismiss = now.getTime() - Date.parse(draft.lastDismissedAt);
    if (sinceDismiss < DRAFT_DISMISSAL_COOLDOWN_MS) return false;
  }
  return draft.items.some((i) => i.includeInDraft);
}

/**
 * Whether we should include this draft in tonight's end-of-day review.
 * Returns false if the draft is empty, was sent/skipped, or is inside the
 * dismissal cooldown.
 */
export function shouldIncludeInEndOfDayReview(
  draft: CheckinDraft,
  now: Date = new Date()
): boolean {
  if (draft.status !== 'active') return false;
  if (!draft.items.some((i) => i.includeInDraft)) return false;
  if (draft.lastDismissedAt) {
    const sinceDismiss = now.getTime() - Date.parse(draft.lastDismissedAt);
    // We use the longer reminder gap here so collecting users aren't nagged
    // every 8 PM.
    if (sinceDismiss < DRAFT_REMINDER_MIN_GAP_MS) return false;
  }
  return true;
}

export type DraftAgeLabel = 'ready_to_send' | 'draft_check_in' | 'a_few_wins_collected';

export function describeDraftAgeLabel(
  draft: CheckinDraft,
  now: Date = new Date()
): DraftAgeLabel {
  const includedCount = draft.items.filter((i) => i.includeInDraft).length;
  if (includedCount >= DRAFT_MANY_ITEMS_THRESHOLD) return 'a_few_wins_collected';
  const createdMs = Date.parse(draft.createdAt);
  if (Number.isFinite(createdMs)) {
    const age = now.getTime() - createdMs;
    if (age >= DRAFT_MULTI_DAY_THRESHOLD_MS) return 'draft_check_in';
  }
  return 'ready_to_send';
}

export function getDraftAgeLabelText(label: DraftAgeLabel): string {
  switch (label) {
    case 'ready_to_send':
      return 'Ready to send';
    case 'draft_check_in':
      return 'Draft check-in';
    case 'a_few_wins_collected':
      return 'A few wins collected';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Partner circle changes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Apply a new partner circle key to a draft. If the key changes, the draft
 * enters a "needs re-approval" state so the user reviews the audience before
 * sending.
 */
export function applyPartnerCircleKey(
  draft: CheckinDraft,
  nextKey: string,
  now: Date = new Date()
): CheckinDraft {
  if (draft.partnerCircleKey === nextKey) return draft;
  return {
    ...draft,
    partnerCircleKey: nextKey,
    needsReapprovalAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

/** Whether a draft is sendable right now. */
export function canSendDraft(draft: CheckinDraft): boolean {
  if (draft.status !== 'active') return false;
  if (draft.partnerCircleKey === 'solo') return false;
  if (!draft.items.some((i) => i.includeInDraft)) {
    // Allow send if user has typed text manually with no items.
    return draft.draftText.trim().length > 0;
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Send / skip / dismiss
// ─────────────────────────────────────────────────────────────────────────────

/** Mark a draft as sent. Caller is responsible for the actual `submitCheckin` call. */
export function markSent(draft: CheckinDraft, now: Date = new Date()): CheckinDraft {
  const nowIso = now.toISOString();
  return {
    ...draft,
    status: 'sent',
    sentAt: nowIso,
    updatedAt: nowIso,
    needsReapprovalAt: null,
  };
}

/** Mark a draft as skipped and clear its queued items. */
export function markSkipped(draft: CheckinDraft, now: Date = new Date()): CheckinDraft {
  const nowIso = now.toISOString();
  return {
    ...draft,
    items: [],
    draftText: '',
    status: 'skipped',
    skippedAt: nowIso,
    updatedAt: nowIso,
    needsReapprovalAt: null,
  };
}

/** Record that the user dismissed a prompt for this draft. */
export function markDismissed(draft: CheckinDraft, now: Date = new Date()): CheckinDraft {
  const nowIso = now.toISOString();
  return {
    ...draft,
    lastDismissedAt: nowIso,
    updatedAt: nowIso,
  };
}

/** Record that we showed a prompt for this draft. */
export function markPrompted(draft: CheckinDraft, now: Date = new Date()): CheckinDraft {
  const nowIso = now.toISOString();
  return {
    ...draft,
    lastPromptedAt: nowIso,
    updatedAt: nowIso,
  };
}

/**
 * Whether skipping should ask for explicit confirmation. We only nag when the
 * user has accumulated something meaningful.
 */
export function shouldConfirmSkip(draft: CheckinDraft, now: Date = new Date()): boolean {
  const items = draft.items.filter((i) => i.includeInDraft);
  if (items.length >= 2) return true;
  if (items.length >= 1) {
    const createdMs = Date.parse(draft.createdAt);
    if (Number.isFinite(createdMs) && now.getTime() - createdMs >= DRAFT_MULTI_DAY_THRESHOLD_MS) {
      return true;
    }
  }
  return false;
}
