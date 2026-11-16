import type { MoneyCategory, MoneySnapshot } from '../data/moneySnapshot';
import type { CategorySettingsOutcome, CategorySettingsRequest } from '../domain/categorySettingsCommand';
import { UNKNOWN_CATEGORY_SAVE } from '../domain/categorySettingsCommand';
import { prepareCategorySettingsRequest } from '../runtime/categorySettingsPreparation';
import type { createMoneyCategorySettingsCommand } from '../runtime/moneyCategorySettingsCommand';
import type { LivingPlanOverridePreview } from '../runtime/livingPlanReconciliation';

export type MoneyBudgetUpdate = {
  requestId: string; month: string; categoryId: string; expectedUpdatedAt: string; plannedCents: number;
};
export type MoneyBudgetUpdateResult = { categoryId: string; name: string; plannedCents: number; updatedAt: string };
export class MoneyBudgetRejectedError extends Error {}
export class MoneyBudgetOutcomeUnknownError extends Error {
  constructor() { super(UNKNOWN_CATEGORY_SAVE); this.name = 'MoneyBudgetOutcomeUnknownError'; }
}

export function createMoneyBudgetActionCommand(deps: {
  getActor(): Promise<string>;
  requestIdFor(actor: string, input: MoneyBudgetUpdate): Promise<string>;
  findOperation(actor: string, requestId: string): Promise<{ request: CategorySettingsRequest; result: CategorySettingsOutcome } | null>;
  command: Pick<ReturnType<typeof createMoneyCategorySettingsCommand>, 'loadPending' | 'execute'>;
  loadSnapshot(): Promise<MoneySnapshot>;
  preview(actor: string, category: MoneyCategory, amount: number): Promise<LivingPlanOverridePreview | null>;
}) {
  const resultFor = (result: CategorySettingsOutcome): MoneyBudgetUpdateResult => {
    if (result.outcome === 'unknown') throw new MoneyBudgetOutcomeUnknownError();
    if (result.outcome === 'rejected') {
      if (!result.resolvesPending) throw new MoneyBudgetOutcomeUnknownError();
      throw new MoneyBudgetRejectedError(result.message);
    }
    return { categoryId: result.receipt.categoryId, name: result.receipt.changes.name,
      plannedCents: result.receipt.changes.budgetCents, updatedAt: result.receipt.planUpdatedAt };
  };
  return async (input: MoneyBudgetUpdate): Promise<MoneyBudgetUpdateResult> => {
    if (!input.requestId.trim() || !/^\d{4}-(0[1-9]|1[0-2])$/.test(input.month)
      || !Number.isSafeInteger(input.plannedCents) || input.plannedCents < 0) throw new Error('invalid_money_budget_diff');
    const actor = await deps.getActor();
    const requestId = await deps.requestIdFor(actor, input);
    const matches = (request: CategorySettingsRequest) => request.actorUserId === actor
      && request.requestId === requestId && request.categoryId === input.categoryId
      && request.settings.budgetCents === input.plannedCents
      && Date.parse(request.expectedPlanUpdatedAt) === Date.parse(input.expectedUpdatedAt);
    // Recovery precedes snapshot/version checks: a confirmed request may already be superseded.
    let recovered;
    try { recovered = await deps.findOperation(actor, requestId); }
    catch { throw new MoneyBudgetOutcomeUnknownError(); }
    if (recovered) {
      if (!matches(recovered.request)) throw new MoneyBudgetOutcomeUnknownError();
      // The server result is authoritative even if cleanup is unavailable. Use
      // the shared command lock to clear only this exact request, never a newer save.
      try {
        const pending = await deps.command.loadPending(actor, input.categoryId);
        if (pending?.requestId === requestId && matches(pending)) await deps.command.execute(pending);
      } catch { /* A later check can finish journal cleanup. */ }
      return resultFor(recovered.result);
    }
    const pending = await deps.command.loadPending(actor, input.categoryId);
    if (pending) {
      if (pending.requestId !== requestId) throw new Error('Resolve the previous save before changing these settings.');
      if (!matches(pending)) throw new MoneyBudgetOutcomeUnknownError();
      return resultFor(await deps.command.execute(pending));
    }
    const snapshot = await deps.loadSnapshot();
    if (snapshot.generatedAt.slice(0, 7) !== input.month) throw new Error('money_target_stale');
    const category = snapshot.categories.find((item) => item.sourceId === input.categoryId);
    if (!category) throw new Error('money_target_not_found');
    if (category.updatedAt !== input.expectedUpdatedAt) throw new Error('money_target_stale');
    const preview = category.plannedCents !== input.plannedCents ? await deps.preview(actor, category, input.plannedCents) : null;
    if (preview && preview.outcome !== 'ready') throw new Error('money_plan_preview_not_ready');
    const request = prepareCategorySettingsRequest({ actorUserId: actor, requestId, category,
      settings: { name: category.name, budgetCents: input.plannedCents, fundingRhythm: category.fundingRhythm,
        rolloverEnabled: category.fundingRhythm === 'monthly' && category.rolloverEnabled,
        rolloverPolicy: category.rolloverPolicy ?? null, planRole: category.planRole ?? 'flexible',
        expectedNeedCents: category.expectedNeed?.amountCents ?? null, expectedNeedDueMonth: category.expectedNeed?.dueMonth ?? null },
      preview: preview?.outcome === 'ready' ? preview : null });
    return resultFor(await deps.command.execute(request));
  };
}
