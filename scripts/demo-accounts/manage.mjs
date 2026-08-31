#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { manageDemoCohort, validateDemoFixture } from "./demo-account-lib.mjs";

const mode = process.argv[2];
const fixture = JSON.parse(
  await readFile(
    new URL("./fixtures/review-household-v1.json", import.meta.url),
    "utf8",
  ),
);

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function legacyJwtRole(key) {
  try {
    const payload = JSON.parse(
      Buffer.from(key.split(".")[1], "base64url").toString("utf8"),
    );
    return payload.role;
  } catch {
    return null;
  }
}

function assertServiceRoleKey(key) {
  if (key.startsWith("sb_secret_") || legacyJwtRole(key) === "service_role")
    return;
  throw new Error(
    "KWILT_DEMO_SERVICE_ROLE_KEY must be a server-only service-role key.",
  );
}

function assertPublishableKey(key) {
  const role = legacyJwtRole(key);
  if (key.startsWith("sb_publishable_") || role === "anon") return;
  throw new Error(
    "KWILT_DEMO_PUBLISHABLE_KEY must be a client-safe publishable key.",
  );
}

function createSupabase(url, key) {
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function throwOnError(result, operation) {
  if (result.error)
    throw new Error(`${operation} failed: ${result.error.message}`);
  return result.data;
}

function createAuthAdmin(client) {
  return {
    async findUserByEmail(email) {
      for (let page = 1; page <= 100; page += 1) {
        const { data, error } = await client.auth.admin.listUsers({
          page,
          perPage: 1000,
        });
        if (error) throw new Error(`Auth user lookup failed: ${error.message}`);
        const match = data.users.find(
          (user) => user.email?.trim().toLowerCase() === email,
        );
        if (match) return match;
        if (data.users.length < 1000) return null;
      }
      throw new Error("Auth user lookup exceeded the bounded page limit.");
    },
    async createUser(input) {
      const { data, error } = await client.auth.admin.createUser(input);
      if (error) throw new Error(`Auth user creation failed: ${error.message}`);
      return data.user;
    },
    async updateUser(userId, input) {
      const { data, error } = await client.auth.admin.updateUserById(
        userId,
        input,
      );
      if (error) throw new Error(`Auth user update failed: ${error.message}`);
      return data.user;
    },
  };
}

async function deleteById(client, table, id) {
  throwOnError(
    await client.from(table).delete().eq("id", id),
    `Delete ${table}`,
  );
}

async function upsert(client, table, rows, onConflict = "id") {
  if (!rows.length) return;
  throwOnError(
    await client.from(table).upsert(rows, { onConflict }),
    `Upsert ${table}`,
  );
}

async function countIds(client, table, ids) {
  if (!ids.length) return 0;
  const data = throwOnError(
    await client.from(table).select("id").in("id", ids),
    `Verify ${table}`,
  );
  return data.length;
}

function createDataStore(client) {
  return {
    async resetSeededRows(rows) {
      for (const connectionId of rows.plaidConnectionIds) {
        await deleteById(client, "budget_financial_connections", connectionId);
      }
      for (const row of rows.choreProfiles) {
        await deleteById(client, "kwilt_chore_profiles", row.id);
      }
      for (const row of rows.mealPlans) {
        await deleteById(client, "kwilt_meal_plans", row.id);
      }
      for (const row of rows.chapterTemplates) {
        await deleteById(client, "kwilt_chapter_templates", row.id);
      }
      for (const row of rows.budgetCategories) {
        await deleteById(client, "budget_categories", row.id);
      }
      for (const account of rows.accounts) {
        for (const [table, id] of [
          ["kwilt_activities", account.activityId],
          ["kwilt_goals", account.goalId],
          ["kwilt_arcs", account.arcId],
        ]) {
          throwOnError(
            await client
              .from(table)
              .delete()
              .eq("user_id", account.userId)
              .eq("id", id),
            `Reset ${table}`,
          );
        }
      }
      for (const household of rows.households) {
        await deleteById(client, "kwilt_households", household.id);
      }
      for (const binding of rows.authBindings) {
        await deleteById(client, "kwilt_person_auth_bindings", binding.id);
      }
      for (const person of rows.people)
        await deleteById(client, "kwilt_people", person.id);
    },
    async upsertSeededRows(rows) {
      await upsert(client, "kwilt_people", rows.people);
      await upsert(client, "kwilt_person_auth_bindings", rows.authBindings);
      await upsert(client, "kwilt_households", rows.households);
      await upsert(client, "kwilt_household_memberships", rows.memberships);
      await upsert(client, "kwilt_arcs", rows.arcs, "user_id,id");
      await upsert(client, "kwilt_goals", rows.goals, "user_id,id");
      await upsert(client, "kwilt_activities", rows.activities, "user_id,id");
      await upsert(client, "kwilt_chapter_templates", rows.chapterTemplates);
      await upsert(client, "kwilt_chapters", rows.chapters);
      await upsert(client, "kwilt_meal_plans", rows.mealPlans);
      await upsert(
        client,
        "kwilt_meal_plan_candidates",
        rows.mealPlanCandidates,
      );
      await upsert(client, "kwilt_chore_profiles", rows.choreProfiles);
      await upsert(client, "budget_categories", rows.budgetCategories);
      await upsert(client, "budget_plans", rows.budgetPlans);
    },
    async verifySeededRows(rows) {
      const expected = {
        people: rows.people.length,
        authBindings: rows.authBindings.length,
        households: rows.households.length,
        memberships: rows.memberships.length,
        arcs: rows.arcs.length,
        goals: rows.goals.length,
        activities: rows.activities.length,
        chapterTemplates: rows.chapterTemplates.length,
        chapters: rows.chapters.length,
        mealPlans: rows.mealPlans.length,
        mealPlanCandidates: rows.mealPlanCandidates.length,
        choreProfiles: rows.choreProfiles.length,
        budgetCategories: rows.budgetCategories.length,
        budgetPlans: rows.budgetPlans.length,
      };
      const counts = {
        people: await countIds(
          client,
          "kwilt_people",
          rows.people.map(({ id }) => id),
        ),
        authBindings: await countIds(
          client,
          "kwilt_person_auth_bindings",
          rows.authBindings.map(({ id }) => id),
        ),
        households: await countIds(
          client,
          "kwilt_households",
          rows.households.map(({ id }) => id),
        ),
        memberships: await countIds(
          client,
          "kwilt_household_memberships",
          rows.memberships.map(({ id }) => id),
        ),
        arcs: await countIds(
          client,
          "kwilt_arcs",
          rows.arcs.map(({ id }) => id),
        ),
        goals: await countIds(
          client,
          "kwilt_goals",
          rows.goals.map(({ id }) => id),
        ),
        activities: await countIds(
          client,
          "kwilt_activities",
          rows.activities.map(({ id }) => id),
        ),
        chapterTemplates: await countIds(
          client,
          "kwilt_chapter_templates",
          rows.chapterTemplates.map(({ id }) => id),
        ),
        chapters: await countIds(
          client,
          "kwilt_chapters",
          rows.chapters.map(({ id }) => id),
        ),
        mealPlans: await countIds(
          client,
          "kwilt_meal_plans",
          rows.mealPlans.map(({ id }) => id),
        ),
        mealPlanCandidates: await countIds(
          client,
          "kwilt_meal_plan_candidates",
          rows.mealPlanCandidates.map(({ id }) => id),
        ),
        choreProfiles: await countIds(
          client,
          "kwilt_chore_profiles",
          rows.choreProfiles.map(({ id }) => id),
        ),
        budgetCategories: await countIds(
          client,
          "budget_categories",
          rows.budgetCategories.map(({ id }) => id),
        ),
        budgetPlans: await countIds(
          client,
          "budget_plans",
          rows.budgetPlans.map(({ id }) => id),
        ),
      };
      return {
        ok: Object.entries(expected).every(
          ([key, value]) => counts[key] === value,
        ),
        counts,
      };
    },
  };
}

function createCredentialVerifier(url, publishableKey) {
  return async ({ alias, email, password, expectedUserId, cohortAccounts }) => {
    const client = createSupabase(url, publishableKey);
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (error || data.user?.id !== expectedUserId) {
      throw new Error(`Credential verification failed for ${alias}.`);
    }
    const account = cohortAccounts.find(
      (candidate) => candidate.alias === alias,
    );
    const ownRows = throwOnError(
      await client
        .from("kwilt_arcs")
        .select("id")
        .eq("user_id", expectedUserId)
        .eq("id", account.arcId),
      `Own-data verification for ${alias}`,
    );
    if (ownRows.length !== 1)
      throw new Error(`Own-data verification failed for ${alias}.`);

    const otherUserIds = cohortAccounts
      .filter((candidate) => candidate.userId !== expectedUserId)
      .map((candidate) => candidate.userId);
    if (otherUserIds.length) {
      const leakedRows = throwOnError(
        await client
          .from("kwilt_arcs")
          .select("id")
          .in("user_id", otherUserIds),
        `Private-boundary verification for ${alias}`,
      );
      if (leakedRows.length)
        throw new Error(`Private-boundary verification failed for ${alias}.`);
    }
    const otherBudgetCategoryIds = cohortAccounts
      .filter((candidate) => candidate.userId !== expectedUserId)
      .flatMap((candidate) => candidate.budgetCategoryIds);
    if (otherBudgetCategoryIds.length) {
      const leakedMoneyRows = throwOnError(
        await client
          .from("budget_categories")
          .select("id")
          .in("id", otherBudgetCategoryIds),
        `Private Money boundary verification for ${alias}`,
      );
      if (leakedMoneyRows.length) {
        throw new Error(
          `Private Money boundary verification failed for ${alias}.`,
        );
      }
    }
    const memberships = throwOnError(
      await client
        .from("kwilt_household_memberships")
        .select("id")
        .eq("household_id", fixture.household.id),
      `Household-roster verification for ${alias}`,
    );
    if (memberships.length !== fixture.accounts.length) {
      throw new Error(`Household-roster verification failed for ${alias}.`);
    }
    const sampleConnections = throwOnError(
      await client
        .from("budget_financial_connections")
        .select("id,environment")
        .eq("id", fixture.showcase.plaidConnectionId),
      `Sample Money connection verification for ${alias}`,
    );
    const isOwner = account.budgetCategoryIds.length > 0;
    if (isOwner) {
      if (
        sampleConnections.length !== 1 ||
        sampleConnections[0]?.environment !== "sandbox"
      ) {
        throw new Error(`Sample Money connection verification failed for ${alias}.`);
      }
      const sampleTransactions = throwOnError(
        await client
          .from("budget_transactions")
          .select("id")
          .eq("connection_id", fixture.showcase.plaidConnectionId)
          .limit(1),
        `Sample Money transaction verification for ${alias}`,
      );
      if (sampleTransactions.length !== 1) {
        throw new Error(`Sample Money transaction verification failed for ${alias}.`);
      }
    } else if (sampleConnections.length !== 0) {
      throw new Error(`Private sample Money boundary failed for ${alias}.`);
    }
    await client.auth.signOut({ scope: "local" });
  };
}

function redactError(error, sensitiveValues) {
  let message = error instanceof Error ? error.message : "Unknown failure";
  for (const value of sensitiveValues.filter(Boolean))
    message = message.split(value).join("[redacted]");
  return message;
}

try {
  validateDemoFixture(fixture);
  const url = requiredEnv("KWILT_DEMO_SUPABASE_URL");
  const serviceRoleKey = requiredEnv("KWILT_DEMO_SERVICE_ROLE_KEY");
  assertServiceRoleKey(serviceRoleKey);
  const adminClient = createSupabase(url, serviceRoleKey);
  let credentialVerifier;
  if (mode === "preflight") {
    const publishableKey = requiredEnv("KWILT_DEMO_PUBLISHABLE_KEY");
    assertPublishableKey(publishableKey);
    credentialVerifier = createCredentialVerifier(url, publishableKey);
  }

  const receipt = await manageDemoCohort({
    mode,
    fixture,
    env: process.env,
    authAdmin: createAuthAdmin(adminClient),
    dataStore: createDataStore(adminClient),
    credentialVerifier,
  });
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
} catch (error) {
  const sensitiveValues = [
    process.env.KWILT_DEMO_SERVICE_ROLE_KEY,
    process.env.KWILT_DEMO_PUBLISHABLE_KEY,
    ...fixture.accounts.flatMap((account) => [
      process.env[account.emailEnv],
      process.env[account.passwordEnv],
    ]),
  ];
  process.stderr.write(
    `Demo-account command failed: ${redactError(error, sensitiveValues)}\n`,
  );
  process.exitCode = 1;
}
