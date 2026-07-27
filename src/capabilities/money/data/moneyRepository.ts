import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import type { CategoryPlanInput } from '../domain/categoryPlanDraft';
import type { MoneyForecastMode } from '../domain/moneyForecast';
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
  buildMerchantRuleUpsert,
  buildTransactionReviewUpdate,
  type TransactionMeaningReviewInput,
  type TransactionReviewUpdate,
} from './moneyMutations';

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

export interface MoneyRepository {
  loadSnapshot(): Promise<MoneySnapshot>;
  ensureGovernedPlanFoundation(): Promise<void>;
  assignTransactionCategory(transactionId: string, categoryId: string): Promise<MoneySnapshot>;
  markTransactionNotCounted(transactionId: string): Promise<MoneySnapshot>;
  splitTransaction(input: {
    transactionId: string;
    transactionAmountCents: number;
    direction: 'inflow' | 'outflow';
    pending: boolean;
    allocations: TransactionAllocationInput[];
  }): Promise<MoneySnapshot>;
  reviewTransactionMeaning(transactionId: string, input: TransactionMeaningReviewInput): Promise<MoneySnapshot>;
  saveMerchantRule(input: {
    transactionId: string;
    merchantName: string;
    categoryId: string;
    categoryName: string;
    matchMode?: 'exact' | 'partial';
    similarTransactionIds?: string[];
  }): Promise<MoneySnapshot>;
  createCategory(input: CategoryPlanInput): Promise<{ categoryId: string; snapshot: MoneySnapshot }>;
  renameCategory(categoryId: string, name: string): Promise<MoneySnapshot>;
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
  }): Promise<MoneySnapshot>;
}

export function createMoneyRepository(client: SupabaseClient = getSupabaseClient()): MoneyRepository {
  const loadSnapshot = async (): Promise<MoneySnapshot> => {
    await requireSignedIn(client);

    const db = client as unknown as MoneyReadClient;
    const [categories, plans, connections, accounts, rules, allocations, transactions] = await Promise.all([
      readPart<MoneyCategoryRow[]>('categories',
        db
          .from('budget_categories')
          .select('id,slug,legacy_budget_id,name,description,accent_color,sort_order')
          .eq('status', 'active')
          .order('sort_order', { ascending: true })),
      readPlanRows(db),
      readPart<MoneyConnectionRow[]>('connections',
        environmentQuery(db
          .from('budget_financial_connections')
          .select('id,institution_name,status,last_synced_at'), 'environment')
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
          `), 'budget_financial_connections.environment')
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
                money_meaning,
                personal_finance_category_primary,
                personal_finance_category_detailed,
                personal_finance_category_confidence,
                budget_financial_connections!inner(environment)
            `), 'budget_financial_connections.environment')
            .order('date', { ascending: false })
            .range(from, to)),
      ),
    ]);

    return projectMoneySnapshot({
      categories,
      plans,
      connections,
      accounts: normalizeAccountRelations(accounts),
      rules,
      allocations,
      transactions,
    });
  };

  const reviewTransaction = async (
    transactionId: string,
    update: TransactionReviewUpdate,
  ): Promise<MoneySnapshot> => {
    const normalizedTransactionId = transactionId.trim();
    if (!normalizedTransactionId) throw new Error('Choose a transaction to review.');
    await requireSignedIn(client);

    const db = client as unknown as MoneyReadClient;
    await readPart<unknown[]>(
      'transaction review',
      db
        .from('budget_transactions')
        .update(update)
        .eq('id', normalizedTransactionId),
    );
    return loadSnapshot();
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
    await readPart<unknown[]>('transaction review', db
      .from('budget_transactions')
      .update(update)
      .in('id', normalizedIds));
  };

  return {
    loadSnapshot,
    async ensureGovernedPlanFoundation() {
      await requireSignedIn(client);
      const db = client as unknown as MoneyReadClient;
      const { error } = await db.rpc('ensure_governed_household_money_foundation', {});
      if (error) throw new Error(`Money could not build the governed plan foundation: ${error.message || 'Unknown database error'}`);
    },
    async assignTransactionCategory(transactionId, categoryId) {
      await replaceTransactionReview([transactionId], { type: 'category', categoryId });
      return loadSnapshot();
    },
    async markTransactionNotCounted(transactionId) {
      await replaceTransactionReview([transactionId], { type: 'not_counted' });
      return loadSnapshot();
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
    reviewTransactionMeaning: (transactionId, input) =>
      reviewTransaction(transactionId, buildTransactionMeaningReviewUpdate(input)),
    async saveMerchantRule(input) {
      const userId = await requireSignedIn(client);
      const db = client as unknown as MoneyReadClient;
      const similarTransactionIds = [...new Set((input.similarTransactionIds ?? []).map((id) => id.trim()).filter(Boolean))];
      if (similarTransactionIds.length > 0) {
        await replaceTransactionReview(similarTransactionIds, { type: 'category', categoryId: input.categoryId });
      }
      await readPart<unknown[]>('merchant rule', db
        .from('budget_transaction_match_rules')
        .upsert(buildMerchantRuleUpsert({ userId, ...input }), {
          onConflict: 'user_id,merchant_contains,merchant_match_mode',
        }));
      return loadSnapshot();
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
    async renameCategory(categoryId, name) {
      const normalizedCategoryId = categoryId.trim();
      if (!normalizedCategoryId) throw new Error('Choose a category to rename.');
      const normalizedName = name.trim();
      if (!normalizedName) throw new Error('Enter a category name.');
      await requireSignedIn(client);
      const db = client as unknown as MoneyReadClient;
      await readPart<unknown[]>('category name', db
        .from('budget_categories')
        .update({ name: normalizedName })
        .eq('id', normalizedCategoryId));
      return loadSnapshot();
    },
    async updateCategoryPlan(categoryId, input) {
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
      await readPart<unknown[]>('category plan', db
        .from('budget_plans')
        .update(update)
        .eq('category_id', normalizedCategoryId));
      return loadSnapshot();
    },
  };
}

async function readPlanRows(db: MoneyReadClient): Promise<MoneyPlanRow[]> {
  const expanded = await db
    .from('budget_plans')
    .select('category_id,base_budget_cents,rollover_enabled,forecast_mode,manual_projected_spend_cents,scheduled_amount_cents,scheduled_due_day,funding_rhythm,funding_policy_version,starter_weight,reserve_balance_cents,reserve_balance_period_id,expected_need_cents,expected_need_due_month')
    .eq('status', 'active');
  if (!expanded.error) return (expanded.data ?? []) as MoneyPlanRow[];
  const missingFundingColumns = expanded.error.code === 'PGRST204'
    || expanded.error.message?.includes('funding_rhythm')
    || expanded.error.message?.includes('expected_need');
  if (!missingFundingColumns) {
    throw new Error(`Money could not read plans: ${expanded.error.message || 'Unknown database error'}`);
  }
  return readPart<MoneyPlanRow[]>('legacy plans', db
    .from('budget_plans')
    .select('category_id,base_budget_cents,rollover_enabled,forecast_mode,manual_projected_spend_cents,scheduled_amount_cents,scheduled_due_day')
    .eq('status', 'active'));
}

function validateNullableCents(value: number | null | undefined, label: string) {
  if (value != null && (!Number.isSafeInteger(value) || value < 0)) {
    throw new Error(`Enter a valid ${label}.`);
  }
}

async function requireSignedIn(client: SupabaseClient): Promise<string> {
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw new Error(userError.message);
  if (!userData.user?.id) throw new Error('Sign in to see your Money data.');
  return userData.user.id;
}

async function readPart<T>(label: string, query: PromiseLike<ReadResult>): Promise<T> {
  const { data, error } = await query;
  if (error) throw new Error(`Money could not read ${label}: ${error.message || 'Unknown database error'}`);
  return (data ?? []) as T;
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

function environmentQuery(query: MoneyReadQuery, column: string): MoneyReadQuery {
  return typeof __DEV__ !== 'undefined' && __DEV__ ? query : query.neq(column, 'sandbox');
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
