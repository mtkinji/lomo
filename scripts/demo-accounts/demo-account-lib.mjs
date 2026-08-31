const FIXTURE_TIMESTAMP = "2026-08-31T12:00:00.000Z";
const ALLOWED_MODES = new Set(["ensure", "reset", "preflight"]);

function requireString(value, label) {
  if (typeof value !== "string" || !value.trim())
    throw new Error(`${label} is required.`);
  return value.trim();
}

function unique(values, label) {
  if (new Set(values).size !== values.length)
    throw new Error(`${label} must be unique.`);
}

export function validateDemoFixture(fixture) {
  if (!fixture || typeof fixture !== "object")
    throw new Error("Demo fixture is required.");
  requireString(fixture.version, "fixture.version");
  requireString(fixture.cohort, "fixture.cohort");
  requireString(fixture.household?.id, "fixture.household.id");
  requireString(fixture.household?.name, "fixture.household.name");
  if (!Array.isArray(fixture.accounts) || fixture.accounts.length < 1) {
    throw new Error("fixture.accounts must contain at least one account.");
  }

  const aliases = [];
  const ids = [fixture.household.id];
  for (const key of [
    "chapterTemplateId",
    "chapterId",
    "mealPlanId",
    "choreProfileId",
    "budgetCategoryId",
    "budgetPlanId",
    "plaidConnectionId",
  ]) {
    ids.push(requireString(fixture.showcase?.[key], `fixture.showcase.${key}`));
  }
  if (
    !Array.isArray(fixture.showcase?.mealCandidateIds) ||
    fixture.showcase.mealCandidateIds.length !== 2
  ) {
    throw new Error(
      "fixture.showcase.mealCandidateIds must contain exactly two IDs.",
    );
  }
  for (const id of fixture.showcase.mealCandidateIds) {
    ids.push(requireString(id, "meal candidate ID"));
  }
  let ownerCount = 0;
  for (const [index, account] of fixture.accounts.entries()) {
    const prefix = `fixture.accounts[${index}]`;
    aliases.push(requireString(account.alias, `${prefix}.alias`));
    requireString(account.emailEnv, `${prefix}.emailEnv`);
    requireString(account.passwordEnv, `${prefix}.passwordEnv`);
    requireString(account.displayName, `${prefix}.displayName`);
    if (!["owner", "caregiver"].includes(account.role)) {
      throw new Error(`${prefix}.role must be owner or caregiver.`);
    }
    if (account.role === "owner") ownerCount += 1;
    for (const key of ["personId", "bindingId", "membershipId"]) {
      ids.push(requireString(account[key], `${prefix}.${key}`));
    }
    for (const domain of ["arc", "goal", "activity"]) {
      ids.push(requireString(account[domain]?.id, `${prefix}.${domain}.id`));
    }
  }
  if (ownerCount !== 1)
    throw new Error("Demo fixture must contain exactly one owner.");
  unique(aliases, "Demo aliases");
  unique(ids, "Deterministic fixture IDs");

  const serialized = JSON.stringify(fixture);
  if (/"(?:email|password)"\s*:/i.test(serialized)) {
    throw new Error(
      "Demo fixture may contain environment variable names, not credentials.",
    );
  }
  return fixture;
}

export function resolveAccountSecrets(fixture, env) {
  validateDemoFixture(fixture);
  const resolved = fixture.accounts.map((account) => {
    const email = requireString(
      env[account.emailEnv],
      account.emailEnv,
    ).toLowerCase();
    const password = requireString(
      env[account.passwordEnv],
      account.passwordEnv,
    );
    if (password.length < 12)
      throw new Error(`${account.passwordEnv} must be at least 12 characters.`);
    return { alias: account.alias, email, password, account };
  });
  unique(
    resolved.map(({ email }) => email),
    "Demo account emails",
  );
  return resolved;
}

function domainMetadata(fixture, alias) {
  return {
    demoFixtureVersion: fixture.version,
    demoCohort: fixture.cohort,
    demoAlias: alias,
  };
}

export function buildSeedRows(fixture, userIdsByAlias) {
  validateDemoFixture(fixture);
  const accounts = fixture.accounts.map((account) => {
    const userId = userIdsByAlias.get(account.alias);
    if (!userId)
      throw new Error(`No auth user was resolved for ${account.alias}.`);
    return { ...account, userId };
  });
  const owner = accounts.find((account) => account.role === "owner");
  const showcase = fixture.showcase;

  return {
    fixtureVersion: fixture.version,
    cohort: fixture.cohort,
    plaidConnectionIds: [showcase.plaidConnectionId],
    accounts: accounts.map((account) => ({
      alias: account.alias,
      userId: account.userId,
      personId: account.personId,
      bindingId: account.bindingId,
      membershipId: account.membershipId,
      arcId: account.arc.id,
      goalId: account.goal.id,
      activityId: account.activity.id,
      budgetCategoryIds:
        account.role === "owner" ? [fixture.showcase.budgetCategoryId] : [],
    })),
    people: accounts.map((account) => ({
      id: account.personId,
      display_name: account.displayName,
      kind: "adult",
      created_by_user_id: account.userId,
      updated_at: FIXTURE_TIMESTAMP,
    })),
    authBindings: accounts.map((account) => ({
      id: account.bindingId,
      person_id: account.personId,
      user_id: account.userId,
      status: "active",
    })),
    households: [
      {
        id: fixture.household.id,
        name: fixture.household.name,
        created_by_user_id: owner.userId,
        updated_at: FIXTURE_TIMESTAMP,
      },
    ],
    memberships: accounts.map((account) => ({
      id: account.membershipId,
      household_id: fixture.household.id,
      person_id: account.personId,
      role: account.role,
      status: "active",
      removed_at: null,
    })),
    arcs: accounts.map((account) => ({
      user_id: account.userId,
      id: account.arc.id,
      data: {
        ...account.arc,
        ...domainMetadata(fixture, account.alias),
        createdAt: FIXTURE_TIMESTAMP,
        updatedAt: FIXTURE_TIMESTAMP,
      },
      is_deleted: false,
      deleted_at: null,
      updated_at: FIXTURE_TIMESTAMP,
    })),
    goals: accounts.map((account) => ({
      user_id: account.userId,
      id: account.goal.id,
      data: {
        ...account.goal,
        arcId: account.arc.id,
        forceIntent: {},
        metrics: [],
        ...domainMetadata(fixture, account.alias),
        createdAt: FIXTURE_TIMESTAMP,
        updatedAt: FIXTURE_TIMESTAMP,
      },
      is_deleted: false,
      deleted_at: null,
      updated_at: FIXTURE_TIMESTAMP,
    })),
    activities: accounts.map((account) => ({
      user_id: account.userId,
      id: account.activity.id,
      data: {
        ...account.activity,
        goalId: account.goal.id,
        type: "task",
        tags: ["demo", "family"],
        ...domainMetadata(fixture, account.alias),
        createdAt: FIXTURE_TIMESTAMP,
        updatedAt: FIXTURE_TIMESTAMP,
      },
      is_deleted: false,
      deleted_at: null,
      updated_at: FIXTURE_TIMESTAMP,
    })),
    chapterTemplates: [
      {
        id: showcase.chapterTemplateId,
        user_id: owner.userId,
        name: "Weekly family reflection",
        kind: "reflection",
        cadence: "weekly",
        timezone: "America/Denver",
        filter_json: [],
        filter_group_logic: "or",
        email_enabled: false,
        detail_level: "short",
        tone: "gentle",
        enabled: true,
        updated_at: FIXTURE_TIMESTAMP,
      },
    ],
    chapters: [
      {
        id: showcase.chapterId,
        user_id: owner.userId,
        template_id: showcase.chapterTemplateId,
        period_start: "2026-08-24T00:00:00.000Z",
        period_end: "2026-08-31T00:00:00.000Z",
        period_key: `${fixture.version}:2026-W35`,
        input_summary: {
          fixtureVersion: fixture.version,
          completedActivities: 2,
        },
        metrics: {
          activities: { completed_count: 2 },
          time_shape: { active_days_count: 4 },
        },
        output_json: {
          title: "A steadier week",
          dek: "The household made the week visible early and shared two concrete responsibilities.",
          sections: [
            {
              key: "story",
              body: "A short reset created enough clarity for the household to share the load without over-planning the week.",
            },
            {
              key: "highlights",
              bullets: [
                "A short Sunday reset",
                "Two dinners with clear ownership",
              ],
            },
          ],
          demoFixtureVersion: fixture.version,
        },
        status: "ready",
        updated_at: FIXTURE_TIMESTAMP,
      },
    ],
    mealPlans: [
      {
        id: showcase.mealPlanId,
        household_id: fixture.household.id,
        organizer_membership_id: owner.membershipId,
        organizer_person_id: owner.personId,
        version: 1,
        state: "draft",
        horizon: { startDate: "2026-08-31", endDate: "2026-09-06" },
        organizer_note:
          "A simple fictional week with flexible family favorites.",
        updated_at: FIXTURE_TIMESTAMP,
      },
    ],
    mealPlanCandidates: [
      {
        id: showcase.mealCandidateIds[0],
        plan_id: showcase.mealPlanId,
        position: 0,
        kind: "meal_note",
        title: "Build-your-own taco night",
        recipe_snapshot: null,
        suggested_by_person_id: owner.personId,
      },
      {
        id: showcase.mealCandidateIds[1],
        plan_id: showcase.mealPlanId,
        position: 1,
        kind: "meal_note",
        title: "Sheet-pan vegetables and chicken",
        recipe_snapshot: null,
        suggested_by_person_id: owner.personId,
      },
    ],
    choreProfiles: [
      {
        id: showcase.choreProfileId,
        household_id: fixture.household.id,
        activity_owner_user_id: owner.userId,
        activity_series_id: owner.activity.id,
        definition_of_done:
          "The next week is visible and each adult owns one concrete responsibility.",
        participation: "open",
        photo_policy: "optional",
        review_policy: "trusted",
        token_value: 1,
        status: "active",
        created_by_membership_id: owner.membershipId,
        updated_at: FIXTURE_TIMESTAMP,
      },
    ],
    budgetCategories: [
      {
        id: showcase.budgetCategoryId,
        user_id: owner.userId,
        household_id: null,
        slug: "demo-family-food",
        legacy_budget_id: null,
        name: "Family food",
        icon_key: "cart",
        description: "Fictional planning data for the review household.",
        status: "active",
        sort_order: 0,
        updated_at: FIXTURE_TIMESTAMP,
      },
    ],
    budgetPlans: [
      {
        id: showcase.budgetPlanId,
        category_id: showcase.budgetCategoryId,
        user_id: owner.userId,
        cadence: "monthly",
        base_budget_cents: 85000,
        rollover_enabled: false,
        forecast_mode: "paced",
        status: "active",
        updated_at: FIXTURE_TIMESTAMP,
      },
    ],
  };
}

export async function manageDemoCohort({
  mode,
  fixture,
  env,
  authAdmin,
  dataStore,
  credentialVerifier,
  now = () => new Date().toISOString(),
}) {
  if (!ALLOWED_MODES.has(mode))
    throw new Error(`Unsupported demo-account mode: ${mode}`);
  validateDemoFixture(fixture);
  if (mode === "preflight" && typeof credentialVerifier !== "function") {
    throw new Error(
      "Preflight requires a credential verifier using a publishable key.",
    );
  }
  const secrets = resolveAccountSecrets(fixture, env);
  const userIdsByAlias = new Map();
  const receiptAccounts = [];

  for (const secret of secrets) {
    const existing = await authAdmin.findUserByEmail(secret.email);
    if (mode === "preflight") {
      if (!existing?.id)
        throw new Error(`Expected demo account ${secret.alias} was not found.`);
      userIdsByAlias.set(secret.alias, existing.id);
      receiptAccounts.push({
        alias: secret.alias,
        userId: existing.id,
        action: "checked",
      });
      continue;
    }

    if (existing?.id) {
      await authAdmin.updateUser(existing.id, {
        password: secret.password,
        user_metadata: { display_name: secret.account.displayName },
        app_metadata: {
          kwilt_demo_alias: secret.alias,
          kwilt_demo_fixture_version: fixture.version,
        },
      });
      userIdsByAlias.set(secret.alias, existing.id);
      receiptAccounts.push({
        alias: secret.alias,
        userId: existing.id,
        action: "updated",
      });
    } else {
      const created = await authAdmin.createUser({
        email: secret.email,
        password: secret.password,
        email_confirm: true,
        user_metadata: { display_name: secret.account.displayName },
        app_metadata: {
          kwilt_demo_alias: secret.alias,
          kwilt_demo_fixture_version: fixture.version,
        },
      });
      if (!created?.id)
        throw new Error(`Auth user creation failed for ${secret.alias}.`);
      userIdsByAlias.set(secret.alias, created.id);
      receiptAccounts.push({
        alias: secret.alias,
        userId: created.id,
        action: "created",
      });
    }
  }

  const rows = buildSeedRows(fixture, userIdsByAlias);
  if (mode === "reset") await dataStore.resetSeededRows(rows);
  if (mode !== "preflight") await dataStore.upsertSeededRows(rows);
  const dataVerification = await dataStore.verifySeededRows(rows);
  if (!dataVerification?.ok)
    throw new Error("Demo fixture verification failed.");

  if (mode === "preflight") {
    for (const secret of secrets) {
      await credentialVerifier({
        alias: secret.alias,
        email: secret.email,
        password: secret.password,
        expectedUserId: userIdsByAlias.get(secret.alias),
        cohortAccounts: rows.accounts,
      });
    }
  }

  return {
    mode,
    cohort: fixture.cohort,
    fixtureVersion: fixture.version,
    checkedAt: now(),
    accounts: receiptAccounts,
    verification: {
      data: "passed",
      credentials: mode === "preflight" ? "passed" : "not_run",
      counts: dataVerification.counts ?? {},
    },
  };
}
