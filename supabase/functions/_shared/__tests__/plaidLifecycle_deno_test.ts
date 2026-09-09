import { assertEquals } from "jsr:@std/assert@1";
import {
  canSyncPlaidConnection,
  plaidFailureCode,
  plaidWebhookAction,
  possiblePlaidAccountMatch,
  samePlaidAccounts,
} from "../plaidLifecycle.ts";

Deno.test("disconnecting and disconnected connections cannot sync; recoverable errors can", () => {
  assertEquals(
    ["linked", "healthy", "error", "syncing", "disconnecting", "disconnected"]
      .map(canSyncPlaidConnection),
    [true, true, true, true, false, false],
  );
});
Deno.test("failure health stores a code, never a provider message or token", () => {
  assertEquals(
    plaidFailureCode(new Error("access-production-private")),
    "SYNC_FAILED",
  );
  assertEquals(
    plaidFailureCode({
      plaid: { error_code: "ITEM_LOGIN_REQUIRED", error_message: "private" },
    }),
    "ITEM_LOGIN_REQUIRED",
  );
  assertEquals(
    plaidFailureCode({ plaid: { error_code: "secret-token" } }),
    "SYNC_FAILED",
  );
});
Deno.test("webhooks separate consent and data changes", () => {
  assertEquals(
    plaidWebhookAction("TRANSACTIONS", "SYNC_UPDATES_AVAILABLE"),
    "sync",
  );
  assertEquals(plaidWebhookAction("ITEM", "PENDING_DISCONNECT"), "repair");
  assertEquals(
    plaidWebhookAction("ITEM", "USER_PERMISSION_REVOKED"),
    "revoked",
  );
  assertEquals(plaidWebhookAction("ITEM", "ERROR"), "error");
  assertEquals(
    plaidWebhookAction("ITEM", "WEBHOOK_UPDATE_ACKNOWLEDGED"),
    "ignore",
  );
});
Deno.test("duplicate account detection requires exact persistent provider identity", () => {
  assertEquals(
    samePlaidAccounts([{ persistent_account_id: "one" }], [{
      persistent_account_id: "one",
    }]),
    true,
  );
  assertEquals(
    samePlaidAccounts([{ persistent_account_id: "one" }], [{
      persistent_account_id: "two",
    }]),
    false,
  );
  assertEquals(
    samePlaidAccounts([{ mask: "1234" }], [{ mask: "1234" }]),
    false,
  );
  assertEquals(samePlaidAccounts([], []), false);
});
Deno.test("non-TAN banks require a complete matching account signature, not mask alone", () => {
  const a = {
    name: "Checking",
    mask: "1234",
    type: "depository",
    subtype: "checking",
  };
  assertEquals(samePlaidAccounts([a], [{ ...a }]), false);
  assertEquals(possiblePlaidAccountMatch([a], [{ ...a }]), true);
  assertEquals(samePlaidAccounts([a], [{ ...a, name: "Savings" }]), false);
  assertEquals(
    samePlaidAccounts([{ ...a, persistent_account_id: "one" }], [{
      ...a,
      persistent_account_id: "two",
    }]),
    false,
  );
});
