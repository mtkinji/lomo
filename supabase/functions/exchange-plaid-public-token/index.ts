import { corsHeaders } from "../_shared/cors.ts";
import { getAuthenticatedUser } from "../_shared/supabase.ts";
import {
  assertPlaidEnvironmentAllowedForSupabase,
  getPlaidEnvironment,
  plaidPost,
} from "../_shared/plaid.ts";
import {
  possiblePlaidAccountMatch,
  samePlaidAccounts,
} from "../_shared/plaidLifecycle.ts";
import { syncPlaidTransactions } from "../_shared/plaid-sync.ts";

type LinkMetadata = {
  institution?: {
    institution_id?: string | null;
    name?: string | null;
  } | null;
  accounts?: Array<{
    id?: string;
    account_id?: string;
    name?: string;
    official_name?: string | null;
    mask?: string | null;
    type?: string | null;
    subtype?: string | null;
  }>;
};

type ExchangeRequestBody = {
  publicToken?: string;
  metadata?: LinkMetadata;
  allowPossibleDuplicate?: boolean;
};

type PublicTokenExchangeResponse = {
  access_token: string;
  item_id: string;
  request_id: string;
};

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

  let release: (() => Promise<void>) | undefined;
  let discard: (() => Promise<void>) | undefined;
  try {
    const { supabase, user } = await getAuthenticatedUser(request);
    const body =
      (await request.json().catch(() => ({}))) as ExchangeRequestBody;

    if (!body.publicToken) {
      return Response.json(
        { error: "Missing Plaid public token." },
        { status: 400, headers: corsHeaders },
      );
    }

    if (
      body.allowPossibleDuplicate !== true &&
      body.metadata?.institution?.institution_id &&
      body.metadata?.accounts?.length
    ) {
      const candidates = await supabase.from("budget_financial_connections")
        .select("id,budget_financial_accounts(name,mask,type,subtype)")
        .eq("user_id", user.id).eq("environment", getPlaidEnvironment()).eq(
          "institution_id",
          body.metadata.institution.institution_id,
        )
        .not("status", "in", "(disconnecting,disconnected)");
      if (candidates.error) throw candidates.error;
      if (
        (candidates.data ?? []).some((c) =>
          possiblePlaidAccountMatch(
            body.metadata!.accounts as Array<
              { name?: string; mask?: string; type?: string; subtype?: string }
            >,
            c.budget_financial_accounts,
          )
        )
      ) {
        return Response.json({
          error: "This bank may already be connected.",
          plaid: { error_code: "POSSIBLE_DUPLICATE_ITEM" },
        }, { status: 409, headers: corsHeaders });
      }
    }
    assertPlaidEnvironmentAllowedForSupabase();
    const exchanged = await plaidPost<PublicTokenExchangeResponse>(
      "/item/public_token/exchange",
      {
        public_token: body.publicToken,
      },
    );
    discard = async () => {
      await plaidPost("/item/remove", { access_token: exchanged.access_token });
    };
    // Bank identity comes from Plaid, never from client metadata.
    const verified = await plaidPost<
      {
        item: { institution_id: string | null };
        accounts: Array<
          {
            account_id: string;
            name: string;
            persistent_account_id?: string;
            mask?: string;
            type?: string;
            subtype?: string;
          }
        >;
      }
    >("/accounts/get", { access_token: exchanged.access_token });
    const institutionName = body.metadata?.institution?.name ??
      "Linked account";
    const institutionId = verified.item.institution_id;
    const environment = getPlaidEnvironment();

    const exchangeLease = crypto.randomUUID();
    const lockKey = `${environment}:${institutionId ?? "unknown"}`;
    const lock = await supabase.rpc("acquire_budget_plaid_exchange", {
      p_user_id: user.id,
      p_institution_id: lockKey,
      p_token: exchangeLease,
    });
    if (lock.error || lock.data !== true) {
      throw new Error(
        "A connection to this bank is already being saved. Try again shortly.",
      );
    }
    release = async () => {
      await supabase.from("budget_plaid_exchange_leases").delete().eq(
        "user_id",
        user.id,
      ).eq("institution_id", lockKey).eq("token", exchangeLease);
    };
    const renewExchange = async () => {
      const renewed = await supabase.from("budget_plaid_exchange_leases")
        .update({ expires_at: new Date(Date.now() + 180000).toISOString() })
        .eq("user_id", user.id).eq("institution_id", lockKey).eq(
          "token",
          exchangeLease,
        ).gt("expires_at", new Date().toISOString()).select("token")
        .maybeSingle();
      if (renewed.error || !renewed.data) {
        throw new Error("Bank connection save lease expired");
      }
    };
    const existing = await supabase.from("budget_financial_connections").select(
      "id,plaid_item_id,institution_name",
    )
      .eq("user_id", user.id).eq("environment", environment).eq(
        "institution_id",
        institutionId,
      )
      .not("status", "in", "(disconnecting,disconnected)");
    if (existing.error) throw existing.error;
    for (const prior of existing.data ?? []) {
      await renewExchange();
      if (prior.plaid_item_id === exchanged.item_id) continue;
      const priorToken = await supabase.rpc("get_budget_plaid_access_token", {
        p_connection_id: prior.id,
      });
      if (priorToken.error || !priorToken.data) continue;
      let priorAccounts;
      try {
        priorAccounts = await plaidPost<
          { accounts: Array<{ persistent_account_id?: string }> }
        >("/accounts/get", { access_token: priorToken.data });
      } catch {
        continue;
      } // An unavailable existing bank is not evidence of duplication.
      if (!samePlaidAccounts(verified.accounts, priorAccounts.accounts)) {
        continue;
      }
      await plaidPost("/item/remove", { access_token: exchanged.access_token });
      discard = undefined;
      const sync = await syncPlaidTransactions({
        supabase,
        userId: user.id,
        connectionId: prior.id,
      });
      return Response.json({
        connectionId: prior.id,
        institutionName: prior.institution_name,
        accountCount: verified.accounts.length,
        sync,
        requestId: exchanged.request_id,
      }, { headers: corsHeaders });
    }

    await renewExchange();
    const { data: connection, error: connectionError } = await supabase
      .from("budget_financial_connections")
      .upsert(
        {
          user_id: user.id,
          provider: "plaid",
          environment,
          plaid_item_id: exchanged.item_id,
          institution_id: institutionId,
          institution_name: institutionName,
          status: "syncing",
          products: ["transactions"],
        },
        { onConflict: "user_id,plaid_item_id" },
      )
      .select("id, institution_name")
      .single();

    if (connectionError || !connection) {
      throw new Error(
        connectionError?.message ?? "Unable to store Plaid connection.",
      );
    }

    const { error: tokenError } = await supabase.rpc(
      "store_budget_plaid_access_token",
      {
        p_connection_id: connection.id,
        p_access_token: exchanged.access_token,
      },
    );

    if (tokenError) {
      throw new Error(
        `Unable to store Plaid access token: ${tokenError.message}`,
      );
    }

    discard = undefined; // The durable connection now owns the token and queued recovery.
    const metadataAccounts = verified.accounts
      .map((account) => ({
        user_id: user.id,
        connection_id: connection.id,
        plaid_account_id: account.account_id,
        name: account.name ?? "Account",
        official_name: null,
        mask: account.mask ?? null,
        type: account.type ?? null,
        subtype: account.subtype ?? null,
        iso_currency_code: "USD",
      }))
      .filter((account) => Boolean(account.plaid_account_id));

    if (metadataAccounts.length > 0) {
      const { error: accountsError } = await supabase
        .from("budget_financial_accounts")
        .upsert(metadataAccounts, {
          onConflict: "connection_id,plaid_account_id",
        });

      if (accountsError) {
        throw new Error(
          `Unable to store Plaid accounts: ${accountsError.message}`,
        );
      }
    }

    const queued = await supabase.rpc("enqueue_budget_plaid_sync", {
      p_connection_id: connection.id,
    });
    if (queued.error) throw queued.error;
    const sync = await syncPlaidTransactions({
      supabase,
      userId: user.id,
      connectionId: connection.id,
    });

    return Response.json(
      {
        connectionId: connection.id,
        institutionName: connection.institution_name,
        accountCount: metadataAccounts.length,
        sync,
        requestId: exchanged.request_id,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    if (discard) {
      try {
        await discard();
      } catch {
        console.error("[exchange-plaid-public-token] orphan cleanup failed");
      }
    }
    return Response.json(
      {
        error: error instanceof Error
          ? error.message
          : "Unable to exchange Plaid public token.",
        plaid: (error as Error & { plaid?: unknown }).plaid,
      },
      { status: 500, headers: corsHeaders },
    );
  } finally {
    if (release) await release();
  }
});
