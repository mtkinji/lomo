import { corsHeaders } from "../_shared/cors.ts";
import { getAuthenticatedUser } from "../_shared/supabase.ts";
import { syncPlaidTransactions } from "../_shared/plaid-sync.ts";
import {
  createSerialTaskRunner,
  syncPlaidConnectionBatch,
} from "../_shared/plaidSyncBatch.ts";

import { reconcileGovernedMoney } from "../_shared/governed-money.ts";

type SyncRequestBody = {
  connectionId?: string;
  repair?: boolean;
};

type SyncResult = Awaited<ReturnType<typeof syncPlaidTransactions>>;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405, headers: corsHeaders },
    );
  }

  try {
    const { supabase, user } = await getAuthenticatedUser(request);
    const body = (await request.json().catch(() => ({}))) as SyncRequestBody;
    const connectionId = typeof body.connectionId === "string"
      ? body.connectionId
      : undefined;
    const accessibleUserIds = await listAccessibleBudgetUserIds({
      supabase,
      userId: user.id,
    });

    const syncResults = connectionId
      ? [
        await syncPlaidTransactions({
          supabase,
          userId: user.id,
          connectionId,
          accessibleUserIds,
          repair: body.repair === true,
        }),
      ]
      : await syncAllPlaidConnections({
        supabase,
        userId: user.id,
        accessibleUserIds,
      });
    const sync = summarizeSyncResults(syncResults);

    return Response.json({ sync, connections: syncResults }, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("[sync-plaid-transactions] failed", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      plaid: (error as Error & { plaid?: unknown }).plaid,
    });
    return Response.json(
      {
        error: error instanceof Error
          ? error.message
          : "Unable to sync Plaid transactions.",
        plaid: (error as Error & { plaid?: unknown }).plaid,
      },
      {
        status: error instanceof NoPlaidConnectionError ? 404 : 500,
        headers: corsHeaders,
      },
    );
  }
});

async function syncAllPlaidConnections(params: {
  supabase: Parameters<typeof syncPlaidTransactions>[0]["supabase"];
  userId: string;
  accessibleUserIds: string[];
}): Promise<SyncResult[]> {
  const { data: connections, error } = await params.supabase
    .from("budget_financial_connections")
    .select("id")
    .in("user_id", params.accessibleUserIds)
    .not("status", "in", "(disconnected,disconnecting)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const connectionIds = (connections ?? [])
    .map((connection) => connection.id as string | null)
    .filter((id): id is string => Boolean(id));

  if (connectionIds.length === 0) {
    throw new NoPlaidConnectionError();
  }

  const runFoundation = createSerialTaskRunner();
  return syncPlaidConnectionBatch(connectionIds, (id) =>
    syncPlaidTransactions({
      supabase: params.supabase,
      userId: params.userId,
      connectionId: id,
      reconcileFoundation: (input) =>
        runFoundation(() => reconcileGovernedMoney(input)),
      accessibleUserIds: params.accessibleUserIds,
    }));
}

async function listAccessibleBudgetUserIds(params: {
  supabase: Parameters<typeof syncPlaidTransactions>[0]["supabase"];
  userId: string;
}): Promise<string[]> {
  const accessibleUserIds = new Set<string>([params.userId]);
  const { data: viewerMemberships, error: viewerMembershipsError } =
    await params.supabase
      .from("budget_household_members")
      .select("household_id")
      .eq("user_id", params.userId)
      .eq("status", "active");

  if (viewerMembershipsError) {
    if (isMissingHouseholdMembersTableError(viewerMembershipsError)) {
      return Array.from(accessibleUserIds);
    }
    throw new Error(viewerMembershipsError.message);
  }

  const householdIds = (viewerMemberships ?? [])
    .map((membership) => membership.household_id as string | null)
    .filter((householdId): householdId is string => Boolean(householdId));

  if (householdIds.length === 0) return Array.from(accessibleUserIds);

  const { data: householdMembers, error: householdMembersError } = await params
    .supabase
    .from("budget_household_members")
    .select("user_id")
    .in("household_id", householdIds)
    .eq("status", "active");

  if (householdMembersError) {
    throw new Error(householdMembersError.message);
  }

  (householdMembers ?? []).forEach((member) => {
    const userId = member.user_id as string | null;
    if (userId) accessibleUserIds.add(userId);
  });

  return Array.from(accessibleUserIds);
}

function isMissingHouseholdMembersTableError(
  error: { code?: string; message?: string },
): boolean {
  return (
    error.code === "PGRST205" ||
    error.message?.includes(
        "Could not find the table 'public.budget_household_members'",
      ) === true ||
    error.message?.includes(
        "Could not find the 'budget_household_members' table",
      ) === true
  );
}

function summarizeSyncResults(syncResults: SyncResult[]): SyncResult {
  return syncResults.reduce<SyncResult>(
    (summary, sync) => ({
      connectionId: summary.connectionId || sync.connectionId,
      added: summary.added + sync.added,
      modified: summary.modified + sync.modified,
      removed: summary.removed + sync.removed,
      hasMore: summary.hasMore || sync.hasMore,
      nextCursor: sync.nextCursor || summary.nextCursor,
      transactionCount: summary.transactionCount + sync.transactionCount,
    }),
    {
      connectionId: syncResults.length === 1
        ? syncResults[0]?.connectionId ?? ""
        : "all",
      added: 0,
      modified: 0,
      removed: 0,
      hasMore: false,
      nextCursor: "",
      transactionCount: 0,
    },
  );
}

class NoPlaidConnectionError extends Error {
  constructor() {
    super("No Plaid connection found.");
  }
}
