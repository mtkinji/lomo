export type ReliabilityExpectedOutcome =
  | 'completed'
  | 'needs_review'
  | 'awaiting_client_action'
  | 'needs_input'
  | 'unavailable'
  | 'refused';

export type ReliabilityScenario = {
  id: string;
  capabilityId: string;
  utterances: {
    typed: readonly string[];
    dictated: readonly string[];
  };
  expectedToolId: string | null;
  expectedOutcome: ReliabilityExpectedOutcome;
  expectedAuthorization: 'none' | 'read' | 'write_explicit';
  requiredReceiptFields: readonly string[];
};

export const RELIABILITY_CORPUS_VERSION = '2026-08-26.1' as const;

const READ_RECEIPT = ['runId', 'capabilityId', 'evidenceVersion', 'status'] as const;
const WRITE_RECEIPT = [
  'runId', 'actorId', 'sourceChannel', 'requestId', 'toolId', 'toolVersion',
  'status', 'resultRef', 'reversible', 'createdAt',
] as const;
const REVIEW_RECEIPT = [
  'runId', 'proposalId', 'capabilityId', 'toolId', 'toolVersion', 'status',
] as const;
const HANDOFF_RECEIPT = [
  'runId', 'clientActionId', 'capabilityId', 'route', 'status',
] as const;
const RUN_RECEIPT = ['runId', 'requestId', 'status'] as const;

function scenario(value: ReliabilityScenario): ReliabilityScenario {
  return Object.freeze({
    ...value,
    utterances: Object.freeze({
      typed: Object.freeze([...value.utterances.typed]),
      dictated: Object.freeze([...value.utterances.dictated]),
    }),
    requiredReceiptFields: Object.freeze([...value.requiredReceiptFields]),
  });
}

export const RELIABILITY_CORPUS: readonly ReliabilityScenario[] = Object.freeze([
  scenario({
    id: 'goals-read-current', capabilityId: 'goals', expectedToolId: 'goals.read',
    utterances: {
      typed: ['What goals am I actively working on?'],
      dictated: ['what goals am i working on right now'],
    },
    expectedOutcome: 'completed', expectedAuthorization: 'read', requiredReceiptFields: READ_RECEIPT,
  }),
  scenario({
    id: 'goals-create-walking', capabilityId: 'goals', expectedToolId: 'goals.create',
    utterances: {
      typed: ['Create a goal to walk three times a week.'],
      dictated: ['make me a goal to walk three times every week'],
    },
    expectedOutcome: 'needs_review', expectedAuthorization: 'write_explicit', requiredReceiptFields: REVIEW_RECEIPT,
  }),
  scenario({
    id: 'goals-update-target-date', capabilityId: 'goals', expectedToolId: 'goals.update',
    utterances: {
      typed: ['Move my 10K goal target date to October 12.'],
      dictated: ['change the ten k goal date to october twelfth'],
    },
    expectedOutcome: 'needs_review', expectedAuthorization: 'write_explicit', requiredReceiptFields: REVIEW_RECEIPT,
  }),
  scenario({
    id: 'activities-complete-checklist-step', capabilityId: 'activities', expectedToolId: 'activities.steps.complete',
    utterances: {
      typed: ['Mark “order invitations” complete in Birthday party.'],
      dictated: ['mark order invitations done in the birthday party list'],
    },
    expectedOutcome: 'completed', expectedAuthorization: 'write_explicit', requiredReceiptFields: WRITE_RECEIPT,
  }),
  scenario({
    id: 'activities-delete-old-task', capabilityId: 'activities', expectedToolId: 'activities.delete',
    utterances: {
      typed: ['Delete the old “renew library card” task.'],
      dictated: ['delete that old renew library card task'],
    },
    expectedOutcome: 'needs_review', expectedAuthorization: 'write_explicit', requiredReceiptFields: REVIEW_RECEIPT,
  }),
  scenario({
    id: 'plan-read-tomorrow', capabilityId: 'plan', expectedToolId: 'plan.read_day_context',
    utterances: {
      typed: ['What is on my plan tomorrow?'],
      dictated: ['whats on the plan tomorrow'],
    },
    expectedOutcome: 'completed', expectedAuthorization: 'read', requiredReceiptFields: READ_RECEIPT,
  }),
  scenario({
    id: 'plan-update-reschedule', capabilityId: 'plan', expectedToolId: 'plan.reschedule_activity',
    utterances: {
      typed: ['Move grocery pickup from Tuesday to Wednesday at 5 PM.'],
      dictated: ['move grocery pickup from tuesday to wednesday at five'],
    },
    expectedOutcome: 'needs_review', expectedAuthorization: 'write_explicit', requiredReceiptFields: REVIEW_RECEIPT,
  }),
  scenario({
    id: 'money-read-month', capabilityId: 'money', expectedToolId: 'money.read',
    utterances: {
      typed: ['How are we doing against this month’s plan?'],
      dictated: ['how are we doing against the money plan this month'],
    },
    expectedOutcome: 'completed', expectedAuthorization: 'read', requiredReceiptFields: READ_RECEIPT,
  }),
  scenario({
    id: 'money-create-category', capabilityId: 'money', expectedToolId: 'money.category.create',
    utterances: {
      typed: ['Create a $75 monthly Pet care category.'],
      dictated: ['make a pet care category for seventy five dollars a month'],
    },
    expectedOutcome: 'needs_review', expectedAuthorization: 'write_explicit', requiredReceiptFields: REVIEW_RECEIPT,
  }),
  scenario({
    id: 'food-review-groceries', capabilityId: 'food', expectedToolId: 'groceries.list.review',
    utterances: {
      typed: ['Review my grocery list before I shop.'],
      dictated: ['review the grocery list before i go shopping'],
    },
    expectedOutcome: 'completed', expectedAuthorization: 'read', requiredReceiptFields: READ_RECEIPT,
  }),
  scenario({
    id: 'food-update-stock', capabilityId: 'food', expectedToolId: 'food_stock.observe',
    utterances: {
      typed: ['Record that we have two unopened cartons of eggs.'],
      dictated: ['remember we have two unopened cartons of eggs'],
    },
    expectedOutcome: 'needs_review', expectedAuthorization: 'write_explicit', requiredReceiptFields: REVIEW_RECEIPT,
  }),
  scenario({
    id: 'food-checkout-handoff', capabilityId: 'food', expectedToolId: 'groceries.handoff.open',
    utterances: {
      typed: ['Open the reviewed groceries at my store.'],
      dictated: ['open these groceries at my store'],
    },
    expectedOutcome: 'awaiting_client_action', expectedAuthorization: 'write_explicit', requiredReceiptFields: HANDOFF_RECEIPT,
  }),
  scenario({
    id: 'screen-time-device-handoff', capabilityId: 'screen_time', expectedToolId: 'screen_time.device.setup.open',
    utterances: {
      typed: ['Set up Screen Time on this phone.'],
      dictated: ['help me set up screen time on this phone'],
    },
    expectedOutcome: 'awaiting_client_action', expectedAuthorization: 'write_explicit', requiredReceiptFields: HANDOFF_RECEIPT,
  }),
  scenario({
    id: 'screen-time-update-agreement', capabilityId: 'screen_time', expectedToolId: 'screen_time.agreement.update',
    utterances: {
      typed: ['Change Maya’s weekday Screen Time limit to 90 minutes.'],
      dictated: ['change mayas weekday screen time to ninety minutes'],
    },
    expectedOutcome: 'needs_review', expectedAuthorization: 'write_explicit', requiredReceiptFields: REVIEW_RECEIPT,
  }),
  scenario({
    id: 'screen-time-unavailable-managed-device', capabilityId: 'screen_time', expectedToolId: null,
    utterances: {
      typed: ['Block games on Jordan’s school-managed iPad.'],
      dictated: ['block games on jordans school ipad'],
    },
    expectedOutcome: 'unavailable', expectedAuthorization: 'write_explicit', requiredReceiptFields: ['runId', 'status', 'reasonCode'],
  }),
  scenario({
    id: 'relationships-create-memory', capabilityId: 'relationships', expectedToolId: 'relationships.remember',
    utterances: {
      typed: ['Remember that Sam prefers quiet restaurants.'],
      dictated: ['remember sam likes quiet restaurants'],
    },
    expectedOutcome: 'needs_review', expectedAuthorization: 'write_explicit', requiredReceiptFields: REVIEW_RECEIPT,
  }),
  scenario({
    id: 'relationships-ambiguity-needs-input', capabilityId: 'relationships', expectedToolId: null,
    utterances: {
      typed: ['Forget that thing about Alex.'],
      dictated: ['forget that thing about alex'],
    },
    expectedOutcome: 'needs_input', expectedAuthorization: 'none', requiredReceiptFields: ['runId', 'status', 'reasonCode'],
  }),
  scenario({
    id: 'relationships-delete-sensitive-memory', capabilityId: 'relationships', expectedToolId: 'relationships.forget',
    utterances: {
      typed: ['Forget the note that Alex is taking medication.'],
      dictated: ['forget the note about alex taking medication'],
    },
    expectedOutcome: 'needs_review', expectedAuthorization: 'write_explicit', requiredReceiptFields: REVIEW_RECEIPT,
  }),
  scenario({
    id: 'agent-run-retry-idempotent', capabilityId: 'agent_run', expectedToolId: null,
    utterances: {
      typed: ['Retry that response.'],
      dictated: ['try that response again'],
    },
    expectedOutcome: 'completed', expectedAuthorization: 'none', requiredReceiptFields: RUN_RECEIPT,
  }),
  scenario({
    id: 'agent-run-stop', capabilityId: 'agent_run', expectedToolId: null,
    utterances: {
      typed: ['Stop working on that.'],
      dictated: ['stop working on that'],
    },
    expectedOutcome: 'completed', expectedAuthorization: 'none', requiredReceiptFields: RUN_RECEIPT,
  }),
  scenario({
    id: 'agent-run-steer', capabilityId: 'agent_run', expectedToolId: null,
    utterances: {
      typed: ['Instead, only look at this week.'],
      dictated: ['actually just look at this week'],
    },
    expectedOutcome: 'completed', expectedAuthorization: 'none', requiredReceiptFields: [...RUN_RECEIPT, 'parentRunId'],
  }),
]);

const OUTCOMES = new Set<unknown>([
  'completed', 'needs_review', 'awaiting_client_action', 'needs_input', 'unavailable', 'refused',
]);
const AUTHORIZATIONS = new Set<unknown>(['none', 'read', 'write_explicit']);
const STABLE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateReliabilityCorpus(
  corpus: readonly ReliabilityScenario[],
): string[] {
  const issues: string[] = [];
  const seenIds = new Set<string>();

  corpus.forEach((item, index) => {
    const label = typeof item?.id === 'string' && item.id ? item.id : `scenario ${index}`;
    if (!STABLE_ID.test(item?.id ?? '')) issues.push(`${label}: expected a stable kebab-case id`);
    if (seenIds.has(item?.id)) issues.push(`${label}: duplicate scenario id`);
    seenIds.add(item?.id);

    if (!item?.capabilityId?.trim()) issues.push(`${label}: capability id is required`);
    if (!Array.isArray(item?.utterances?.typed)
      || !item.utterances.typed.some((utterance) => typeof utterance === 'string' && utterance.trim())) {
      issues.push(`${label}: at least one typed utterance is required`);
    }
    if (!Array.isArray(item?.utterances?.dictated)
      || !item.utterances.dictated.some((utterance) => typeof utterance === 'string' && utterance.trim())) {
      issues.push(`${label}: at least one dictated utterance is required`);
    }
    if (!OUTCOMES.has(item?.expectedOutcome)) issues.push(`${label}: expected outcome is invalid`);
    if (!AUTHORIZATIONS.has(item?.expectedAuthorization)) issues.push(`${label}: expected authorization is invalid`);
    if (!Array.isArray(item?.requiredReceiptFields)
      || item.requiredReceiptFields.some((field) => typeof field !== 'string' || !field.trim())
      || new Set(item.requiredReceiptFields).size !== item.requiredReceiptFields.length) {
      issues.push(`${label}: receipt fields must be a unique list of non-empty names`);
    }
  });

  return issues;
}
