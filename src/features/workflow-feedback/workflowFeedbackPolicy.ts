import type { WorkflowFeedbackSuppressionState } from './workflowFeedbackStorage';

export type WorkflowFeedbackIneligibility =
  | 'flag_disabled'
  | 'screen_time_flag_disabled'
  | 'session_already_shown'
  | 'minimum_encounters_not_met'
  | 'submitted_cooldown'
  | 'dismissed_cooldown'
  | 'unresolved_exposure_cooldown'
  | 'same_prompt_cooldown';

const DAY_MS = 24 * 60 * 60 * 1000;

function isInsideCooldown(nowMs: number, timestamp: string | undefined, days: number): boolean {
  if (!timestamp) return false;
  const timestampMs = Date.parse(timestamp);
  if (!Number.isFinite(timestampMs)) return false;
  return nowMs - timestampMs < days * DAY_MS;
}

export function evaluateWorkflowFeedbackEligibility(input: {
  nowIso: string;
  promptKey: string;
  minimumEncounterCount: number;
  state: WorkflowFeedbackSuppressionState;
  sessionHasShown: boolean;
  enabled: boolean;
  screenTimeEnabled: boolean;
  capabilityId: 'money' | 'meals' | 'screen_time';
}): { eligible: true } | { eligible: false; reason: WorkflowFeedbackIneligibility } {
  if (!input.enabled) return { eligible: false, reason: 'flag_disabled' };
  if (input.capabilityId === 'screen_time' && !input.screenTimeEnabled) {
    return { eligible: false, reason: 'screen_time_flag_disabled' };
  }
  if (input.sessionHasShown) return { eligible: false, reason: 'session_already_shown' };

  const promptState = input.state.prompts[input.promptKey];
  if ((promptState?.encounterCount ?? 0) < input.minimumEncounterCount) {
    return { eligible: false, reason: 'minimum_encounters_not_met' };
  }

  const nowMs = Date.parse(input.nowIso);
  if (input.state.unresolvedExposure && isInsideCooldown(nowMs, input.state.lastShownAt, 7)) {
    return { eligible: false, reason: 'unresolved_exposure_cooldown' };
  }
  if (isInsideCooldown(nowMs, input.state.lastSubmittedAt, 14)) {
    return { eligible: false, reason: 'submitted_cooldown' };
  }
  if (isInsideCooldown(nowMs, input.state.lastDismissedAt, 30)) {
    return { eligible: false, reason: 'dismissed_cooldown' };
  }
  if (isInsideCooldown(nowMs, promptState?.lastTerminalAt, 60)) {
    return { eligible: false, reason: 'same_prompt_cooldown' };
  }
  return { eligible: true };
}
