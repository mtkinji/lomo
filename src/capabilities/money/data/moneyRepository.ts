import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import {
  projectMoneySnapshot,
  type MoneyAccountRow,
  type MoneyCategoryRow,
  type MoneyConnectionRow,
  type MoneyPlanRow,
  type MoneySnapshot,
  type MoneyTransactionRow,
} from './moneySnapshot';
import {
  buildTransactionMeaningReviewUpdate,
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
};

type MoneyReadClient = {
  from(table: string): MoneyReadQuery;
};

export interface MoneyRepository {
  loadSnapshot(): Promise<MoneySnapshot>;
  assignTransactionCategory(transactionId: string, categoryId: string): Promise<MoneySnapshot>;
  markTransactionNotCounted(transactionId: string): Promise<MoneySnapshot>;
  reviewTransactionMeaning(transactionId: string, input: TransactionMeaningReviewInput): Promise<MoneySnapshot>;
}

export function createMoneyRepository(client: SupabaseClient = getSupabaseClient()): MoneyRepository {
  const loadSnapshot = async (): Promise<MoneySnapshot> => {
    await requireSignedIn(client);

    const db = client as unknown as MoneyReadClient;
    const [categories, plans, connections, accounts, transactions] = await Promise.all([
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
