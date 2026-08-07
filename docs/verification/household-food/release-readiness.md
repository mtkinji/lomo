# Household Food release readiness

Recorded: 2026-08-06

## Automated result

`npm run verify:changed -- --run` passed from
`/Users/andrewwatanabe/Kwilt/.worktrees/household-food-ai-exploration` on branch
`codex/household-food-ai-exploration`, based on
`f7e852897144aac58e666dc1bb1c81681d92b419` with uncommitted Food changes.

- TypeScript app and test typechecks: pass.
- Full Jest suite: pass (including the new Grocery rebase, scenario recovery,
  next-cycle Cook learning, and Food analytics contracts).
- Edge Function typecheck: pass.
- Deno helper tests: 48 passed.
- Product, Chat delivery, Chat contracts, code-health ratchet, and architecture
  gates: pass (existing warnings remain).
- Git diff whitespace/conflict gate: pass.

## Release decision

**No-go for TestFlight or production; source-complete exploration only.**

Blocking gates:

1. Select and authorize a disposable non-production Supabase project; apply and
   test all six Food migrations and four Food Edge Functions.
2. Prove owner and non-member denial paths plus one private family round using
   two separate signed accounts/devices.
3. Configure development Recipe import and Instacart credentials, confirm the
   real retailer review page, and retain plain-list fallback.
4. Complete the visual/accessibility/performance matrices and signed-device Cook
   voice/timer/background/relaunch run.
5. Complete each pending scenario application through the version-checked Meal
   Planning and Grocery owners. Acceptance now atomically creates a private,
   durable recovery receipt containing the immutable baseline and pending diffs;
   it truthfully reports `partially_applied` until those owners finish.
6. Inspect emitted runtime analytics and database/provider receipts across the
   fifteen-step walkthrough. Privacy-constrained events are wired through the
   key Recipe, planning, Grocery, scenario, savings, handoff, and Cook transitions,
   but runtime delivery is not yet proven.

Independent flags should gate Food entry, import, household rounds, voice,
providers, savings, and public discovery. Public discovery and automatic coupon
activation remain deferred; current coupon actions explain or deep-link and may
say “Applied” only after provider acknowledgement.
