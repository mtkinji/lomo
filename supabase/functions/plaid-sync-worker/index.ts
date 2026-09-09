import { createServiceClient } from "../_shared/supabase.ts";
import { getPlaidEnvironment, plaidPost } from "../_shared/plaid.ts";
import { syncPlaidTransactions } from "../_shared/plaid-sync.ts";
import { plaidFailureCode } from "../_shared/plaidLifecycle.ts";

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response(null, { status: 405 });
  const secret =
    request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!/^[a-f0-9]{64}$/.test(secret)) {
    return new Response(null, { status: 401 });
  }
  const supabase = createServiceClient();
  const verified = await supabase.rpc("verify_budget_plaid_worker", {
    p_secret: secret,
  });
  if (verified.error || verified.data !== true) {
    return new Response(null, { status: 401 });
  }
  try {
    // Repair missed webhooks and register existing Items, without initializing paid products.
    const sweep = await supabase.rpc("sweep_budget_plaid_jobs", {
      p_environment: getPlaidEnvironment(),
    });
    if (sweep.error) throw sweep.error;
    const claimed = await supabase.rpc("claim_budget_plaid_jobs", {
      p_limit: 1,
      p_environment: getPlaidEnvironment(),
    });
    if (claimed.error) throw claimed.error;
    let succeeded = 0, failed = 0;
    for (const job of claimed.data ?? []) {
      let failure: string | null = null;
      try {
        const { data: c, error } = await supabase.from(
          "budget_financial_connections",
        ).select("id,user_id,environment,status,webhook_registered_at").eq(
          "id",
          job.connection_id,
        ).single();
        if (error || !c) throw new Error("Connection missing");
        if (c.environment !== getPlaidEnvironment()) {
          throw new Error("Environment mismatch");
        }
        if (
          !c.webhook_registered_at &&
          !["disconnecting", "disconnected"].includes(c.status)
        ) {
          const token = await supabase.rpc("get_budget_plaid_access_token", {
            p_connection_id: c.id,
          });
          if (token.error || !token.data) throw new Error("Token missing");
          await plaidPost("/item/webhook/update", {
            access_token: token.data,
            webhook: `${
              Deno.env.get("SUPABASE_URL")
            }/functions/v1/plaid-webhook`,
          });
          const saved = await supabase.from("budget_financial_connections")
            .update({ webhook_registered_at: new Date().toISOString() }).eq(
              "id",
              c.id,
            );
          if (saved.error) throw saved.error;
        }
        await syncPlaidTransactions({
          supabase,
          userId: c.user_id,
          connectionId: c.id,
        });
        succeeded++;
      } catch (error) {
        failure = plaidFailureCode(error);
        failed++;
        console.error("[plaid-sync-worker] job failed", { code: failure });
      }
      const result = await supabase.rpc("finish_budget_plaid_job", {
        p_connection_id: job.connection_id,
        p_token: job.lease_token,
        p_generation: job.generation,
        p_error: failure,
      });
      if (result.error) throw result.error;
    }
    return Response.json({ succeeded, failed });
  } catch {
    console.error("[plaid-sync-worker] queue unavailable");
    return new Response(null, { status: 503 });
  }
});
