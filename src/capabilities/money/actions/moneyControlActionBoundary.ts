import { createMoneyRepository, type MoneyRepository } from '../data/moneyRepository';
import {
  authenticateMoneyPrivacyLock,
  loadMoneyPrivacyLockSettings,
} from '../runtime/moneyPrivacyLock';
import type { MoneyControlActionBoundary } from './moneyControlActions';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import { getLivingPlanSettings } from '../data/livingPlanRepository';
import {
  commitLivingPlanCategoryChange,
  previewLivingPlanOverride,
} from '../runtime/livingPlanReconciliation';
import { applyGovernedMoneyBudgetUpdate } from './moneyBudgetControlBoundary';
import { assertMoneyProAccess } from '../runtime/moneyProAccess';

export function createMoneyControlActionBoundary(
  repository?: MoneyRepository,
): MoneyControlActionBoundary {
  const getRepository = () => repository ?? createMoneyRepository();
  return {
    loadSnapshot: () => getRepository().loadSnapshot(),
    requireProAccess: assertMoneyProAccess,
    async requireFreshAuthentication() {
      const privacy = await loadMoneyPrivacyLockSettings();
      if (!privacy.enabled) return true;
      const result = await authenticateMoneyPrivacyLock();
      return result.success;
    },
    updateCategoryPlan: (categoryId, input, version) => {
      const resolvedRepository = getRepository();
      const client = getSupabaseClient();
      return applyGovernedMoneyBudgetUpdate({
        categoryId,
        budgetCents: input.budgetCents,
        expectedUpdatedAt: version.expectedUpdatedAt,
        loadSnapshot: () => resolvedRepository.loadSnapshot(),
        directUpdate: (id, update, expected) => resolvedRepository.updateCategoryPlan(id, update, expected),
        loadSettings: () => getLivingPlanSettings(client),
        preview: (id, amountCents, funding) => previewLivingPlanOverride(client, id, amountCents, funding),
        commit: (commit) => commitLivingPlanCategoryChange(client, commit),
      });
    },
    reviewTransactionMeaning: (transactionId, input, version) => (
      getRepository().reviewTransactionMeaning(transactionId, input, version)
    ),
    setTransactionPlanRoleOverride: (transactionId, role, version) => (
      getRepository().setTransactionPlanRoleOverride(transactionId, role, version)
    ),
    reviewTransferPair: (input) => getRepository().reviewTransferPair(input),
    disconnectConnection: (connectionId, version) => getRepository().disconnectConnection(connectionId, version),
  };
}
