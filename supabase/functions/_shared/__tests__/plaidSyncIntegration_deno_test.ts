import { assertEquals, assertRejects } from "jsr:@std/assert@1";
import { syncPlaidTransactions } from "../plaid-sync.ts";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.78.0";

function database(status = "healthy") {
  const connection: Record<string, unknown> = {
    id: "c",
    user_id: "u",
    status,
    environment: "production",
    sync_cursor: "start",
    health_revision: 0,
  };
  let staged: Record<string, unknown> | null = null;
  const writes: Array<{ table: string; value: unknown }> = [];
  const db = {
    auth: {
      admin: {
        getUserById: () =>
          Promise.resolve({ data: { user: { id: "u" } }, error: null }),
      },
    },
    rpc: (name: string, args?: Record<string, unknown>) => {
      if (name === "finish_budget_plaid_sync") {
        writes.push({ table: "budget_financial_connections", value: args });
        Object.assign(
          connection,
          args?.p_error ? { status: "error", last_error: args.p_error } : {
            status: "healthy",
            last_error: null,
            sync_cursor: args?.p_cursor,
          },
        );
      }
      return Promise.resolve({
        data: name === "get_budget_plaid_access_token"
          ? "private"
          : name === "reconcile_governed_household_money_foundation"
          ? { outcome: "reconciled_governed_foundation" }
          : true,
        error: null,
      });
    },
    from(table: string) {
      let action = "select", value: unknown;
      const query = {
        select: () => query,
        eq: () => query,
        not: () => query,
        in: () => query,
        upsert: (v: unknown) => {
          action = "upsert";
          value = v;
          return query;
        },
        update: (v: unknown) => {
          action = "update";
          value = v;
          return query;
        },
        delete: () => {
          action = "delete";
          return query;
        },
        single: () => query,
        maybeSingle: () => query,
        then(
          resolve: (result: unknown) => unknown,
          reject?: (error: unknown) => unknown,
        ) {
          if (table === "budget_plaid_sync_staging" && action === "upsert") {
            staged = structuredClone(value as Record<string, unknown>);
          }
          if (table === "budget_plaid_sync_staging" && action === "delete") {
            staged = null;
          }
          if (action !== "select") {
            writes.push({ table, value });
            if (
              table === "budget_financial_connections" && action === "update"
            ) Object.assign(connection, value);
          }
          return Promise.resolve({
            data: table === "budget_financial_connections"
              ? { ...connection }
              : table === "budget_plaid_sync_staging"
              ? staged
              : [],
            count: 0,
            error: null,
          }).then(resolve, reject);
        },
      };
      return query;
    },
  };
  return { db: db as unknown as SupabaseClient, connection, writes };
}
Deno.test("real sync boundary refuses disconnected and unauthorized records before token/provider access", async () => {
  const { db } = database("disconnected");
  await assertRejects(
    () =>
      syncPlaidTransactions({ supabase: db, userId: "u", connectionId: "c" }),
    Error,
    "disconnected",
  );
  await assertRejects(
    () =>
      syncPlaidTransactions({
        supabase: database().db,
        userId: "other",
        connectionId: "c",
      }),
    Error,
    "not found",
  );
});
Deno.test("real sync boundary persists safe failures and preserves the original cursor", async () => {
  const { db, connection } = database();
  const original = globalThis.fetch;
  Deno.env.set("PLAID_ENV", "production");
  Deno.env.set("PLAID_CLIENT_ID", "test");
  Deno.env.set("PLAID_SECRET", "test");
  globalThis.fetch = () =>
    Promise.resolve(
      Response.json({
        error_code: "ITEM_LOGIN_REQUIRED",
        error_message: "sensitive bank message",
      }, { status: 400 }),
    );
  try {
    await assertRejects(() =>
      syncPlaidTransactions({ supabase: db, userId: "u", connectionId: "c" })
    );
    assertEquals(connection.status, "error");
    assertEquals(connection.last_error, "ITEM_LOGIN_REQUIRED");
    assertEquals(connection.sync_cursor, "start");
  } finally {
    globalThis.fetch = original;
  }
});
Deno.test("real sync retries page mutation and only writes the successful page sequence", async () => {
  const { db, connection, writes } = database();
  let requests = 0;
  const original = globalThis.fetch;
  globalThis.fetch = () => {
    requests++;
    if (requests === 2) {
      return Promise.resolve(
        Response.json({
          error_code: "TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION",
        }, { status: 400 }),
      );
    }
    return Promise.resolve(
      Response.json({
        next_cursor: requests === 1 ? "intermediate" : "final",
        has_more: requests === 1,
        accounts: [],
        added: [],
        modified: [],
        removed: [],
      }),
    );
  };
  try {
    const result = await syncPlaidTransactions({
      supabase: db,
      userId: "u",
      connectionId: "c",
    });
    assertEquals(requests, 3);
    assertEquals(result.nextCursor, "final");
    assertEquals(connection.status, "healthy");
    assertEquals(
      writes.filter((w) => w.table === "budget_financial_connections").length,
      1,
    );
  } finally {
    globalThis.fetch = original;
  }
});

Deno.test("large imports resume checkpointed pages after a bounded invocation", async () => {
  const { db, connection } = database();
  const originalFetch = globalThis.fetch, originalNow = Date.now;
  let now = originalNow();
  Date.now = () => now;
  const cursors: unknown[] = [];
  globalThis.fetch = (_input, init) => {
    cursors.push(JSON.parse(String(init?.body)).cursor);
    if (cursors.length === 1) now += 91000;
    return Promise.resolve(
      Response.json({
        next_cursor: cursors.length === 1 ? "checkpoint" : "done",
        has_more: cursors.length === 1,
        accounts: [],
        added: [],
        modified: [],
        removed: [],
      }),
    );
  };
  try {
    await assertRejects(
      () =>
        syncPlaidTransactions({ supabase: db, userId: "u", connectionId: "c" }),
      Error,
      "checkpoint",
    );
    assertEquals(connection.status, "healthy");
    assertEquals(connection.sync_cursor, "start");
    const result = await syncPlaidTransactions({
      supabase: db,
      userId: "u",
      connectionId: "c",
    });
    assertEquals(cursors, ["start", "checkpoint"]);
    assertEquals(result.nextCursor, "done");
  } finally {
    globalThis.fetch = originalFetch;
    Date.now = originalNow;
  }
});
