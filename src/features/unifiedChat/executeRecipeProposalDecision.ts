import type { RecipeMutationReceipt, SaveRecipeInput } from '../../capabilities/recipes/data/recipeRepository';
import type {
  DecideUnifiedChatProposalInput,
  FinalizeUnifiedChatMutationReceiptInput,
  PersistUnifiedChatMutationReceiptInput,
  TransitionUnifiedChatProposalInput,
  UnifiedChatMutationReceipt,
  UnifiedChatProposal,
  UnifiedChatProposalDecisionResult,
} from './types';
import { createRecipeControlActions, type RecipeControlActions } from '../../capabilities/recipes/actions/recipeControlActions';
import { createRecipeFavoriteRepository } from '../../capabilities/recipes/data/recipeFavoriteRepository';
import { createHiddenRecipeRepository } from '../../capabilities/recipes/data/hiddenRecipeRepository';
import { createRecipeImportProposalExecutor } from '../../capabilities/food-ai/recipeImportProposalExecutor';
import { createRecipeCookActionBoundary, createRecipeCookActions, type RecipeCookActions } from '../../capabilities/recipes/actions/recipeCookActions';
import { Platform } from 'react-native';
import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import { createRecipeCollaborationActionBoundary, createRecipeCollaborationActions, type RecipeCollaborationActions } from '../../capabilities/recipes/actions/recipeCollaborationActions';

type RecipeProposal = Extract<UnifiedChatProposal, { capabilityId: 'recipes' }>;

type Repository = {
  decideProposal: (input: DecideUnifiedChatProposalInput) => Promise<UnifiedChatProposalDecisionResult>;
  transitionProposalStatus: (input: TransitionUnifiedChatProposalInput) => Promise<{ status: UnifiedChatProposal['status']; version: number }>;
  persistMutationReceipt: (input: PersistUnifiedChatMutationReceiptInput) => Promise<UnifiedChatMutationReceipt>;
  finalizeMutationReceipt: (id: string, input: FinalizeUnifiedChatMutationReceiptInput) => Promise<UnifiedChatMutationReceipt>;
  failMutationReceipt: (id: string, errorCode: string, errorMessage: string) => Promise<UnifiedChatMutationReceipt>;
};

export type RecipeMutationBoundary = {
  save(input: SaveRecipeInput): Promise<RecipeMutationReceipt>;
  delete(recipeId: string, expectedVersion: number): Promise<RecipeMutationReceipt>;
  refresh(): Promise<void>;
};
export type RecipeImportMutationBoundary = {
  approve(input: { draftId: string; expectedDraftVersion: number; idempotencyKey: string; reviewedData: unknown }): Promise<RecipeMutationReceipt>;
};

function recipeReturnTarget(recipeId: string, title: string): Record<string, unknown> {
  return {
    capabilityId: 'recipes',
    object: { type: 'recipe', id: recipeId },
    label: title,
    route: { name: 'Food', params: { screen: 'RecipeHome', params: { recipeId } } },
  };
}

function cookReturnTarget(recipeId: string, multiplier: 1 | 2 | 3, sessionId: string): Record<string, unknown> {
  return {
    capabilityId: 'recipes', object: { type: 'cook_session', id: sessionId }, label: 'Cook Mode',
    route: { name: 'Food', params: { screen: 'RecipeCookMode', params: { recipeId, recipeScaleMultiplier: multiplier } } },
  };
}

function errorDetails(error: unknown): { code: string; message: string } {
  const code = typeof error === 'object' && error !== null && typeof (error as { code?: unknown }).code === 'string'
    ? (error as { code: string }).code
    : 'recipe_mutation_failed';
  return { code, message: error instanceof Error ? error.message : 'The Recipe change could not be applied.' };
}

export async function executeRecipeProposalDecision({
  proposal,
  action,
  repository,
  recipes,
  controls,
  imports,
  cook,
  collaboration,
  resolveCookRecipe,
  now = () => new Date().toISOString(),
}: {
  proposal: RecipeProposal;
  action: DecideUnifiedChatProposalInput['action'];
  repository: Repository;
  recipes: RecipeMutationBoundary;
  controls?: Pick<RecipeControlActions, 'setFavorite' | 'setVisibility'>;
  imports?: RecipeImportMutationBoundary;
  cook?: Pick<RecipeCookActions, 'start' | 'complete'>;
  collaboration?: Pick<RecipeCollaborationActions, 'invite'>;
  resolveCookRecipe?: (recipeVersionId: string) => {
    ownerPersonId: string; recipeId: string; recipeVersionId: string; recipeVersion: number; cueCount: number;
  } | null;
  now?: () => string;
}): Promise<void> {
  const decision = await repository.decideProposal({
    proposalId: proposal.id, action, expectedVersion: proposal.version,
  });
  if (action !== 'approve') return;

  const applying = await repository.transitionProposalStatus({
    proposalId: proposal.id, fromStatus: 'approved', toStatus: 'applying', expectedVersion: decision.version,
  });
  const operation = proposal.operation;
  if (operation.type === 'recipes.collaborator.invite') {
    const actions = collaboration ?? createRecipeCollaborationActions(createRecipeCollaborationActionBoundary());
    const appliedAt = now();
    let reservedReceipt: UnifiedChatMutationReceipt | null = null;
    try {
      reservedReceipt = await repository.persistMutationReceipt({
        capabilityId: 'recipes', threadId: proposal.threadId, proposalId: proposal.id,
        operationId: operation.id, idempotencyKey: operation.idempotencyKey, status: 'reserved',
        resultingObjectType: 'recipe_access_grant', resultingObjectId: null,
        resultState: { expectedVersion: operation.expectedVersion, ...operation.payload },
        returnTarget: recipeReturnTarget(operation.targetId, proposal.title), undoOperation: null, appliedAt: null,
      });
      const result = await actions.invite({ requestId: operation.idempotencyKey, confirmed: true,
        recipeId: operation.targetId, expectedVersion: operation.expectedVersion, ...operation.payload });
      await repository.finalizeMutationReceipt(reservedReceipt.id, {
        capabilityId: 'recipes', resultingObjectType: 'recipe_access_grant', resultingObjectId: result.grantId,
        resultState: result, returnTarget: recipeReturnTarget(operation.targetId, proposal.title),
        undoOperation: null, appliedAt,
      });
      await repository.transitionProposalStatus({ proposalId: proposal.id, fromStatus: 'applying',
        toStatus: 'applied', expectedVersion: applying.version });
      return;
    } catch (error) {
      const details = errorDetails(error);
      if (reservedReceipt) await repository.failMutationReceipt(reservedReceipt.id, details.code, details.message).catch(() => undefined);
      await repository.transitionProposalStatus({ proposalId: proposal.id, fromStatus: 'applying',
        toStatus: 'failed', expectedVersion: applying.version }).catch(() => undefined);
      throw error;
    }
  }
  if (operation.type === 'recipes.favorite.update' || operation.type === 'recipes.visibility.update') {
    const controlBoundary = controls ?? createRecipeControlActions({
      favorite: createRecipeFavoriteRepository(),
      hidden: createHiddenRecipeRepository(),
    });
    const appliedAt = now();
    let reservedReceipt: UnifiedChatMutationReceipt | null = null;
    try {
      reservedReceipt = await repository.persistMutationReceipt({
        capabilityId: 'recipes', threadId: proposal.threadId, proposalId: proposal.id,
        operationId: operation.id, idempotencyKey: operation.idempotencyKey, status: 'reserved',
        resultingObjectType: 'recipe_preference', resultingObjectId: operation.targetId,
        resultState: { expectedVersion: operation.expectedVersion, ...operation.payload },
        returnTarget: recipeReturnTarget(operation.targetId, proposal.title), undoOperation: null, appliedAt: null,
      });
      const result = operation.type === 'recipes.favorite.update'
        ? await controlBoundary.setFavorite({ requestId: operation.idempotencyKey, confirmed: true,
            recipeId: operation.targetId, expectedVersion: operation.expectedVersion,
            favorite: operation.payload.favorite === true })
        : await controlBoundary.setVisibility({ requestId: operation.idempotencyKey, confirmed: true,
            recipeId: operation.targetId, expectedVersion: operation.expectedVersion,
            visibility: operation.payload.visibility === 'hidden' ? 'hidden' : 'visible' });
      await repository.finalizeMutationReceipt(reservedReceipt.id, {
        capabilityId: 'recipes', resultingObjectType: 'recipe_preference', resultingObjectId: operation.targetId,
        resultState: result, returnTarget: recipeReturnTarget(operation.targetId, proposal.title),
        undoOperation: null, appliedAt,
      });
      await repository.transitionProposalStatus({
        proposalId: proposal.id, fromStatus: 'applying', toStatus: 'applied', expectedVersion: applying.version,
      });
      return;
    } catch (error) {
      const details = errorDetails(error);
      if (reservedReceipt) await repository.failMutationReceipt(reservedReceipt.id, details.code, details.message).catch(() => undefined);
      await repository.transitionProposalStatus({
        proposalId: proposal.id, fromStatus: 'applying', toStatus: 'failed', expectedVersion: applying.version,
      }).catch(() => undefined);
      throw error;
    }
  }
  if (operation.type === 'cook_session.start' || operation.type === 'cook_session.complete') {
    const cookBoundary = cook ?? createRecipeCookActions(createRecipeCookActionBoundary(), {
      now, createId: () => Crypto.randomUUID(),
      device: { deviceId: 'unified-chat-device', platform: Platform.OS === 'android' ? 'android' : 'ios',
        appVersion: Application.nativeApplicationVersion ?? 'development' },
    });
    const appliedAt = now();
    let reservedReceipt: UnifiedChatMutationReceipt | null = null;
    try {
      reservedReceipt = await repository.persistMutationReceipt({
        capabilityId: 'recipes', threadId: proposal.threadId, proposalId: proposal.id,
        operationId: operation.id, idempotencyKey: operation.idempotencyKey, status: 'reserved',
        resultingObjectType: 'cook_session', resultingObjectId: operation.type === 'cook_session.complete' ? operation.targetId : null,
        resultState: { expectedRevision: operation.expectedVersion, ...operation.payload },
        returnTarget: null, undoOperation: null, appliedAt: null,
      });
      const result = operation.type === 'cook_session.start'
        ? await (async () => {
            const source = resolveCookRecipe?.(operation.targetId);
            if (!source || source.recipeVersionId !== operation.targetId || source.recipeVersion !== operation.expectedVersion) {
              throw new Error('recipe_cook.version_conflict');
            }
            return cookBoundary.start({ requestId: operation.idempotencyKey, confirmed: true,
              ...source, recipeScaleMultiplier: operation.payload.recipeScaleMultiplier });
          })()
        : await cookBoundary.complete({ requestId: operation.idempotencyKey, confirmed: true,
            sessionId: operation.targetId, expectedRevision: operation.expectedVersion, outcome: operation.payload.outcome });
      const session = result.session;
      await repository.finalizeMutationReceipt(reservedReceipt.id, {
        capabilityId: 'recipes', resultingObjectType: 'cook_session', resultingObjectId: session.id,
        resultState: { status: session.status, revision: session.revision, recipeId: session.recipeId,
          recipeVersionId: session.recipeVersionId, replayed: result.replayed },
        returnTarget: session.status === 'active' || session.status === 'paused'
          ? cookReturnTarget(session.recipeId, session.recipeScaleMultiplier, session.id)
          : null,
        undoOperation: null, appliedAt,
      });
      await repository.transitionProposalStatus({
        proposalId: proposal.id, fromStatus: 'applying', toStatus: 'applied', expectedVersion: applying.version,
      });
      return;
    } catch (error) {
      const details = errorDetails(error);
      if (reservedReceipt) await repository.failMutationReceipt(reservedReceipt.id, details.code, details.message).catch(() => undefined);
      await repository.transitionProposalStatus({
        proposalId: proposal.id, fromStatus: 'applying', toStatus: 'failed', expectedVersion: applying.version,
      }).catch(() => undefined);
      throw error;
    }
  }
  const reviewedData = operation.type === 'delete_recipe' ? null : operation.payload.reviewedData;
  const title = reviewedData?.title ?? proposal.title.replace(/^Delete\s+/i, '');
  const appliedAt = now();
  let reservedReceipt: UnifiedChatMutationReceipt | null = null;

  try {
    reservedReceipt = await repository.persistMutationReceipt({
      capabilityId: 'recipes', threadId: proposal.threadId, proposalId: proposal.id,
      operationId: operation.id, idempotencyKey: operation.idempotencyKey, status: 'reserved',
      resultingObjectType: 'recipe', resultingObjectId: operation.type === 'recipes.import.approve' || operation.type === 'recipes.fork' ? null : operation.targetId,
      resultState: { title, expectedVersion: operation.expectedVersion, deleted: operation.type === 'delete_recipe' },
      returnTarget: operation.targetId && operation.type !== 'delete_recipe' && operation.type !== 'recipes.import.approve' && operation.type !== 'recipes.fork'
        ? recipeReturnTarget(operation.targetId, title)
        : null,
      undoOperation: null,
      appliedAt: null,
    });

    const result = operation.type === 'delete_recipe'
      ? await recipes.delete(operation.targetId, operation.expectedVersion)
      : operation.type === 'recipes.import.approve'
        ? await (imports ?? createRecipeImportProposalExecutor()).approve({
            draftId: operation.targetId, expectedDraftVersion: operation.expectedVersion,
            idempotencyKey: operation.payload.approvalIdempotencyKey, reviewedData: operation.payload.reviewedData,
          })
      : await recipes.save({
          recipeId: operation.type === 'recipes.fork' ? null : operation.targetId,
          expectedVersion: operation.type === 'recipes.fork' ? 0 : operation.expectedVersion,
          idempotencyKey: operation.idempotencyKey,
          reviewedData: operation.payload.reviewedData,
        });
    await recipes.refresh();

    const deleted = operation.type === 'delete_recipe' || result.deleted === true;
    await repository.finalizeMutationReceipt(reservedReceipt.id, {
      capabilityId: 'recipes', resultingObjectType: 'recipe', resultingObjectId: result.recipeId,
      resultState: {
        title, version: result.version, recipeVersionId: result.recipeVersionId ?? null,
        deleted,
      },
      returnTarget: deleted ? null : recipeReturnTarget(result.recipeId, title),
      undoOperation: null,
      appliedAt,
    });
    await repository.transitionProposalStatus({
      proposalId: proposal.id, fromStatus: 'applying', toStatus: 'applied', expectedVersion: applying.version,
    });
  } catch (error) {
    const details = errorDetails(error);
    if (reservedReceipt) {
      await repository.failMutationReceipt(reservedReceipt.id, details.code, details.message).catch(() => undefined);
    }
    await repository.transitionProposalStatus({
      proposalId: proposal.id, fromStatus: 'applying', toStatus: 'failed', expectedVersion: applying.version,
    }).catch(() => undefined);
    throw error;
  }
}
