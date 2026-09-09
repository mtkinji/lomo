import { corsHeaders } from "../_shared/cors.ts";
import { type PlaidEnvironment, plaidPost } from "../_shared/plaid.ts";
import {
  getAuthenticatedUser,
  isAuthenticationError,
} from "../_shared/supabase.ts";
import {
  disconnectMoneyConnection,
  DisconnectMoneyConnectionError,
} from "./disconnectMoneyConnection.ts";

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }
  try {
    const { supabase, user } = await getAuthenticatedUser(request);
    const body = await request.json().catch(() => ({})) as Record<
      string,
      unknown
    >;
    const leaseToken = crypto.randomUUID();
    let environment: PlaidEnvironment = "production";
    const receipt = await disconnectMoneyConnection({
      userId: user.id,
      connectionId: body.connectionId,
      expectedUpdatedAt: body.expectedUpdatedAt,
    }, {
      async loadOwnedConnection(userId, connectionId) {
        const { data, error } = await supabase.from(
          "budget_financial_connections",
        )
          .select(
            "id,updated_at,status,environment,budget_financial_accounts(count)",
          )
          .eq("user_id", userId).eq("id", connectionId).maybeSingle();
        if (error || !data) return null;
        const accountRelation = data.budget_financial_accounts;
        const accountCount = Array.isArray(accountRelation)
          ? Number(
            (accountRelation[0] as { count?: unknown } | undefined)?.count ?? 0,
          )
          : 0;
        environment = data.environment as PlaidEnvironment;
        return {
          status: data.status,
          id: data.id,
          updatedAt: data.updated_at,
          accountCount,
        };
      },
      async reserve(connectionId, expectedUpdatedAt) {
        const { data, error } = await supabase.rpc(
          "acquire_budget_plaid_lease",
          {
            p_connection_id: connectionId,
            p_token: leaseToken,
            p_disconnect: true,
            p_expected_updated_at: expectedUpdatedAt,
          },
        );
        return !error && data === true;
      },
      async release(connectionId) {
        await supabase.from("budget_plaid_leases").delete().eq(
          "connection_id",
          connectionId,
        ).eq("token", leaseToken);
      },
      async loadAccessToken(connectionId) {
        const { data, error } = await supabase.rpc(
          "get_budget_plaid_access_token",
          {
            p_connection_id: connectionId,
          },
        );
        return error || typeof data !== "string" || !data.trim() ? null : data;
      },
      async removeProviderItem(accessToken) {
        try {
          await plaidPost(
            "/item/remove",
            { access_token: accessToken },
            environment,
          );
        } catch (error) {
          if (
            (error as { plaid?: { error_code?: string } }).plaid?.error_code !==
              "ITEM_NOT_FOUND"
          ) throw error;
        }
      },
      async markDisconnected({ connectionId }) {
        const { data, error } = await supabase.rpc(
          "finish_budget_plaid_disconnect",
          { p_connection_id: connectionId, p_token: leaseToken },
        );
        return error || typeof data !== "string" ? null : { confirmedAt: data };
      },
    });
    return json(receipt);
  } catch (error) {
    if (isAuthenticationError(error)) {
      return json({ error: error.message, code: "unauthorized" }, 401);
    }
    if (error instanceof DisconnectMoneyConnectionError) {
      return json({ error: error.message, code: error.code }, error.status);
    }
    console.error("[disconnect-money-connection] failed", {
      code: "PROVIDER_DISCONNECT_FAILED",
    });
    return json({
      error: "The financial provider could not confirm the disconnect.",
      code: "provider_disconnect_failed",
    }, 502);
  }
});
