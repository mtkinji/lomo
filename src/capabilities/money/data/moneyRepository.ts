import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import type { CategoryPlanInput } from '../domain/categoryPlanDraft';
import {
  projectMoneySnapshot,
  type MoneyAccountRow,
  type MoneyCategoryRow,
  type MoneyConnectionRow,
  type MoneyPlanRow,
  type MoneyRuleRow,
  type MoneySnapshot,
  type MoneyTransactionRow,
} from './moneySnapshot';
import {
  buildTransactionMeaningReviewUpdate,
  buildMerchantRuleUpsert,
  buildTransactionReviewUpdate,
  type TransactionMeaningReviewInput,
  type TransactionReviewUpdate,
} from './moneyMutations';

type ReadResult = { data: unknown; error: { message?: string } | null };

type MoneyReadQuery = PromiseLike<ReadResult> & {
  eq(column: string, value: unknown): MoneyReadQuery;
  limit(count: number): MoneyReadQuery;
  neq(column: string, value: unknown): MoneyReadQuery;
  order(column: string, options?: { ascending?: boolean }): MoneyReadQuery;
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
  assignTransactionCategory(transactionId: string, categoryId: string): Promise<MoneySnapshot>;
  markTransactionNotCounted(transactionId: string): Promise<MoneySnapshot>;
  reviewTransactionMeaning(transactionId: string, input: TransactionMeaningReviewInput): Promise<MoneySnapshot>;
  saveMerchantRule(input: {
    transactionId: string;
    merchantName: string;
    categoryId: string;
    categoryName: string;
  }): Promise<MoneySnapshot>;
  createCategory(input: CategoryPlanInput): Promise<{ categoryId: string; snapshot: MoneySnapshot }>;
  renameCategory(categoryId: string, name: string): Promise<MoneySnapshot>;
  updateCategoryPlan(categoryId: string, input: {
    budgetCents?: number;
    rolloverEnabled?: boolean;
  }): Promise<MoneySnapshot>;
}

export function createMoneyRepository(client: SupabaseClient = getSupabaseClient()): MoneyRepository {
  const loadSnapshot = async (): Promise<MoneySnapshot> => {
    await requireSignedIn(client);

    const db = client as unknown as MoneyReadClient;
    const [categories, plans, connections, accounts, rules, transactions] = await Promise.all([
      readPart<MoneyCategoryRow[]>('categories',
        db
          .from('budget_categories')
          .select('id,slug,legacy_budget_id,name,description,accent_color,sort_order')
          .eq('status', 'active')
          .order('sort_order', { ascending: true })),
      readPart<MoneyPlanRow[]>('plans',
        db
          .from('budget_plans')
          .select('category_id,base_budget_cents,rollover_enabled')
          .eq('status', 'active')),
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
      readPart<MoneyTransactionRow[]>('transactions',
        environmentQuery(db
          .from('budget_transactions')
          .select(`
              id,
              financial_account_id,
              name,
              merchant_name,
              amount_cents,
              direction,
              date,
              pending,
              iso_currency_code,
              budget_id,
              budget_match_source,
              money_meaning,
              budget_financial_connections!inner(environment)
          `), 'budget_financial_connections.environment')
          .order('date', { ascending: false })
          .limit(1000)),
    ]);

    return projectMoneySnapshot({
      categories,
      plans,
      connections,
      accounts: normalizeAccountRelations(accounts),
      rules,
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

  return {
    loadSnapshot,
    assignTransactionCategory: (transactionId, categoryId) =>
      reviewTransaction(transactionId, buildTransactionReviewUpdate({ type: 'category', categoryId })),
    markTransactionNotCounted: (transactionId) =>
      reviewTransaction(transactionId, buildTransactionReviewUpdate({ type: 'not_counted' })),
    reviewTransactionMeaning: (transactionId, input) =>
      reviewTransaction(transactionId, buildTransactionMeaningReviewUpdate(input)),
    async saveMerchantRule(input) {
      const userId = await requireSignedIn(client);
      const db = client as unknown as MoneyReadClient;
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
