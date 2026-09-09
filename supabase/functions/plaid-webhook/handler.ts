import { createServiceClient } from "../_shared/supabase.ts";
import { getPlaidEnvironment, plaidPost } from "../_shared/plaid.ts";
import { plaidWebhookAction } from "../_shared/plaidLifecycle.ts";
import {
  type PlaidVerificationKey,
  verifyPlaidWebhook,
} from "../_shared/plaidWebhookVerification.ts";

export async function handlePlaidWebhook(request: Request): Promise<Response> {
  if (request.method !== "POST") return new Response(null, { status: 405 });
  if (!request.headers.get("plaid-verification")) {
    return new Response(null, { status: 401 });
  }
  const raw = new Uint8Array(await request.arrayBuffer());
  if (raw.length > 65536) return new Response(null, { status: 413 });
  try {
    await verifyPlaidWebhook(
      raw,
      request.headers.get("plaid-verification"),
      async (kid) => {
        const result = await plaidPost<{ key: PlaidVerificationKey }>(
          "/webhook_verification_key/get",
          { key_id: kid },
        );
        return result.key;
      },
    );
  } catch {
    return new Response(null, { status: 401 });
  }
  try {
    const body = JSON.parse(new TextDecoder().decode(raw));
    if (
      typeof body.item_id !== "string" ||
      body.environment !== getPlaidEnvironment()
    ) return new Response(null, { status: 200 });
    const action = plaidWebhookAction(body.webhook_type, body.webhook_code);
    if (action === "ignore") return new Response(null, { status: 200 });
    const supabase = createServiceClient();
    const { data: connections, error } = await supabase.from(
      "budget_financial_connections",
    )
      .select("id,status").eq("plaid_item_id", body.item_id).eq(
        "environment",
        body.environment,
      );
    if (error) throw error;
    for (const connection of connections ?? []) {
      if (["disconnecting", "disconnected"].includes(connection.status)) {
        continue;
      }
      if (action !== "sync") {
        const code = action === "error"
          ? body.error?.error_code
          : body.webhook_code;
        const safe =
          typeof code === "string" && /^[A-Z][A-Z0-9_]{1,79}$/.test(code)
            ? code
            : "ITEM_ERROR";
        const result = await supabase.rpc("record_budget_plaid_event", {
          p_connection_id: connection.id,
          p_code: safe,
        });
        if (result.error) throw result.error;
      }
      if (action === "sync") {
        const queued = await supabase.rpc("enqueue_budget_plaid_sync", {
          p_connection_id: connection.id,
        });
        if (queued.error) throw queued.error;
      }
    }
    return new Response(null, { status: 200 });
  } catch {
    console.error("[plaid-webhook] durable processing failed");
    return new Response(null, { status: 503 });
  }
}
