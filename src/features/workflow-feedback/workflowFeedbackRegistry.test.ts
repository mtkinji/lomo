import {
  getWorkflowFeedbackPrompt,
  responseBandForValue,
  WORKFLOW_FEEDBACK_REGISTRY,
} from './workflowFeedbackRegistry';

describe('workflow feedback registry', () => {
  it('contains exactly the five accepted pilot prompts', () => {
    expect(Object.keys(WORKFLOW_FEEDBACK_REGISTRY)).toEqual([
      'money_rebalance_satisfaction_v1',
      'meal_plan_finalized_satisfaction_v1',
      'money_transaction_correction_ease_v1',
      'screen_time_block_reason_clarity_v1',
      'screen_time_block_clear_ease_v1',
    ]);
  });

  it('keeps question ownership and placement in the registry', () => {
    expect(getWorkflowFeedbackPrompt('money_rebalance_satisfaction_v1')).toMatchObject({
      category: 'satisfaction',
      questionVersion: 1,
      minimumEncounterCount: 2,
      placement: 'standalone',
      question: 'How satisfied are you with this spending plan?',
    });
    expect(getWorkflowFeedbackPrompt('screen_time_block_reason_clarity_v1')).toMatchObject({
      category: 'clarity',
      placement: 'inline',
      question: 'How clear is why this app is blocked?',
    });
  });

  it('uses complete bounded choices and reason sets', () => {
    for (const prompt of Object.values(WORKFLOW_FEEDBACK_REGISTRY)) {
      expect(prompt.choices.map((choice) => choice.value)).toEqual([1, 2, 3, 4, 5]);
      expect(new Set(prompt.choices.map((choice) => choice.value)).size).toBe(5);
      expect(prompt.choices.every((choice) => choice.label.trim() && choice.accessibilityLabel.trim())).toBe(true);
      expect(prompt.reasons).toHaveLength(4);
      expect(new Set(prompt.reasons.map((reason) => reason.code)).size).toBe(4);

      const serialized = JSON.stringify(prompt).toLowerCase();
      for (const forbidden of ['user_id', 'household_id', 'child_id', 'transaction_id', 'plan_id']) {
        expect(serialized).not.toContain(forbidden);
      }
    }
  });

  it('maps the five-point scale into stable response bands', () => {
    expect([1, 2, 3, 4, 5].map((value) => responseBandForValue(value as 1 | 2 | 3 | 4 | 5)))
      .toEqual(['negative', 'negative', 'mixed', 'positive', 'positive']);
  });
});
