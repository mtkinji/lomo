import type { UnifiedChatCapabilityId } from './requestPolicy';

const ACTION_CAPABILITY_LABELS: Partial<Record<UnifiedChatCapabilityId, string>> = {
  account: 'Account',
  arcs: 'Arc',
  chapters: 'Chapter',
  goals: 'Goal',
  money: 'Money',
  notifications: 'Notification',
  plan: 'Plan',
  profile: 'Profile',
  relationships: 'Relationship',
  screenTime: 'Screen Time',
  todos: 'To-do',
};

export type UnifiedChatFailureCopy = {
  label: string;
  detail: string;
};

export function getUnifiedChatFailureCopy({
  failureCode,
  participatingCapabilities,
}: {
  failureCode: string | null;
  participatingCapabilities: readonly UnifiedChatCapabilityId[];
}): UnifiedChatFailureCopy {
  if (failureCode === 'action_outcome_missing') {
    const capabilityLabel = participatingCapabilities.length === 1
      ? ACTION_CAPABILITY_LABELS[participatingCapabilities[0]!]
      : undefined;
    return capabilityLabel
      ? {
          label: `${capabilityLabel} change not ready`,
          detail: `Kwilt didn't receive a reviewable ${capabilityLabel} change, so nothing was changed.`,
        }
      : {
          label: 'Change not ready',
          detail: "Kwilt didn't receive a reviewable change, so nothing was changed.",
        };
  }

  if (failureCode === 'context_selection_failed') {
    return {
      label: 'Context check interrupted',
      detail: 'No reply was saved.',
    };
  }

  if (failureCode === 'model_response_failed') {
    return {
      label: 'Response service interrupted',
      detail: 'No reply was saved.',
    };
  }

  return {
    label: 'Response interrupted',
    detail: 'No reply was saved.',
  };
}
