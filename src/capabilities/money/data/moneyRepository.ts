import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import type { CategoryPlanInput } from '../domain/categoryPlanDraft';
import { validateMoneyCategoryCover, type MoneyCategoryCover } from '../domain/moneyCategoryCover';
import type { MoneyForecastMode } from '../domain/moneyForecast';
import type { MoneyCategoryPlanRole } from '../domain/moneyCategoryPlanRole';
import { CATEGORY_FUNDING_POLICY_VERSION, type CategoryFundingRhythm } from '../domain/categoryFunding';
import { collectAllPages } from '../domain/living-plan-pagination';
import {
  buildTransactionAllocationPlan,
  type TransactionAllocationInput,
} from '../domain/transactionAllocation';
import {
  projectMoneySnapshot,
  type MoneyAccountRow,
  type MoneyCategoryRow,
  type MoneyConnectionRow,
  type MoneyPlanRow,
  type MoneyRuleRow,
  type MoneySnapshot,
  type MoneyTransactionRow,
  type MoneyTransactionAllocationRow,
} from './moneySnapshot';
import {
  buildTransactionMeaningReviewUpdate,
  buildTransactionPlanRoleOverrideUpdate,
  buildMerchantRuleUpsert,
  buildTransactionReviewUpdate,
  type TransactionMeaningReviewInput,
  type TransactionReviewUpdate,
} from './moneyMutations';
import { loadMoneyPlanProjection } from './moneyPlanProjection';
import { canReadSandboxMoneyData } from '../domain/demoMoneyEnvironment';

type ReadResult = { data: unknown; error: { code?: string; message?: string } | null };

type MoneyReadQuery = PromiseLike<ReadResult> & {
  eq(column: string, value: unknown): MoneyReadQuery;
  in(column: string, values: unknown[]): MoneyReadQuery;
  limit(count: number): MoneyReadQuery;
  neq(column: string, value: unknown): MoneyReadQuery;
  order(column: string, options?: { ascending?: boolean }): MoneyReadQuery;
  range(from: number, to: number): MoneyReadQuery;
  select(columns: string): MoneyReadQuery;
  update(values: Record<string, unknown>): MoneyReadQuery;
  upsert(values: Record<string, unknown>, options?: { onConflict?: string }): MoneyReadQuery;
};

type MoneyReadClient = {
  from(table: string): MoneyReadQuery;
  rpc(name: string, args: Record<string, unknown>): PromiseLike<ReadResult>;
};

export type ConfirmedTransactionWrite = {
  confirmedAt: string;
  transactionId: string;
  categorySourceId: string | null;
  meaning: TransactionMeaningReviewInput['meaning'] | null;
  reviewState: 'assigned' | 'not_counted';
};

export type ConfirmedTransactionPlanRoleWrite = {
  confirmedAt: string;
  transactionId: string;
  planRoleOverride: MoneyCategoryPlanRole | null;
};

export type ConfirmedCategoryWrite = {
  confirmedAt: string;
  categoryId: string;
  changes: {
    name?: string;
    rolloverEnabled?: boolean;
    forecastMode?: MoneyForecastMode;
    manualProjectedSpendCents?: number | null;
    scheduledAmountCents?: number | null;
    scheduledDueDay?: number | null;
    coverImage?: MoneyCategoryCover | null;
    planRole?: MoneyCategoryPlanRole;
  };
};

export type ConfirmedMerchantRuleWrite = {
  confirmedAt: string;
  ruleId: string;
  transactionId: string;
  appliedTransactionCount: number;
  merchantKey: string;
  matchMode: 'exact' | 'partial';
  categorySourceId: string;
};

export type ConfirmedCategoryOrderWrite = {
  confirmedAt: string;
  categoryIds: string[];
};

export type ConfirmedTransferReviewWrite = {
  confirmedAt: string;
  transactionIds: [string, string];
  decision: 'confirm_pair' | 'unpair';
};

export type ConfirmedConnectionDisconnectWrite = {
  confirmedAt: string;
  connectionId: string;
  disconnectedAccountCount: number;
};

export type MoneyClassificationReceipt = {
  policyVersion: string;
  consideredCount: number;
  assignedCount: number;
  deterministicAssignedCount: number;
  aiAssignedCount: number;
  unresolvedCount: number;
  retryableCount: number;
};

export interface MoneyRepository {
  loadSnapshot(): Promise<MoneySnapshot>;
  classifyUnresolvedTransactions(): Promise<MoneyClassificationReceipt>;
  ensureGovernedPlanFoundation(): Promise<void>;
  assignTransactionCategory(transactionId: string, categoryId: string): Promise<ConfirmedTransactionWrite>;
  markTransactionNotCounted(transactionId: string): Promise<ConfirmedTransactionWrite>;
  splitTransaction(input: {
    transactionId: string;
    transactionAmountCents: number;
    direction: 'inflow' | 'outflow';
    pending: boolean;
    allocations: TransactionAllocationInput[];
  }): Promise<MoneySnapshot>;
  reviewTransactionMeaning(transactionId: string, input: TransactionMeaningReviewInput, version?: { expectedUpdatedAt: string }): Promise<ConfirmedTransactionWrite>;
  setTransactionPlanRoleOverride(transactionId: string, planRoleOverride: MoneyCategoryPlanRole | null, version?: { expectedUpdatedAt: string }): Promise<ConfirmedTransactionPlanRoleWrite>;
  reviewTransferPair(input: {
    transactionIds: [string, string];
    expectedUpdatedAt: string;
    decision: 'confirm_pair' | 'unpair';
  }): Promise<ConfirmedTransferReviewWrite>;
  disconnectConnection(connectionId: string, version: { expectedUpdatedAt: string }): Promise<ConfirmedConnectionDisconnectWrite>;
  setTransactionPlanCoverage(transactionId: string, savedResourceCents: number): Promise<MoneySnapshot>;
  saveMerchantRule(input: {
    transactionId: string;
    merchantName: string;
    categoryId: string;
    categoryName: string;
    matchMode?: 'exact' | 'partial';
    merchantPattern?: string;
  }): Promise<ConfirmedMerchantRuleWrite>;
  createCategory(input: CategoryPlanInput): Promise<{ categoryId: string; snapshot: MoneySnapshot }>;
  reorderCategories(categoryIds: string[]): Promise<ConfirmedCategoryOrderWrite>;
  renameCategory(categoryId: string, name: string): Promise<ConfirmedCategoryWrite>;
  updateCategoryCover(categoryId: string, cover: MoneyCategoryCover | null): Promise<ConfirmedCategoryWrite>;
  updateCategoryPlan(categoryId: string, input: {
    budgetCents?: number;
    rolloverEnabled?: boolean;
    forecastMode?: MoneyForecastMode;
    manualProjectedSpendCents?: number | null;
    scheduledAmountCents?: number | null;
    scheduledDueDay?: number | null;
    fundingRhythm?: CategoryFundingRhythm;
    expectedNeedCents?: number | null;
    expectedNeedDueMonth?: string | null;
    planRole?: MoneyCategoryPlanRole;
  }, version?: { expectedUpdatedAt: string }): Promise<ConfirmedCategoryWrite>;
}

export function createMoneyRepository(client: SupabaseClient = getSupabaseClient()): MoneyRepository {
  const loadSnapshot = async (): Promise<MoneySnapshot> => {
    const signedInUser = await requireSignedInUser(client);
    const includeSandbox = canReadSandboxMoneyData(
      signedInUser,
      typeof __DEV__ !== 'undefined' && __DEV__,
    );

    const db = client as unknown as MoneyReadClient;
    const [categories, plans, connections, accounts, rules, allocations, transactions] = await Promise.all([
      readCategoryRows(db),
      readPlanRows(db),
      readPart<MoneyConnectionRow[]>('connections',
        environmentQuery(db
          .from('budget_financial_connections')
          .select('id,environment,institution_name,status,last_synced_at,updated_at'), 'environment', includeSandbox)
          .order('created_at', { ascending: false })),
      readPart<MoneyAccountRow[]>('accounts',
        environmentQuery(db
          .from('budget_financial_accounts')
          .select(`
              id,
              connection_id,
              name,
              official_name,
              mask,
              type,
              subtype,
              budget_financial_connections!inner(environment,institution_name,status,last_synced_at)
          `), 'budget_financial_connections.environment', includeSandbox)
          .order('created_at', { ascending: false })),
      readPart<MoneyRuleRow[]>('merchant rules',
        db
          .from('budget_transaction_match_rules')
          .select('id,budget_id,merchant_contains,merchant_match_mode,label,created_from_transaction_id')
          .order('created_at', { ascending: false })),
      collectAllPages<MoneyTransactionAllocationRow>((from, to) =>
        readOptionalAllocations(db
          .from('budget_transaction_allocations')
          .select('transaction_id,budget_id,amount_cents')
          .order('transaction_id', { ascending: true })
          .order('budget_id', { ascending: true })
          .range(from, to)),
      ),
      collectAllPages<MoneyTransactionRow>((from, to) =>
        readPart<MoneyTransactionRow[]>('transactions',
          environmentQuery(db
            .from('budget_transactions')
            .select(`
                id,
                financial_account_id,
                name,
                merchant_name,
                original_description,
                authorized_date,
                amount_cents,
                direction,
                date,
                pending,
                iso_currency_code,
                budget_id,
                budget_match_source,
                budget_assignment_source,
                budget_assignment_policy_version,
                budget_assignment_governed,
                money_meaning,
                plan_role_override,
                plan_role_override_reviewed_at,
                saved_resource_cents,
                plan_coverage_reviewed_at,
                personal_finance_category_primary,
                personal_finance_category_detailed,
                personal_finance_category_confidence,
                updated_at,
                budget_financial_connections!inner(environment)
            `), 'budget_financial_connections.environment', includeSandbox)
            .order('date', { ascending: false })
            .order('id', { ascending: false })
            .range(from, to)),
      ),
    ]);

    const snapshot = projectMoneySnapshot({
      categories,
      plans,
      connections,
      accounts: normalizeAccountRelations(accounts),
      rules,
      allocations,
      transactions,
    });
    const projection = await loadMoneyPlanProjection(client, snapshot);
    return projection?.snapshot ?? snapshot;
  };

  const reviewTransaction = async (
    transactionId: string,
    update: TransactionReviewUpdate,
    version?: { expectedUpdatedAt: string },
  ): Promise<ConfirmedTransactionWrite> => {
    const normalizedTransactionId = transactionId.trim();
    if (!normalizedTransactionId) throw new Error('Choose a transaction to review.');
    await requireSignedIn(client);

    const db = client as unknown as MoneyReadClient;
    let updateQuery = db
      .from('budget_transactions')
      .update(update)
      .eq('id', normalizedTransactionId);
    if (version) updateQuery = updateQuery.eq('updated_at', version.expectedUpdatedAt);
    const updatedRows = await readPart<Array<{ id: string; updated_at?: string }>>(
      'transaction review',
      updateQuery.select('id,updated_at'),
    );
    requireConfirmedRows('transaction review', updatedRows, 1);
    return {
      confirmedAt: updatedRows[0]?.updated_at ?? new Date().toISOString(),
      transactionId: normalizedTransactionId,
      categorySourceId: update.budget_id,
      meaning: update.money_meaning ?? null,
      reviewState: update.budget_match_source === 'excluded' ? 'not_counted' : 'assigned',
    };
  };

  const replaceTransactionReview = async (
    transactionIds: string[],
    input: Parameters<typeof buildTransactionReviewUpdate>[0],
  ): Promise<void> => {
    const normalizedIds = [...new Set(transactionIds.map((id) => id.trim()).filter(Boolean))];
    if (normalizedIds.length === 0) throw new Error('Choose a transaction to review.');
    const update = buildTransactionReviewUpdate(input);
    await requireSignedIn(client);
    const db = client as unknown as MoneyReadClient;
    const { error } = await db.rpc('replace_budget_transaction_review', {
      p_transaction_ids: normalizedIds,
      p_budget_id: update.budget_id,
      p_excluded: update.budget_match_source === 'excluded',
    });
    if (!error) return;
    if (!isMissingRpcError(error, 'replace_budget_transaction_review')) {
      throw new Error(`Money could not save the transaction review: ${error.message || 'Unknown database error'}`);
    }
    const updatedRows = await readPart<Array<{ id: string }>>('transaction review', db
      .from('budget_transactions')
      .update(update)
      .in('id', normalizedIds)
      .select('id'));
    requireConfirmedRows('transaction review', updatedRows, normalizedIds.length);
  };

  return {
    loadSnapshot,
    async classifyUnresolvedTransactions() {
      await requireSignedIn(client);
      const { data, error } = await client.functions.invoke('classify-money-transactions', { body: {} });
      if (error) throw new Error(`Money could not classify transactions: ${error.message || 'Unknown server error'}`);
      const result = data as Record<string, unknown> | null;
      const policyVersion = typeof result?.policyVersion === 'string' ? result.policyVersion.trim() : '';
      const consideredCount = Number(result?.consideredCount);
      const assignedCount = Number(result?.assignedCount);
      const deterministicAssignedCount = Number(result?.deterministicAssignedCount);
      const aiAssignedCount = Number(result?.aiAssignedCount);
      const unresolvedCount = Number(result?.unresolvedCount);
      const retryableCount = Number(result?.retryableCount);
      const counts = [consideredCount, assignedCount, deterministicAssignedCount, aiAssignedCount, unresolvedCount, retryableCount];
      if (!policyVersion
        || !counts.every((value) => Number.isSafeInteger(value) && value >= 0)
        || assignedCount !== deterministicAssignedCount + aiAssignedCount
        || consideredCount !== assignedCount + unresolvedCount + retryableCount) {
        throw new Error('Money received an invalid classification receipt.');
      }
      return {
        policyVersion,
        consideredCount,
        assignedCount,
        deterministicAssignedCount,
        aiAssignedCount,
        unresolvedCount,
        retryableCount,
      };
    },
    async ensureGovernedPlanFoundation() {
      await requireSignedIn(client);
      const { error } = await client.functions.invoke('reconcile-governed-money', { body: {} });
      if (error) {
        throw new Error(
          `Money could not build the governed plan foundation: ${error.message || 'Unknown server error'}`,
        );
      }
    },
    async assignTransactionCategory(transactionId, categoryId) {
      await replaceTransactionReview([transactionId], { type: 'category', categoryId });
      return {
        confirmedAt: new Date().toISOString(),
        transactionId: transactionId.trim(),
        categorySourceId: categoryId.trim(),
        meaning: null,
        reviewState: 'assigned',
      };
    },
    async markTransactionNotCounted(transactionId) {
      await replaceTransactionReview([transactionId], { type: 'not_counted' });
      return {
        confirmedAt: new Date().toISOString(),
        transactionId: transactionId.trim(),
        categorySourceId: null,
        meaning: 'not_counted',
        reviewState: 'not_counted',
      };
    },
    async splitTransaction(input) {
      const transactionId = input.transactionId.trim();
      if (!transactionId) throw new Error('Choose a transaction to split.');
      const plan = buildTransactionAllocationPlan(input);
      if (!plan.valid) throw new Error(plan.error ?? 'Choose a valid transaction split.');
      await requireSignedIn(client);
      const db = client as unknown as MoneyReadClient;
      const { error } = await db.rpc('replace_budget_transaction_allocations', {
        p_transaction_id: transactionId,
        p_allocations: plan.allocations.map((allocation) => ({
          budget_id: allocation.categoryId,
          amount_cents: allocation.amountCents,
        })),
      });
      if (error) throw new Error(`Money could not save the transaction split: ${error.message || 'Unknown database error'}`);
      return loadSnapshot();
    },
    reviewTransactionMeaning: (transactionId, input, version) =>
      reviewTransaction(transactionId, buildTransactionMeaningReviewUpdate(input), version),
    async setTransactionPlanRoleOverride(transactionId, planRoleOverride, version) {
      const normalizedTransactionId = transactionId.trim();
      if (!normalizedTransactionId) throw new Error('Choose a transaction to update.');
      await requireSignedIn(client);
      const db = client as unknown as MoneyReadClient;
      let updateQuery = db
        .from('budget_transactions')
        .update(buildTransactionPlanRoleOverrideUpdate(planRoleOverride))
        .eq('id', normalizedTransactionId);
      if (version) updateQuery = updateQuery.eq('updated_at', version.expectedUpdatedAt);
      const updatedRows = await readPart<Array<{ id: string; updated_at?: string }>>(
        'transaction plan treatment',
        updateQuery.select('id,updated_at'),
      );
      requireConfirmedRows('transaction plan treatment', updatedRows, 1);
      return {
        confirmedAt: updatedRows[0]?.updated_at ?? new Date().toISOString(),
        transactionId: normalizedTransactionId,
        planRoleOverride,
      };
    },
    async reviewTransferPair(input) {
      const ids = [...new Set(input.transactionIds.map((id) => id.trim()).filter(Boolean))];
      if (ids.length !== 2 || !input.expectedUpdatedAt.trim()
        || (input.decision !== 'confirm_pair' && input.decision !== 'unpair')) {
        throw new Error('Choose one current transfer pair to review.');
      }
      await requireSignedIn(client);
      const db = client as unknown as MoneyReadClient;
      const { data, error } = await db.rpc('review_budget_transfer_pair', {
        p_transaction_ids: ids,
        p_expected_updated_at: input.expectedUpdatedAt,
        p_decision: input.decision,
      });
      if (error) throw new Error(`Money could not save the transfer review: ${error.message || 'Unknown database error'}`);
      return parseTransferReviewReceipt(data, ids as [string, string], input.decision);
    },
    async disconnectConnection(connectionId, version) {
      const normalizedConnectionId = connectionId.trim();
      if (!normalizedConnectionId || !version.expectedUpdatedAt.trim()) {
        throw new Error('Choose one current financial connection to disconnect.');
      }
      await requireSignedIn(client);
      const { data, error } = await client.functions.invoke('disconnect-money-connection', {
        body: { connectionId: normalizedConnectionId, expectedUpdatedAt: version.expectedUpdatedAt },
      });
      if (error) throw new Error(`Money could not disconnect the connection: ${error.message || 'Unknown provider error'}`);
      return parseConnectionDisconnectReceipt(data, normalizedConnectionId);
    },
    async setTransactionPlanCoverage(transactionId, savedResourceCents) {
      const normalizedTransactionId = transactionId.trim();
      if (!normalizedTransactionId) throw new Error('Choose a transaction before changing plan coverage.');
      const normalizedSavedResourceCents = Number.isFinite(savedResourceCents)
        ? Math.max(0, Math.round(savedResourceCents))
        : 0;
      await requireSignedIn(client);
      const db = client as unknown as MoneyReadClient;
      const updatedRows = await readPart<Array<{ id: string }>>(
        'transaction plan coverage',
        db
          .from('budget_transactions')
          .update({
            saved_resource_cents: normalizedSavedResourceCents,
            plan_coverage_reviewed_at: new Date().toISOString(),
            plan_coverage_provenance: 'user_declared',
          })
          .eq('id', normalizedTransactionId)
          .select('id'),
      );
      requireConfirmedRows('transaction plan coverage', updatedRows, 1);
      return loadSnapshot();
    },
    async saveMerchantRule(input) {
      const userId = await requireSignedIn(client);
      const db = client as unknown as MoneyReadClient;
      const rule = buildMerchantRuleUpsert({ userId, ...input });
      const { data, error } = await db.rpc('upsert_budget_transaction_match_rule', {
        p_transaction_id: rule.created_from_transaction_id,
        p_budget_id: rule.budget_id,
        p_merchant_contains: rule.merchant_contains,
        p_match_mode: rule.merchant_match_mode,
        p_label: rule.label,
      });
      if (error) throw new Error(`Money could not save the merchant rule: ${error.message || 'Unknown database error'}`);
      return parseMerchantRuleReceipt(data, rule.created_from_transaction_id);
    },
    async createCategory(input) {
      await requireSignedIn(client);
      const db = client as unknown as MoneyReadClient;
      const { data, error } = await db.rpc('create_budget_category_with_plan', {
        p_name: input.name,
        p_budget_cents: input.budgetCents,
        p_icon_key: 'custom',
        p_description: null,
        p_accent_color: '#315545',
      });
      if (error) throw new Error(`Money could not create the category: ${error.message || 'Unknown database error'}`);
      if (typeof data !== 'string' || !data.trim()) throw new Error('Money created the category without a return id.');
      return { categoryId: data.trim(), snapshot: await loadSnapshot() };
    },
    async reorderCategories(categoryIds) {
      const normalizedCategoryIds = categoryIds.map((categoryId) => categoryId.trim());
      if (normalizedCategoryIds.length === 0) throw new Error('Choose a category order to save.');
      if (normalizedCategoryIds.some((categoryId) => !categoryId)
        || new Set(normalizedCategoryIds).size !== normalizedCategoryIds.length) {
        throw new Error('Each active category must appear exactly once.');
      }
      await requireSignedIn(client);
      const db = client as unknown as MoneyReadClient;
      const { data, error } = await db.rpc('reorder_budget_categories', {
        p_category_ids: normalizedCategoryIds,
      });
      if (error) throw new Error(`Money could not save the category order: ${error.message || 'Unknown database error'}`);
      return requireCategoryOrderReceipt(data, normalizedCategoryIds);
    },
    async renameCategory(categoryId, name) {
      const normalizedCategoryId = categoryId.trim();
      if (!normalizedCategoryId) throw new Error('Choose a category to rename.');
      const normalizedName = name.trim();
      if (!normalizedName) throw new Error('Enter a category name.');
      await requireSignedIn(client);
      const db = client as unknown as MoneyReadClient;
      const updatedRows = await readPart<Array<{ id: string }>>('category name', db
        .from('budget_categories')
        .update({ name: normalizedName })
        .eq('id', normalizedCategoryId)
        .select('id'));
      requireConfirmedRows('category name', updatedRows, 1);
      return {
        confirmedAt: new Date().toISOString(),
        categoryId: normalizedCategoryId,
        changes: { name: normalizedName },
      };
    },
    async updateCategoryCover(categoryId, cover) {
      const normalizedCategoryId = categoryId.trim();
      if (!normalizedCategoryId) throw new Error('Choose a category cover to update.');
      const normalizedCover = validateMoneyCategoryCover(cover);
      await requireSignedIn(client);
      const db = client as unknown as MoneyReadClient;
      const { data, error } = await db.rpc('set_budget_category_cover', {
        p_category_id: normalizedCategoryId,
        p_cover: normalizedCover,
      });
      if (error) throw new Error(`Money could not save the category cover: ${error.message || 'Unknown database error'}`);
      const receipt = requireCategoryCoverReceipt(data, normalizedCategoryId, normalizedCover);
      return {
        confirmedAt: receipt.confirmedAt,
        categoryId: normalizedCategoryId,
        changes: { coverImage: normalizedCover },
      };
    },
    async updateCategoryPlan(categoryId, input, version) {
      const normalizedCategoryId = categoryId.trim();
      if (!normalizedCategoryId) throw new Error('Choose a category plan to update.');
      const update: Record<string, unknown> = {};
      if (input.budgetCents != null) {
        if (!Number.isSafeInteger(input.budgetCents) || input.budgetCents < 0) {
          throw new Error('Enter a valid monthly amount.');
        }
        update.base_budget_cents = input.budgetCents;
      }
      if (input.rolloverEnabled != null) update.rollover_enabled = input.rolloverEnabled;
      if (input.planRole != null) update.plan_role = input.planRole;
      if (input.forecastMode != null) update.forecast_mode = input.forecastMode;
      if ('manualProjectedSpendCents' in input) {
        validateNullableCents(input.manualProjectedSpendCents, 'manual forecast');
        update.manual_projected_spend_cents = input.manualProjectedSpendCents ?? null;
      }
      if ('scheduledAmountCents' in input) {
        validateNullableCents(input.scheduledAmountCents, 'scheduled amount');
        update.scheduled_amount_cents = input.scheduledAmountCents ?? null;
      }
      if ('scheduledDueDay' in input) {
        const day = input.scheduledDueDay;
        if (day != null && (!Number.isInteger(day) || day < 1 || day > 31)) {
          throw new Error('Enter a due day from 1 through 31.');
        }
        update.scheduled_due_day = day ?? null;
      }
      if (input.fundingRhythm != null) {
        update.funding_rhythm = input.fundingRhythm;
        update.funding_policy_version = CATEGORY_FUNDING_POLICY_VERSION;
        if (input.fundingRhythm === 'reserve') update.rollover_enabled = false;
        if (input.fundingRhythm === 'monthly') {
          update.expected_need_cents = null;
          update.expected_need_due_month = null;
        }
      }
      if ('expectedNeedCents' in input || 'expectedNeedDueMonth' in input) {
        const amount = input.expectedNeedCents;
        const dueMonth = input.expectedNeedDueMonth?.trim() || null;
        if ((amount == null) !== (dueMonth == null)) {
          throw new Error('Enter both an expected amount and due month.');
        }
        if (amount != null && (!Number.isSafeInteger(amount) || amount <= 0)) {
          throw new Error('Enter a valid expected amount.');
        }
        if (dueMonth != null && !/^\d{4}-(0[1-9]|1[0-2])$/.test(dueMonth)) {
          throw new Error('Enter the due month as YYYY-MM.');
        }
        update.expected_need_cents = amount ?? null;
        update.expected_need_due_month = dueMonth;
      }
      if (Object.keys(update).length === 0) throw new Error('Choose a category plan change.');
      await requireSignedIn(client);
      const db = client as unknown as MoneyReadClient;
      let updateQuery = db.from('budget_plans').update(update).eq('category_id', normalizedCategoryId);
      if (version) updateQuery = updateQuery.eq('updated_at', version.expectedUpdatedAt);
      const updatedRows = await readPart<Array<{ category_id: string; updated_at?: string }>>(
        'category plan', updateQuery.select('category_id,updated_at'),
      );
      requireConfirmedRows('category plan', updatedRows, 1);
      return {
        confirmedAt: updatedRows[0]?.updated_at ?? new Date().toISOString(),
        categoryId: normalizedCategoryId,
        changes: {
          ...(input.rolloverEnabled != null ? { rolloverEnabled: input.rolloverEnabled } : null),
          ...(input.forecastMode != null ? { forecastMode: input.forecastMode } : null),
          ...('manualProjectedSpendCents' in input ? { manualProjectedSpendCents: input.manualProjectedSpendCents ?? null } : null),
          ...('scheduledAmountCents' in input ? { scheduledAmountCents: input.scheduledAmountCents ?? null } : null),
          ...('scheduledDueDay' in input ? { scheduledDueDay: input.scheduledDueDay ?? null } : null),
          ...(input.planRole != null ? { planRole: input.planRole } : null),
        },
      };
    },
  };
}

function parseMerchantRuleReceipt(data: unknown, transactionId: string): ConfirmedMerchantRuleWrite {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Money saved the merchant rule without a valid confirmation receipt.');
  }
  const receipt = data as Record<string, unknown>;
  const ruleId = typeof receipt.ruleId === 'string' ? receipt.ruleId.trim() : '';
  const merchantKey = typeof receipt.merchantKey === 'string' ? receipt.merchantKey.trim() : '';
  const categorySourceId = typeof receipt.categoryId === 'string' ? receipt.categoryId.trim() : '';
  const matchMode = receipt.matchMode;
  const appliedTransactionCount = receipt.appliedTransactionCount;
  if (
    !ruleId
    || !merchantKey
    || !categorySourceId
    || (matchMode !== 'exact' && matchMode !== 'partial')
    || !Number.isInteger(appliedTransactionCount)
    || (appliedTransactionCount as number) < 0
  ) {
    throw new Error('Money saved the merchant rule without a valid confirmation receipt.');
  }
  return {
    confirmedAt: new Date().toISOString(),
    ruleId,
    transactionId,
    appliedTransactionCount: appliedTransactionCount as number,
    merchantKey,
    matchMode,
    categorySourceId,
  };
}

function parseTransferReviewReceipt(
  data: unknown,
  expectedIds: [string, string],
  decision: 'confirm_pair' | 'unpair',
): ConfirmedTransferReviewWrite {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Money saved the transfer review without a valid confirmation receipt.');
  }
  const receipt = data as Record<string, unknown>;
  const transactionIds = Array.isArray(receipt.transaction_ids)
    ? receipt.transaction_ids.filter((id): id is string => typeof id === 'string').sort()
    : [];
  const confirmedAt = typeof receipt.updated_at === 'string' ? receipt.updated_at : '';
  if (transactionIds.length !== 2
    || transactionIds.some((id, index) => id !== [...expectedIds].sort()[index])
    || receipt.decision !== decision
    || !Number.isFinite(Date.parse(confirmedAt))) {
    throw new Error('Money saved the transfer review without a valid confirmation receipt.');
  }
  return { confirmedAt, transactionIds: transactionIds as [string, string], decision };
}

function parseConnectionDisconnectReceipt(
  data: unknown,
  connectionId: string,
): ConfirmedConnectionDisconnectWrite {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Money disconnected the connection without a valid confirmation receipt.');
  }
  const receipt = data as Record<string, unknown>;
  const confirmedAt = typeof receipt.confirmedAt === 'string' ? receipt.confirmedAt : '';
  const disconnectedAccountCount = Number(receipt.disconnectedAccountCount);
  if (receipt.connectionId !== connectionId
    || !Number.isSafeInteger(disconnectedAccountCount) || disconnectedAccountCount < 0
    || !Number.isFinite(Date.parse(confirmedAt))) {
    throw new Error('Money disconnected the connection without a valid confirmation receipt.');
  }
  return { confirmedAt, connectionId, disconnectedAccountCount };
}

async function readPlanRows(db: MoneyReadClient): Promise<MoneyPlanRow[]> {
  const expanded = await db
    .from('budget_plans')
    .select('category_id,base_budget_cents,rollover_enabled,forecast_mode,manual_projected_spend_cents,scheduled_amount_cents,scheduled_due_day,funding_rhythm,funding_policy_version,starter_weight,reserve_balance_cents,reserve_balance_period_id,expected_need_cents,expected_need_due_month,plan_role,updated_at')
    .eq('status', 'active');
  if (!expanded.error) return (expanded.data ?? []) as MoneyPlanRow[];
  const missingPlanRole = expanded.error.code === 'PGRST204'
    || expanded.error.message?.includes('plan_role');
  if (missingPlanRole) {
    const withoutPlanRole = await db
      .from('budget_plans')
      .select('category_id,base_budget_cents,rollover_enabled,forecast_mode,manual_projected_spend_cents,scheduled_amount_cents,scheduled_due_day,funding_rhythm,funding_policy_version,starter_weight,reserve_balance_cents,reserve_balance_period_id,expected_need_cents,expected_need_due_month,updated_at')
      .eq('status', 'active');
    if (!withoutPlanRole.error) return (withoutPlanRole.data ?? []) as MoneyPlanRow[];
    expanded.error = withoutPlanRole.error;
  }
  const missingFundingColumns = expanded.error.code === 'PGRST204'
    || expanded.error.message?.includes('funding_rhythm')
    || expanded.error.message?.includes('expected_need');
  if (!missingFundingColumns) {
    throw new Error(`Money could not read plans: ${expanded.error.message || 'Unknown database error'}`);
  }
  return readPart<MoneyPlanRow[]>('legacy plans', db
    .from('budget_plans')
    .select('category_id,base_budget_cents,rollover_enabled,forecast_mode,manual_projected_spend_cents,scheduled_amount_cents,scheduled_due_day,updated_at')
    .eq('status', 'active'));
}

function validateNullableCents(value: number | null | undefined, label: string) {
  if (value != null && (!Number.isSafeInteger(value) || value < 0)) {
    throw new Error(`Enter a valid ${label}.`);
  }
}

function requireCategoryCoverReceipt(
  value: unknown,
  categoryId: string,
  cover: MoneyCategoryCover | null,
): { confirmedAt: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Money could not confirm the category cover. Refresh and try again.');
  }
  const receipt = value as Record<string, unknown>;
  const confirmedCover = validateMoneyCategoryCover(receipt.cover);
  const confirmedAt = typeof receipt.updated_at === 'string' ? receipt.updated_at : '';
  if (receipt.category_id !== categoryId || JSON.stringify(confirmedCover) !== JSON.stringify(cover) || !Number.isFinite(Date.parse(confirmedAt))) {
    throw new Error('Money could not confirm the category cover. Refresh and try again.');
  }
  return { confirmedAt };
}

function requireCategoryOrderReceipt(value: unknown, expectedCategoryIds: string[]): ConfirmedCategoryOrderWrite {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Money could not confirm the category order. Refresh and try again.');
  }
  const receipt = value as Record<string, unknown>;
  const categoryIds = Array.isArray(receipt.category_ids)
    ? receipt.category_ids.filter((categoryId): categoryId is string => typeof categoryId === 'string')
    : [];
  const confirmedAt = typeof receipt.updated_at === 'string' ? receipt.updated_at : '';
  if (categoryIds.length !== expectedCategoryIds.length
    || categoryIds.some((categoryId, index) => categoryId !== expectedCategoryIds[index])
    || !Number.isFinite(Date.parse(confirmedAt))) {
    throw new Error('Money could not confirm the category order. Refresh and try again.');
  }
  return { categoryIds, confirmedAt };
}

function requireConfirmedRows(label: string, rows: unknown[], expectedCount: number): void {
  if (rows.length !== expectedCount) {
    throw new Error(`Money could not confirm the ${label}. Refresh and try again.`);
  }
}

async function requireSignedIn(client: SupabaseClient): Promise<string> {
  return (await requireSignedInUser(client)).id;
}

async function requireSignedInUser(client: SupabaseClient) {
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw new Error(userError.message);
  if (!userData.user?.id) throw new Error('Sign in to see your Money data.');
  return userData.user;
}

async function readPart<T>(label: string, query: PromiseLike<ReadResult>): Promise<T> {
  const { data, error } = await query;
  if (error) throw new Error(`Money could not read ${label}: ${error.message || 'Unknown database error'}`);
  return (data ?? []) as T;
}

async function readCategoryRows(db: MoneyReadClient): Promise<MoneyCategoryRow[]> {
  const withCover = await db
    .from('budget_categories')
    .select('id,slug,legacy_budget_id,name,description,accent_color,cover_image,sort_order,mapping_tags')
    .eq('status', 'active')
    .order('sort_order', { ascending: true });
  if (!withCover.error) return (withCover.data ?? []) as MoneyCategoryRow[];
  if (!isMissingCoverColumnError(withCover.error)) {
    throw new Error(`Money could not read categories: ${withCover.error.message || 'Unknown database error'}`);
  }
  return readPart<MoneyCategoryRow[]>('categories', db
    .from('budget_categories')
    .select('id,slug,legacy_budget_id,name,description,accent_color,sort_order')
    .eq('status', 'active')
    .order('sort_order', { ascending: true }));
}

function isMissingCoverColumnError(error: NonNullable<ReadResult['error']>): boolean {
  return error.code === '42703'
    || error.code === 'PGRST204'
    || error.message?.includes('cover_image') === true;
}

async function readOptionalAllocations(query: PromiseLike<ReadResult>): Promise<MoneyTransactionAllocationRow[]> {
  const { data, error } = await query;
  if (!error) return (data ?? []) as MoneyTransactionAllocationRow[];
  if (error.code === 'PGRST205' || error.message?.includes('budget_transaction_allocations')) return [];
  throw new Error(`Money could not read transaction allocations: ${error.message || 'Unknown database error'}`);
}

function isMissingRpcError(error: NonNullable<ReadResult['error']>, name: string): boolean {
  return error.code === 'PGRST202'
    || error.message?.includes(`Could not find the function public.${name}`) === true
    || error.message?.includes(name) === true && error.message?.includes('schema cache') === true;
}

function environmentQuery(
  query: MoneyReadQuery,
  column: string,
  includeSandbox: boolean,
): MoneyReadQuery {
  return includeSandbox ? query : query.neq(column, 'sandbox');
}

function normalizeAccountRelations(rows: MoneyAccountRow[]): MoneyAccountRow[] {
  return rows.map((row) => {
    const relation = row.budget_financial_connections as
      | MoneyAccountRow['budget_financial_connections']
      | Array<NonNullable<MoneyAccountRow['budget_financial_connections']>>;
    return {
      ...row,
      budget_financial_connections: Array.isArray(relation) ? relation[0] ?? null : relation ?? null,
    };
  });
}
