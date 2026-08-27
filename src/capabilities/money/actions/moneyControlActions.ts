import type {
  ConfirmedCategoryWrite,
  ConfirmedTransactionPlanRoleWrite,
  ConfirmedTransactionWrite,
} from '../data/moneyRepository';
import type { MoneyCategoryPlanRole } from '../domain/moneyCategoryPlanRole';
import type { MoneySnapshot, MoneyTransaction } from '../data/moneySnapshot';
import type { TransactionMeaningReviewInput } from '../data/moneyMutations';
import { getEffectiveMoneyMeaning } from '../domain/transactionMeaning';
import { getTransactionPlanTreatment } from '../domain/transactionPlanTreatment';

export class MoneyAuthenticationRequiredError extends Error {
  constructor() { super('money_native_authentication_required'); }
}
export class MoneyConfirmationRequiredError extends Error {
  constructor() { super('money_confirmation_required'); }
}
export class MoneyTargetNotFoundError extends Error {
  constructor() { super('money_target_not_found'); }
}
export class MoneyTargetStaleError extends Error {
  constructor() { super('money_target_stale'); }
}

type ExpectedVersion = { expectedUpdatedAt: string };

export type MoneyControlActionBoundary = {
  loadSnapshot(): Promise<MoneySnapshot>;
  requireFreshAuthentication(): Promise<boolean>;
  updateCategoryPlan(
    categoryId: string,
    input: { budgetCents: number },
    version: ExpectedVersion,
  ): Promise<Pick<ConfirmedCategoryWrite, 'confirmedAt'>>;
  reviewTransactionMeaning(
    transactionId: string,
    input: TransactionMeaningReviewInput,
    version: ExpectedVersion,
  ): Promise<Pick<ConfirmedTransactionWrite, 'confirmedAt'>>;
  setTransactionPlanRoleOverride(
    transactionId: string,
    role: MoneyCategoryPlanRole | null,
    version: ExpectedVersion,
  ): Promise<Pick<ConfirmedTransactionPlanRoleWrite, 'confirmedAt'>>;
  reviewTransferPair(input: {
    transactionIds: [string, string];
    expectedUpdatedAt: string;
    decision: 'confirm_pair' | 'unpair';
  }): Promise<{ confirmedAt: string }>;
  disconnectConnection(
    connectionId: string,
    version: ExpectedVersion,
  ): Promise<{ confirmedAt: string; disconnectedAccountCount: number }>;
};

type CompletedReceipt<OperationId extends string, Result> = {
  operationId: OperationId;
  status: 'completed';
  resultRefs: Array<{ kind: string; id: string }>;
  reversible: boolean;
  result: Result;
};

function completed<OperationId extends string, Result>(
  operationId: OperationId,
  result: Result,
  resultRefs: Array<{ kind: string; id: string }>,
  reversible = true,
): CompletedReceipt<OperationId, Result> {
  return { operationId, status: 'completed', resultRefs, reversible, result };
}

function requireConfirmation(confirmed: boolean) {
  if (!confirmed) throw new MoneyConfirmationRequiredError();
}

function requireVersion(actual: string | undefined, expected: string) {
  if (!expected.trim() || actual !== expected) throw new MoneyTargetStaleError();
}

function transactionById(snapshot: MoneySnapshot, transactionId: string): MoneyTransaction {
  const id = transactionId.trim();
  const transaction = snapshot.transactions.find((candidate) => candidate.id === id);
  if (!transaction) throw new MoneyTargetNotFoundError();
  return transaction;
}

function transactionSummary(transaction: MoneyTransaction, snapshot: MoneySnapshot) {
  const explicit = transaction.moneyMeaning && transaction.moneyMeaning !== 'unknown'
    ? transaction.moneyMeaning
    : null;
  const effective = getEffectiveMoneyMeaning(transaction);
  const treatment = getTransactionPlanTreatment(transaction, snapshot.categories);
  return {
    id: transaction.id,
    displayName: transaction.merchantName,
    amountCents: transaction.amountCents,
    direction: transaction.direction,
    date: transaction.date,
    pending: transaction.pending,
    currencyCode: transaction.currencyCode,
    sourceClassification: {
      providerPrimary: transaction.providerCategoryPrimary ?? null,
      providerDetailed: transaction.providerCategoryDetailed ?? null,
      confidence: transaction.providerCategoryConfidence ?? null,
    },
    meaning: {
      explicit,
      effective: effective ?? null,
      basis: explicit ? 'user_confirmed' as const
        : effective === 'income' ? 'provider_inference' as const : 'unresolved' as const,
    },
    planTreatment: treatment,
    updatedAt: transaction.updatedAt ?? snapshot.generatedAt,
  };
}

type TransferSummary = {
  id: string;
  transactionIds: [string, string];
  amountCents: number;
  currencyCode: string;
  date: string;
  meaning: 'transfer' | 'unresolved';
  updatedAt: string;
};

function transferSummaries(snapshot: MoneySnapshot): TransferSummary[] {
  const byId = new Map(snapshot.transactions.map((transaction) => [transaction.id, transaction]));
  const seen = new Set<string>();
  const result: TransferSummary[] = [];
  snapshot.transactions.forEach((transaction) => {
    const counterpartId = transaction.transferPair?.counterpartTransactionId;
    if (!counterpartId) return;
    const ids = [transaction.id, counterpartId].sort() as [string, string];
    const id = ids.join(':');
    if (seen.has(id)) return;
    const counterpart = byId.get(counterpartId);
    if (!counterpart || counterpart.amountCents !== transaction.amountCents
      || counterpart.currencyCode !== transaction.currencyCode) return;
    seen.add(id);
    result.push({
      id,
      transactionIds: ids,
      amountCents: transaction.amountCents,
      currencyCode: transaction.currencyCode,
      date: [transaction.date, counterpart.date].sort()[0],
      meaning: transaction.moneyMeaning === 'transfer' && counterpart.moneyMeaning === 'transfer'
        ? 'transfer' : 'unresolved',
      updatedAt: [
        transaction.updatedAt ?? snapshot.generatedAt,
        counterpart.updatedAt ?? snapshot.generatedAt,
      ].sort().at(-1)!,
    });
  });
  return result.sort((left, right) => right.date.localeCompare(left.date) || left.id.localeCompare(right.id));
}

export function createMoneyControlActions(boundary: MoneyControlActionBoundary) {
  const requests = new Map<string, Promise<unknown>>();

  const authorize = async () => {
    if (!(await boundary.requireFreshAuthentication())) throw new MoneyAuthenticationRequiredError();
  };

  const mutate = <T>(requestId: string, confirmed: boolean, execute: () => Promise<T>): Promise<T> => {
    const id = requestId.trim();
    if (!id) return Promise.reject(new Error('money_request_id_required'));
    const existing = requests.get(id);
    if (existing) return existing as Promise<T>;
    const operation = (async () => {
      requireConfirmation(confirmed);
      await authorize();
      return execute();
    })();
    requests.set(id, operation);
    return operation;
  };

  return {
    async readBudget() {
      await authorize();
      const snapshot = await boundary.loadSnapshot();
      const result = {
        month: snapshot.generatedAt.slice(0, 7),
        periodLabel: snapshot.periodLabel,
        plannedCents: snapshot.totals.plannedCents,
        categories: snapshot.categories.map((category) => ({
          id: category.sourceId,
          name: category.name,
          plannedCents: category.plannedCents,
          updatedAt: category.updatedAt ?? snapshot.generatedAt,
        })),
        observedAt: snapshot.generatedAt,
      };
      return completed('money.budget.read', result, result.categories.map((category) => ({
        kind: 'money_category', id: category.id,
      })));
    },

    updateBudget(input: {
      requestId: string; confirmed: boolean; month: string; categoryId: string;
      expectedUpdatedAt: string; plannedCents: number;
    }) {
      return mutate(input.requestId, input.confirmed, async () => {
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.month)
          || !Number.isSafeInteger(input.plannedCents) || input.plannedCents < 0) {
          throw new Error('invalid_money_budget_diff');
        }
        const snapshot = await boundary.loadSnapshot();
        if (snapshot.generatedAt.slice(0, 7) !== input.month) throw new MoneyTargetStaleError();
        const category = snapshot.categories.find((candidate) => candidate.sourceId === input.categoryId.trim());
        if (!category) throw new MoneyTargetNotFoundError();
        requireVersion(category.updatedAt, input.expectedUpdatedAt);
        const receipt = await boundary.updateCategoryPlan(
          category.sourceId,
          { budgetCents: input.plannedCents },
          { expectedUpdatedAt: input.expectedUpdatedAt },
        );
        return completed('money.budget.update', {
          categoryId: category.sourceId,
          name: category.name,
          previousPlannedCents: category.plannedCents,
          plannedCents: input.plannedCents,
          updatedAt: receipt.confirmedAt,
        }, [{ kind: 'money_category', id: category.sourceId }]);
      });
    },

    async getTransaction(input: { transactionId: string }) {
      await authorize();
      const snapshot = await boundary.loadSnapshot();
      const result = transactionSummary(transactionById(snapshot, input.transactionId), snapshot);
      return completed('money.transaction.get', result, [{ kind: 'money_transaction', id: result.id }]);
    },

    updateTransactionMeaning(input: {
      requestId: string; confirmed: boolean; transactionId: string; expectedUpdatedAt: string;
      meaning: TransactionMeaningReviewInput['meaning']; categoryId?: string;
    }) {
      return mutate(input.requestId, input.confirmed, async () => {
        const snapshot = await boundary.loadSnapshot();
        const transaction = transactionById(snapshot, input.transactionId);
        requireVersion(transaction.updatedAt, input.expectedUpdatedAt);
        const meaning = input.meaning === 'category_credit'
          ? { meaning: 'category_credit' as const, categoryId: input.categoryId?.trim() ?? '' }
          : { meaning: input.meaning as 'income' | 'transfer' | 'not_counted' };
        const receipt = await boundary.reviewTransactionMeaning(
          transaction.id, meaning, { expectedUpdatedAt: input.expectedUpdatedAt },
        );
        return completed('money.transaction.meaning.update', {
          transactionId: transaction.id,
          priorMeaning: transaction.moneyMeaning,
          meaning: input.meaning,
          updatedAt: receipt.confirmedAt,
        }, [{ kind: 'money_transaction', id: transaction.id }]);
      });
    },

    updateTransactionPlanTreatment(input: {
      requestId: string; confirmed: boolean; transactionId: string; expectedUpdatedAt: string;
      treatment: MoneyCategoryPlanRole | 'default';
    }) {
      return mutate(input.requestId, input.confirmed, async () => {
        const snapshot = await boundary.loadSnapshot();
        const transaction = transactionById(snapshot, input.transactionId);
        requireVersion(transaction.updatedAt, input.expectedUpdatedAt);
        const role = input.treatment === 'default' ? null : input.treatment;
        if (role !== null && role !== 'protected' && role !== 'flexible') {
          throw new Error('invalid_money_plan_treatment');
        }
        const before = getTransactionPlanTreatment(transaction, snapshot.categories);
        const receipt = await boundary.setTransactionPlanRoleOverride(
          transaction.id, role, { expectedUpdatedAt: input.expectedUpdatedAt },
        );
        return completed('money.transaction.plan_treatment.update', {
          transactionId: transaction.id,
          priorTreatment: before.kind,
          treatment: input.treatment,
          updatedAt: receipt.confirmedAt,
        }, [{ kind: 'money_transaction', id: transaction.id }]);
      });
    },

    async listTransfers() {
      await authorize();
      const result = transferSummaries(await boundary.loadSnapshot());
      return completed('money.transfer.list', result, result.map((transfer) => ({
        kind: 'money_transfer', id: transfer.id,
      })));
    },

    async getTransfer(input: { transferId: string }) {
      await authorize();
      const result = transferSummaries(await boundary.loadSnapshot())
        .find((transfer) => transfer.id === input.transferId.trim());
      if (!result) throw new MoneyTargetNotFoundError();
      return completed('money.transfer.get', result, [{ kind: 'money_transfer', id: result.id }]);
    },

    reviewTransfer(input: {
      requestId: string; confirmed: boolean; transferId: string; expectedUpdatedAt: string;
      decision: 'confirm_pair' | 'unpair';
    }) {
      return mutate(input.requestId, input.confirmed, async () => {
        const snapshot = await boundary.loadSnapshot();
        const transfer = transferSummaries(snapshot).find((candidate) => candidate.id === input.transferId.trim());
        if (!transfer) throw new MoneyTargetNotFoundError();
        requireVersion(transfer.updatedAt, input.expectedUpdatedAt);
        const receipt = await boundary.reviewTransferPair({
          transactionIds: transfer.transactionIds,
          expectedUpdatedAt: input.expectedUpdatedAt,
          decision: input.decision,
        });
        return completed('money.transfer.review', {
          transferId: transfer.id,
          decision: input.decision,
          updatedAt: receipt.confirmedAt,
        }, [{ kind: 'money_transfer', id: transfer.id }]);
      });
    },

    disconnectConnection(input: {
      requestId: string; confirmed: boolean; connectionId: string; expectedUpdatedAt: string;
    }) {
      return mutate(input.requestId, input.confirmed, async () => {
        const snapshot = await boundary.loadSnapshot();
        const connection = (snapshot.connections ?? []).find((candidate) => candidate.id === input.connectionId.trim());
        if (!connection) throw new MoneyTargetNotFoundError();
        requireVersion(connection.updatedAt, input.expectedUpdatedAt);
        const receipt = await boundary.disconnectConnection(
          connection.id, { expectedUpdatedAt: input.expectedUpdatedAt },
        );
        return completed('money.connection.disconnect', {
          connectionId: connection.id,
          institutionName: connection.institutionName,
          disconnectedAccountCount: receipt.disconnectedAccountCount,
          updatedAt: receipt.confirmedAt,
        }, [{ kind: 'money_connection', id: connection.id }], false);
      });
    },
  };
}
