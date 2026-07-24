export type LivingPlanNoticeReceipt = {
  trigger?: string;
  outcome: 'initial' | 'routine' | 'material' | 'reversal';
  cause: string;
  seenAtIso: string | null;
};

export type LivingPlanNoticeContent = { title: string; body: string };

export function getLivingPlanNoticeContent(
  receipt: LivingPlanNoticeReceipt | null | undefined,
): LivingPlanNoticeContent | null {
  if (!receipt || receipt.seenAtIso || receipt.outcome === 'initial' || receipt.outcome === 'reversal') return null;
  return {
    title: receipt.trigger === 'override_changed'
      ? 'Your change adjusted the plan'
      : receipt.outcome === 'material'
        ? 'Monthly plans changed'
        : 'Plan updated',
    body: receipt.cause,
  };
}
