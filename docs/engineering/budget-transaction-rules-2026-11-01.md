# Budget transaction rule repair

Status: local implementation; production deployment and native acceptance pending.
Source: `/Users/andrewwatanabe/Kwilt`, `codex/budget-reliability-checkpoint`, following `2c6fde0f`.
Parent: [Budget quality assessment](budget-quality-assessment-2026-11-01.md).

## Report and behavior

Andrew reported that Internal transfer has no save-as-rule opportunity and Partial match does not find text known to be present. The clarification identifies matching semantics, not disappearing keyboard input.

The category-only rule destination prevented transfer rules. Partial normalization retained only the first two meaningful words, discarding recipient names later in bank descriptions. Cleaned merchant names could also mask the original bank description.

The existing review drawer now offers Internal transfer as a rule destination for incoming and outgoing transfers. New partial rules preserve the complete entered pattern, normalize case/punctuation and search the merchant, original bank description and bank transaction name. Exact rules retain exact merchant matching. Existing rules remain on the legacy matching version; deployment does not rewrite their history.

The app and server use exact-first, most-recently-updated, then ID precedence. Category rules apply only to outflows. The save receipt distinguishes the saved rule from the effective rule for its source, so a new partial transfer cannot falsely displace an existing exact category in the confirmation UI. Confirmation patches only rule metadata; authoritative history totals still require reconciliation.

Splits, excluded transactions and explicit income, credit and non-spending meanings remain protected. Rule-owned transfers can be reconciled after a rule change/delete. Transfer classification clears incompatible spending coverage and category-role overrides. Canonical adult household authority and the existing Pro write trigger remain in force.

## Backend change

`supabase/migrations/20261102021916_transfer_and_literal_merchant_rules.sql` adds typed destinations and matching versions, an indexed exact-history path covering both directions, the versioned matching helper and v2 save RPC, and updated history/import triggers. The old category RPC retains its legacy matcher contract. Existing public-table RLS and grants are retained; new helper/RPC execute grants are explicit and deny anonymous access.

The release checker fingerprints all new implementations and trigger bindings, checks destination columns and required execute grants, and blocks releases without this contract. A narrow read-only missing-column fallback keeps legacy snapshots readable; writes never fall back to the old matching contract.

This requires a separate production approval. The previous approval covered category settings and household preview reads only. Applying this migration does not release an app. Rollback must account for new transfer/versioned rules before restoring older functions; dropping the added columns blindly would lose their intent.

## Evidence and remaining gates

- Regression-first tests reproduced late-description misses, the missing transfer offer, incorrect precedence, legacy-schema read failure and a legacy-category confirmation mismatch.
- Focused component tests exercise real inputs and rule actions with drawer/provider test substitutes: typed matching text, examples, transfer saves in both directions, rejected-save draft retention and dismissal without a write. These do not prove native keyboard or drawer behavior.
- The isolated PostgreSQL 17.11 runner tests existing-rule upgrades without history rewrites, partial descriptions behind cleaned merchants, transfer history/future imports, changed descriptions, rule precedence and deletion, old-client behavior, plan-coverage constraints, Pro rejection and owner/adult/child/unrelated/anonymous boundaries. It uses selected production DDL/functions plus documented auth/read/entitlement fixture substitutes, not a full Supabase replay.
- Read-only client/backend review found precedence, effective confirmation, category-alias, harness import and execute-grant coverage gaps; each was corrected with focused verification.
- Actual signed-JWT HTTP acceptance uses the production repository and Supabase client against disposable PostgREST, with synthetic identities and transaction rows only. See the [harness instructions](../../scripts/money/native-harness/README.md).
- Native typing, keyboard dismissal, save/reopen/relaunch, existing scroll/Dynamic Type acceptance, live signed-in persistence and installed-device behavior remain open. The Mac is locked; no new Simulator result is claimed.
- Production migration approval/deployment, updated live contract verification, release read-token transport and final CI/merge gates remain separate. No app upload or release is implied.

Final local completion pass: 251 related Jest suites, 1,765 tests passed and two
skipped; app/test typechecks, architecture, code-health, explicit grants,
release-contract checks and whitespace passed in 111.83 seconds. All nine checks
executed freshly for the 29-file delta against `2c6fde0f`; no files were omitted.
The separate rule HTTP acceptance and existing settings HTTP acceptance both
passed. Both read-only reviewers report no outstanding findings.

[Exact source hashes and evidence](evidence/budget-rules-2026-11-01.json) record the
proof boundaries. Live catalog preflight passes 49/61 checks; the 12 failures are
only the new, undeployed rule contract. All 46 previously deployed settings checks
still pass, and no existing rule has an invalid blank category destination.
The disposable API/PostgreSQL runtime was stopped after verification.

Uncached integration verification against `origin/main` passed: 1,319 Jest suites,
8,321 tests passed, two skipped and two snapshots; selected TypeScript, code-health,
Chat delivery/contracts, architecture, release/upload-policy and verification
tooling checks also passed. Hosted CI and the remaining native/production gates
are separate; this is not a merge or release receipt.
