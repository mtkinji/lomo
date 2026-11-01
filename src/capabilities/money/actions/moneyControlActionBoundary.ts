import { createMoneyRepository, type MoneyRepository } from '../data/moneyRepository';
import {
  authenticateMoneyPrivacyLock,
  loadMoneyPrivacyLockSettings,
} from '../runtime/moneyPrivacyLock';
import type { MoneyControlActionBoundary } from './moneyControlActions';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import { getLivingPlanSettings } from '../data/livingPlanRepository';
import {
  previewLivingPlanOverride,
} from '../runtime/livingPlanReconciliation';
import * as Crypto from 'expo-crypto';
import { createMoneyBudgetActionCommand } from './moneyBudgetActionCommand';
import { createMoneyCategorySettingsCommand } from '../runtime/moneyCategorySettingsCommand';
import { categorySettingsJournal } from '../runtime/categorySettingsJournal';
import { createCategorySettingsRepository } from '../data/categorySettingsRepository';
import { resolveMoneyHouseholdScope } from '../data/moneyHouseholdScope';
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
    applyBudgetChange: (input) => {
      const client = getSupabaseClient();
      const remote = createCategorySettingsRepository(client);
      return createMoneyBudgetActionCommand({
        getActor: async () => {
          const { data, error } = await client.auth.getUser();
          if (error || !data.user || data.user.is_anonymous) throw new Error('money_native_authentication_required');
          return data.user.id;
        },
        requestIdFor: async (actor, intent) => {
          // Content-addressed identity survives relaunch and device changes. The
          // original expected version still guards competing, different intents.
          const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256,
            JSON.stringify(['money.budget.update:v1', actor, intent.requestId, intent.month,
              intent.categoryId, intent.expectedUpdatedAt, intent.plannedCents]));
          if (!/^[0-9a-f]{64}$/i.test(hash)) throw new Error('Could not identify this Budget request.');
          return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-8${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
        },
        findOperation: remote.findOperation,
        command: createMoneyCategorySettingsCommand(categorySettingsJournal, remote),
        loadSnapshot: () => getRepository().loadSnapshot(),
        preview: async (actor, category, amount) => {
          const { ownerUserId } = await resolveMoneyHouseholdScope(client, actor);
          const settings = await getLivingPlanSettings(client, ownerUserId);
          if (!settings.promotionEnabled || !settings.target) return null;
          return previewLivingPlanOverride(client, category.id, amount, {
            fundingRhythm: category.fundingRhythm,
            expectedNeedCents: category.expectedNeed?.amountCents ?? null,
            expectedNeedDueMonth: category.expectedNeed?.dueMonth ?? null,
          }, ownerUserId);
        },
      })(input);
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
