import type { SupabaseClient } from "npm:@supabase/supabase-js@2.78.0";
import { reconcileGovernedMoney } from "./governed-money.ts";
import { type PlaidEnvironment, plaidPost } from "./plaid.ts";
import { canSyncPlaidConnection, plaidFailureCode } from "./plaidLifecycle.ts";

type SyncResult = {
  connectionId: string;
  added: number;
  modified: number;
  removed: number;
  hasMore: boolean;
  nextCursor: string;
  transactionCount: number;
};

type PlaidAccount = {
  account_id: string;
  name: string;
  official_name?: string | null;
  mask?: string | null;
  type?: string | null;
  subtype?: string | null;
  iso_currency_code?: string | null;
};

type PlaidTransaction = {
  account_id: string;
  transaction_id: string;
  pending_transaction_id?: string | null;
  name: string;
  merchant_name?: string | null;
  original_description?: string | null;
  amount: number;
  authorized_date?: string | null;
  date: string;
  pending: boolean;
  iso_currency_code?: string | null;
  personal_finance_category?: {
    primary?: string | null;
    detailed?: string | null;
    confidence_level?: string | null;
  } | null;
};

type PlaidRemovedTransaction = {
  transaction_id: string;
};

type TransactionsSyncResponse = {
  accounts: PlaidAccount[];
  added: PlaidTransaction[];
  modified: PlaidTransaction[];
  removed: PlaidRemovedTransaction[];
  next_cursor: string;
  has_more: boolean;
};

function centsFromPlaidAmount(amount: number) {
  return Math.round(Math.abs(amount) * 100);
}

function directionFromPlaidAmount(amount: number) {
  return amount < 0 ? "inflow" : "outflow";
}

async function upsertAccounts(params: {
  supabase: SupabaseClient;
  userId: string;
  connectionId: string;
  accounts: PlaidAccount[];
}) {
  if (params.accounts.length === 0) return new Map<string, string>();

  const rows = params.accounts.map((account) => ({
    user_id: params.userId,
    connection_id: params.connectionId,
    plaid_account_id: account.account_id,
    name: account.name,
    official_name: account.official_name ?? null,
    mask: account.mask ?? null,
    type: account.type ?? null,
    subtype: account.subtype ?? null,
    iso_currency_code: account.iso_currency_code ?? "USD",
  }));

  const { data, error } = await params.supabase
    .from("budget_financial_accounts")
    .upsert(rows, { onConflict: "connection_id,plaid_account_id" })
    .select("id, plaid_account_id");

  if (error) {
    throw new Error(`Unable to store Plaid accounts: ${error.message}`);
  }

  return new Map(
    (data ?? []).map((
      account,
    ) => [account.plaid_account_id as string, account.id as string]),
  );
}

async function upsertTransactions(params: {
  supabase: SupabaseClient;
  userId: string;
  connectionId: string;
  accountIdByPlaidId: Map<string, string>;
  transactions: PlaidTransaction[];
}) {
  if (params.transactions.length === 0) return;

  const rows = params.transactions.map((transaction) => ({
    user_id: params.userId,
    connection_id: params.connectionId,
    financial_account_id:
      params.accountIdByPlaidId.get(transaction.account_id) ?? null,
    plaid_account_id: transaction.account_id,
    plaid_transaction_id: transaction.transaction_id,
    pending_transaction_id: transaction.pending_transaction_id ?? null,
    name: transaction.name,
    merchant_name: transaction.merchant_name ?? null,
    original_description: transaction.original_description ?? transaction.name,
    amount_cents: centsFromPlaidAmount(transaction.amount),
    direction: directionFromPlaidAmount(transaction.amount),
    authorized_date: transaction.authorized_date ?? null,
    date: transaction.date,
    pending: transaction.pending,
    iso_currency_code: transaction.iso_currency_code ?? "USD",
    personal_finance_category_primary:
      transaction.personal_finance_category?.primary ?? null,
    personal_finance_category_detailed:
      transaction.personal_finance_category?.detailed ?? null,
    personal_finance_category_confidence:
      transaction.personal_finance_category?.confidence_level ?? null,
  }));

  const { error } = await params.supabase
    .from("budget_transactions")
    .upsert(rows, { onConflict: "connection_id,plaid_transaction_id" });

  if (error) {
    throw new Error(`Unable to store Plaid transactions: ${error.message}`);
  }
}

async function syncLockedPlaidTransactions(params: {
  supabase: SupabaseClient;
  userId: string;
  connectionId: string;
  accessibleUserIds?: string[];
  leaseToken: string;
  healthRevision: number;
  deadline: number;
  repair?: boolean;
  reconcileFoundation?: typeof reconcileGovernedMoney;
}): Promise<SyncResult> {
  const { data: connection, error: connectionError } = await params.supabase
    .from("budget_financial_connections")
    .select("id, user_id, sync_cursor, environment, status, last_error")
    .eq("id", params.connectionId)
    .single();

  const connectionUserId = connection?.user_id as string | undefined;
  const canAccessConnection = connectionUserId === params.userId ||
    params.accessibleUserIds?.includes(connectionUserId ?? "") === true;

  if (
    connectionError || !connection || !connectionUserId || !canAccessConnection
  ) {
    throw new Error(connectionError?.message ?? "Plaid connection not found.");
  }

  if (!canSyncPlaidConnection(connection.status)) {
    throw new Error("Connection is disconnected");
  }
  const renew = async () => {
    const { data, error } = await params.supabase.rpc(
      "renew_budget_plaid_lease",
      { p_connection_id: params.connectionId, p_token: params.leaseToken },
    );
    if (error || data !== true) throw new Error("Connection lease lost");
  };

  const { data: accessToken, error: tokenError } = await params.supabase.rpc(
    "get_budget_plaid_access_token",
    {
      p_connection_id: params.connectionId,
    },
  );

  if (tokenError || !accessToken) {
    throw new Error(tokenError?.message ?? "Plaid access token not found.");
  }

  const originalCursor = (connection.sync_cursor as string | null) ?? null;
  if (params.repair) {
    const result = await plaidPost<
      { item: { error: unknown; consent_expiration_time?: string | null } }
    >(
      "/item/get",
      { access_token: accessToken },
      connection.environment as PlaidEnvironment,
    );
    if (result.item.error) {
      throw Object.assign(new Error("Bank repair is incomplete"), {
        plaid: result.item.error,
      });
    }
    if (
      ["PENDING_EXPIRATION", "PENDING_DISCONNECT"].includes(
        connection.last_error ?? "",
      ) &&
      (result.item.consent_expiration_time != null &&
        Date.parse(result.item.consent_expiration_time) <
          Date.now() + 8 * 24 * 3600000)
    ) throw new Error("Bank consent has not been extended");
    await plaidPost(
      "/accounts/get",
      { access_token: accessToken },
      connection.environment as PlaidEnvironment,
    );
  }
  let nextCursor = originalCursor ?? "";
  let added = 0;
  let modified = 0;
  let removed = 0;

  const staging = await params.supabase.from("budget_plaid_sync_staging")
    .select("*").eq("connection_id", params.connectionId).maybeSingle();
  if (staging.error) throw staging.error;
  let pages: TransactionsSyncResponse[] =
    staging.data?.base_cursor === originalCursor ? staging.data.pages : [];
  const healthRevision = staging.data?.base_cursor === originalCursor
    ? staging.data.health_revision
    : params.healthRevision;
  let complete = staging.data?.base_cursor === originalCursor &&
    staging.data.complete === true;
  let applied = staging.data?.base_cursor === originalCursor
    ? staging.data.applied_pages
    : 0;
  const checkpoint = async () => {
    await renew();
    const saved = await params.supabase.from("budget_plaid_sync_staging")
      .upsert({
        connection_id: params.connectionId,
        base_cursor: originalCursor,
        health_revision: healthRevision,
        pages,
        complete,
        applied_pages: applied,
      });
    if (saved.error) throw saved.error;
  };
  const checkDeadline = () => {
    if (Date.now() > params.deadline) {
      throw Object.assign(new Error("Import checkpoint saved"), {
        plaid: { error_code: "SYNC_CONTINUE" },
      });
    }
  };
  let mutationRetries = 0;
  while (!complete) {
    checkDeadline();
    await renew();
    try {
      const cursor = pages.at(-1)?.next_cursor ?? originalCursor;
      const page = await plaidPost<TransactionsSyncResponse>(
        "/transactions/sync",
        {
          access_token: accessToken,
          cursor: cursor ?? undefined,
          count: 500,
          options: { personal_finance_category_version: "v2" },
        },
        connection.environment as PlaidEnvironment,
      );
      if (page.has_more && (!page.next_cursor || page.next_cursor === cursor)) {
        throw new Error("Plaid cursor did not advance");
      }
      pages.push(page);
      complete = !page.has_more;
      await checkpoint();
    } catch (error) {
      if (
        plaidFailureCode(error) !==
          "TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION" ||
        ++mutationRetries > 2
      ) throw error;
      pages = [];
      applied = 0;
      complete = false;
      await checkpoint();
    }
  }
  for (const [index, response] of pages.entries()) {
    added += response.added?.length ?? 0;
    modified += response.modified?.length ?? 0;
    removed += response.removed?.length ?? 0;
    nextCursor = response.next_cursor;
    if (index < applied) continue;
    checkDeadline();
    await renew();
    const accountIdByPlaidId = await upsertAccounts({
      supabase: params.supabase,
      userId: connectionUserId,
      connectionId: params.connectionId,
      accounts: response.accounts ?? [],
    });

    await upsertTransactions({
      supabase: params.supabase,
      userId: connectionUserId,
      connectionId: params.connectionId,
      accountIdByPlaidId,
      transactions: [...(response.added ?? []), ...(response.modified ?? [])],
    });

    const removedIds = (response.removed ?? []).map((item) =>
      item.transaction_id
    );
    if (removedIds.length > 0) {
      const { error } = await params.supabase
        .from("budget_transactions")
        .delete()
        .eq("connection_id", params.connectionId)
        .in("plaid_transaction_id", removedIds);

      if (error) {
        throw new Error(
          `Unable to remove stale Plaid transactions: ${error.message}`,
        );
      }
    }

    applied = index + 1;
    await checkpoint();
  }

  const { count, error: countError } = await params.supabase
    .from("budget_transactions")
    .select("id", { count: "exact", head: true })
    .eq("connection_id", params.connectionId);

  if (countError) {
    throw new Error(
      `Unable to count synced transactions: ${countError.message}`,
    );
  }

  await renew();
  const completed = await params.supabase.rpc("finish_budget_plaid_sync", {
    p_connection_id: params.connectionId,
    p_token: params.leaseToken,
    p_revision: healthRevision,
    p_cursor: nextCursor,
    p_added: added,
    p_modified: modified,
    p_removed: removed,
    p_repaired: params.repair === true,
  });
  if (completed.error || completed.data !== true) {
    throw new Error("Unable to confirm Plaid sync state");
  }

  await params.supabase.from("budget_plaid_sync_staging").delete().eq(
    "connection_id",
    params.connectionId,
  );
  await (params.reconcileFoundation ?? reconcileGovernedMoney)({
    supabase: params.supabase,
    userId: connectionUserId,
  });

  return {
    connectionId: params.connectionId,
    added,
    modified,
    removed,
    hasMore: false,
    nextCursor,
    transactionCount: count ?? 0,
  };
}

export async function syncPlaidTransactions(params: {
  supabase: SupabaseClient;
  userId: string;
  connectionId: string;
  accessibleUserIds?: string[];
  repair?: boolean;
  reconcileFoundation?: typeof reconcileGovernedMoney;
}): Promise<SyncResult> {
  // Authorize before claiming a lease or writing health.
  const { data: connection, error } = await params.supabase.from(
    "budget_financial_connections",
  )
    .select("user_id,status,health_revision").eq("id", params.connectionId)
    .single();
  if (
    error || !connection ||
    !(connection.user_id === params.userId ||
      params.accessibleUserIds?.includes(connection.user_id))
  ) throw new Error("Plaid connection not found");
  if (params.repair && connection.user_id !== params.userId) {
    throw new Error("Only the owner can repair this connection");
  }
  if (!canSyncPlaidConnection(connection.status)) {
    throw new Error("Connection is disconnected");
  }
  const token = crypto.randomUUID();
  const claimed = await params.supabase.rpc("acquire_budget_plaid_lease", {
    p_connection_id: params.connectionId,
    p_token: token,
  });
  if (claimed.error || claimed.data !== true) {
    throw Object.assign(new Error("Connection is already being checked"), {
      plaid: { error_code: "SYNC_BUSY" },
    });
  }
  try {
    return await syncLockedPlaidTransactions({
      ...params,
      leaseToken: token,
      healthRevision: connection.health_revision,
      deadline: Date.now() + 90000,
    });
  } catch (error) {
    const code = plaidFailureCode(error);
    if (code === "SYNC_CONTINUE") {
      const queued = await params.supabase.rpc("enqueue_budget_plaid_sync", {
        p_connection_id: params.connectionId,
      });
      if (queued.error) throw new Error("Unable to queue import continuation");
    }
    if (code !== "SYNC_CONTINUE") {
      await params.supabase.rpc("finish_budget_plaid_sync", {
        p_connection_id: params.connectionId,
        p_token: token,
        p_revision: connection.health_revision,
        p_cursor: null,
        p_added: 0,
        p_modified: 0,
        p_removed: 0,
        p_error: code,
      });
    }
    throw error;
  } finally {
    await params.supabase.from("budget_plaid_leases").delete().eq(
      "connection_id",
      params.connectionId,
    ).eq("token", token);
  }
}
