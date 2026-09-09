import {
  decodeProtectedHeader,
  importJWK,
  type JWK,
  jwtVerify,
} from "npm:jose@6.1.0";
export type PlaidVerificationKey = JWK & { expired_at?: number | null };

export async function verifyPlaidWebhook(
  body: Uint8Array,
  signature: string | null,
  loadKey: (kid: string) => Promise<PlaidVerificationKey>,
): Promise<void> {
  if (!signature || signature.length > 8192) {
    throw new Error("Missing Plaid signature");
  }
  const header = decodeProtectedHeader(signature);
  if (
    header.alg !== "ES256" || typeof header.kid !== "string" ||
    header.kid.length > 200
  ) throw new Error("Invalid Plaid signature header");
  const key = await loadKey(header.kid);
  if (key.expired_at != null || key.alg !== "ES256" || key.kid !== header.kid) {
    throw new Error("Invalid Plaid verification key");
  }
  const { payload } = await jwtVerify(
    signature,
    await importJWK(key, "ES256"),
    { algorithms: ["ES256"], maxTokenAge: "5 minutes", clockTolerance: 0 },
  );
  const expected = payload.request_body_sha256;
  if (typeof expected !== "string" || !/^[a-f0-9]{64}$/.test(expected)) {
    throw new Error("Invalid Plaid body hash");
  }
  const actual = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(body))),
  ).map((x) => x.toString(16).padStart(2, "0")).join("");
  let difference = 0;
  for (let i = 0; i < 64; i++) {
    difference |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  if (difference !== 0) throw new Error("Invalid Plaid body hash");
}
