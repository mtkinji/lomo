export function canSyncPlaidConnection(status: string): boolean {
  return ["linked", "syncing", "healthy", "error"].includes(status);
}

export function plaidFailureCode(error: unknown): string {
  const code = (error as { plaid?: { error_code?: unknown } } | null)?.plaid
    ?.error_code;
  return typeof code === "string" && /^[A-Z][A-Z0-9_]{1,79}$/.test(code)
    ? code
    : "SYNC_FAILED";
}

export function plaidWebhookAction(type: string, code: string) {
  if (
    type === "TRANSACTIONS" &&
    [
      "SYNC_UPDATES_AVAILABLE",
      "INITIAL_UPDATE",
      "HISTORICAL_UPDATE",
      "DEFAULT_UPDATE",
      "TRANSACTIONS_REMOVED",
    ].includes(code)
  ) return "sync";
  if (type !== "ITEM") return "ignore";
  if (
    ["PENDING_DISCONNECT", "PENDING_EXPIRATION", "NEW_ACCOUNTS_AVAILABLE"]
      .includes(code)
  ) return "repair";
  if (code === "USER_PERMISSION_REVOKED") return "revoked";
  if (code === "USER_ACCOUNT_REVOKED") return "repair";
  if (code === "ERROR") return "error";
  if (code === "LOGIN_REPAIRED") return "sync";
  return "ignore";
}

export type PlaidAccountIdentity = {
  persistent_account_id?: string;
  mask?: string;
  name?: string;
  type?: string;
  subtype?: string;
};

// Called only for the same owner, environment and provider-verified institution.
// Plaid recommends name + mask for non-TAN banks; masks alone are never sufficient.
export function possiblePlaidAccountMatch(
  a: PlaidAccountIdentity[],
  b: PlaidAccountIdentity[],
): boolean {
  if (!a.length || a.length !== b.length) return false;
  const identity = (account: PlaidAccountIdentity): string | null => {
    if (account.persistent_account_id) {
      return `persistent:${account.persistent_account_id}`;
    }
    if (!account.name || !account.mask || !account.type || !account.subtype) {
      return null;
    }
    return JSON.stringify([
      account.name,
      account.mask,
      account.type,
      account.subtype,
    ]);
  };
  const ids = a.map(identity).sort();
  const other = b.map(identity).sort();
  return ids.every((id, i) => id !== null && id === other[i]);
}

export function samePlaidAccounts(
  a: PlaidAccountIdentity[],
  b: PlaidAccountIdentity[],
): boolean {
  return a.length > 0 &&
    a.every((account) => Boolean(account.persistent_account_id)) &&
    b.every((account) => Boolean(account.persistent_account_id)) &&
    possiblePlaidAccountMatch(a, b);
}
