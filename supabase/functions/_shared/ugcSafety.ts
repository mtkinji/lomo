export const UGC_REPORT_REASONS = [
  'harassment',
  'hate_or_abuse',
  'sexual_content',
  'violence_or_threat',
  'spam_or_scam',
  'privacy',
  'other',
] as const;

export type UgcReportReason = (typeof UGC_REPORT_REASONS)[number];
export type UgcReportTargetKind = 'shared_delivery' | 'goal_feed_event' | 'user' | 'household_member' | 'meal_reaction' | 'guest_meal_feedback';

export type UgcReportRequest = {
  targetKind: UgcReportTargetKind;
  targetId: string;
  reason: UgcReportReason;
  note: string | null;
  appVersion: string | null;
  buildNumber: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TARGET_KINDS = new Set<UgcReportTargetKind>(['shared_delivery', 'goal_feed_event', 'user', 'household_member', 'meal_reaction', 'guest_meal_feedback']);
const REASONS = new Set<string>(UGC_REPORT_REASONS);

function boundedOptional(value: unknown, max: number): string | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') throw new Error('invalid_request');
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > max) throw new Error('invalid_request');
  return trimmed;
}

export function parseUgcReportRequest(value: unknown): UgcReportRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_request');
  const raw = value as Record<string, unknown>;
  const targetKind = raw.targetKind;
  const targetId = typeof raw.targetId === 'string' ? raw.targetId.trim() : '';
  const reason = raw.reason;
  if (typeof targetKind !== 'string' || !TARGET_KINDS.has(targetKind as UgcReportTargetKind)) {
    throw new Error('invalid_request');
  }
  if (!UUID.test(targetId) || typeof reason !== 'string' || !REASONS.has(reason)) {
    throw new Error('invalid_request');
  }
  return {
    targetKind: targetKind as UgcReportTargetKind,
    targetId,
    reason: reason as UgcReportReason,
    note: boundedOptional(raw.note, 500),
    appVersion: boundedOptional(raw.appVersion, 40),
    buildNumber: boundedOptional(raw.buildNumber, 20),
  };
}

export type SharedTextModeration =
  | { allowed: true; normalizedText: string }
  | { allowed: false; code: 'targeted_self_harm_abuse' | 'credible_threat' | 'sexual_minor_content' };

export function moderateSharedText(value: string): SharedTextModeration {
  const normalizedText = value.trim().replace(/\s+/g, ' ');
  const canonical = normalizedText.toLocaleLowerCase('en-US');
  if (/\b(?:kill|hurt)\s+(?:yourself|urself|your self)\b/.test(canonical)) {
    return { allowed: false, code: 'targeted_self_harm_abuse' };
  }
  if (/\b(?:i(?:'m| am| will|'ll)?|we(?: will|'ll)?)\s+(?:kill|hurt|shoot|stab)\s+you\b/.test(canonical)) {
    return { allowed: false, code: 'credible_threat' };
  }
  if (/\b(?:sexual|nude|naked)\b.{0,32}\b(?:child|minor|kid)\b|\b(?:child|minor|kid)\b.{0,32}\b(?:sexual|nude|naked)\b/.test(canonical)) {
    return { allowed: false, code: 'sexual_minor_content' };
  }
  return { allowed: true, normalizedText };
}

const URGENT_REASONS = new Set<UgcReportReason>(['sexual_content', 'violence_or_threat', 'privacy']);

export function buildModerationIntake(input: {
  reporterUserId: string;
  reportedUserId: string | null;
  reportedPersonId: string | null;
  targetKind: UgcReportTargetKind;
  targetId: string;
  reason: UgcReportReason;
  note: string | null;
  snapshot: Record<string, unknown>;
  submittedAt: string;
  appVersion: string | null;
  buildNumber: string | null;
}) {
  const priority = URGENT_REASONS.has(input.reason) ? 'urgent' : 'standard';
  const submitted = new Date(input.submittedAt);
  const dueMs = submitted.getTime() + (priority === 'urgent' ? 4 : 24) * 60 * 60 * 1000;
  return {
    reporter_user_id: input.reporterUserId,
    reported_user_id: input.reportedUserId,
    reported_person_id: input.reportedPersonId,
    target_kind: input.targetKind,
    target_id: input.targetId,
    reason: input.reason,
    reporter_note: input.note,
    snapshot: input.snapshot,
    status: 'open',
    priority,
    submitted_at: submitted.toISOString(),
    response_due_at: new Date(dueMs).toISOString(),
    source_app_version: input.appVersion,
    source_build_number: input.buildNumber,
  };
}
