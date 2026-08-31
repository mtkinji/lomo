#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { hydratePlaidSandboxDemo } from "./demo-plaid-lib.mjs";

const fixture = JSON.parse(
  await readFile(new URL("./fixtures/review-household-v1.json", import.meta.url), "utf8"),
);

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function legacyJwtRole(key) {
  try {
    return JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString("utf8")).role;
  } catch {
    return null;
  }
}

function assertServiceRoleKey(key) {
  if (key.startsWith("sb_secret_") || legacyJwtRole(key) === "service_role") return;
  throw new Error("KWILT_DEMO_SERVICE_ROLE_KEY must be a server-only service-role key.");
}

function createSupabase(url, key) {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function throwOnError(result, operation) {
  if (result.error) throw new Error(`${operation} failed: ${result.error.message}`);
  return result.data;
}

function createAuthAdmin(client) {
  return {
    async findUserByEmail(email) {
      for (let page = 1; page <= 100; page += 1) {
        const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw new Error(`Auth user lookup failed: ${error.message}`);
        const match = data.users.find((user) => user.email?.trim().toLowerCase() === email);
        if (match) return match;
        if (data.users.length < 1000) return null;
      }
      throw new Error("Auth user lookup exceeded the bounded page limit.");
    },
  };
}

function createPlaidClient(clientId, secret) {
  const post = async (path, body) => {
    const response = await fetch(`https://sandbox.plaid.com${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, secret, ...body }),
    });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(`Plaid Sandbox request failed (${json.error_code ?? "sandbox_request_failed"}).`);
    }
    return json;
  };

  return {
    async createCustomItem({ institutionId, customUser }) {
      const created = await post("/sandbox/public_token/create", {
        institution_id: institutionId,
        initial_products: ["transactions"],
        options: {
          override_username: "user_custom",
          override_password: JSON.stringify(customUser),
        },
      });
      const exchanged = await post("/item/public_token/exchange", {
        public_token: created.public_token,
      });
      return { itemId: exchanged.item_id, accessToken: exchanged.access_token };
    },
    async syncTransactions(accessToken) {
      let cursor;
      let hasMore = true;
      const accountsById = new Map();
      const transactionsById = new Map();
      while (hasMore) {
        const page = await post("/transactions/sync", {
          access_token: accessToken,
          cursor,
          count: 100,
          options: { personal_finance_category_version: "v2" },
        });
        for (const account of page.accounts ?? []) accountsById.set(account.account_id, account);
        for (const transaction of [...(page.added ?? []), ...(page.modified ?? [])]) {
          transactionsById.set(transaction.transaction_id, transaction);
        }
        for (const removed of page.removed ?? []) transactionsById.delete(removed.transaction_id);
        cursor = page.next_cursor;
        hasMore = page.has_more === true;
      }
      return {
        accounts: [...accountsById.values()],
        transactions: [...transactionsById.values()],
        nextCursor: cursor,
      };
    },
    async removeItem(accessToken) {
      await post("/item/remove", { access_token: accessToken });
    },
  };
}

function createDataStore(client) {
  return {
    async replaceSandboxSnapshot(rows) {
      throwOnError(
        await client.from("budget_financial_connections").delete().eq("id", rows.connection.id),
        "Reset sample Money connection",
      );
      throwOnError(
        await client.from("budget_financial_connections").insert(rows.connection),
        "Insert sample Money connection",
      );
      const accounts = throwOnError(
        await client.from("budget_financial_accounts").insert(rows.accounts).select("id,plaid_account_id"),
        "Insert sample Money accounts",
      );
      const accountIds = new Map(accounts.map((account) => [account.plaid_account_id, account.id]));
      const transactions = rows.transactions.map((transaction) => ({
        ...transaction,
        financial_account_id: accountIds.get(transaction.plaid_account_id) ?? null,
      }));
      if (transactions.length) {
        throwOnError(
          await client.from("budget_transactions").insert(transactions),
          "Insert sample Money transactions",
        );
      }
    },
    async verifySandboxSnapshot(rows) {
      const count = async (table, column, value) => {
        const { count: result, error } = await client
          .from(table)
          .select("id", { count: "exact", head: true })
          .eq(column, value);
        if (error) throw new Error(`Verify ${table} failed: ${error.message}`);
        return result ?? 0;
      };
      const counts = {
        connections: await count("budget_financial_connections", "id", rows.connection.id),
        accounts: await count("budget_financial_accounts", "connection_id", rows.connection.id),
        transactions: await count("budget_transactions", "connection_id", rows.connection.id),
      };
      return {
        ok: counts.connections === 1
          && counts.accounts === rows.accounts.length
          && counts.transactions === rows.transactions.length,
        counts,
      };
    },
  };
}

function redactError(error, sensitiveValues) {
  let message = error instanceof Error ? error.message : "Unknown failure";
  for (const value of sensitiveValues.filter(Boolean)) message = message.split(value).join("[redacted]");
  return message;
}

try {
  const url = requiredEnv("KWILT_DEMO_SUPABASE_URL");
  const serviceRoleKey = requiredEnv("KWILT_DEMO_SERVICE_ROLE_KEY");
  const plaidClientId = requiredEnv("KWILT_DEMO_PLAID_CLIENT_ID");
  const plaidSecret = requiredEnv("KWILT_DEMO_PLAID_SANDBOX_SECRET");
  assertServiceRoleKey(serviceRoleKey);
  const adminClient = createSupabase(url, serviceRoleKey);
  const receipt = await hydratePlaidSandboxDemo({
    fixture,
    env: process.env,
    authAdmin: createAuthAdmin(adminClient),
    plaidClient: createPlaidClient(plaidClientId, plaidSecret),
    dataStore: createDataStore(adminClient),
  });
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
} catch (error) {
  const sensitiveValues = [
    process.env.KWILT_DEMO_SERVICE_ROLE_KEY,
    process.env.KWILT_DEMO_PLAID_CLIENT_ID,
    process.env.KWILT_DEMO_PLAID_SANDBOX_SECRET,
    ...fixture.accounts.flatMap((account) => [
      process.env[account.emailEnv],
      process.env[account.passwordEnv],
    ]),
  ];
  process.stderr.write(`Demo Plaid command failed: ${redactError(error, sensitiveValues)}\n`);
  process.exitCode = 1;
}
