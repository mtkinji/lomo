import { assertEquals } from "jsr:@std/assert@1";
import { exportJWK, generateKeyPair, SignJWT } from "npm:jose@6.1.0";
import { handlePlaidWebhook } from "../../plaid-webhook/handler.ts";

Deno.test("webhook HTTP boundary rejects unsigned callers before provider or database access", async () => {
  const response = await handlePlaidWebhook(
    new Request("https://example.test", { method: "POST", body: "{}" }),
  );
  assertEquals(response.status, 401);
});
Deno.test("signed delivery acknowledges only after durable enqueue, returning 503 for retry on failure", async () => {
  Deno.env.set("SUPABASE_URL", "https://fixture.supabase.co");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fixture");
  Deno.env.set("PLAID_ENV", "production");
  Deno.env.set("PLAID_CLIENT_ID", "fixture");
  Deno.env.set("PLAID_SECRET", "fixture");
  const pair = await generateKeyPair("ES256");
  const key = {
    ...await exportJWK(pair.publicKey),
    kid: "test",
    alg: "ES256",
    expired_at: null,
  };
  const body = JSON.stringify({
    item_id: "fixture",
    environment: "production",
    webhook_type: "TRANSACTIONS",
    webhook_code: "SYNC_UPDATES_AVAILABLE",
  });
  const digest = Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body)),
    ),
  ).map((x) => x.toString(16).padStart(2, "0")).join("");
  const jwt = await new SignJWT({
    iat: Math.floor(Date.now() / 1000),
    request_body_sha256: digest,
  }).setProtectedHeader({ alg: "ES256", kid: "test" }).sign(pair.privateKey);
  const original = globalThis.fetch;
  let enqueues = 0, fail = false;
  globalThis.fetch = (input) => {
    const url = String(input);
    if (url.includes("webhook_verification_key")) {
      return Promise.resolve(Response.json({ key }));
    }
    if (url.includes("enqueue_budget_plaid_sync")) {
      enqueues++;
      return Promise.resolve(
        fail
          ? Response.json({ message: "database unavailable" }, { status: 503 })
          : Response.json(null),
      );
    }
    return Promise.resolve(
      Response.json([{ id: "connection", status: "healthy" }]),
    );
  };
  const request = () =>
    new Request("https://example.test", {
      method: "POST",
      headers: { "Plaid-Verification": jwt },
      body,
    });
  try {
    assertEquals((await handlePlaidWebhook(request())).status, 200);
    assertEquals(enqueues, 1);
    fail = true;
    assertEquals((await handlePlaidWebhook(request())).status, 503);
    assertEquals(enqueues, 2);
  } finally {
    globalThis.fetch = original;
  }
});
