import { evaluateWorkflowFeedbackEligibility } from './workflowFeedbackPolicy';
import type { WorkflowFeedbackSuppressionState } from './workflowFeedbackStorage';

const NOW = '2026-09-02T18:00:00.000Z';
const DAY = 24 * 60 * 60 * 1000;
const promptKey = 'money_rebalance_satisfaction_v1:v1';

function isoBefore(days: number, extraMs = 0): string {
  return new Date(Date.parse(NOW) - days * DAY + extraMs).toISOString();
}

function state(overrides: Partial<WorkflowFeedbackSuppressionState> = {}): WorkflowFeedbackSuppressionState {
  return {
    schemaVersion: 1,
    unresolvedExposure: false,
    prompts: { [promptKey]: { encounterCount: 2 } },
    ...overrides,
  };
}

function evaluate(overrides: Partial<Parameters<typeof evaluateWorkflowFeedbackEligibility>[0]> = {}) {
  return evaluateWorkflowFeedbackEligibility({
    nowIso: NOW,
    promptKey,
    minimumEncounterCount: 2,
    state: state(),
    sessionHasShown: false,
    enabled: true,
    screenTimeEnabled: true,
    capabilityId: 'money',
    ...overrides,
  });
}

describe('workflow feedback eligibility', () => {
  it('uses a stable rejection order', () => {
    expect(evaluate({ enabled: false })).toEqual({ eligible: false, reason: 'flag_disabled' });
    expect(evaluate({ capabilityId: 'screen_time', screenTimeEnabled: false })).toEqual({ eligible: false, reason: 'screen_time_flag_disabled' });
    expect(evaluate({ sessionHasShown: true })).toEqual({ eligible: false, reason: 'session_already_shown' });
    expect(evaluate({ state: state({ prompts: { [promptKey]: { encounterCount: 1 } } }) })).toEqual({ eligible: false, reason: 'minimum_encounters_not_met' });
  });

  it('allows the second encounter', () => {
    expect(evaluate()).toEqual({ eligible: true });
  });

  it('enforces the seven-day unresolved exposure boundary', () => {
    expect(evaluate({ state: state({ unresolvedExposure: true, lastShownAt: isoBefore(7, 1) }) }))
      .toEqual({ eligible: false, reason: 'unresolved_exposure_cooldown' });
    expect(evaluate({ state: state({ unresolvedExposure: true, lastShownAt: isoBefore(7) }) }))
      .toEqual({ eligible: true });
  });

  it('enforces the fourteen-day submitted boundary', () => {
    expect(evaluate({ state: state({ lastSubmittedAt: isoBefore(14, 1) }) }))
      .toEqual({ eligible: false, reason: 'submitted_cooldown' });
    expect(evaluate({ state: state({ lastSubmittedAt: isoBefore(14) }) })).toEqual({ eligible: true });
  });

  it('enforces the thirty-day dismissed boundary', () => {
    expect(evaluate({ state: state({ lastDismissedAt: isoBefore(30, 1) }) }))
      .toEqual({ eligible: false, reason: 'dismissed_cooldown' });
    expect(evaluate({ state: state({ lastDismissedAt: isoBefore(30) }) })).toEqual({ eligible: true });
  });

  it('enforces the sixty-day same-prompt terminal boundary', () => {
    expect(evaluate({ state: state({ prompts: { [promptKey]: { encounterCount: 2, lastTerminalAt: isoBefore(60, 1) } } }) }))
      .toEqual({ eligible: false, reason: 'same_prompt_cooldown' });
    expect(evaluate({ state: state({ prompts: { [promptKey]: { encounterCount: 2, lastTerminalAt: isoBefore(60) } } }) }))
      .toEqual({ eligible: true });
  });

  it('ignores malformed timestamps instead of crashing', () => {
    expect(evaluate({ state: state({
      unresolvedExposure: true,
      lastShownAt: 'not-a-date',
      lastSubmittedAt: 'also-not-a-date',
      prompts: { [promptKey]: { encounterCount: 2, lastTerminalAt: 'bad' } },
    }) })).toEqual({ eligible: true });
  });
});
