import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildPlaidCustomUser,
  hydratePlaidSandboxDemo,
} from "./demo-plaid-lib.mjs";

const fixture = JSON.parse(
  await readFile(
    new URL("./fixtures/review-household-v1.json", import.meta.url),
    "utf8",
  ),
);

function readyPlaidSnapshot() {
  const accounts = fixture.plaidSandbox.accounts.map((account, accountIndex) => ({
    account_id: `plaid-account-${accountIndex}`,
    name: account.name,
    type: account.type,
    subtype: account.subtype,
  }));
  const transactions = fixture.plaidSandbox.accounts.flatMap(
    (account, accountIndex) =>
      account.transactions.map((transaction, transactionIndex) => ({
        account_id: `plaid-account-${accountIndex}`,
        transaction_id: `plaid-transaction-${accountIndex}-${transactionIndex}`,
        name: transaction.description,
        amount: transaction.amount,
        date: "2026-08-29",
        pending: false,
      })),
  );
  return { accounts, transactions, nextCursor: "ready-cursor" };
}

test("builds deterministic custom Plaid accounts with dates relative to hydration", () => {
  const customUser = buildPlaidCustomUser(fixture, "2026-08-31");
  assert.equal(customUser.seed, "kwilt-review-household-v1");
  assert.equal(customUser.override_accounts.length, 2);
  assert.equal(
    customUser.override_accounts[0].transactions[0].date_posted,
    "2026-08-29",
  );
  assert.equal(
    customUser.override_accounts[0].transactions[0].description,
    "Family Market",
  );
});

test("hydrates Plaid-shaped rows, removes the temporary Item, and returns no secrets", async () => {
  const calls = [];
  const receipt = await hydratePlaidSandboxDemo({
    fixture,
    env: {
      KWILT_DEMO_OWNER_EMAIL: "owner@example.test",
      KWILT_DEMO_OWNER_PASSWORD: "owner-password-long",
      KWILT_DEMO_MEMBER_EMAIL: "member@example.test",
      KWILT_DEMO_MEMBER_PASSWORD: "member-password-long",
      KWILT_DEMO_PLAID_CLIENT_ID: "client-sensitive",
      KWILT_DEMO_PLAID_SANDBOX_SECRET: "secret-sensitive",
    },
    authAdmin: {
      findUserByEmail: async () => ({ id: "owner-user" }),
    },
    plaidClient: {
      createCustomItem: async (input) => {
        calls.push(["create", input]);
        return { itemId: "sandbox-item", accessToken: "access-sensitive" };
      },
      syncTransactions: async () => ({
        ...readyPlaidSnapshot(),
        nextCursor: "cursor-sensitive",
      }),
      removeItem: async (accessToken) => calls.push(["remove", accessToken]),
    },
    dataStore: {
      replaceSandboxSnapshot: async (rows) => calls.push(["replace", rows]),
      verifySandboxSnapshot: async () => ({
        ok: true,
        counts: { connections: 1, accounts: 1, transactions: 1 },
      }),
    },
    today: "2026-08-31",
    now: () => "2026-08-31T12:00:00.000Z",
  });

  const replace = calls.find(([name]) => name === "replace")[1];
  assert.equal(replace.connection.environment, "sandbox");
  assert.equal(replace.connection.user_id, "owner-user");
  assert.equal(replace.transactions[0].direction, "outflow");
  assert.deepEqual(calls.at(-1), ["remove", "access-sensitive"]);
  const serialized = JSON.stringify(receipt);
  for (const secret of [
    "owner@example.test",
    "client-sensitive",
    "secret-sensitive",
    "access-sensitive",
    "cursor-sensitive",
  ]) {
    assert.equal(serialized.includes(secret), false);
  }
});

test("waits for Plaid's initial transaction sync instead of accepting an empty snapshot", async () => {
  let syncAttempts = 0;
  let replacedRows;
  await hydratePlaidSandboxDemo({
    fixture,
    env: {
      KWILT_DEMO_OWNER_EMAIL: "owner@example.test",
      KWILT_DEMO_OWNER_PASSWORD: "owner-password-long",
      KWILT_DEMO_MEMBER_EMAIL: "member@example.test",
      KWILT_DEMO_MEMBER_PASSWORD: "member-password-long",
      KWILT_DEMO_PLAID_CLIENT_ID: "client-sensitive",
      KWILT_DEMO_PLAID_SANDBOX_SECRET: "secret-sensitive",
    },
    authAdmin: {
      findUserByEmail: async () => ({ id: "owner-user" }),
    },
    plaidClient: {
      createCustomItem: async () => ({
        itemId: "sandbox-item",
        accessToken: "access-sensitive",
      }),
      syncTransactions: async () => {
        syncAttempts += 1;
        if (syncAttempts === 1) {
          return { accounts: [], transactions: [], nextCursor: null };
        }
        return readyPlaidSnapshot();
      },
      removeItem: async () => {},
    },
    dataStore: {
      replaceSandboxSnapshot: async (rows) => {
        replacedRows = rows;
      },
      verifySandboxSnapshot: async () => ({
        ok: true,
        counts: { connections: 1, accounts: 2, transactions: 18 },
      }),
    },
    sleep: async () => {},
    today: "2026-08-31",
  });

  assert.equal(syncAttempts, 2);
  assert.equal(replacedRows.accounts.length, 2);
  assert.equal(replacedRows.transactions.length, 18);
});

test("fails closed when Plaid credentials or the owner account are missing", async () => {
  await assert.rejects(
    hydratePlaidSandboxDemo({
      fixture,
      env: {},
      authAdmin: { findUserByEmail: async () => null },
      plaidClient: {},
      dataStore: {},
    }),
    /KWILT_DEMO_OWNER_EMAIL/,
  );
});
