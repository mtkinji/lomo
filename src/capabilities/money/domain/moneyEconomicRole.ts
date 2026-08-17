import type { MoneyTransaction } from '../data/moneySnapshot';
import type { LivingPlanAllocation } from './living-plan';

export type MoneyEconomicRole =
  | 'protected_spending'
  | 'flexible_spending'
  | 'outside_plan'
  | 'not_spending'
  | 'unresolved';

export type MoneyEconomicContribution = {
  role: Extract<MoneyEconomicRole, 'protected_spending' | 'flexible_spending'>;
  amountCents: number;
  spendDeltaCents: number;
};

export type MoneyEconomicRoleRow = {
  transactionId: string;
  disposition: MoneyEconomicRole;
  amountCents: number;
  contributions: MoneyEconomicContribution[];
};

export type MoneyEconomicRoleReconciliation = {
  rows: MoneyEconomicRoleRow[];
  totals: {
    protectedSpendingCents: number;
    flexibleSpendingCents: number;
    outsidePlanCents: number;
    neutralCents: number;
    unresolvedInScopeCents: number;
  };
  invariant: {
    valid: boolean;
    transactionCount: number;
    accountedTransactionCount: number;
  };
};

type SpendingRole = MoneyEconomicContribution['role'];

export function reconcileMoneyEconomicRoles(input: {
  transactions: MoneyTransaction[];
  allocations: LivingPlanAllocation[];
  roleByCategoryId?: ReadonlyMap<string, SpendingRole>;
}): MoneyEconomicRoleReconciliation {
  const roleByCategoryId = new Map<string, SpendingRole>();
  input.allocations.forEach((allocation) => {
    roleByCategoryId.set(
      allocation.categoryId,
      allocation.fixedCents > 0 || allocation.overrideCents > 0
        ? 'protected_spending'
        : 'flexible_spending',
    );
  });
  input.roleByCategoryId?.forEach((role, categoryId) => roleByCategoryId.set(categoryId, role));

  const rows = input.transactions.map((transaction) => reconcileTransaction(transaction, roleByCategoryId));
  const uniqueTransactionIds = new Set(rows.map((row) => row.transactionId));
  const totals = rows.reduce<MoneyEconomicRoleReconciliation['totals']>((result, row) => {
    row.contributions.forEach((contribution) => {
      if (contribution.role === 'protected_spending') {
        result.protectedSpendingCents += contribution.spendDeltaCents;
      } else {
        result.flexibleSpendingCents += contribution.spendDeltaCents;
      }
    });
    if (row.disposition === 'outside_plan') result.outsidePlanCents += row.amountCents;
    if (row.disposition === 'not_spending' && row.contributions.length === 0) result.neutralCents += row.amountCents;
    if (row.disposition === 'unresolved') result.unresolvedInScopeCents += row.amountCents;
    return result;
  }, {
    protectedSpendingCents: 0,
    flexibleSpendingCents: 0,
    outsidePlanCents: 0,
    neutralCents: 0,
    unresolvedInScopeCents: 0,
  });

  totals.protectedSpendingCents = Math.max(0, totals.protectedSpendingCents);
  totals.flexibleSpendingCents = Math.max(0, totals.flexibleSpendingCents);
  const accountedTransactionCount = rows.length;

  return {
    rows,
    totals,
    invariant: {
      valid: accountedTransactionCount === input.transactions.length
        && uniqueTransactionIds.size === input.transactions.length,
      transactionCount: input.transactions.length,
      accountedTransactionCount,
    },
  };
}

function reconcileTransaction(
  transaction: MoneyTransaction,
  roleByCategoryId: Map<string, SpendingRole>,
): MoneyEconomicRoleRow {
  const amountCents = validCents(transaction.amountCents);
  const base = { transactionId: transaction.id, amountCents };

  if (transaction.moneyMeaning === 'transfer') {
    return { ...base, disposition: 'not_spending', contributions: [] };
  }

  if (transaction.direction === 'inflow' && transaction.pending) {
    return { ...base, disposition: 'not_spending', contributions: [] };
  }

  if (transaction.direction === 'inflow') {
    if (transaction.moneyMeaning === 'category_credit') {
      const role = transaction.categoryId ? roleByCategoryId.get(transaction.categoryId) : undefined;
      if (role) {
        return {
          ...base,
          disposition: 'not_spending',
          contributions: [{ role, amountCents, spendDeltaCents: -amountCents }],
        };
      }
      return { ...base, disposition: 'unresolved', contributions: [] };
    }
    return { ...base, disposition: 'not_spending', contributions: [] };
  }

  if (transaction.reviewState === 'not_counted' || transaction.moneyMeaning === 'not_counted') {
    return { ...base, disposition: 'outside_plan', contributions: [] };
  }

  if (transaction.allocations?.length) {
    const allocationTotalCents = transaction.allocations.reduce(
      (sum, allocation) => sum + validCents(allocation.amountCents),
      0,
    );
    const contributions = transaction.allocations.map((allocation) => {
      const role = roleByCategoryId.get(allocation.categoryId);
      return role
        ? { role, amountCents: validCents(allocation.amountCents), spendDeltaCents: validCents(allocation.amountCents) }
        : null;
    });
    if (allocationTotalCents === amountCents && contributions.every(isContribution)) {
      const resolved = contributions.filter(isContribution);
      return {
        ...base,
        disposition: resolved.every((contribution) => contribution.role === 'protected_spending')
          ? 'protected_spending'
          : 'flexible_spending',
        contributions: resolved,
      };
    }
    return { ...base, disposition: 'unresolved', contributions: [] };
  }

  const role = transaction.planRoleOverride === 'protected'
    ? 'protected_spending'
    : transaction.planRoleOverride === 'flexible'
      ? 'flexible_spending'
      : transaction.categoryId
        ? roleByCategoryId.get(transaction.categoryId)
        : undefined;
  if (role) {
    return {
      ...base,
      disposition: role,
      contributions: [{ role, amountCents, spendDeltaCents: amountCents }],
    };
  }

  const providerRole = providerEconomicRole(transaction);
  if (providerRole === 'not_spending') {
    return { ...base, disposition: 'not_spending', contributions: [] };
  }
  if (providerRole === 'protected_spending') {
    return {
      ...base,
      disposition: 'protected_spending',
      contributions: [{ role: 'protected_spending', amountCents, spendDeltaCents: amountCents }],
    };
  }

  return { ...base, disposition: 'unresolved', contributions: [] };
}

function providerEconomicRole(transaction: MoneyTransaction): 'not_spending' | 'protected_spending' | null {
  const primary = transaction.providerCategoryPrimary;
  const detailed = transaction.providerCategoryDetailed;
  if (detailed === 'TRANSFER_OUT_ACCOUNT_TRANSFER'
    || detailed === 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT') {
    return 'not_spending';
  }
  if (primary === 'RENT_AND_UTILITIES' || primary === 'INSURANCE' || primary === 'LOAN_PAYMENTS') {
    return 'protected_spending';
  }
  return null;
}

function isContribution(value: MoneyEconomicContribution | null): value is MoneyEconomicContribution {
  return value != null;
}

function validCents(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}
