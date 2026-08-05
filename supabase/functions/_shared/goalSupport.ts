type WebGoalSupportPayloadInput = {
  targetEventId: string | null;
  text: string;
  senderName: string;
};

export function webGoalSupportInviteIsEligible(input: {
  intendedRecipientUserId: string | null;
}): boolean {
  return input.intendedRecipientUserId == null;
}

export function buildWebGoalSupportPayload(input: WebGoalSupportPayloadInput) {
  return {
    targetEventId: input.targetEventId,
    text: input.text,
    webReply: true,
    goalSupport: input.targetEventId == null,
    senderName: input.senderName || null,
  };
}
