export type WorkflowFeedbackPromptId =
  | 'money_rebalance_satisfaction_v1'
  | 'meal_plan_finalized_satisfaction_v1'
  | 'money_transaction_correction_ease_v1'
  | 'screen_time_block_reason_clarity_v1'
  | 'screen_time_block_clear_ease_v1';

export type WorkflowFeedbackCategory = 'satisfaction' | 'ease' | 'clarity';
export type WorkflowFeedbackPlacement = 'standalone' | 'inline';
export type WorkflowFeedbackResponseBand = 'negative' | 'mixed' | 'positive';
export type WorkflowFeedbackValue = 1 | 2 | 3 | 4 | 5;

export type WorkflowFeedbackChoice = Readonly<{
  value: WorkflowFeedbackValue;
  label: string;
  accessibilityLabel: string;
}>;

export type WorkflowFeedbackReason = Readonly<{
  code: string;
  label: string;
}>;

export type WorkflowFeedbackPrompt = Readonly<{
  promptId: WorkflowFeedbackPromptId;
  questionVersion: 1;
  category: WorkflowFeedbackCategory;
  question: string;
  choices: readonly WorkflowFeedbackChoice[];
  reasons: readonly WorkflowFeedbackReason[];
  capabilityId: 'money' | 'meals' | 'screen_time';
  workflowId:
    | 'adjust_spending_plan'
    | 'finalize_meal_plan'
    | 'correct_transaction_category'
    | 'respond_to_blocked_app';
  checkpointId:
    | 'rebalance_saved'
    | 'meal_plan_finalized'
    | 'transaction_category_corrected'
    | 'block_reason_rendered'
    | 'temporary_open_applied';
  invocationKind:
    | 'checkpoint_experience'
    | 'workflow_completion_experience'
    | 'authoritative_outcome_experience';
  outcomeClass: 'saved' | 'finalized' | 'corrected' | 'rendered' | 'opened';
  placement: WorkflowFeedbackPlacement;
  minimumEncounterCount: 2;
}>;

const satisfactionChoices = [
  { value: 1, label: 'Very dissatisfied', accessibilityLabel: 'Very dissatisfied' },
  { value: 2, label: 'Dissatisfied', accessibilityLabel: 'Dissatisfied' },
  { value: 3, label: 'Neutral', accessibilityLabel: 'Neutral' },
  { value: 4, label: 'Satisfied', accessibilityLabel: 'Satisfied' },
  { value: 5, label: 'Very satisfied', accessibilityLabel: 'Very satisfied' },
] as const satisfies readonly WorkflowFeedbackChoice[];

const easeChoices = [
  { value: 1, label: 'Very difficult', accessibilityLabel: 'Very difficult' },
  { value: 2, label: 'Difficult', accessibilityLabel: 'Difficult' },
  { value: 3, label: 'Neutral', accessibilityLabel: 'Neither difficult nor easy' },
  { value: 4, label: 'Easy', accessibilityLabel: 'Easy' },
  { value: 5, label: 'Very easy', accessibilityLabel: 'Very easy' },
] as const satisfies readonly WorkflowFeedbackChoice[];

const clarityChoices = [
  { value: 1, label: 'Not clear', accessibilityLabel: 'Not clear' },
  { value: 2, label: 'Slightly clear', accessibilityLabel: 'Slightly clear' },
  { value: 3, label: 'Moderately clear', accessibilityLabel: 'Moderately clear' },
  { value: 4, label: 'Very clear', accessibilityLabel: 'Very clear' },
  { value: 5, label: 'Completely clear', accessibilityLabel: 'Completely clear' },
] as const satisfies readonly WorkflowFeedbackChoice[];

export const WORKFLOW_FEEDBACK_REGISTRY: Record<WorkflowFeedbackPromptId, WorkflowFeedbackPrompt> = {
  money_rebalance_satisfaction_v1: {
    promptId: 'money_rebalance_satisfaction_v1',
    questionVersion: 1,
    category: 'satisfaction',
    question: 'How satisfied are you with this spending plan?',
    choices: satisfactionChoices,
    reasons: [
      { code: 'result_unclear', label: "I couldn't tell what changed" },
      { code: 'too_much_work', label: 'It took too much work' },
      { code: 'priorities_missed', label: "It didn't match my priorities" },
      { code: 'result_not_trusted', label: "I didn't trust the result" },
    ],
    capabilityId: 'money',
    workflowId: 'adjust_spending_plan',
    checkpointId: 'rebalance_saved',
    invocationKind: 'authoritative_outcome_experience',
    outcomeClass: 'saved',
    placement: 'standalone',
    minimumEncounterCount: 2,
  },
  meal_plan_finalized_satisfaction_v1: {
    promptId: 'meal_plan_finalized_satisfaction_v1',
    questionVersion: 1,
    category: 'satisfaction',
    question: 'How satisfied are you with the meal plan you just made?',
    choices: satisfactionChoices,
    reasons: [
      { code: 'choices_didnt_fit', label: "The meals didn't fit" },
      { code: 'too_much_work', label: 'It took too much work' },
      { code: 'household_fit_unclear', label: "I wasn't sure it fit everyone" },
      { code: 'next_step_unclear', label: "I wasn't sure what came next" },
    ],
    capabilityId: 'meals',
    workflowId: 'finalize_meal_plan',
    checkpointId: 'meal_plan_finalized',
    invocationKind: 'workflow_completion_experience',
    outcomeClass: 'finalized',
    placement: 'standalone',
    minimumEncounterCount: 2,
  },
  money_transaction_correction_ease_v1: {
    promptId: 'money_transaction_correction_ease_v1',
    questionVersion: 1,
    category: 'ease',
    question: 'How easy was it to correct this transaction?',
    choices: easeChoices,
    reasons: [
      { code: 'category_hard_to_find', label: 'The category was hard to find' },
      { code: 'too_many_steps', label: 'It took too many steps' },
      { code: 'save_result_unclear', label: "I couldn't tell whether it saved" },
      { code: 'merchant_rule_distracting', label: 'The rule offer got in the way' },
    ],
    capabilityId: 'money',
    workflowId: 'correct_transaction_category',
    checkpointId: 'transaction_category_corrected',
    invocationKind: 'checkpoint_experience',
    outcomeClass: 'corrected',
    placement: 'standalone',
    minimumEncounterCount: 2,
  },
  screen_time_block_reason_clarity_v1: {
    promptId: 'screen_time_block_reason_clarity_v1',
    questionVersion: 1,
    category: 'clarity',
    question: 'How clear is why this app is blocked?',
    choices: clarityChoices,
    reasons: [
      { code: 'reason_too_vague', label: 'The reason was too vague' },
      { code: 'reason_too_much_information', label: 'There was too much to take in' },
      { code: 'reason_unexpected_rule', label: "It didn't match the rule I expected" },
      { code: 'reason_next_step_unclear', label: "I wasn't sure what to do next" },
    ],
    capabilityId: 'screen_time',
    workflowId: 'respond_to_blocked_app',
    checkpointId: 'block_reason_rendered',
    invocationKind: 'checkpoint_experience',
    outcomeClass: 'rendered',
    placement: 'inline',
    minimumEncounterCount: 2,
  },
  screen_time_block_clear_ease_v1: {
    promptId: 'screen_time_block_clear_ease_v1',
    questionVersion: 1,
    category: 'ease',
    question: 'How easy was it to open the app temporarily?',
    choices: easeChoices,
    reasons: [
      { code: 'reason_action_hard_to_find', label: 'The action was hard to find' },
      { code: 'reason_too_many_steps', label: 'It took too many steps' },
      { code: 'reason_result_unclear', label: "I couldn't tell whether it opened" },
      { code: 'reason_still_seemed_blocked', label: 'The app still seemed blocked' },
    ],
    capabilityId: 'screen_time',
    workflowId: 'respond_to_blocked_app',
    checkpointId: 'temporary_open_applied',
    invocationKind: 'authoritative_outcome_experience',
    outcomeClass: 'opened',
    placement: 'inline',
    minimumEncounterCount: 2,
  },
};

export function getWorkflowFeedbackPrompt(promptId: WorkflowFeedbackPromptId): WorkflowFeedbackPrompt {
  return WORKFLOW_FEEDBACK_REGISTRY[promptId];
}

export function responseBandForValue(value: WorkflowFeedbackValue): WorkflowFeedbackResponseBand {
  return value <= 2 ? 'negative' : value === 3 ? 'mixed' : 'positive';
}
