import type { ServerAgentToolCall, ServerAgentToolResult } from './agentRuntime.ts';
import type { ServerDeviceActionRequest } from './serverDeviceHandoffs.ts';
import type { KwiltActionSource } from '../../../packages/kwilt-agent-runtime/src/types.ts';
import { projectCategoryFunding } from '../../../src/capabilities/money/domain/categoryFunding.ts';
import { projectCategoryForecast, type MoneyCategoryForecast } from '../../../src/capabilities/money/domain/moneyForecast.ts';
import { isCommittedOutflow } from '../../../src/capabilities/money/domain/transactionCounting.ts';

const MONEY_TOOL_IDS = new Set([
  'money.read', 'money.review_transaction', 'money.category.create', 'money.category.rename',
  'money.app_control.review', 'money.category.update', 'money.privacy.configure',
  'money.connection.connect', 'money.connection.sync',
  'money.budget.read', 'money.budget.update', 'money.transaction.get',
  'money.transaction.meaning.update', 'money.transaction.plan_treatment.update',
  'money.connection.disconnect', 'money.connection.repair.open', 'money.transfer.list',
  'money.transfer.get', 'money.transfer.review',
]);

type MoneyTarget = {
  targetType: 'money' | 'money_category' | 'money_transaction' | 'money_connection' | 'money_transfer';
  targetId: string | null;
};

type MoneyReadResult = { data: unknown; error: { message?: string } | null };
type MoneyReadQuery = PromiseLike<MoneyReadResult> & {
  select: (...args: unknown[]) => MoneyReadQuery;
  eq: (...args: unknown[]) => MoneyReadQuery;
  gte: (...args: unknown[]) => MoneyReadQuery;
  lt: (...args: unknown[]) => MoneyReadQuery;
  order: (...args: unknown[]) => MoneyReadQuery;
  range: (from: number, to: number) => Promise<MoneyReadResult>;
};
type MoneyReadClient = { from: (table: string) => MoneyReadQuery };
type MoneyCategoryRenameClient = {
  rpc: (name: string, args: Record<string, unknown>) => PromiseLike<MoneyReadResult>;
};

type MoneyCategoryRow = {
  id: string; slug: string; legacy_budget_id?: string | null; name: string;
  sort_order: number; updated_at?: string | null;
};
type MoneyPlanRow = {
  category_id: string; base_budget_cents: number; rollover_enabled?: boolean;
  forecast_mode?: 'paced' | 'scheduled' | 'hybrid' | 'manual' | null;
  manual_projected_spend_cents?: number | null; scheduled_amount_cents?: number | null;
  scheduled_due_day?: number | null; funding_rhythm?: 'monthly' | 'reserve' | null;
  reserve_balance_cents?: number | null; expected_need_cents?: number | null;
  expected_need_due_month?: string | null; updated_at?: string | null;
};
type MoneyConnectionRow = { last_synced_at?: string | null };
type MoneyAccountRow = { id: string };
type MoneyAllocationRow = { transaction_id: string; budget_id: string; amount_cents: number };
type MoneyTransactionRow = {
  id: string; amount_cents: number; direction: 'inflow' | 'outflow'; date: string; pending: boolean;
  budget_id?: string | null; budget_match_source?: string | null; money_meaning?: string | null;
  saved_resource_cents?: number | null; personal_finance_category_detailed?: string | null;
};
type ServerMoneyCategory = {
  id: string; name: string; plannedCents: number; spentCents: number; remainingCents: number;
  percentUsed: number; transactionCount: number; updatedAt: string; forecast: MoneyCategoryForecast;
};
type ServerMoneySnapshot = {
  month: string; periodLabel: string; observedAt: string; lastSyncedAt: string | null;
  totals: { plannedCents: number; spentCents: number; remainingCents: number; needsReviewCount: number };
  forecast: {
    projectedSpendCents: number; projectionRangeLowCents: number; projectionRangeHighCents: number;
    projectedRemainingCents: number; projectedOverageCents: number; confidence: 'low' | 'medium' | 'high';
    atRiskCategoryCount: number;
  };
  outsidePlan: { spentCents: number; transactionCount: number };
  categories: ServerMoneyCategory[]; accountCount: number;
};

const MONEY_PAGE_SIZE = 1_000;
const MONEY_MAX_ROWS = 10_000;

async function readAllMoneyRows<T>(label: string, query: MoneyReadQuery): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < MONEY_MAX_ROWS; from += MONEY_PAGE_SIZE) {
    const { data, error } = await query.range(from, from + MONEY_PAGE_SIZE - 1);
    if (error) throw new Error(`money_${label}_read_failed:${error.message ?? 'unknown'}`);
    const page = Array.isArray(data) ? data as T[] : [];
    rows.push(...page);
    if (page.length < MONEY_PAGE_SIZE) return rows;
  }
  throw new Error(`money_${label}_read_limit_exceeded`);
}

function moneyMonth(now: Date) {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function nextMoneyMonth(month: string) {
  const [year, value] = month.split('-').map(Number);
  return `${year + (value === 12 ? 1 : 0)}-${String(value === 12 ? 1 : value + 1).padStart(2, '0')}`;
}

async function loadServerMoneyRows(client: MoneyReadClient, userId: string, now: Date) {
  const month = moneyMonth(now);
  return Promise.all([
    readAllMoneyRows<MoneyCategoryRow>('categories', client.from('budget_categories')
      .select('id,slug,legacy_budget_id,name,sort_order,updated_at')
      .eq('user_id', userId).eq('status', 'active').order('sort_order', { ascending: true })),
    readAllMoneyRows<MoneyPlanRow>('plans', client.from('budget_plans')
      .select('category_id,base_budget_cents,rollover_enabled,forecast_mode,manual_projected_spend_cents,scheduled_amount_cents,scheduled_due_day,funding_rhythm,reserve_balance_cents,expected_need_cents,expected_need_due_month,updated_at')
      .eq('user_id', userId).eq('status', 'active').order('category_id', { ascending: true })),
    readAllMoneyRows<MoneyConnectionRow>('connections', client.from('budget_financial_connections')
      .select('last_synced_at')
      .eq('user_id', userId).order('created_at', { ascending: false })),
    readAllMoneyRows<MoneyAccountRow>('accounts', client.from('budget_financial_accounts')
      .select('id')
      .eq('user_id', userId).order('created_at', { ascending: false })),
    readAllMoneyRows<MoneyAllocationRow>('allocations', client.from('budget_transaction_allocations')
      .select('transaction_id,budget_id,amount_cents').eq('user_id', userId)
      .order('transaction_id', { ascending: true }).order('budget_id', { ascending: true })),
    readAllMoneyRows<MoneyTransactionRow>('transactions', client.from('budget_transactions')
      .select('id,amount_cents,direction,date,pending,budget_id,budget_match_source,money_meaning,saved_resource_cents,personal_finance_category_detailed')
      .eq('user_id', userId).gte('date', `${month}-01`).lt('date', `${nextMoneyMonth(month)}-01`)
      .order('date', { ascending: false }).order('id', { ascending: false })),
  ]);
}

function cents(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

function planCoveredCents(transaction: MoneyTransactionRow) {
  const amount = cents(transaction.amount_cents);
  return Math.max(0, amount - Math.min(amount, cents(transaction.saved_resource_cents)));
}

function buildServerMoneySnapshot(
  rows: [MoneyCategoryRow[], MoneyPlanRow[], MoneyConnectionRow[], MoneyAccountRow[], MoneyAllocationRow[], MoneyTransactionRow[]],
  now: Date,
): ServerMoneySnapshot {
  const [categoryRows, plans, connections, accounts, allocationRows, transactions] = rows;
  const month = moneyMonth(now);
  const observedAt = now.toISOString();
  const categoryByAlias = new Map<string, MoneyCategoryRow>();
  categoryRows.forEach((category) => {
    categoryByAlias.set(category.id, category);
    categoryByAlias.set(category.slug, category);
    if (category.legacy_budget_id?.trim()) categoryByAlias.set(category.legacy_budget_id.trim(), category);
  });
  const transactionById = new Map(transactions.map((transaction) => [transaction.id, transaction]));
  const allocationsByTransaction = new Map<string, MoneyAllocationRow[]>();
  allocationRows.forEach((allocation) => {
    if (!transactionById.has(allocation.transaction_id)) return;
    const values = allocationsByTransaction.get(allocation.transaction_id) ?? [];
    values.push(allocation);
    allocationsByTransaction.set(allocation.transaction_id, values);
  });
  [...allocationsByTransaction].forEach(([transactionId, allocations]) => {
    const transaction = transactionById.get(transactionId)!;
    const valid = allocations.length >= 2 && allocations.length <= 8
      && allocations.every((allocation) => categoryByAlias.has(allocation.budget_id))
      && allocations.reduce((sum, allocation) => sum + cents(allocation.amount_cents), 0) === cents(transaction.amount_cents);
    if (!valid) allocationsByTransaction.delete(transactionId);
  });
  const planByCategory = new Map(plans.map((plan) => [plan.category_id, plan]));
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
  const categories = categoryRows.slice().sort((left, right) => left.sort_order - right.sort_order).map((category) => {
    const plan = planByCategory.get(category.id);
    let outflowCents = 0;
    let creditCents = 0;
    const transactionIds = new Set<string>();
    transactions.forEach((transaction) => {
      const allocations = allocationsByTransaction.get(transaction.id);
      if (allocations) {
        const allocation = allocations.find((value) => categoryByAlias.get(value.budget_id)?.id === category.id);
        if (allocation && isCommittedOutflow({
          direction: transaction.direction, pending: transaction.pending, moneyMeaning: transaction.money_meaning,
          providerCategoryDetailed: transaction.personal_finance_category_detailed,
        })) {
          outflowCents += Math.floor(planCoveredCents(transaction) * cents(allocation.amount_cents)
            / Math.max(1, cents(transaction.amount_cents)));
          transactionIds.add(transaction.id);
        }
        return;
      }
      if (!transaction.budget_id || categoryByAlias.get(transaction.budget_id)?.id !== category.id) return;
      if (isCommittedOutflow({
        direction: transaction.direction, pending: transaction.pending, moneyMeaning: transaction.money_meaning,
        providerCategoryDetailed: transaction.personal_finance_category_detailed,
      })) outflowCents += planCoveredCents(transaction);
      if (!transaction.pending && transaction.direction === 'inflow' && transaction.money_meaning === 'category_credit') {
        creditCents += cents(transaction.amount_cents);
      }
      transactionIds.add(transaction.id);
    });
    const spentCents = Math.max(0, outflowCents - creditCents);
    const plannedCents = cents(plan?.base_budget_cents);
    const fundingRhythm = plan?.funding_rhythm === 'reserve' ? 'reserve' as const : 'monthly' as const;
    const funding = projectCategoryFunding({
      rhythm: fundingRhythm, monthlyContributionCents: plannedCents,
      priorReserveCents: fundingRhythm === 'reserve' ? cents(plan?.reserve_balance_cents) : 0,
      countedSpendCents: spentCents, periodId: month,
      expectedNeed: plan?.expected_need_cents != null && plan.expected_need_due_month
        ? { amountCents: cents(plan.expected_need_cents), dueMonth: plan.expected_need_due_month } : null,
    });
    const forecast = projectCategoryForecast({
      periodStartIso: `${month}-01`, periodEndIso: periodEnd, todayIso: now.toISOString().slice(0, 10),
      plannedCents, spentCents, mode: plan?.forecast_mode,
      manualProjectedSpendCents: plan?.manual_projected_spend_cents,
      scheduledAmountCents: plan?.scheduled_amount_cents, scheduledDueDay: plan?.scheduled_due_day,
      fundingRhythm, reserveAvailableCents: funding.availableCents, fundingCoverage: funding.coverage,
    });
    return {
      id: category.id, name: category.name.trim() || category.slug, plannedCents, spentCents,
      remainingCents: funding.availableCents,
      percentUsed: plannedCents > 0 ? Math.round(spentCents / plannedCents * 100) : 0,
      transactionCount: transactionIds.size, updatedAt: plan?.updated_at ?? category.updated_at ?? observedAt, forecast,
    };
  });
  const outsidePlan = transactions.filter((transaction) => {
    if (allocationsByTransaction.has(transaction.id) || transaction.budget_match_source === 'excluded') return false;
    const assigned = transaction.budget_id ? categoryByAlias.has(transaction.budget_id) : false;
    return !assigned && isCommittedOutflow({
      direction: transaction.direction, pending: transaction.pending, moneyMeaning: transaction.money_meaning,
      providerCategoryDetailed: transaction.personal_finance_category_detailed,
    });
  });
  const plannedCents = categories.reduce((sum, category) => sum + category.plannedCents, 0);
  const spentCents = categories.reduce((sum, category) => sum + category.spentCents, 0);
  const projectedSpendCents = categories.reduce((sum, category) => sum + category.forecast.projectedSpendCents, 0);
  const projectionRangeLowCents = categories.reduce((sum, category) => sum + category.forecast.projectionRangeLowCents, 0);
  const projectionRangeHighCents = categories.reduce((sum, category) => sum + category.forecast.projectionRangeHighCents, 0);
  const confidences = categories.map((category) => category.forecast.confidence);
  const confidence = confidences.includes('low') ? 'low' as const : confidences.includes('medium') ? 'medium' as const : 'high' as const;
  const synced = connections.map((connection) => connection.last_synced_at)
    .filter((value): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value)))
    .sort((left, right) => Date.parse(right) - Date.parse(left));
  return {
    month, periodLabel: new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(now),
    observedAt, lastSyncedAt: synced[0] ?? null,
    totals: { plannedCents, spentCents, remainingCents: plannedCents - spentCents, needsReviewCount: outsidePlan.length },
    forecast: { projectedSpendCents, projectionRangeLowCents, projectionRangeHighCents,
      projectedRemainingCents: Math.max(0, plannedCents - projectedSpendCents),
      projectedOverageCents: Math.max(0, projectedSpendCents - plannedCents), confidence,
      atRiskCategoryCount: categories.filter((category) => category.forecast.status !== 'steady').length },
    outsidePlan: { spentCents: outsidePlan.reduce((sum, transaction) => sum + planCoveredCents(transaction), 0),
      transactionCount: outsidePlan.length },
    categories, accountCount: accounts.length,
  };
}

function budgetOutput(snapshot: ServerMoneySnapshot) {
  return {
    month: snapshot.month,
    periodLabel: snapshot.periodLabel,
    plannedCents: snapshot.totals.plannedCents,
    categories: snapshot.categories.map((category) => ({
      id: category.id,
      name: category.name,
      plannedCents: category.plannedCents,
      updatedAt: category.updatedAt,
    })),
    observedAt: snapshot.observedAt,
  };
}

function summaryOutput(snapshot: ServerMoneySnapshot) {
  return {
    money: {
      periodLabel: snapshot.periodLabel,
      lastSyncedAt: snapshot.lastSyncedAt,
      totals: snapshot.totals,
      forecast: snapshot.forecast,
      outsidePlan: snapshot.outsidePlan,
      categories: snapshot.categories.map((category) => ({
        id: category.id,
        name: category.name,
        plannedCents: category.plannedCents,
        spentCents: category.spentCents,
        remainingCents: category.remainingCents,
        percentUsed: category.percentUsed,
        transactionCount: category.transactionCount,
        forecast: category.forecast,
      })),
      accountCount: snapshot.accountCount,
      planLimit: null,
    },
  };
}

function nonEmptyText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function resolveTarget(call: ServerAgentToolCall): MoneyTarget | null {
  if (call.toolId === 'money.review_transaction') {
    const targetId = nonEmptyText(call.arguments.transactionId);
    return targetId ? { targetType: 'money_transaction', targetId } : { targetType: 'money', targetId: null };
  }
  if (call.toolId === 'money.category.rename' || call.toolId === 'money.category.update') {
    const targetId = nonEmptyText(call.arguments.categoryId);
    return targetId ? { targetType: 'money_category', targetId } : null;
  }
  if (call.toolId === 'money.app_control.review') {
    const condition = call.arguments.condition && typeof call.arguments.condition === 'object'
      ? call.arguments.condition as Record<string, unknown> : {};
    const targetId = nonEmptyText(condition.categoryId);
    return targetId ? { targetType: 'money_category', targetId } : null;
  }
  if (call.toolId === 'money.connection.sync') {
    const targetId = nonEmptyText(call.arguments.connectionId);
    return targetId ? { targetType: 'money_connection', targetId } : { targetType: 'money', targetId: null };
  }
  if (call.toolId === 'money.connection.connect') {
    return { targetType: 'money', targetId: null };
  }
  if (call.toolId.startsWith('money.transaction.')) {
    const targetId = nonEmptyText(call.arguments.transactionId);
    return targetId ? { targetType: 'money_transaction', targetId } : null;
  }
  if (call.toolId.startsWith('money.connection.')) {
    const targetId = nonEmptyText(call.arguments.connectionId);
    return targetId ? { targetType: 'money_connection', targetId } : null;
  }
  if (call.toolId === 'money.transfer.get' || call.toolId === 'money.transfer.review') {
    const targetId = nonEmptyText(call.arguments.transferId);
    return targetId ? { targetType: 'money_transfer', targetId } : null;
  }
  if (call.toolId === 'money.budget.update') {
    const month = nonEmptyText(call.arguments.month);
    return month && /^\d{4}-\d{2}$/.test(month)
      ? { targetType: 'money_category', targetId: month }
      : null;
  }
  return { targetType: 'money', targetId: null };
}

/** Complete bounded server-safe reads and confirmed category renames; persist remaining Money requests for the device. */
export async function executeServerMoneyTool({
  client, userId, call, stageDeviceAction, writeContext, actionSource, now = new Date(),
}: {
  client: unknown; userId: string; call: ServerAgentToolCall;
  stageDeviceAction: (request: ServerDeviceActionRequest) => Promise<void>;
  writeContext?: { threadId: string; runId: string; messageId: string };
  actionSource?: KwiltActionSource;
  now?: Date;
}): Promise<ServerAgentToolResult | null> {
  if (!MONEY_TOOL_IDS.has(call.toolId)) return null;
  if (call.toolId === 'money.read' || call.toolId === 'money.budget.read') {
    try {
      const rows = await loadServerMoneyRows(client as MoneyReadClient, userId, now);
      const snapshot = buildServerMoneySnapshot(rows, now);
      return {
        status: 'completed', receipt: null,
        output: call.toolId === 'money.budget.read' ? budgetOutput(snapshot) : summaryOutput(snapshot),
      };
    } catch {
      return { status: 'unavailable', reason: 'server_money_read_unavailable', retryable: true };
    }
  }
  if (call.toolId === 'money.category.rename') {
    const categoryId = nonEmptyText(call.arguments.categoryId);
    const name = nonEmptyText(call.arguments.name);
    if (!categoryId || !name || name.length > 120) {
      return {
        status: 'failed', code: 'invalid_money_category_rename',
        message: 'Choose a valid Money category and name.', retryable: false,
      };
    }
    const rpc = (client as Partial<MoneyCategoryRenameClient>).rpc;
    if (!writeContext || typeof rpc !== 'function') {
      return { status: 'unavailable', reason: 'server_money_write_context_unavailable', retryable: false };
    }
    try {
      const { data, error } = await (client as MoneyCategoryRenameClient).rpc('rename_budget_category_from_agent', {
        p_user_id: userId,
        p_thread_id: writeContext.threadId,
        p_run_id: writeContext.runId,
        p_message_id: writeContext.messageId,
        p_call_id: call.id,
        p_category_id: categoryId,
        p_name: name,
      });
      const result = data && typeof data === 'object' && !Array.isArray(data)
        ? data as Record<string, unknown> : {};
      if (result.status === 'not_found') {
        return {
          status: 'failed', code: 'money_category_not_found',
          message: 'Kwilt could not find that Money category.', retryable: false,
        };
      }
      if (result.status === 'pro_required') return { status: 'refused', reason: 'kwilt_pro_required' };
      if (error) {
        return {
          status: 'failed', code: 'money_category_rename_failed',
          message: 'Kwilt could not rename that Money category.', retryable: true,
        };
      }
      const receiptId = typeof result.receiptId === 'string' ? result.receiptId : '';
      const resultCategoryId = typeof result.categoryId === 'string' ? result.categoryId : '';
      if (result.status !== 'applied' || !receiptId || resultCategoryId !== categoryId) {
        return {
          status: 'failed', code: 'money_category_rename_failed',
          message: 'Kwilt could not rename that Money category.', retryable: true,
        };
      }
      const resultRefs = [{ kind: 'money_category', id: categoryId }];
      const createdAt = typeof result.updatedAt === 'string' ? result.updatedAt : now.toISOString();
      const receipt = {
        receiptId, operationId: call.toolId, requestId: call.id,
        actorId: userId, householdId: userId, source: actionSource ?? 'mobile_chat',
        status: 'completed', resultRefs, reversible: true, targetVersion: null,
        provider: null, retryable: false, reason: null, candidateSummary: null,
        replayed: result.replayed === true, createdAt,
      };
      return {
        status: 'completed', receipt,
        output: { receiptId, resultRefs, replayed: result.replayed === true },
      };
    } catch {
      return {
        status: 'failed', code: 'money_category_rename_failed',
        message: 'Kwilt could not rename that Money category.', retryable: true,
      };
    }
  }
  const target = resolveTarget(call);
  if (!target) {
    return {
      status: 'failed', code: 'invalid_money_target',
      message: 'Choose a valid Money item to review on your device.', retryable: false,
    };
  }
  const repair = call.toolId === 'money.connection.repair.open';
  const appControl = call.toolId === 'money.app_control.review';
  const condition = appControl && call.arguments.condition && typeof call.arguments.condition === 'object'
    ? call.arguments.condition as Record<string, unknown> : {};
  const effect = appControl && call.arguments.effect && typeof call.arguments.effect === 'object'
    ? call.arguments.effect as Record<string, unknown> : {};
  const request: ServerDeviceActionRequest = {
    capabilityId: 'money',
    actionType: repair ? 'open_money_connection_repair' : appControl ? 'review_money_app_control' : 'open_money_control',
    targetType: target.targetType, targetId: target.targetId,
    title: repair ? 'Repair Money connection' : 'Review private Money action',
    consequenceSummary: repair
      ? 'Kwilt will open the provider’s repair screen on your authenticated device. Your sign-in information stays with the provider.'
      : 'Kwilt will open this Money request on your device. Financial details stay hidden until you authenticate, and nothing changes without your review.',
    payload: appControl ? {
      subject: call.arguments.subject,
      preset: condition.preset,
      suggestedAppLabels: effect.suggestedAppLabels,
    } : { toolId: call.toolId, arguments: call.arguments },
  };
  await stageDeviceAction(request);
  return { status: 'pending_client_action', provider: 'device', request };
}
