import type { FoodOperationId } from './foodOperationIds';

export type FoodProposalCapabilityId = 'recipes' | 'meal_planning' | 'groceries' | 'savings';
export type FoodProposalStatus = 'pending' | 'edited' | 'rejected' | 'deferred' | 'approved' | 'applying' | 'applied' | 'failed' | 'undone';

export type FoodProposalOrigin = {
  channel: 'native_food' | 'unified_chat' | 'phone' | 'connector';
  threadId: string | null;
  runId: string | null;
  messageId: string | null;
};

type FoodProposalOperationBase = {
  id: string;
  proposalId: string;
  capabilityId: FoodProposalCapabilityId;
  operationId: FoodOperationId;
  targetType: string;
  targetId: string;
  expectedResourceVersion: number;
  summary: string;
  idempotencyKey: string;
  sequence: number;
  evidenceRefs: string[];
  returnTarget: { capability: FoodProposalCapabilityId; objectType: string; objectId: string };
  reversible: boolean;
  outcomeStep?: { sequence: number; dependsOnSequence: number | null };
};

export type FoodProposalOperation = FoodProposalOperationBase & (
  | {
      capabilityId: 'recipes'; operationId: 'recipes.import.approve';
      payload: { draftId: string; expectedDraftVersion: number };
    }
  | {
      capabilityId: 'meal_planning'; operationId: 'meal_planning.plan.finalize';
      payload: { planId: string; expectedPlanVersion: number; selectedCandidateIds: string[] };
    }
  | {
      capabilityId: 'meal_planning'; operationId: 'meal_planning.round.open';
      payload: { planId: string; expectedPlanVersion: number; invitedPersonIds: string[] };
    }
  | {
      capabilityId: 'recipes'; operationId: 'recipes.publication.publish';
      payload: {
        publicationId: string;
        expectedPublicationVersion: number;
        confirmedRecipeVersionId: string;
        confirmedScopes: string[];
      };
    }
  | {
      capabilityId: 'groceries'; operationId: 'groceries.product_match.confirm';
      payload: { groceryItemId: string; expectedItemVersion: number; productId: string; priceQuoteId: string };
    }
  | {
      capabilityId: 'savings'; operationId: 'savings.accept';
      payload: { savingsPlanId: string; expectedSavingsPlanVersion: number; selectedOfferIds: string[] };
    }
);

export type FoodProposal = {
  id: string;
  origin: FoodProposalOrigin;
  title: string;
  body: string;
  status: FoodProposalStatus;
  version: number;
  operation: FoodProposalOperation;
  createdAt: string;
  updatedAt: string;
};

export type FoodMutationReceipt = {
  id: string;
  proposalId: string;
  operationId: string;
  capabilityId: FoodProposalCapabilityId;
  idempotencyKey: string;
  status: 'reserved' | 'applied' | 'failed' | 'undone';
  resultingObjectType: string | null;
  resultingObjectId: string | null;
  resultState: Record<string, unknown>;
  returnTarget: FoodProposalOperation['returnTarget'];
  undoOperation: Record<string, unknown> | null;
  canUndo: boolean;
  errorCode: string | null;
  errorMessage: string | null;
};

export class FoodProposalContractError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'FoodProposalContractError';
  }
}

export function toAgentLedgerRecords(proposal: FoodProposal): {
  proposal: {
    id: string;
    threadId: string | null;
    runId: string | null;
    messageId: string | null;
    originChannel: FoodProposalOrigin['channel'];
    capabilityId: FoodProposalCapabilityId;
    title: string;
    body: string;
    status: FoodProposalStatus;
    version: number;
  };
  operation: {
    id: string;
    proposalId: string;
    capabilityId: FoodProposalCapabilityId;
    operationType: FoodOperationId;
    targetType: string;
    targetId: string;
    summary: string;
    payload: FoodProposalOperation['payload'];
    expectedResourceVersion: number;
    evidenceRefs: string[];
    returnTarget: FoodProposalOperation['returnTarget'];
    reversible: boolean;
    idempotencyKey: string;
    sequence: number;
  };
} {
  return {
    proposal: {
      id: proposal.id,
      threadId: proposal.origin.threadId,
      runId: proposal.origin.runId,
      messageId: proposal.origin.messageId,
      originChannel: proposal.origin.channel,
      capabilityId: proposal.operation.capabilityId,
      title: proposal.title,
      body: proposal.body,
      status: proposal.status,
      version: proposal.version,
    },
    operation: {
      id: proposal.operation.id,
      proposalId: proposal.operation.proposalId,
      capabilityId: proposal.operation.capabilityId,
      operationType: proposal.operation.operationId,
      targetType: proposal.operation.targetType,
      targetId: proposal.operation.targetId,
      summary: proposal.operation.summary,
      payload: proposal.operation.payload,
      expectedResourceVersion: proposal.operation.expectedResourceVersion,
      evidenceRefs: [...proposal.operation.evidenceRefs],
      returnTarget: { ...proposal.operation.returnTarget },
      reversible: proposal.operation.reversible,
      idempotencyKey: proposal.operation.idempotencyKey,
      sequence: proposal.operation.sequence,
    },
  };
}

export function decideFoodProposal(
  proposal: FoodProposal,
  input: {
    action: 'edit' | 'reject' | 'defer' | 'approve';
    expectedVersion: number;
    payload?: FoodProposalOperation['payload'];
  },
): FoodProposal {
  if (proposal.status !== 'pending' || proposal.version !== input.expectedVersion) {
    throw new FoodProposalContractError('food_proposal.version_conflict', 'The proposal changed before this decision.');
  }
  if (input.action === 'edit' && !input.payload) {
    throw new FoodProposalContractError('food_proposal.edit_required', 'An edited proposal requires a complete replacement payload.');
  }
  const status = input.action === 'reject' ? 'rejected' : input.action === 'approve' ? 'approved' :
    input.action === 'defer' ? 'deferred' : 'edited';
  return {
    ...proposal,
    status,
    version: proposal.version + 1,
    operation: input.payload ? { ...proposal.operation, payload: input.payload } as FoodProposalOperation : proposal.operation,
  };
}

function receiptKey(proposal: FoodProposal): string {
  return `${proposal.operation.capabilityId}:${proposal.operation.idempotencyKey}`;
}

export class InMemoryFoodReceiptLedger {
  private readonly receipts = new Map<string, FoodMutationReceipt>();

  reserve(proposal: FoodProposal): FoodMutationReceipt {
    const key = receiptKey(proposal);
    const existing = this.receipts.get(key);
    if (existing) return existing;
    const receipt: FoodMutationReceipt = {
      id: `receipt:${proposal.operation.idempotencyKey}`,
      proposalId: proposal.id,
      operationId: proposal.operation.id,
      capabilityId: proposal.operation.capabilityId,
      idempotencyKey: proposal.operation.idempotencyKey,
      status: 'reserved',
      resultingObjectType: null,
      resultingObjectId: null,
      resultState: {},
      returnTarget: { ...proposal.operation.returnTarget },
      undoOperation: null,
      canUndo: false,
      errorCode: null,
      errorMessage: null,
    };
    this.receipts.set(key, receipt);
    return receipt;
  }

  finalize(proposal: FoodProposal, result: FoodApplyResult): FoodMutationReceipt {
    const receipt = this.reserve(proposal);
    if (receipt.status === 'applied') return receipt;
    const applied: FoodMutationReceipt = {
      ...receipt,
      status: 'applied',
      resultingObjectType: result.resultingObjectType ?? null,
      resultingObjectId: result.resultingObjectId ?? null,
      resultState: { ...result },
      undoOperation: result.undoOperation ?? null,
      canUndo: proposal.operation.reversible && Boolean(result.undoOperation),
      errorCode: null,
      errorMessage: null,
    };
    this.receipts.set(receiptKey(proposal), applied);
    return applied;
  }

  fail(proposal: FoodProposal, code: string, message: string): FoodMutationReceipt {
    const failed: FoodMutationReceipt = {
      ...this.reserve(proposal),
      status: 'failed',
      errorCode: code,
      errorMessage: message,
    };
    this.receipts.set(receiptKey(proposal), failed);
    return failed;
  }

  all(): FoodMutationReceipt[] {
    return [...this.receipts.values()];
  }
}

export type FoodApplyResult = {
  resultingObjectType?: string;
  resultingObjectId?: string;
  resourceVersion?: number;
  undoOperation?: Record<string, unknown> | null;
  [key: string]: unknown;
};

export function applyFoodProposal(input: {
  proposal: FoodProposal;
  currentResourceVersion: number;
  providerAvailable: boolean;
  ledger: InMemoryFoodReceiptLedger;
  apply: () => FoodApplyResult;
}): FoodMutationReceipt {
  const { proposal } = input;
  if (proposal.status !== 'approved') {
    throw new FoodProposalContractError('food_proposal.approval_required', 'The proposal has not been approved.');
  }
  if (proposal.operation.expectedResourceVersion !== input.currentResourceVersion) {
    throw new FoodProposalContractError('food_proposal.version_conflict', 'The reviewed resource changed before application.');
  }
  const reserved = input.ledger.reserve(proposal);
  if (reserved.status === 'applied') return reserved;
  if (!input.providerAvailable) {
    const message = 'The required provider is unavailable.';
    input.ledger.fail(proposal, 'food_proposal.provider_unavailable', message);
    throw new FoodProposalContractError('food_proposal.provider_unavailable', message);
  }
  try {
    return input.ledger.finalize(proposal, input.apply());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The operation failed.';
    input.ledger.fail(proposal, 'food_proposal.apply_failed', message);
    throw error;
  }
}

export function applyFoodProposalBatch(input: {
  proposals: FoodProposal[];
  currentResourceVersion: (proposal: FoodProposal) => number;
  providerAvailable: (proposal: FoodProposal) => boolean;
  ledger: InMemoryFoodReceiptLedger;
  apply: (proposal: FoodProposal) => FoodApplyResult;
}): {
  applied: string[];
  failed: Array<{ proposalId: string; message: string }>;
  skipped: Array<{ proposalId: string; reason: string }>;
} {
  const ordered = input.proposals.map((proposal, index) => ({ proposal, index })).sort((left, right) =>
    (left.proposal.operation.outcomeStep?.sequence ?? left.index + 1) -
    (right.proposal.operation.outcomeStep?.sequence ?? right.index + 1));
  const stateBySequence = new Map<number, 'applied' | 'failed' | 'skipped'>();
  const result = {
    applied: [] as string[],
    failed: [] as Array<{ proposalId: string; message: string }>,
    skipped: [] as Array<{ proposalId: string; reason: string }>,
  };
  for (const { proposal, index } of ordered) {
    const sequence = proposal.operation.outcomeStep?.sequence ?? index + 1;
    const dependency = proposal.operation.outcomeStep?.dependsOnSequence ?? null;
    if (dependency !== null && stateBySequence.get(dependency) !== 'applied') {
      result.skipped.push({ proposalId: proposal.id, reason: 'Its prerequisite did not complete.' });
      stateBySequence.set(sequence, 'skipped');
      continue;
    }
    try {
      applyFoodProposal({
        proposal,
        currentResourceVersion: input.currentResourceVersion(proposal),
        providerAvailable: input.providerAvailable(proposal),
        ledger: input.ledger,
        apply: () => input.apply(proposal),
      });
      result.applied.push(proposal.id);
      stateBySequence.set(sequence, 'applied');
    } catch (error) {
      result.failed.push({ proposalId: proposal.id, message: error instanceof Error ? error.message : 'The operation failed.' });
      stateBySequence.set(sequence, 'failed');
    }
  }
  return result;
}
