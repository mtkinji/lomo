export type UnifiedChatOperationalIncidentEvalCase = {
  id: string;
  initialPrompt: string;
  correctionPrompt: string;
  retryPrompt: string;
  expectedCapability: 'money';
  inventorySize: number;
};

// Structural fixtures only: retain the lived turn shape without category names,
// amounts, thread ids, or other private account content.
export const UNIFIED_CHAT_OPERATIONAL_INCIDENT_EVAL_CASES: readonly UnifiedChatOperationalIncidentEvalCase[] = [
  {
    id: 'money-category-emoji-correction-and-retry',
    initialPrompt: 'Add an emoji to every Money category that does not have one.',
    correctionPrompt: 'Close, but put the emoji at the beginning instead of the end.',
    retryPrompt: 'Can you try that again?',
    expectedCapability: 'money',
    inventorySize: 9,
  },
];
