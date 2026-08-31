import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildSeedRows,
  manageDemoCohort,
  resolveAccountSecrets,
  validateDemoFixture,
} from "./demo-account-lib.mjs";

const fixture = JSON.parse(
  await readFile(
    new URL("./fixtures/review-household-v1.json", import.meta.url),
    "utf8",
  ),
);

const secretEnv = {
  KWILT_DEMO_OWNER_EMAIL: "owner@example.test",
  KWILT_DEMO_OWNER_PASSWORD: "owner-password-long",
  KWILT_DEMO_MEMBER_EMAIL: "member@example.test",
  KWILT_DEMO_MEMBER_PASSWORD: "member-password-long",
};

function createBoundary(existing = new Map()) {
  const calls = [];
  let nextId = 1;
  const authAdmin = {
    async findUserByEmail(email) {
      calls.push(["find", email]);
      return existing.get(email) ?? null;
    },
    async createUser(input) {
      calls.push(["create", input]);
      const user = { id: `created-user-${nextId++}`, email: input.email };
      existing.set(input.email, user);
      return user;
    },
    async updateUser(userId, input) {
      calls.push(["update", userId, input]);
      return { id: userId };
    },
  };
  const dataStore = {
    resetSeededRows: async (rows) => calls.push(["reset", rows]),
    upsertSeededRows: async (rows) => calls.push(["upsert", rows]),
    verifySeededRows: async (rows) => {
      calls.push(["verify", rows]);
      return { ok: true, counts: { accounts: rows.accounts.length } };
    },
  };
  return { authAdmin, dataStore, calls };
}

test("fixture is deterministic, paired, and private domain rows stay owner scoped", () => {
  validateDemoFixture(fixture);
  const rows = buildSeedRows(
    fixture,
    new Map([
      ["review-owner", "owner-user-id"],
      ["review-member", "member-user-id"],
    ]),
  );

  assert.equal(rows.households.length, 1);
  assert.equal(rows.memberships.length, 2);
  assert.equal(rows.chapters.length, 1);
  assert.equal(rows.mealPlanCandidates.length, 2);
  assert.equal(rows.choreProfiles.length, 1);
  assert.equal(rows.budgetPlans.length, 1);
  assert.equal(rows.budgetCategories[0].household_id, null);
  assert.match(rows.budgetCategories[0].description, /fictional planning data/i);
  assert.deepEqual(
    rows.arcs.map((row) => row.user_id),
    ["owner-user-id", "member-user-id"],
  );
  assert.deepEqual(
    rows.goals.map((row) => row.user_id),
    ["owner-user-id", "member-user-id"],
  );
  assert.ok(
    rows.arcs.every((row) => row.data.demoFixtureVersion === fixture.version),
  );
  assert.notEqual(rows.arcs[0].id, rows.arcs[1].id);
});

test("secret resolution fails closed and never stores secrets in the fixture", () => {
  assert.throws(
    () =>
      resolveAccountSecrets(fixture, {
        ...secretEnv,
        KWILT_DEMO_MEMBER_PASSWORD: "",
      }),
    /KWILT_DEMO_MEMBER_PASSWORD/,
  );
  assert.equal(JSON.stringify(fixture).includes("owner-password-long"), false);
});

test("ensure creates missing users, updates existing passwords, seeds, and returns a redacted receipt", async () => {
  const existing = new Map([
    [
      "member@example.test",
      { id: "existing-member", email: "member@example.test" },
    ],
  ]);
  const boundary = createBoundary(existing);

  const receipt = await manageDemoCohort({
    mode: "ensure",
    fixture,
    env: secretEnv,
    ...boundary,
    now: () => "2026-08-31T12:00:00.000Z",
  });

  assert.deepEqual(
    receipt.accounts.map(({ alias, action }) => ({ alias, action })),
    [
      { alias: "review-owner", action: "created" },
      { alias: "review-member", action: "updated" },
    ],
  );
  assert.equal(boundary.calls.filter(([name]) => name === "upsert").length, 1);
  assert.equal(boundary.calls.filter(([name]) => name === "reset").length, 0);
  const serialized = JSON.stringify(receipt);
  for (const sensitive of Object.values(secretEnv))
    assert.equal(serialized.includes(sensitive), false);
});

test("reset removes only the resolved deterministic cohort before reseeding", async () => {
  const existing = new Map([
    ["owner@example.test", { id: "owner-user", email: "owner@example.test" }],
    [
      "member@example.test",
      { id: "member-user", email: "member@example.test" },
    ],
  ]);
  const boundary = createBoundary(existing);

  await manageDemoCohort({
    mode: "reset",
    fixture,
    env: secretEnv,
    ...boundary,
  });

  const resetIndex = boundary.calls.findIndex(([name]) => name === "reset");
  const upsertIndex = boundary.calls.findIndex(([name]) => name === "upsert");
  assert.ok(resetIndex >= 0 && resetIndex < upsertIndex);
  const resetRows = boundary.calls[resetIndex][1];
  assert.deepEqual(
    resetRows.accounts.map((account) => account.userId),
    ["owner-user", "member-user"],
  );
  assert.deepEqual(
    resetRows.households.map((row) => row.id),
    [fixture.household.id],
  );
});

test("preflight never mutates and verifies both credentials", async () => {
  const existing = new Map([
    ["owner@example.test", { id: "owner-user", email: "owner@example.test" }],
    [
      "member@example.test",
      { id: "member-user", email: "member@example.test" },
    ],
  ]);
  const boundary = createBoundary(existing);
  const verifiedAliases = [];

  const receipt = await manageDemoCohort({
    mode: "preflight",
    fixture,
    env: secretEnv,
    ...boundary,
    credentialVerifier: async ({ alias }) => verifiedAliases.push(alias),
  });

  assert.deepEqual(verifiedAliases, ["review-owner", "review-member"]);
  assert.equal(
    boundary.calls.some(([name]) =>
      ["create", "update", "reset", "upsert"].includes(name),
    ),
    false,
  );
  assert.equal(receipt.verification.credentials, "passed");
});

test("preflight fails closed when an expected account or credential verifier is missing", async () => {
  const boundary = createBoundary(new Map());
  await assert.rejects(
    manageDemoCohort({
      mode: "preflight",
      fixture,
      env: secretEnv,
      ...boundary,
    }),
    /credential verifier/i,
  );
});
