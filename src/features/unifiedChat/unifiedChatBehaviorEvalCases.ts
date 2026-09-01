import type { CoachChatTurn } from '../../services/ai';
import type {
  AgentJudgmentAuthorization,
  AgentJudgmentEvidenceScope,
  AgentJudgmentResponseContract,
} from './agentJudgment';
import type { UnifiedChatCapabilityId, UnifiedChatRequestClass } from './requestPolicy';

export type UnifiedChatBehaviorEvalCase = {
  id: string;
  family: 'analysis' | 'action' | 'follow_up' | 'cross_capability' | 'focused' | 'boundary';
  prompt: string;
  recentTurns?: readonly CoachChatTurn[];
  expectedRequestClass: UnifiedChatRequestClass;
  expectedCapabilities: readonly UnifiedChatCapabilityId[];
  expectedToolIds: readonly string[];
  expectedAuthorization: AgentJudgmentAuthorization;
  expectedEvidenceScope: AgentJudgmentEvidenceScope;
  expectedResponseContract: AgentJudgmentResponseContract;
  forbidsWriteTools: boolean;
};

const review = (
  id: string,
  prompt: string,
  evidenceScope: AgentJudgmentEvidenceScope = 'broad',
): UnifiedChatBehaviorEvalCase => ({
  id,
  family: evidenceScope === 'focused' ? 'focused' : 'analysis',
  prompt,
  expectedRequestClass: 'capability_question',
  expectedCapabilities: ['money'],
  expectedToolIds: ['money.read'],
  expectedAuthorization: 'none',
  expectedEvidenceScope: evidenceScope,
  expectedResponseContract: 'evidence_linked',
  forbidsWriteTools: true,
});

export const UNIFIED_CHAT_BEHAVIOR_EVAL_CASES: readonly UnifiedChatBehaviorEvalCase[] = [
  review(
    'money-system-review-incident',
    'Look into my budgets and transactions. What additional budgets or changes to my existing budgets might I make for a better budget system?',
  ),
  review(
    'money-system-review-hesitant-question',
    "I'm not convinced I have ask the right budget categories right now. What do you think about them?",
  ),
  review(
    'money-system-review-paraphrase',
    'Review how my spending actually maps to my budgets and recommend a simpler structure.',
  ),
  review(
    'money-system-review-action-verbs',
    'Which categories should I add, remove, or change if I want the budget to reflect real life better?',
  ),
  review(
    'money-system-review-dictation',
    'look at all the money stuff transactions budgets and tell me what setup would work better',
  ),
  {
    id: 'money-and-goals-cross-capability-review',
    family: 'cross_capability',
    prompt: 'Compare where my money is going with the Goals I say matter and tell me where they disagree.',
    expectedRequestClass: 'capability_question',
    expectedCapabilities: ['goals', 'money'],
    expectedToolIds: ['goals.read', 'money.read'],
    expectedAuthorization: 'none',
    expectedEvidenceScope: 'broad',
    expectedResponseContract: 'evidence_linked',
    forbidsWriteTools: true,
  },
  {
    id: 'money-category-create-explicit',
    family: 'action',
    prompt: 'Create a $75 monthly Pet care budget.',
    expectedRequestClass: 'capability_action',
    expectedCapabilities: ['money'],
    expectedToolIds: ['money.category.create'],
    expectedAuthorization: 'explicit_request',
    expectedEvidenceScope: 'focused',
    expectedResponseContract: 'evidence_linked',
    forbidsWriteTools: false,
  },
  {
    id: 'money-category-rename-explicit',
    family: 'action',
    prompt: 'Rename my Dress and Grooming budget to Personal care.',
    expectedRequestClass: 'capability_action',
    expectedCapabilities: ['money'],
    expectedToolIds: ['money.category.rename'],
    expectedAuthorization: 'explicit_request',
    expectedEvidenceScope: 'focused',
    expectedResponseContract: 'evidence_linked',
    forbidsWriteTools: false,
  },
  {
    id: 'money-category-accepted-suggestion',
    family: 'follow_up',
    prompt: 'Yes, prepare that rename.',
    recentTurns: [
      { role: 'user', content: 'How could I make my categories clearer?' },
      { role: 'assistant', content: 'One option is to rename Dress and Grooming to Personal care. Nothing has been changed.' },
    ],
    expectedRequestClass: 'capability_action',
    expectedCapabilities: ['money'],
    expectedToolIds: ['money.category.rename'],
    expectedAuthorization: 'accepted_prior_suggestion',
    expectedEvidenceScope: 'focused',
    expectedResponseContract: 'evidence_linked',
    forbidsWriteTools: false,
  },
  {
    id: 'money-category-ambiguous-change',
    family: 'boundary',
    prompt: 'Change that one.',
    recentTurns: [
      { role: 'user', content: 'Which Money categories seem unclear?' },
      { role: 'assistant', content: 'I found two candidates, but you have not selected either one.' },
    ],
    expectedRequestClass: 'capability_question',
    expectedCapabilities: ['money'],
    expectedToolIds: [],
    expectedAuthorization: 'none',
    expectedEvidenceScope: 'focused',
    expectedResponseContract: 'evidence_linked',
    forbidsWriteTools: true,
  },
  review('money-focused-transaction', 'What was the latest charge from Alpine Market?', 'focused'),
  review('money-review-missing-data', 'Assess my budget structure, and be clear if the synced transactions are not enough to tell.', 'broad'),
  {
    id: 'general-budgeting-no-private-data',
    family: 'analysis',
    prompt: 'Explain the envelope budgeting method without using my Kwilt data.',
    expectedRequestClass: 'general',
    expectedCapabilities: [],
    expectedToolIds: [],
    expectedAuthorization: 'none',
    expectedEvidenceScope: 'none',
    expectedResponseContract: 'direct',
    forbidsWriteTools: true,
  },
];
