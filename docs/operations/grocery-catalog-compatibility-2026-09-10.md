# Grocery catalog compatibility deployment — September 10, 2026

## Production state

- Project: Kwilt (`sqxwjtorodqjdfnuvprf`).
- `grocery-compile` v13 is ACTIVE, with `verify_jwt: true` retained.
- Deployed bundle SHA-256: `9623907b2f6910b734e902a69c808214a4c43a803e971706e85d950e68dbf8fa`.
- Applied migration: `20260910222443_accept_hosted_catalog_grocery_snapshots`.
- Downloaded deployed files match the reviewed six-file payload. The compiler validator is the only code difference from v12; the entrypoint, auth helper, CORS helper, hard-pass logic, and food-core dependency match v12.

## Cause and change

Moving a meal from Ideas to Planned invokes grocery compilation. The hosted catalog supplies SHA-256 content hashes and UUID ingredient IDs. The old compiler accepted only bundled `kwilt:<roster>:v<version>` hashes and recipe-prefixed ingredient IDs, raising `missing_recipe_version`. Production logs confirmed that error for the reported failures. The client discarded the response body and displayed the SDK's generic non-2xx message.

The compiler now recognizes both formats, keeping format-specific ingredient validation. The migration updates the equivalent hash checks in the finalized-plan and direct-recipe persistence functions. Existing function grants, security mode, search path, ownership, version, and ingredient-provenance checks are retained. No new security-advisor findings appeared after deployment.

## Verification and limits

- Regression-first compiler tests: the hosted cases failed before the repair; all 16 tests passed afterward.
- All 600 currently published mobile catalog recipes compiled through four compiler entry paths (2,400 checks).
- Predeployment local verification passed, including app/test types, backend checks, architecture checks, and 431 related Jest tests.
- The uncached `npm run verify:changed -- --run` executed app/test typechecks, 1,254 passing Jest suites (7,706 passed, 2 skipped), 149 passing backend tests, backend typechecking, product/chat checks, and code-map generation. It exited nonzero at an unrelated input-policy exception mismatch in `src/ui/Input.tsx` (current input at line 150 versus an exception at line 158). This does not certify the whole dirty checkout. Only the reviewed backend payload and migration were deployed.
- The rollback-only SQL regression passed against the migrated production database for bundled and hosted snapshots, including invalid-hash and unrelated-ingredient rejection. This exercises the SQL RPC request shape; it is not end-to-end proof of the direct-recipe app flow.
- The downloaded v13 compiler output passed the production move-to-Planned persistence operation for Classic BLT, Tuna noodle casserole, Korean beef and vegetable rice bowls, Honey-glazed carrots, and Huevos rancheros. All five transactions rolled back. The affected plan remained at version 147, with 5 Ideas and 2 Planned meals.
- Native Simulator and signed-device UI actions were not repeated in this deployment turn. The core fix is server-side and requires no new app build.
- Improved client error reporting remains in local source and requires a future app build to reach installed production clients.

## Source and local evidence

Source checkout: `/Users/andrewwatanabe/Kwilt`, branch `main`, HEAD `9baf1a4a8e14b83e806c1df9e25ee4d3e66d0678`, with unrelated uncommitted work preserved. This task made no Git commit, push, merge, worktree, or app release. The local migration filename was aligned with the server-assigned applied version without changing its SQL.

Temporary detailed evidence is in `/tmp/kwilt-grocery-compat/`: deployment candidate and manifest, before/after deployed source, integration-verification log, catalogue snapshot, isolated SQL checks, and rollback results. Those temporary snapshots may disappear on cleanup; the source regressions and this receipt remain in the repository.
