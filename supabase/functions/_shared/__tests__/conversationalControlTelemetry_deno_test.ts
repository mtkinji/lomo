import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  conversationalControlEventForResult,
  conversationalControlHouseholdId,
  conversationalControlRateClass,
  createConversationalControlTelemetry,
  digestConversationalControlArguments,
} from "../conversationalControlTelemetry.ts";

class InsertQuery {
  writes: Record<string, unknown>[] = [];
  error: unknown = null;
  insert(value: Record<string, unknown>) {
    this.writes.push(value);
    return Promise.resolve({ error: this.error });
  }
}

Deno.test("audit digests stable redacted arguments without storing secrets", async () => {
  const first = await digestConversationalControlArguments({
    goalId: "goal-1", accessToken: "secret-token", nested: { phoneNumber: "+18015551212", value: 2 },
  });
  const second = await digestConversationalControlArguments({
    nested: { value: 2, phoneNumber: "+18015551212" }, accessToken: "different-secret", goalId: "goal-1",
  });
  assertEquals(first, second);

  const query = new InsertQuery();
  const rpcCalls: Array<[string, Record<string, unknown>]> = [];
  const telemetry = createConversationalControlTelemetry({
    admin: { from: () => query, rpc: (name, args) => {
      rpcCalls.push([name, args]);
      return Promise.resolve({ data: {}, error: null });
    } },
    now: () => "2026-08-28T20:00:00.000Z",
  });
  await telemetry.record({
    event: "completed", operationId: "goals.update", toolVersion: 1, catalogHash: "fnv1a:12345678",
    actorId: "actor-1", householdId: "household-1", oauthClientId: "chatgpt-client",
    channel: "mcp", provider: "server", requestId: "request-1", arguments: {
      accessToken: "secret-token", phoneNumber: "+18015551212", goalId: "goal-1",
    }, resultStatus: "completed", receiptId: "receipt-1", latencyMs: 42,
  });
  assertEquals(query.writes.length, 1);
  const serialized = JSON.stringify(query.writes[0]);
  assertEquals(serialized.includes("secret-token"), false);
  assertEquals(serialized.includes("+18015551212"), false);
  assertEquals(typeof query.writes[0]?.argument_digest, "string");
  assertEquals(query.writes[0]?.occurred_at, "2026-08-28T20:00:00.000Z");
  assertEquals(rpcCalls[0], ["record_kwilt_conversational_provider_outcome", {
    p_provider: "server", p_succeeded: true, p_error_code: null,
  }]);
});

Deno.test("authorization fails closed and preserves replay-safe database decisions", async () => {
  const calls: Array<[string, Record<string, unknown>]> = [];
  const telemetry = createConversationalControlTelemetry({
    admin: {
      from: () => new InsertQuery(),
      rpc: (name, args) => {
        calls.push([name, args]);
        return Promise.resolve({ data: { allowed: true, replayed: true, reason: null }, error: null });
      },
    },
  });
  assertEquals(await telemetry.authorize({
    operationId: "goals.update", actorId: "actor-1", oauthClientId: "chatgpt-client",
    channel: "mcp", provider: "server", requestId: "request-1", consequence: "medium",
  }), { allowed: true, replayed: true, reason: null });
  assertEquals(calls[0][0], "authorize_kwilt_conversational_control");

  const unavailable = createConversationalControlTelemetry({
    admin: { from: () => new InsertQuery(), rpc: () => Promise.resolve({ data: null, error: { code: "offline" } }) },
  });
  await assertRejects(() => unavailable.authorize({
    operationId: "goals.update", actorId: "actor-1", oauthClientId: null,
    channel: "mobile", provider: "server", requestId: "request-2", consequence: "medium",
  }), Error, "conversational_control_authorization_failed");
});

Deno.test("reconciliation delegates expiration and dead-letter recovery to one database boundary", async () => {
  const calls: Array<[string, Record<string, unknown>]> = [];
  const telemetry = createConversationalControlTelemetry({
    admin: { from: () => new InsertQuery(), rpc: (name, args) => {
      calls.push([name, args]);
      return Promise.resolve({ data: { expiredHandoffs: 2, deadLetters: 1 }, error: null });
    } },
  });
  assertEquals(await telemetry.reconcile({ staleAfterMinutes: 15, limit: 100 }), {
    expiredHandoffs: 2, deadLetters: 1,
  });
  assertEquals(calls[0], ["reconcile_kwilt_conversational_control", {
    p_stale_after_minutes: 15, p_limit: 100,
  }]);
});

Deno.test("result and consequence mapping preserve operationally distinct outcomes", () => {
  assertEquals(conversationalControlRateClass("low"), "low");
  assertEquals(conversationalControlRateClass("consequential"), "high");
  assertEquals(conversationalControlEventForResult({ status: "completed" }), "completed");
  assertEquals(conversationalControlEventForResult({ status: "proposed" }), "proposed");
  assertEquals(conversationalControlEventForResult({ status: "pending_client_action" }), "handoff");
  assertEquals(conversationalControlEventForResult({ status: "needs_input" }), "failed");
  assertEquals(conversationalControlEventForResult({ status: "failed", code: "stale_version" }), "stale_version_conflict");
  assertEquals(conversationalControlHouseholdId({ householdId: " household-1 " }), "household-1");
  assertEquals(conversationalControlHouseholdId({ householdId: "" }), null);
  assertEquals(conversationalControlHouseholdId({ nested: { householdId: "household-2" } }), null);
});
