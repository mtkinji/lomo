import {
  AGENT_CAPABILITY_EVAL_CASES,
  APP_CONTROL_EVAL_CASES,
  OPERATION_LANGUAGE_CASES,
} from './agentCapabilityEvalCases';
import { CHAT_CAPABILITY_COVERAGE } from './chatCapabilityCoverage';
import { KWILT_OPERATION_REGISTRY } from '../../capabilities/operations';

describe('AGENT_CAPABILITY_EVAL_CASES', () => {
  it('defines the standing app-control jobs with two natural paraphrases each', () => {
    const byScenario = new Map<string, typeof APP_CONTROL_EVAL_CASES[number][]>();
    for (const item of APP_CONTROL_EVAL_CASES) {
      byScenario.set(item.scenarioId, [...(byScenario.get(item.scenarioId) ?? []), item]);
    }

    expect([...byScenario.keys()].sort()).toEqual([
      'create-recurring-reminded-activity',
      'create-walking-goal-and-routine',
      'future-screen-time-control',
      'read-tomorrow-plan',
    ]);
    for (const cases of byScenario.values()) expect(cases).toHaveLength(3);

    expect(byScenario.get('create-recurring-reminded-activity')?.[0]).toEqual(expect.objectContaining({
      expectedOperations: ['activities.capture'],
      expectedOutcome: 'proposal_or_receipt',
    }));
    expect(byScenario.get('read-tomorrow-plan')?.[0]).toEqual(expect.objectContaining({
      expectedOperations: ['plan.read_day_context'],
      expectedOutcome: 'answer',
    }));
    expect(byScenario.get('create-walking-goal-and-routine')?.[0]).toEqual(expect.objectContaining({
      expectedOperations: ['goals.create', 'activities.capture'],
      expectedOutcome: 'proposal_or_receipt',
    }));
    expect(byScenario.get('future-screen-time-control')?.[0]).toEqual(expect.objectContaining({
      expectedOperations: ['screen_time.configure'],
      expectedOutcome: 'native_review',
    }));
  });

  it('gives every registered operation an ordinary utterance or an explicit boundary case', () => {
    const operationIds = OPERATION_LANGUAGE_CASES.map((item) => item.operationId);
    expect(new Set(operationIds).size).toBe(operationIds.length);
    expect([...operationIds].sort()).toEqual(KWILT_OPERATION_REGISTRY.map((item) => item.id).sort());
    for (const item of OPERATION_LANGUAGE_CASES) {
      expect(Boolean(item.prompt?.trim()) || Boolean(item.boundaryReason?.trim())).toBe(true);
    }
  });

  it('represents every manifest operation exactly once', () => {
    expect(AGENT_CAPABILITY_EVAL_CASES.map((item) => item.operationId))
      .toEqual(CHAT_CAPABILITY_COVERAGE.map((row) => row.id));
    expect(new Set(AGENT_CAPABILITY_EVAL_CASES.map((item) => item.id)).size)
      .toBe(AGENT_CAPABILITY_EVAL_CASES.length);
  });

  it('never turns an incomplete Phone operation into apparent success', () => {
    for (const item of AGENT_CAPABILITY_EVAL_CASES) {
      if (item.phoneState === 'pending_provider' || item.phoneState === 'excluded') {
        expect(item.expectedPhoneOutcome).toBe('honest_boundary');
      }
    }
  });

  it('derives both channel outcomes directly from the executable manifest', () => {
    for (const item of AGENT_CAPABILITY_EVAL_CASES) {
      const row = CHAT_CAPABILITY_COVERAGE.find((candidate) => candidate.id === item.operationId)!;
      expect(item.mobileState).toBe(row.channels.mobile.state);
      expect(item.phoneState).toBe(row.channels.phone.state);
      expect(item.expectedMobileOutcome).toBe(row.channels.mobile.outcome);
      expect(item.expectedPhoneOutcome).toBe(row.channels.phone.outcome);
    }
  });

  it('records the current Phone Agent boundary instead of borrowing mobile or MCP claims', () => {
    const byOperation = new Map(AGENT_CAPABILITY_EVAL_CASES.map((item) => [item.operationId, item]));
    expect(byOperation.get('general.answer_with_context')?.expectedPhoneOutcome).toBe('server_execution');
    expect(byOperation.get('activities.capture')?.expectedPhoneOutcome).toBe('server_execution');
    expect(byOperation.get('relationships.read')?.expectedPhoneOutcome).toBe('server_execution');
    expect(byOperation.get('relationships.remember')?.expectedPhoneOutcome).toBe('server_execution');
    expect(byOperation.get('relationships.correct')?.expectedMobileOutcome).toBe('proposal_or_receipt');
    expect(byOperation.get('relationships.correct')?.expectedPhoneOutcome).toBe('server_execution');
    expect(byOperation.get('relationships.forget')?.expectedMobileOutcome).toBe('proposal_or_receipt');
    expect(byOperation.get('relationships.forget')?.expectedPhoneOutcome).toBe('server_execution');
    expect(byOperation.get('goals.check_in')?.expectedPhoneOutcome).toBe('device_handoff');
    expect(byOperation.get('goals.update')?.expectedPhoneOutcome).toBe('mobile_proposal');
    expect(byOperation.get('goals.create')?.expectedPhoneOutcome).toBe('mobile_proposal');
    expect(byOperation.get('goals.delete')?.expectedPhoneOutcome).toBe('mobile_proposal');
    expect(byOperation.get('arcs.create')?.expectedPhoneOutcome).toBe('mobile_proposal');
    expect(byOperation.get('arcs.update')?.expectedPhoneOutcome).toBe('mobile_proposal');
    expect(byOperation.get('arcs.delete')?.expectedPhoneOutcome).toBe('mobile_proposal');
    expect(byOperation.get('activities.update')?.expectedPhoneOutcome).toBe('mobile_proposal');
    expect(byOperation.get('activities.complete')?.expectedPhoneOutcome).toBe('mobile_proposal');
    expect(byOperation.get('activities.delete')?.expectedPhoneOutcome).toBe('mobile_proposal');
    expect(byOperation.get('activities.steps.create')?.expectedPhoneOutcome).toBe('mobile_proposal');
    expect(byOperation.get('activities.steps.update')?.expectedPhoneOutcome).toBe('mobile_proposal');
    expect(byOperation.get('activities.steps.complete')?.expectedPhoneOutcome).toBe('mobile_proposal');
    expect(byOperation.get('activities.steps.delete')?.expectedPhoneOutcome).toBe('mobile_proposal');
    expect(byOperation.get('activities.steps.reorder')?.expectedPhoneOutcome).toBe('mobile_proposal');
    expect(byOperation.get('activities.repeat.update')?.expectedPhoneOutcome).toBe('mobile_proposal');
    expect(byOperation.get('activities.reminder.update')?.expectedPhoneOutcome).toBe('mobile_proposal');
    expect(byOperation.get('activities.focus_today')?.expectedPhoneOutcome).toBe('mobile_proposal');
    expect(byOperation.get('activities.focus.open')?.expectedPhoneOutcome).toBe('device_handoff');
    expect(byOperation.get('activities.location.update')?.expectedPhoneOutcome).toBe('device_handoff');
    expect(byOperation.get('activities.attachments.update')?.expectedPhoneOutcome).toBe('device_handoff');
    expect(byOperation.get('activities.share')?.expectedPhoneOutcome).toBe('device_handoff');
    expect(byOperation.get('goals.share')?.expectedPhoneOutcome).toBe('device_handoff');
    expect(byOperation.get('chapters.note.update')?.expectedPhoneOutcome).toBe('mobile_proposal');
    expect(byOperation.get('plan.read_day_context')?.expectedPhoneOutcome).toBe('server_execution');
    expect(byOperation.get('plan.recommend_day')?.expectedPhoneOutcome).toBe('server_execution');
    expect(byOperation.get('activities.schedule')?.expectedPhoneOutcome).toBe('mobile_proposal');
    expect(byOperation.get('plan.schedule_activity')?.expectedPhoneOutcome).toBe('mobile_proposal');
    expect(byOperation.get('plan.reschedule_activity')?.expectedPhoneOutcome).toBe('mobile_proposal');
    expect(byOperation.get('plan.remove_activity')?.expectedPhoneOutcome).toBe('mobile_proposal');
    expect(byOperation.get('plan.schedule_chunks')?.expectedPhoneOutcome).toBe('mobile_proposal');
    expect(byOperation.get('plan.preferences.open')?.expectedPhoneOutcome).toBe('device_handoff');
  });
});
