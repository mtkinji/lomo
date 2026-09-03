import * as Application from 'expo-application';

import { getSupabaseClient } from './backend/supabaseClient';

export const UGC_REPORT_REASONS = [
  { id: 'harassment', label: 'Harassment or bullying' },
  { id: 'hate_or_abuse', label: 'Hate or abuse' },
  { id: 'sexual_content', label: 'Sexual content' },
  { id: 'violence_or_threat', label: 'Violence or threat' },
  { id: 'spam_or_scam', label: 'Spam or scam' },
  { id: 'privacy', label: 'Privacy concern' },
  { id: 'other', label: 'Something else' },
] as const;

export type UgcReportReason = (typeof UGC_REPORT_REASONS)[number]['id'];
export type UgcReportTargetKind =
  | 'shared_delivery'
  | 'goal_feed_event'
  | 'user'
  | 'household_member'
  | 'meal_reaction'
  | 'guest_meal_feedback';

export type UgcReportTarget = {
  kind: UgcReportTargetKind;
  id: string;
  reportedUserId: string | null;
  displayName: string;
  contextLabel: string;
  canHide?: boolean;
};

export type UgcSafetyFollowup =
  | { kind: 'peer_block' }
  | { kind: 'household_help'; reporterRole: 'child' }
  | { kind: 'manage_household'; reporterRole: 'owner' | 'caregiver' }
  | { kind: 'guest_scope' };

export function safetyReceiptPresentation(followup: UgcSafetyFollowup, displayName: string): {
  title: string;
  body: string;
  canBlock: boolean;
} {
  if (followup.kind === 'household_help') {
    return {
      title: 'Your report was sent privately.',
      body: `Kwilt saved what happened for safety review. ${displayName} is not notified by this report.`,
      canBlock: false,
    };
  }
  if (followup.kind === 'manage_household') {
    return {
      title: 'Report sent.',
      body: `${displayName} is part of your Household. Household access is managed separately in Family settings.`,
      canBlock: false,
    };
  }
  if (followup.kind === 'guest_scope') {
    return {
      title: 'Report sent.',
      body: 'Kwilt saved the guest response for review. You can turn off the guest link separately to prevent more responses.',
      canBlock: false,
    };
  }
  return {
    title: 'Thank you for speaking up.',
    body: `If you feel unsafe, block ${displayName} now. Blocking is immediate and separate from our review.`,
    canBlock: true,
  };
}

export function buildUgcReportPayload(
  input: { targetKind: UgcReportTargetKind; targetId: string; reason: UgcReportReason; note?: string | null },
  application: { appVersion: string | null; buildNumber: string | null } = {
    appVersion: Application.nativeApplicationVersion,
    buildNumber: Application.nativeBuildVersion,
  },
) {
  return {
    targetKind: input.targetKind,
    targetId: input.targetId.trim(),
    reason: input.reason,
    note: input.note?.trim() || null,
    appVersion: application.appVersion,
    buildNumber: application.buildNumber,
  };
}

export function reportErrorMessage(error: unknown): string {
  const message = error && typeof error === 'object' && 'message' in error
    ? String((error as { message?: unknown }).message ?? '')
    : '';
  if (message.includes('shared_text_not_allowed')) {
    return 'That wording can’t be shared. Change it and try again.';
  }
  return 'Your report could not be sent. Check your connection and try again.';
}

export async function submitUgcReport(input: {
  target: UgcReportTarget;
  reason: UgcReportReason;
  note?: string | null;
}): Promise<{ reportId: string; status: 'submitted'; followup: UgcSafetyFollowup }> {
  const result = await getSupabaseClient().functions.invoke('ugc-report', {
    body: buildUgcReportPayload({
      targetKind: input.target.kind,
      targetId: input.target.id,
      reason: input.reason,
      note: input.note,
    }),
  });
  if (result.error) throw result.error;
  if (!result.data || result.data.status !== 'submitted' || typeof result.data.reportId !== 'string'
    || !result.data.followup || typeof result.data.followup.kind !== 'string') {
    throw new Error('invalid_report_receipt');
  }
  return result.data;
}

export async function blockUgcUser(userId: string): Promise<void> {
  const result = await getSupabaseClient().rpc('block_kwilt_user', { p_blocked_user_id: userId });
  if (result.error) throw result.error;
}

export async function hideUgcTarget(target: UgcReportTarget): Promise<void> {
  const result = await getSupabaseClient().rpc('hide_kwilt_ugc_target', {
    p_target_kind: target.kind,
    p_target_id: target.id,
  });
  if (result.error) throw result.error;
}
