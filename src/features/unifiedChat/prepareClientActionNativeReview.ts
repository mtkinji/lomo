import type { UnifiedChatClientAction } from './types';

type GoalCheckinDraft = {
  partnerCircleKey: string;
  draftText: string;
};

type GoalCheckinDraftPort = {
  getDraft: (goalId: string) => GoalCheckinDraft | null;
  ensureDraft: (params: { goalId: string; partnerCircleKey: string }) => GoalCheckinDraft;
  setDraftText: (params: { goalId: string; draftText: string }) => unknown;
};

function mergeDraftText(existingText: string, proposedText: string): string {
  const existing = existingText.trim();
  if (!existing || existing === proposedText || existing.includes(proposedText)) {
    return existing || proposedText;
  }
  return `${existing}\n\n${proposedText}`;
}

export function prepareClientActionNativeReview(
  action: UnifiedChatClientAction,
  checkinDrafts: GoalCheckinDraftPort,
): void {
  if (action.actionType !== 'open_goal_checkin') return;
  const goalId = action.targetId?.trim() ?? '';
  const text = typeof action.payload.text === 'string' ? action.payload.text.trim() : '';
  if (!goalId || !text || text.length > 2000) {
    throw new Error('Kwilt needs a valid check-in draft before opening native review.');
  }
  const existing = checkinDrafts.getDraft(goalId);
  const draft = checkinDrafts.ensureDraft({
    goalId,
    partnerCircleKey: existing?.partnerCircleKey || 'solo',
  });
  checkinDrafts.setDraftText({
    goalId,
    draftText: mergeDraftText(draft.draftText, text),
  });
}
