import { assertEquals, assertRejects } from "jsr:@std/assert@1";
import { exportJWK, generateKeyPair, SignJWT } from "npm:jose@6.1.0";
import { verifyPlaidWebhook } from "../plaidWebhookVerification.ts";
const pair = await generateKeyPair("ES256");
const jwk = {
  ...await exportJWK(pair.publicKey),
  kid: "test-key",
  alg: "ES256",
  expired_at: null,
};
const body = new TextEncoder().encode(
  '{"item_id":"fixture","webhook_type":"TRANSACTIONS"}',
);
const digest = Array.from(
  new Uint8Array(await crypto.subtle.digest("SHA-256", body)),
).map((x) => x.toString(16).padStart(2, "0")).join("");
async function signed(iat = Math.floor(Date.now() / 1000), hash = digest) {
  return await new SignJWT({ iat, request_body_sha256: hash })
    .setProtectedHeader({ alg: "ES256", kid: "test-key" }).sign(
      pair.privateKey,
    );
}
Deno.test("accepts a valid Plaid signature over exact raw bytes", async () => {
  assertEquals(
    await verifyPlaidWebhook(body, await signed(), async () => jwk),
    undefined,
  );
});
Deno.test("rejects tampered payloads, expired/future JWTs and expired keys", async () => {
  await assertRejects(() =>
    verifyPlaidWebhook(
      new TextEncoder().encode("{}"),
      signedHeader,
      async () => jwk,
    )
  );
  await assertRejects(async () =>
    verifyPlaidWebhook(body, await signed(1), async () => jwk)
  );
  await assertRejects(async () =>
    verifyPlaidWebhook(
      body,
      await signed(Math.floor(Date.now() / 1000) + 600),
      async () => jwk,
    )
  );
  await assertRejects(async () =>
    verifyPlaidWebhook(
      body,
      await signed(),
      async () => ({ ...jwk, expired_at: 1 }),
    )
  );
});
const signedHeader = await signed();
Deno.test("missing signature fails before any key lookup", async () => {
  let reads = 0;
  await assertRejects(() =>
    verifyPlaidWebhook(body, null, async () => {
      reads++;
      return jwk;
    })
  );
  assertEquals(reads, 0);
});
