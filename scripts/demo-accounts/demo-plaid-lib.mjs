import { resolveAccountSecrets, validateDemoFixture } from "./demo-account-lib.mjs";

function requireString(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required.`);
  }
  return value.trim();
}

function dateDaysAgo(today, daysAgo) {
  if (!Number.isInteger(daysAgo) || daysAgo < 0) {
    throw new Error("Plaid transaction daysAgo must be a non-negative integer.");
  }
  const date = new Date(`${today}T12:00:00.000Z`);
  if (!Number.isFinite(date.getTime())) throw new Error("today must be YYYY-MM-DD.");
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function validatePlaidFixture(fixture) {
  validateDemoFixture(fixture);
  const plaid = fixture.plaidSandbox;
  requireString(plaid?.ownerAlias, "fixture.plaidSandbox.ownerAlias");
  requireString(plaid?.institutionId, "fixture.plaidSandbox.institutionId");
  requireString(plaid?.institutionName, "fixture.plaidSandbox.institutionName");
  requireString(plaid?.seed, "fixture.plaidSandbox.seed");
  requireString(
    fixture.showcase?.plaidConnectionId,
    "fixture.showcase.plaidConnectionId",
  );
  if (!Array.isArray(plaid?.accounts) || plaid.accounts.length === 0) {
    throw new Error("fixture.plaidSandbox.accounts must not be empty.");
  }
  for (const account of plaid.accounts) {
    requireString(account.type, "Plaid account type");
    requireString(account.subtype, "Plaid account subtype");
    requireString(account.name, "Plaid account name");
    requireString(account.mask, "Plaid account mask");
    if (!Array.isArray(account.transactions) || account.transactions.length === 0) {
      throw new Error("Each Plaid account needs sample transactions.");
    }
  }
  return plaid;
}

export function buildPlaidCustomUser(fixture, today) {
  const plaid = validatePlaidFixture(fixture);
  return {
    version: 2,
    seed: plaid.seed,
    override_accounts: plaid.accounts.map((account) => ({
      type: account.type,
      subtype: account.subtype,
      starting_balance: account.startingBalance,
      currency: "USD",
      meta: {
        name: account.name,
        official_name: account.officialName ?? account.name,
        mask: account.mask,
      },
      transactions: account.transactions.map((transaction) => {
        const date = dateDaysAgo(today, transaction.daysAgo);
        return {
          date_transacted: date,
          date_posted: date,
          amount: transaction.amount,
          description: transaction.description,
          currency: "USD",
        };
      }),
    })),
  };
}

function mapPlaidTransaction(transaction) {
  return {
    plaid_account_id: transaction.account_id,
    plaid_transaction_id: transaction.transaction_id,
    pending_transaction_id: transaction.pending_transaction_id ?? null,
    name: transaction.name,
    merchant_name: transaction.merchant_name ?? null,
    original_description: transaction.original_description ?? transaction.name,
    amount_cents: Math.round(Math.abs(transaction.amount) * 100),
    direction: transaction.amount < 0 ? "inflow" : "outflow",
    authorized_date: transaction.authorized_date ?? null,
    date: transaction.date,
    pending: transaction.pending === true,
    iso_currency_code: transaction.iso_currency_code ?? "USD",
    personal_finance_category_primary:
      transaction.personal_finance_category?.primary ?? null,
    personal_finance_category_detailed:
      transaction.personal_finance_category?.detailed ?? null,
    personal_finance_category_confidence:
      transaction.personal_finance_category?.confidence_level ?? null,
  };
}

export async function hydratePlaidSandboxDemo({
  fixture,
  env,
  authAdmin,
  plaidClient,
  dataStore,
  sleep = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
  today = new Date().toISOString().slice(0, 10),
  now = () => new Date().toISOString(),
}) {
  const plaid = validatePlaidFixture(fixture);
  const accounts = resolveAccountSecrets(fixture, env);
  requireString(env.KWILT_DEMO_PLAID_CLIENT_ID, "KWILT_DEMO_PLAID_CLIENT_ID");
  requireString(
    env.KWILT_DEMO_PLAID_SANDBOX_SECRET,
    "KWILT_DEMO_PLAID_SANDBOX_SECRET",
  );
  const owner = accounts.find(({ alias }) => alias === plaid.ownerAlias);
  if (!owner) throw new Error("Plaid owner alias is not a demo account.");
  const authUser = await authAdmin.findUserByEmail(owner.email);
  if (!authUser?.id) {
    throw new Error("Create the demo owner account before hydrating Plaid data.");
  }

  const created = await plaidClient.createCustomItem({
    institutionId: plaid.institutionId,
    customUser: buildPlaidCustomUser(fixture, today),
  });
  const accessToken = requireString(created?.accessToken, "Plaid access token");
  const itemId = requireString(created?.itemId, "Plaid Item ID");

  try {
    const expectedAccountCount = plaid.accounts.length;
    const expectedTransactionCount = plaid.accounts.reduce(
      (total, account) => total + account.transactions.length,
      0,
    );
    let synced;
    for (let attempt = 1; attempt <= 20; attempt += 1) {
      synced = await plaidClient.syncTransactions(accessToken);
      if (
        synced.accounts.length >= expectedAccountCount &&
        synced.transactions.length >= expectedTransactionCount
      ) {
        break;
      }
      if (attempt < 20) await sleep(1_000);
    }
    if (
      !synced ||
      synced.accounts.length < expectedAccountCount ||
      synced.transactions.length < expectedTransactionCount
    ) {
      throw new Error(
        "Plaid Sandbox data was not ready before the bounded sync deadline.",
      );
    }
    const checkedAt = now();
    const rows = {
      connection: {
        id: fixture.showcase.plaidConnectionId,
        user_id: authUser.id,
        provider: "plaid",
        environment: "sandbox",
        plaid_item_id: itemId,
        institution_id: plaid.institutionId,
        institution_name: plaid.institutionName,
        status: "healthy",
        products: ["transactions"],
        sync_cursor: synced.nextCursor ?? null,
        last_synced_at: checkedAt,
        last_sync_added: synced.transactions.length,
        last_sync_modified: 0,
        last_sync_removed: 0,
        last_error: null,
        updated_at: checkedAt,
      },
      accounts: synced.accounts.map((account) => ({
        user_id: authUser.id,
        connection_id: fixture.showcase.plaidConnectionId,
        plaid_account_id: account.account_id,
        name: account.name,
        official_name: account.official_name ?? null,
        mask: account.mask ?? null,
        type: account.type ?? null,
        subtype: account.subtype ?? null,
        iso_currency_code: account.iso_currency_code ?? "USD",
      })),
      transactions: synced.transactions.map((transaction) => ({
        user_id: authUser.id,
        connection_id: fixture.showcase.plaidConnectionId,
        ...mapPlaidTransaction(transaction),
      })),
    };
    await dataStore.replaceSandboxSnapshot(rows);
    const verification = await dataStore.verifySandboxSnapshot(rows);
    if (!verification?.ok) {
      throw new Error("Plaid Sandbox demo verification failed.");
    }
    return {
      mode: "plaid-sandbox-hydrate",
      fixtureVersion: fixture.version,
      ownerAlias: owner.alias,
      checkedAt,
      source: "plaid-sandbox",
      liveConnection: false,
      temporaryItemRemoved: true,
      verification: {
        data: "passed",
        counts: verification.counts ?? {},
      },
    };
  } finally {
    await plaidClient.removeItem(accessToken);
  }
}
