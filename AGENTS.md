# AGENTS.md

**Kwilt** is a React Native (Expo SDK 54) mobile app for personal life coaching. It uses npm workspaces with one internal package (`packages/arc-survey`). There are two companion repos at `/Users/andrewwatanabe/kwilt-site` (Next.js marketing site) and `/Users/andrewwatanabe/kwilt-desktop` (Tauri desktop app); the persona and JTBD taxonomies are shared across all three via symlinks.

## Solo-dev loop (read this first)

Kwilt's product development uses a composed methodology:
- **Superpowers** (Cursor plugin) — engineering execution half (writing-plans, subagent-driven-development, code review, branch finishing).
- **User-level methodology skills** at `~/.cursor/skills/` — product-framing half. These skills are project-agnostic and work in every Cursor workspace; they consume project-specific content (anchor taxonomy, context primer, feature brief authoring conventions) discovered in standard paths.
- **Project-level product review skills** at `.cursor/skills/` — Kwilt-specific review workflows such as `job-flow-review`.

For Kwilt, the project content lives at:
- **Audience/persona taxonomy** (read by `design-thinking-loop` Phase 1): [`docs/personas/`](docs/personas/) — target audiences with named representative personas.
- **JTBD taxonomy** (read by `assess-against-anchors`, `yes-and-expand`, `reflect-after-ship`): [`docs/jtbd/`](docs/jtbd/) — active jobs for a persona in a situation.
- **Job flows** (product operating artifact): [`docs/job-flows/`](docs/job-flows/) — maps hero JTBDs to user steps, app flows, offerings, delivery scores, and gaps. Used by roadmap prioritization, design-thinking, feature briefs, product review / QA, analytics, growth positioning, and reflect-after-ship.
- **Context primer** (read by `design-thinking-loop` Phase 2 Diverge): [`docs/jtbd/_kwilt-context-primer.md`](docs/jtbd/_kwilt-context-primer.md).
- **Feature brief authoring conventions** (read by `design-thinking-loop` Phase 4 Build): [`docs/feature-briefs/_AUTHORING.md`](docs/feature-briefs/_AUTHORING.md).

### The loop

```
User: "let's add X" / "what if we Y"
  → design-thinking-loop (ambient, auto-fires — installed at ~/.cursor/skills/)
      Phase 0 — Yes-and    (calls yes-and-expand with sub-triage; may skip for narrow
                            refinements. Output: 5-8 aspirational adjacencies or a skip
                            rationale with job-elevation note; run path also includes
                            frame recommendation.)
      Phase 1 — Frame      (selects a target audience + named representative persona from
                            docs/personas/, starts from that audience's hero JTBD, then
                            reads docs/job-flows/ to find the underserved step and
                            delivery score, then calls assess-against-jtbd /
                            assess-against-anchors against docs/jtbd/; outputs audience,
                            persona, hero_jtbd, job-flow step, serves: snippet, and
                            aspirational design challenge)
      Phase 2 — Diverge    (3+ distinct solutions answering the audience/persona-shaped
                            design challenge; reads docs/jtbd/_kwilt-context-primer.md
                            for anti-pattern enforcement)
      Phase 3 — Converge   (chosen option + persona/challenge fit + trade-offs + stated bet)
      Phase 4 — Build      (feature brief with serves: front-matter → Superpowers writing-plans →
                            Superpowers subagent-driven-development → pragmatic-tdd-posture
                            override → Superpowers code-review → finishing-a-development-branch)
      Phase 5 — Reflect    (calls reflect-after-ship post-ship; updates JTBD evidence/confidence)
```

**Superpowers' `brainstorming` is intentionally NOT used.** The design-thinking loop replaces it.

### Job flows are not owned by the loop

`design-thinking-loop` consumes job flows in Phase 1, but job flows are broader than design ideation. Use them whenever deciding what to prioritize, reviewing whether a shipped feature improved the product, naming analytics events/funnels, positioning Kwilt to an audience, or reflecting after ship. After a feature ships, update the relevant job-flow delivery scores and gaps if the work changed Kwilt's ability to help the user complete a job step.

Use `job-flow-review` when the user says "roadmap," "prioritize," "review feature brief," "analytics," "did this ship improve things," "what should we build next," "how well does Kwilt serve X," or otherwise asks to evaluate product delivery, product gaps, audience fit, persona fit, JTBD coverage, shipped impact, growth positioning, or feature value.

Phase 0 (yes-and) and Phase 2 (Diverge) are *different operations*:
- **Phase 0 — Yes-and** is aspirational adjacency-generating — given an offered idea, what else could it enable, and how could that elevate the underlying job? Runs before frame selection. May reveal a missing anchor or a too-narrow frame.
- **Phase 2 — Diverge** is alternative-generating — given a fixed audience, named persona, active JTBDs, and aspirational design challenge, what are different ways to *solve* it? Runs inside the loop after framing.

### Triage (before entering the loop)

`design-thinking-loop` auto-fires on feature change/add intent, but **bypasses** for:
- Cosmetic tweaks (padding, copy, color, icon, animation tuning).
- Refactors with no user-visible behavior change.
- Bug fixes (use Superpowers' `systematic-debugging`).
- Trivial settings/config changes.

When ambiguous, ask the user once and proceed.

### UI surfaces that aren't landing

`ui-paradigm-coach` (user-level) auto-fires on UI dissatisfaction signals ("isn't landing," "feels off," screenshot + commentary, "redesign the X page"). It runs a Diagnose → Anchor → Reference → 3-Sketches workflow scoped to *existing* surfaces. Use it instead of `design-thinking-loop` when the work is "this surface needs rethinking" rather than "we're adding a new feature." It reads Kwilt's anchor taxonomy at `docs/jtbd/` to ground sketches in JTBD-derived design principles.

### TDD posture (pragmatic) — Kwilt-specific override

The user-level `pragmatic-tdd-posture` skill applies sensible defaults. For Kwilt specifically:

- **TDD required**: pure logic, hooks with branching, AI prompt builders, sync/queue logic, scoring/aggregation, anything in `packages/arc-survey/`, Supabase Edge Functions, notification scheduling rules.
- **TDD optional / vibe-code OK**: UI components, screens, layout, animations, copy, color, padding.
- **Always**: bug fixes are regression-first (write the failing test that reproduces the bug before fixing).

### Cross-repo JTBD convention

The persona and JTBD taxonomies are canonical at `/Users/andrewwatanabe/Kwilt/docs/personas/` and `/Users/andrewwatanabe/Kwilt/docs/jtbd/`. The other two repos symlink `docs/jtbd`; if they need persona-aware product framing, they should also symlink `docs/personas`:

```bash
# /Users/andrewwatanabe/kwilt-site/docs/jtbd  -> ../../Kwilt/docs/jtbd
# /Users/andrewwatanabe/kwilt-desktop/docs/jtbd -> ../../Kwilt/docs/jtbd
# /Users/andrewwatanabe/kwilt-site/docs/personas  -> ../../Kwilt/docs/personas
# /Users/andrewwatanabe/kwilt-desktop/docs/personas -> ../../Kwilt/docs/personas
```

If a symlink ever breaks (e.g. a repo is moved), recreate it with `ln -s ../../Kwilt/docs/jtbd docs/jtbd` and `ln -s ../../Kwilt/docs/personas docs/personas` from each repo root. Feature briefs in any of the three repos use the same `personas:` and `serves:` ids.

### Lint

```bash
npm run jtbd:lint
```

Validates JTBD front-matter, `parent` references, and `serves:` references in feature briefs and any "JTBDs served" trailer sections across `docs/`.

## Cursor Cloud specific instructions

### Key commands

| Task | Command |
|---|---|
| Install deps | `npm install` |
| Typecheck / lint | `npm run lint` (runs `tsc --noEmit`) |
| Run tests | `npm test` (Jest with `jest-expo` preset) |
| Run tests with coverage | `npm run test:ci` |
| Start Metro bundler | `npx expo start` (serves JS bundles to native devices on port 8081) |

### Cloud VM caveats

- **No iOS/Android simulators available.** Native builds (`expo run:ios`, `expo run:android`) require macOS + Xcode or Android Studio, neither of which is present on the Cloud VM. The primary development loop in this environment is typecheck + Jest tests.
- **Metro bundler** starts successfully and can serve iOS/Android JS bundles (verified via `curl http://localhost:8081/index.bundle?platform=ios&dev=true`). This proves the bundler and all JS transforms work correctly.
- **Expo web mode** (`expo start --web`) fails to bundle because `react-native-maps` imports native-only codegen modules. This is expected and not a bug; the app targets iOS/Android, not web.
- **Environment variables** are loaded from `.env` files by `app.config.ts` (dotenv cascade: `.env`, `.env.<NODE_ENV>`, `.env.local`, `.env.<NODE_ENV>.local`). No `.env` files are required for typecheck, tests, or Metro startup, but backend-connected features (Supabase, AI proxy, RevenueCat, PostHog) need them at runtime on-device.
- **Supabase Edge Functions** (in `supabase/functions/`) are Deno/TypeScript and live outside the npm workspace. They are not covered by `npm run lint` or `npm test`. Use the Supabase CLI to serve/test them locally.
