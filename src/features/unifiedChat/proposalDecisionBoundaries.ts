import { createRecipeRepository } from '../../capabilities/recipes/data/recipeRepository';
import { useRecipeStore } from '../../capabilities/recipes/runtime/useRecipeStore';
import { fetchMyChapterById, updateChapterUserNote } from '../../services/chapters';
import { useAppStore } from '../../store/useAppStore';
import { useEntitlementsStore } from '../../store/useEntitlementsStore';
import type { MoneyCategoryProposal } from './executeMoneyCategoryProposalDecision';
import type { MoneyControlProposal } from './executeMoneyControlProposalDecision';
import type { MealPreferenceProposal } from './executeMealPreferenceProposalDecision';
import type { MealPlanProposal } from './executeMealPlanProposalDecision';
import type { UnifiedChatProposal } from './types';

export function isMoneyCategoryProposal(proposal: UnifiedChatProposal): proposal is MoneyCategoryProposal {
  return proposal.capabilityId === 'money' && (
    proposal.operation.type === 'create_money_category'
    || proposal.operation.type === 'rename_money_category'
  );
}

export function isMoneyControlProposal(proposal: UnifiedChatProposal): proposal is MoneyControlProposal {
  return proposal.capabilityId === 'money'
    && proposal.operation.type !== 'create_money_category'
    && proposal.operation.type !== 'rename_money_category';
}

export function isMealPlanProposal(proposal: UnifiedChatProposal): proposal is MealPlanProposal {
  return proposal.capabilityId === 'meal_planning'
    && proposal.operation.type !== 'meal_planning.preferences.update';
}

export function isMealPreferenceProposal(proposal: UnifiedChatProposal): proposal is MealPreferenceProposal {
  return proposal.capabilityId === 'meal_planning'
    && proposal.operation.type === 'meal_planning.preferences.update';
}

export const activityStoreBoundary = {
  getActivities: () => useAppStore.getState().activities,
  getGoals: () => useAppStore.getState().goals,
  addActivity: (activity: Parameters<ReturnType<typeof useAppStore.getState>['addActivity']>[0]) =>
    useAppStore.getState().addActivity(activity),
  updateActivity: (id: string, updater: Parameters<ReturnType<typeof useAppStore.getState>['updateActivity']>[1]) =>
    useAppStore.getState().updateActivity(id, updater),
  removeActivity: (id: string) => useAppStore.getState().removeActivity(id),
};

export const recipeMutationBoundary = {
  save: (input: Parameters<ReturnType<typeof createRecipeRepository>['save']>[0]) =>
    createRecipeRepository().save(input),
  delete: (recipeId: string, expectedVersion: number) =>
    createRecipeRepository().delete(recipeId, expectedVersion),
  refresh: () => useRecipeStore.getState().refresh(),
};

export const resolveCookRecipe = (recipeVersionId: string) => {
  const projection = useRecipeStore.getState().recipes.find((candidate) => candidate.currentVersion.id === recipeVersionId);
  return projection ? {
    ownerPersonId: projection.recipe.ownerPersonId, recipeId: projection.recipe.id,
    recipeVersionId: projection.currentVersion.id, recipeVersion: projection.currentVersion.version,
    cueCount: Math.max(1, projection.currentVersion.instructions.length),
  } : null;
};

export const planStoreBoundary = {
  getActivities: () => useAppStore.getState().activities,
  updateActivity: (id: string, updater: Parameters<ReturnType<typeof useAppStore.getState>['updateActivity']>[1]) =>
    useAppStore.getState().updateActivity(id, updater),
  addDailyPlanCommitment: (dateKey: string, activityId: string) =>
    useAppStore.getState().addDailyPlanCommitment(dateKey, activityId),
  removeDailyPlanCommitment: (dateKey: string, activityId: string) =>
    useAppStore.getState().removeDailyPlanCommitment(dateKey, activityId),
};

export const goalStoreBoundary = {
  getGoals: () => useAppStore.getState().goals,
  getArcIds: () => useAppStore.getState().arcs.map((arc) => arc.id),
  getActivities: () => useAppStore.getState().activities,
  addGoal: (goal: Parameters<ReturnType<typeof useAppStore.getState>['addGoal']>[0]) =>
    useAppStore.getState().addGoal(goal),
  updateGoal: (id: string, updater: Parameters<ReturnType<typeof useAppStore.getState>['updateGoal']>[1]) =>
    useAppStore.getState().updateGoal(id, updater),
  removeGoal: (id: string) => useAppStore.getState().removeGoal(id),
  restoreRemovedGoal: (input: Parameters<ReturnType<typeof useAppStore.getState>['restoreRemovedGoal']>[0]) =>
    useAppStore.getState().restoreRemovedGoal(input),
};

export const arcStoreBoundary = {
  getArcs: () => useAppStore.getState().arcs,
  getGoals: () => useAppStore.getState().goals,
  getActivities: () => useAppStore.getState().activities,
  getGoalRecommendations: (arcId: string) => useAppStore.getState().goalRecommendations[arcId] ?? [],
  getIsPro: () => useEntitlementsStore.getState().isPro,
  addArc: (arc: Parameters<ReturnType<typeof useAppStore.getState>['addArc']>[0]) =>
    useAppStore.getState().addArc(arc),
  updateArc: (id: string, updater: Parameters<ReturnType<typeof useAppStore.getState>['updateArc']>[1]) =>
    useAppStore.getState().updateArc(id, updater),
  removeArc: (id: string) => useAppStore.getState().removeArc(id),
  restoreRemovedArc: (input: Parameters<ReturnType<typeof useAppStore.getState>['restoreRemovedArc']>[0]) =>
    useAppStore.getState().restoreRemovedArc(input),
};

export const profileStoreBoundary = {
  getProfile: () => useAppStore.getState().userProfile,
  updateProfileAt: (
    updater: Parameters<ReturnType<typeof useAppStore.getState>['updateUserProfileAt']>[0],
    updatedAt: string,
  ) => useAppStore.getState().updateUserProfileAt(updater, updatedAt),
};

export const chapterStoreBoundary = {
  getChapter: (id: string) => fetchMyChapterById(id),
  updateNote: (id: string, note: string | null) => updateChapterUserNote({ chapterId: id, note }),
};
