import { assertEquals, assertRejects } from "jsr:@std/assert@1";
import {
  createServiceActionExecutionReceiptStore,
  createServiceDeviceHandoffPersistence,
} from "../serviceAgentRunPersistence.ts";

type QueryResult = { data: unknown; error: unknown };

class FakeQuery implements PromiseLike<QueryResult> {
  filters: Array<[string, unknown]> = [];
  writes: Array<
    { value: Record<string, unknown>; options?: Record<string, unknown> }
  > = [];
  constructor(
    private readonly result: QueryResult = { data: null, error: null },
  ) {}
  select(): this {
    return this;
  }
  eq(name: string, value: unknown): this {
    this.filters.push([name, value]);
    return this;
  }
  order(): this {
    return this;
  }
  limit(): PromiseLike<QueryResult> {
    return Promise.resolve(this.result);
  }
  maybeSingle(): PromiseLike<QueryResult> {
    return Promise.resolve(this.result);
  }
  insert(value: Record<string, unknown>): PromiseLike<{ error: unknown }> {
    this.writes.push({ value });
    return Promise.resolve({ error: this.result.error });
  }
  upsert(
    value: Record<string, unknown>,
    options?: Record<string, unknown>,
  ): PromiseLike<{ error: unknown }> {
    this.writes.push({ value, options });
    return Promise.resolve({ error: this.result.error });
  }
  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?:
      | ((value: QueryResult) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.result).then(onfulfilled, onrejected);
  }
}

Deno.test("service receipt persistence scopes replay lookup and uses the canonical idempotency key", async () => {
  const query = new FakeQuery();
  const admin = {
    from: () => query,
    rpc: () => Promise.resolve({ data: null, error: null }),
  };
  const store = createServiceActionExecutionReceiptStore({ admin });
  await store.load({
    actorId: "actor-1",
    operationId: "goals.update",
    requestId: "request-1",
  });
  assertEquals(query.filters, [
    ["actor_id", "actor-1"],
    ["operation_id", "goals.update"],
    ["request_id", "request-1"],
  ]);

  await store.save({
    receiptId: "receipt-1",
    actorId: "actor-1",
    householdId: "household-1",
    operationId: "goals.update",
    requestId: "request-1",
    source: "mcp",
    status: "completed",
    resultRefs: [{ kind: "goal", id: "goal-1" }],
    reversible: true,
    targetVersion: 3,
    provider: "server",
    retryable: false,
    reason: null,
    candidateSummary: null,
    replayed: false,
    createdAt: "2026-08-27T18:00:00.000Z",
  });
  assertEquals(query.writes[0].options, {
    onConflict: "actor_id,operation_id,request_id",
  });
  assertEquals(query.writes[0].value.result_refs, [{
    kind: "goal",
    id: "goal-1",
  }]);
});

Deno.test("service handoff persistence stores redacted arguments and bounded transitions", async () => {
  const query = new FakeQuery();
  const calls: Array<[string, Record<string, unknown>]> = [];
  const admin = {
    from: () => query,
    rpc: (name: string, args: Record<string, unknown>) => {
      calls.push([name, args]);
      return Promise.resolve({
        data: { state: "claimed", version: 2 },
        error: null,
      });
    },
  };
  const persistence = createServiceDeviceHandoffPersistence({ admin });
  await persistence.save({
    id: "handoff-1",
    actorId: "actor-1",
    householdId: "household-1",
    operationId: "screen_time.configure",
    requestId: "request-1",
    targetVersion: 2,
    state: "created",
    version: 1,
    redactedArguments: { opaqueSelectionToken: "raw-native-token" },
    resultRefs: [],
    createdAt: "2026-08-27T18:00:00.000Z",
    claimedAt: null,
    completedAt: null,
    cancelledAt: null,
    expiredAt: null,
    expiresAt: "2026-08-27T18:15:00.000Z",
  });
  assertEquals(query.writes[0].value.redacted_arguments, {
    opaqueSelectionToken: "[REDACTED]",
  });
  assertEquals(query.writes[0].options, {
    onConflict: "actor_id,operation_id,request_id",
    ignoreDuplicates: true,
  });

  await persistence.transition({
    handoffId: "handoff-1",
    from: "created",
    to: "claimed",
    expectedVersion: 1,
    occurredAt: "2026-08-27T18:01:00.000Z",
  });
  assertEquals(calls[0], ["transition_kwilt_conversational_action_handoff", {
    p_handoff_id: "handoff-1",
    p_from_state: "created",
    p_to_state: "claimed",
    p_expected_version: 1,
    p_result_refs: [],
    p_occurred_at: "2026-08-27T18:01:00.000Z",
  }]);
});

Deno.test("persistence reports database refusal without leaking the database error", async () => {
  const query = new FakeQuery({
    data: null,
    error: { message: "private database detail" },
  });
  const admin = {
    from: () => query,
    rpc: () => Promise.resolve({ data: null, error: null }),
  };
  const store = createServiceActionExecutionReceiptStore({ admin });
  await assertRejects(
    () =>
      store.load({
        actorId: "other-actor",
        operationId: "goals.update",
        requestId: "request-1",
      }),
    Error,
    "conversational_action_receipt_load_failed",
  );
});
