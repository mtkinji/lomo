import { AGENT_CAPABILITY_EVAL_CASES } from './agentCapabilityEvalCases';
import { CHAT_CAPABILITY_COVERAGE } from './chatCapabilityCoverage';

describe('AGENT_CAPABILITY_EVAL_CASES', () => {
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
