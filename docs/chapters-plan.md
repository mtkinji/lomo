## Chapters — Plan

**Goal:** Take Chapters from a well-executed retrospective essay feature to the Kwilt product's spine: a measurable, dependable weekly rhythm that closes a loop — *Saw → Noticed → Next* — and carries activation, engagement, upsell, and retention on a single artifact.

**Strategy source:** Continues the trajectory of `docs/chapters-build-plan.md` (original build, largely complete). Related: `docs/growth-loops-strategy.md` (where Chapters sits in the retention picture), `docs/email-system-ga-plan.md` (owns digest *delivery*; this plan owns digest *destination* and *content*), `docs/life-architecture-model.md` (requires a small amendment; see §Amendments).

**Why now:** Chapters today is an essay engine with incomplete GA plumbing (analytics absent, digest content bugs, default template disabled) *and* a generation model that doesn't yet do the jobs the product actually needs (help me feel progress; anchor in Arcs; carry forward to next week). This plan closes both gaps in one integrated sequence: Phases 1–2 make today's feature GA-worthy; Phases 3–8 reshape it into the artifact the product needs it to be.

**Where we are (Apr 2026):** Phases **1, 2, 3, 5** are landed on `docs/chapters-ga-hardening-plan`. Phase 4 (HealthKit) is the only remaining chunk independent of the others and is the next scoped decision; Phases 6–8 extend the Next Steps machinery shipped in Phase 5.

**Scope invariant:**
- No changes to the fundamental app shell / canvas UX layers.
- No changes to the deterministic-metrics-then-LLM generation architecture — it's the right shape; we're adding evidence sources and a structured output field, not replacing the engine.
- Chapters remain retrospective in *character*; "Next Steps" (Phase 5+) is a bounded forward sliver anchored to the lookback, not planning (see `docs/life-architecture-model.md` amendment below).
- No new primary nav entry. Chapters continues to live under More until a separate product decision moves it.

Each phase is independently shippable.

---

## Scope simplification: weekly-only, scheduled-only

Before executing this plan, Chapters collapses from a multi-cadence, user-triggered tool into a **single weekly rhythm that Kwilt generates automatically.** The monthly, yearly, and manual-range cadences go away. The in-app "+" / generate drawer goes away. A Chapter lands every Monday for the prior ISO week; no user action required, no user action supported. This decision is executed by Phase 2.1.

### Why

1. **Quality scales inversely with cadence count.** One prompt tuned hard against weekly evidence density outperforms three prompts each tuned partway. Weekly is the cadence with the most predictable evidence shape, so it's the one that responds best to tuning.
2. **The engagement loop is inherently weekly.** Phase 8's continuity citation ("since you named the Fitness Arc last week…") only works at a cadence the user still remembers. Monthly rots; yearly is meaningless. If the loop is weekly, the generation cadence should be too.
3. **Manual triggers are a bad-Chapter vector.** The current UI lets a user generate Chapters for empty periods, cross-template custom ranges, and `force` regenerations that silently break continuity with the next Chapter. Removing the manual surface kills the whole class of failures in one cut.

### What's removed

- `ChapterGenerateDrawer` and its configuration state (cadence / periodChoice / manual range / overwrite)
- `createDefaultMonthlyReflectionTemplate`, `createDefaultYearlyReflectionTemplate`, `createDefaultManualReflectionTemplate` (+ their template rows)
- The user-facing `triggerChapterGeneration` call site on `ChaptersScreen`
- The `openCreateChapter` navigation param plumbed from the global "+"
- `ChapterGenerateStarted` / `…Succeeded` / `…Failed` as client analytics; scheduled-generation observability lives in server logs / Sentry, not product analytics

### What stays

- Server-side scheduled generation (Monday morning for the prior ISO week) on existing plumbing.
- An ops-only regenerate path for weeks that failed or produced broken output — not user-visible.
- Monthly / yearly "wrap-up" remains a potential future feature, but conceived as a **deterministic rollup of weekly Chapters**, not its own LLM generation. Explicitly deferred.

### Operating policy

- A new user's first Chapter arrives the first Monday after signup. No backfill.
- If scheduled generation fails for a week, the user sees the empty-state-style ETA for the next week; no user-visible retry.

### Downstream simplifications in this plan

- **Phase 3.2** — arc-lane deltas only ever compare to the single prior weekly Chapter. No cross-template guard logic.
- **Phase 4** — HealthKit evidence is always a 7-day window. No aggregation variants.
- **Phase 5.1** — "sustained pattern over ≥N weeks" maps directly to the last N weekly Chapter metric rows; no calendar-math edge cases.
- **Phase 8** — continuity is week-over-week; "prior Chapter" is unambiguous.

---

## What's there today (honest readout)

**GA plumbing:**
- **Backend generation** — solid. Deterministic metrics + LLM-written narrative with citation validation, structured `output_json` with `sections.story.body`, strict validator, anti-hallucination prompt rules. No changes to the engine.
- **`ChapterDetailScreen`** — magazine-style "Kwilt report" with kicker / headline / dek / metrics band / long structured story (markdown subheads) / bullet sections / expandable forces block. Designed for a sit-down read. Top-of-screen content is the right content but not yet weighted as the primary artifact.
- **`ChaptersScreen`** — adequate. Latest chapter card + chronological history. Missing snippet on history cards and unread indicator.
- **Digest email** — broken in content. Reads `outputJson.narrative`; the generator writes `outputJson.sections.story.body` → snippet is empty in production. Passes `period.key` (e.g. `2026-W15`) as the human label → subject/preheader copy is technical.
- **Defaults** — off. App-side default template creation sets `email_enabled: false`. No user receives the digest today unless the DB row has been hand-flipped.
- **Analytics** — absent. No `chapter_viewed`, `chapter_shared`, or digest-open events. We cannot currently measure whether chapters drive engagement.
- **In-app settings** — thin. Backend has `email_enabled`, `detail_level`, `tone`, `filter_json` per template. Zero UI surfaces these.

**Engagement-layer gaps:**
- **HealthKit** — not integrated. No permissions flow, no read path.
- **`next_experiments` section** — exists as free-text LLM output, unstructured, unactionable. Weak precursor to Next Steps.
- **Arc / Goal / Activity recommendations** — none today. The app has no mechanism to surface "consider this Arc" or "add this Activity."
- **Cross-Chapter continuity** — prior Chapter is passed to the LLM as narrative context, but the LLM isn't told what the user actually *did* in response to the prior Chapter's suggestions (because there were no structured suggestions to respond to).
- **User feedback field** — `ChapterDetailScreen` has a feedback note TextInput. Rendered as diagnostic feedback, not first-class content. Easy to repurpose.

**Bottom line:** The read experience is stronger than the surrounding apparatus, and stronger than the artifact's job-to-be-done. Phases 1–2 close the GA-plumbing gap; Phases 3–8 reshape the artifact into a loop.

---

## The shift in concept

Today, a Chapter is a 450–1500 word investigative-reporter-voiced article *about* the user. The user's literal ask is closer to: *"help me feel progress in a 30–60 second review."* Those are different products.

We are moving Chapters from **essay-first** to **signal-first, essay-on-demand**, then extending it with a forward sliver (*Next Steps*) that closes the loop to the next Chapter. The generator stays; the **artifact and its framing** change.

**What a Chapter becomes — three acts:**

1. **Saw** — a signal-first lookback: arc lanes with concrete deltas, one "moment" pulled from evidence, key figures. Readable in ~60 seconds. Long essay behind a "Read the full story" disclosure.
2. **Noticed** — patterns Kwilt observed but the user hasn't named yet (Arc Nominations live here).
3. **Next** — 1–3 forward steps at the Arc / Goal / Activity / Align level, each evidence-anchored, each actionable in one tap. The next Chapter reads the outcomes of these as priority evidence.

**What this does for the growth loops** (closing the four-loop gap called out in `docs/growth-loops-strategy.md`):

| Loop | Mechanic |
|---|---|
| Activation | HealthKit + passive signals + arc lanes → rich first Chapter even when Kwilt capture is thin |
| Engagement | Digest → signal-first Chapter → optional add-a-line → Next Steps → next week |
| Upsell | Next Steps of `kind: arc` or `kind: goal` naturally gate against the Free tier limits; the upsell becomes *recognition* of a pattern the user is already living |
| Retention | Cross-Chapter continuity — each Chapter cites the outcome of the prior Chapter's Next Steps, turning the weekly cadence into a compounding narrative |

---

## Phases

### Phase 1 — Instrumentation & content fidelity

**Theme:** Before any polish or evolution, make the feature measurable and stop it from lying. This phase unblocks every judgement call downstream (is the polish working? is the email converting? is the signal-first reframe producing longer reads?).

**Status:** Landed. All three sub-phases shipped. PostHog signal verification waits on live production traffic after deploy; unit-level coverage is in place.

#### 1.1 Add Chapters analytics events — **Landed**

Files: `src/services/analytics/events.ts`, `src/features/chapters/ChaptersScreen.tsx`, `src/features/chapters/ChapterDetailScreen.tsx`.

Chapters is server-scheduled-only (see §Scope simplification + Phase 2.1). Generation is not a user-initiated action, so the event table is user-behavior-only; scheduled-generation observability lives in server logs / Sentry, not product analytics.

New events:

| Event | Properties | Fires from |
|---|---|---|
| `chapter_list_viewed` | `{ chapter_count }` | `ChaptersScreen` mount |
| `chapter_viewed` | `{ period_key, from: 'list' \| 'email' \| 'push' \| 'deep_link' }` | `ChapterDetailScreen` mount |
| `chapter_section_expanded` | `{ section: 'forces' \| 'patterns' \| 'story' \| ... }` | expandable section tap (includes "Read the full story" once Phase 3 lands) |
| `chapter_shared` | `{ method: 'copy' \| 'system_share' }` | future; stub now |

The `from` dimension on `chapter_viewed` is what lets us attribute an open to the digest email (combined with `docs/email-system-ga-plan.md` Phase 6's `EmailDeepLinkConverted` event on `utm_source=email`).

Implementation: `ChaptersScreen` mount fires `ChapterListViewed`; `ChapterDetailScreen` mount fires `ChapterViewed` with the `from` hint resolved by `chapterOpenSource.ts` (list / email / push / deep_link, plus UTM campaign passthrough). `ChapterSectionExpanded` fires from the "Read the full story" disclosure (Phase 3.3) and the Details/Forces expander. `ChapterShared` fires from the system-share action. Phase 5.2 added three more (`ChapterNextStepShown / CtaTapped / Dismissed`). Phase 1.5 (prev/next nav analytics) added `ChapterPrevNextTapped`. Scheduled-generation events are intentionally absent — server cron observability lives in Sentry.

#### 1.2 Fix the digest snippet field bug — **Landed**

Files: `supabase/functions/_shared/emailTemplates.ts` (`buildChapterDigestEmail`), `supabase/functions/chapters-generate/index.ts` (caller).

- The email template reads `outputJson.narrative`; the generator writes `outputJson.sections.story.body`. Reconcile on the canonical schema field.
- Truncate the snippet intelligently (first paragraph, ~280 chars) rather than the middle of a sentence.
- Add a test fixture from a real `output_json` so this can't silently regress.

Implementation: `extractChapterSnippet` in `emailTemplates.ts` reads
`sections.story.body` with intelligent first-paragraph + word-boundary
truncation. Phase 3.4 later extended the same function to prefer
`sections.signal.caption` when present (length-capped by construction so
truncation is rare). Unit-tested in
`supabase/functions/_shared/__tests__/emailTemplates.test.ts` with
fixtures covering missing fields, long paragraphs, and the caption-first
path.

#### 1.3 Humanize period labels in the digest — **Landed**

Files: `supabase/functions/_shared/emailTemplates.ts`, `supabase/functions/_shared/periodLabels.ts` (new).

- Stop passing `period.key` (e.g. `2026-W15`) as the label.
- Produce human copy for the weekly cadence only: e.g. `"the week of Apr 13"`. (Other cadences are cut by Phase 2.1; no need to build their labels.)
- Update subject/preheader to match the pattern in `email-system-ga-plan.md` Phase 5 (subject = headline, preheader = complementary hook, never duplicates).

Implementation: new `supabase/functions/_shared/periodLabels.ts`
provides `formatHumanPeriodLabel` (cadence-aware, timezone-aware) used by
the digest subject ("Your chapter for the week of Apr 13 is ready"), the
preheader ("A short read about the week of Apr 13."), and the uppercase
kicker at the top of the email body. Unit-tested in
`supabase/functions/_shared/__tests__/periodLabels.test.ts` (DST
boundaries, week-of formatting, timezone fallbacks). The "no raw period
key" guard ships as a test assertion, not a CI regex.

#### Phase 1 acceptance criteria

- [x] All 4 events land from the client with correct properties (coverage
  via analytics-capture wiring + TypeScript-typed `AnalyticsEvent`
  registry). PostHog live-signal verification pending first deploy.
- [x] A test fixture proves the digest email snippet renders a non-empty
  preview from a real `output_json` — see
  `emailTemplates.test.ts::extractChapterSnippet` cases.
- [x] Subject/preheader for the digest never contains a raw period key —
  enforced by `periodLabels.test.ts` and the no-`W<NN>` assertion in the
  email test suite.

---

### Phase 2 — Weekly-only cutover, surface polish, defaults

**Theme:** Execute the scope simplification, then add the small UI + settings work that separates "we shipped it" from "we trust it enough to email users about it weekly."

**Status:** Landed. All six sub-phases shipped. Phase 2.3's `topArcs` chip row shipped, then was replaced by Phase 3.3's full arc-lanes layout — the chip row is no longer in the build but was a real shipped step, not skipped.

#### 2.1 Weekly-only cutover — **Landed**

Files: `src/features/chapters/ChaptersScreen.tsx`, `src/features/chapters/ChapterGenerateDrawer.tsx` (delete), `src/navigation/RootNavigator.tsx` (global "+" plumbing), `src/services/chapters.ts`, migration in `supabase/migrations/`.

Executes the collapse described in §Scope simplification. Prerequisite for every subsequent Phase 2 item and for Phases 3–8.

Removed:

- `ChapterGenerateDrawer.tsx` and its configuration state (cadence / periodChoice / manual range / overwrite)
- `createDefaultMonthlyReflectionTemplate`, `createDefaultYearlyReflectionTemplate`, `createDefaultManualReflectionTemplate` from `src/services/chapters.ts`
- User-facing call site of `triggerChapterGeneration` on `ChaptersScreen` (server-scheduled generation remains)
- The `openCreateChapter` navigation param on `MoreChapters` plus the global "+" plumbing that routed into the Chapters create drawer
- Client-emitted `chapter_generate_started` / `…_succeeded` / `…_failed` analytics (already dropped from Phase 1.1's event table)

Kept:

- Server-scheduled generation (Monday morning, prior ISO week) on existing plumbing
- Ops-only regenerate path (internal tooling; not user-visible)
- Reading, detail, history, digest email — all unchanged in shape

Migration: no active users → simple delete of default monthly/yearly/manual template rows.

Future-state note: monthly / yearly "wrap-up" features are not canceled — they're re-scoped as deterministic rollups over the weekly Chapter corpus, not their own LLM generations. Tracked forward, not here.

Implementation (migration files on disk):

- `supabase/migrations/20260417020000_kwilt_chapter_templates_weekly_only.sql` — drops monthly/yearly/manual templates.
- `ChapterGenerateDrawer.tsx` deleted from the tree (visible in `git status`).
- `src/services/chapters.ts` retains only the weekly default factory; the `triggerChapterGeneration` call site is gone from `ChaptersScreen`. The function itself is kept for the ops-only regenerate path.
- `openCreateChapter` param removed from the `MoreStack` type and the global "+" plumbing routed into Activities / Arcs creation instead.

#### 2.2 Chapter list polish — **Landed**

Files: `src/features/chapters/ChaptersScreen.tsx`.

- Add a one-line snippet (first sentence of `story.body`, ellipsized) to each history-card, matching the pattern `docs/ux-flow.md` describes. (Phase 3.4 later swaps the snippet source to `signal.caption`.)
- Add an unread indicator — simple dot, derived from a per-chapter `read_at` timestamp stored in `AsyncStorage` initially (no migration needed for V1; a proper column can come later if the metric turns out to matter).
- On `ChapterDetailScreen` mount, mark the chapter read.

Implementation:

- `src/features/chapters/chapterSnippet.ts` owns snippet extraction (body-first in Phase 2.2; caption-first once Phase 3.4 shipped). Unit-tested in `chapterSnippet.test.ts`.
- `src/features/chapters/chapterReadState.ts` persists per-chapter `read_at` in AsyncStorage with a subscriber pattern; `markChapterRead` fires from `ChapterDetailScreen` mount.
- `ChaptersScreen` shows an unread-dot before any chapter without a stored `read_at`.

#### 2.3 Render the unused `topArcs` block — **Landed (later superseded)**

Files: `src/features/chapters/ChapterDetailScreen.tsx`.

- `topArcs` is already computed but never rendered. Add it between the metrics band and the main story as a compact row of 1–3 Arc chips. This directly connects each Chapter to the Arcs it reflects on, which is part of what makes a Chapter feel like "your" chapter rather than "a generated essay." (Phase 3.3 later replaces this chip row with full arc lanes; rendering the chips now closes the content gap on today's artifact.)

Implementation: chip row shipped with Phase 2.2; Phase 3.3 replaced it with the `arcLanes` block (stacked rows with week-over-week deltas). Old chip styles (`topArcsRow`, `topArcChip`, `topArcChipText`) were removed in the Phase 3 commit.

#### 2.4 Chapters digest settings surface — **Landed**

Files: new `src/features/chapters/ChapterDigestSettingsScreen.tsx`, `src/navigation/RootNavigator.tsx` (register inside `MoreStack` or `SettingsStack`), `src/services/chapters.ts`.

Minimal V1 — a single screen accessible from both `MoreChapters` ("Digest settings" link) and the app-wide Notifications settings screen:

- Toggle: **Email me when a new chapter is ready**. Writes to the default template's `email_enabled`.
- Toggle: **Generate my weekly Chapter**. Writes to the default weekly template's `enabled`. In a weekly-only world this is the "pause Chapters" escape valve — disabling it stops future generation; existing history remains readable.
- Read-only preview: cadence (weekly, fixed), timezone (user's current), "what's included" summary (counts).

No cadence picker, tone selector, filter editor, or multi-template UX — those are **cut** (see Phase 2.1), not deferred.

Implementation: `src/features/chapters/ChapterDigestSettingsScreen.tsx` (new), reachable from both `NotificationsSettingsScreen` (global) and `ChaptersScreen` (contextual). Both toggles round-trip through the default template row via `src/services/chapters.ts`.

#### 2.5 Default template: `enabled=true`, `email_enabled=false` — **Landed**

Files: `src/services/chapters.ts` (default template creation), plus a one-shot migration in `supabase/migrations/` for existing users.

- Flip `enabled` to **true** by default so every user gets a chapter generated at the end of their first full week. (Today it's false and cron skips them.)
- Leave `email_enabled` as **false** by default for V1 — the user opts into the digest from Phase 2.4, the app doesn't opt them in by surprise.
- The onboarding flow can surface the digest opt-in at the "your first chapter is ready" moment, keeping the offer contextual rather than upfront-overwhelming.

Implementation: `supabase/migrations/20260417000000_kwilt_chapter_templates_backfill_enabled.sql` flips existing rows; the weekly-default factory in `src/services/chapters.ts` writes `enabled: true, email_enabled: false` for new users.

#### 2.6 Empty / pending / failed state copy — **Landed**

Files: `src/features/chapters/ChaptersScreen.tsx`, `ChapterDetailScreen.tsx`.

- Empty (no chapters yet, < 1 full week): "Your first chapter arrives next [day]. It'll recap the week of [date range] using the Arcs you're showing up for." (The current `buildFirstChapterEta()` helper already produces this shape.)
- Pending (generation running): progress state rather than blank.
- Failed: human-readable "We couldn't write this week's chapter. We'll try again next week." No user-visible retry button in the weekly-only world; ops handles failed weeks server-side.

#### Phase 2 acceptance criteria

- [x] `ChapterGenerateDrawer` and its call sites are removed; no build references remain. The global "+" entry path that previously opened the drawer is gone.
- [x] Only the weekly default template exists in `src/services/chapters.ts`; monthly/yearly/manual factories are deleted.
- [x] History cards show snippet + unread indicator; read state clears on detail view.
- [x] `topArcs` row renders in detail screen for chapters with ≥1 arc. (Shipped as chips in 2.3, then replaced by arc lanes in 3.3.)
- [x] New Digest Settings screen reachable from `MoreChapters` and Notifications; both toggles persist and round-trip through the server template.
- [x] New signups created after the default flip get `enabled=true, email_enabled=false`.
- [x] Empty / pending / failed states all have on-brand copy and a next action (or an honest "next week" for failed, given no manual retry).
- [x] No changes to primary nav or app shell; Chapters remains under More.

---

### Phase 3 — Signal-first detail screen + short caption

**Theme:** Make the first 60 seconds of a Chapter carry the primary value. Essay stays, but earns its place behind a disclosure.

**Status:** Landed (3.1 caption generator + validator, 3.2 arc-lane deltas, 3.3 inverted detail layout with "Read the full story" disclosure, 3.4 caption-first snippet for list cards + digest emails). Acceptance criteria passing on unit tests + type-check; field validation waits on first weekly run after deploy. The "moment" pull-quote sub-element of 3.3 was intentionally folded into the caption hero rather than rendered as a separate block — one above-the-fold hook, not two.

#### 3.1 Generator: add `signal.caption`

Files: `supabase/functions/chapters-generate/index.ts` (prompt + schema + validator), `supabase/functions/_shared/emailTemplates.ts`.

- Add a new required section: `sections.signal.caption` — 1–3 sentences, must quote ≥1 activity title, must name ≥1 Arc, must include ≥1 number from metrics.
- Writing-requirements rule: caption must summarize the *top story hook* in reader-facing language. No "this chapter highlights" etc.
- Validator: enforce caption length (≤ 320 chars), concrete anchor (number or quoted title), and alignment with `chosen_hook_id`.
- Cheap — same LLM call, ~80 extra output tokens.

#### 3.2 Generator: arc-lane deltas

Files: `supabase/functions/chapters-generate/index.ts` (`computeDeterministicMetrics`).

- For each arc in `metrics.arcs[]`, compute deltas vs the immediately prior weekly Chapter: `completed_delta`, `active_days_delta`, `new_or_first` flags.
- Extend `metrics.arcs[]` entries with a `delta` block. Deltas are computed from the prior Chapter's stored metrics — no new data, just diff.
- Deltas are evidence the LLM can cite; they are also the raw material for the arc lanes UI.
- No prior Chapter (first week) → omit the delta block; lane renders without a delta line.

#### 3.3 Detail screen: invert the layout

Files: `src/features/chapters/ChapterDetailScreen.tsx`.

Above-the-fold becomes:

- Kicker + headline + dek *(unchanged)*
- **Arc lanes** — 2–3 rows, one per top arc, each with: arc title · delta line (e.g. "+2 completions vs last week") · mini counts. Replaces the Phase 2.3 `topArcs` chip row.
- **The moment** — one pull-quote styled block. Sourced from: highest-scored `noteworthy_example`'s title, or the first paragraph of the LLM's `signal.caption` if no noteworthy example dominates.
- **Key figures band** *(unchanged)*

Below that, the existing long-form article is wrapped in a **"Read the full story"** disclosure (collapsed by default, expandable). Feedback buttons, Details (Forces/Patterns/Next experiments), and neighbor nav remain as today.

#### 3.4 List card + digest email: lead with caption

Files: `src/features/chapters/ChaptersScreen.tsx`, `supabase/functions/_shared/emailTemplates.ts`.

- History card snippet (landed by Phase 2.2) switches source from `story.body` first-sentence to `signal.caption`.
- Digest email lead paragraph switches source likewise. Kills the class of "empty snippet" and "snippet truncated mid-sentence" bugs because the caption is short-by-construction.

#### Phase 3 acceptance criteria

- [x] `sections.signal.caption` present on every newly generated Chapter; validator rejects missing/weak captions. *(Enforced in `validateChapterOutput`: required section + length 80–320 + number + Arc + quoted activity title + not-equal-to-dek + banned-phrase checks; runs on both first-attempt and strict retry.)*
- [x] Existing Chapters (no caption) render a graceful fallback on the detail screen (first sentence of `story.body`). *(Detail screen falls back to `dek` when no caption exists; list-card / email snippet falls back to `story.body` first-sentence via `extractChapterSnippet` + `getChapterHistorySnippet`.)*
- [x] Arc lane deltas render for any Chapter whose prior Chapter exists; quietly omit the delta line when there's no prior. *(`augmentArcsWithDeltas` populates `metrics.arcs[].delta`; `formatArcLaneDelta` returns `''` when data is missing and the row renders without the secondary line.)*
- [x] "Read the full story" disclosure is collapsed by default; user scrolls less than one screen to reach the moment + key figures + Next Steps (once Phase 5 ships). *(Article body gated behind a `storyExpanded` disclosure; expansion fires `chapter_section_expanded` with `section: 'story'`.)*
- [x] Digest email preview tests show the caption as the lead paragraph. *(New `extractChapterSnippet` test covers caption-first extraction + word-boundary truncation.)*

---

### Phase 4 — HealthKit integration (passive signal)

**Theme:** Pull a low-effort, high-delight signal into the evidence set for every user who has Apple Health set up, regardless of whether they have a Health-flavored Arc.

**Status:** Not started. Independent of Phase 3 — can ship in parallel. **Non-goal in this phase:** Android Health Connect. iOS only.

#### 4.1 Permission flow

Files: new `src/services/health/healthKit.ts`, plus hook-up point in `ChapterDetailScreen` (post-first-Chapter footer prompt) and optional onboarding.

- Detect HealthKit availability (no permission needed to detect).
- Ask for permission **after the user's first Chapter lands**, surfaced as a non-blocking footer card: *"We noticed your iPhone has Apple Health set up. Want Kwilt to fold your movement, sleep, and mindfulness minutes into next week's Chapter?"*
- Bundle the ask: step count, workouts, sleep analysis, mindfulness minutes. One system permission sheet.
- Reversible from Chapter digest settings.

#### 4.2 Weekly pull on generation

Files: new server-side collection path. Options are either (a) pulling from a snapshotted `kwilt_health_samples` table the client writes to nightly, or (b) requesting a summary from the client at generation time. **Recommendation: (a)** — a nightly client-side job writes summarized daily totals to Supabase, and `chapters-generate` reads from there. This keeps the edge function's hot path off-device.

- New migration: `kwilt_health_daily` (RLS, user-owned), columns per metric + date.
- Client: scheduled background fetch writes yesterday's totals each morning.
- Generator: extends `loadUserDomain` to pull rows intersecting the period; feeds them into `computeDeterministicMetrics` as a new `metrics.health` block.

#### 4.3 Tasteful inclusion rule

Files: `computeDeterministicMetrics` + prompt.

- Include health lines in the evidence only when the week crosses a "positive or neutral" floor: ≥3 active days, OR ≥1 logged workout, OR ≥6h average sleep, OR any mindfulness minutes at all.
- If the week is genuinely low, omit silently. The Chapter never mentions deficits. Same philosophy as the existing "honest not boosterish" rule.
- Prompt gets a new evidence slot `metrics.health` with a note that *if present*, the LLM should weave one line into `story.body` or `signal.caption` — never generate a shame-flavored framing.

#### Phase 4 acceptance criteria

- [ ] Permission flow appears after the first successful Chapter, once per user, respectful of denial.
- [ ] `kwilt_health_daily` rows accumulate for permitted users.
- [ ] A Chapter for a user with good-week health data renders a single positive health line in the caption or story.
- [ ] A Chapter for a user with low-signal health data renders no health line at all (explicit test case).
- [ ] No HealthKit? Chapter is identical to today's shape. No upsell, no badge, no nag.

---

### Phase 5 — Next Steps v1: Arc Nominations

**Theme:** Introduce the *Next Steps* section as a first-class Chapter artifact, starting with the highest-leverage type — Arc Nominations — which also functions as the primary behavioral upsell surface.

**Status:** Landed (Arc Nomination v1). Depends on Phase 3.

Implementation summary: deterministic Next Steps pipeline on top of the
Phase-3 signal-first layout. Recommendations are computed server-side in
`_shared/chapterRecommendations.ts` (framework-free, unit-tested) and
merged into `output_json.recommendations` after the LLM pass succeeds. The
Chapter detail screen renders a **Next steps** section directly beneath
the Arc lanes with per-kind CTAs that respect the existing paywall gate,
and the weekly digest email gains a single curiosity-gap hint line when
any recommendation is attached.

Trade-offs taken for v1 (documented in `chapterRecommendations.ts`):

- A single trigger ships now — the untagged-activity cluster. The
  sustained-health-signal triggers named in the plan wait for Phase 4
  (HealthKit). v1 still delivers the section to every user whose week
  includes a themed cluster of arc-less activities.
- The `reason` copy is a deterministic template rather than LLM-written.
  Moving to LLM-authored reasons is a follow-up (new output schema slot +
  prompt rule + validator). The ship-now tradeoff keeps the trigger
  unit-testable in isolation and ships the section without adding a second
  LLM round-trip.

#### 5.1 Schema: structured recommendations — **Landed**

Files: `supabase/functions/_shared/chapterRecommendations.ts` (new),
`supabase/functions/chapters-generate/index.ts` (call site).

- New `output_json.recommendations[]` with `{ id, kind: 'arc', payload, reason, evidence_ids[], evidence_summary }`.
- `computeArcNominations` is a pure function: takes `{ activitiesIncluded, arcById }`, emits 0 or 1 Arc Nomination.
- Trigger: ≥5 in-period activities with `arcId == null` share a 4+-letter
  theme token (stopwords filtered), AND the winning token is not a
  substring of any existing Arc title (case-insensitive). Guard against
  activity-verb false positives via a Kwilt-specific stopword list
  (`call`, `email`, `meet`, …).
- Runs after LLM validation succeeds; attached recommendations never gate
  Chapter readiness (they're purely additive signal).
- Schema is stable/versioned; Phase 6 adds `goal | activity | align` kinds
  under the same field + a shared 3-cap prioritization.

#### 5.2 Client surface: Next Steps section on detail screen — **Landed**

Files: `src/features/chapters/ChapterDetailScreen.tsx`,
`src/features/chapters/chapterRecommendationDismissals.ts` (new),
`src/navigation/RootNavigator.tsx` (ArcsList params),
`src/features/arcs/ArcsScreen.tsx` (prefill plumb-through),
`src/services/paywall.ts` (new source).

- New **Next steps** section renders directly below the Arc-lanes block on
  Chapter detail — this is the Phase-3 analog of "between 'The moment'
  and 'Read the full story'," keeping the card inside the signal-first
  surface.
- Each card surfaces: the nominated Arc title (as `"<Title> Arc"`), the
  deterministic `reason` line, a primary CTA and a "Not now" secondary.
- CTA wiring:
  - **Free tier at 1-Arc limit:** opens the paywall interstitial with
    `reason: 'limit_arcs_total'` and a new source
    `'chapter_arc_nomination'` so the upsell funnel is attributable.
  - **Below-cap or Pro:** deep-links to `ArcsStack / ArcsList` with a new
    `prefilledArcName` route param. `ArcsScreen` pushes that into
    `NewArcModal`, which auto-selects the manual tab and populates the
    title field.
- Dismissal: tapping "Not now" calls `dismissRecommendation(id)` in
  `chapterRecommendationDismissals.ts`, an AsyncStorage-backed
  `{ [recommendationId]: iso }` map with a 90-day sleep window. v1 is
  local only (server sync deferred — documented in the module).
- Analytics: `chapter_next_step_shown` (fires once per rendered card per
  chapter), `chapter_next_step_cta_tapped` (with
  `result: 'paywall' | 'create_flow'`), `chapter_next_step_dismissed`.
  All three carry `{ chapter_id, period_key, recommendation_id, kind }`.

#### 5.3 Digest email: Next Steps hook — **Landed**

Files: `supabase/functions/_shared/emailTemplates.ts`,
`supabase/functions/_shared/chapterRecommendations.ts`.

- When `outputJson.recommendations` has at least one well-formed entry
  (see `hasAnyRecommendation`), the weekly digest adds a single line
  between the snippet blockquote and the CTA: *"Kwilt noticed something
  worth naming — open to see."*
- Zero content spoilage — the nominated Arc's title never appears in the
  email body. Unit-tested in
  `supabase/functions/_shared/__tests__/emailTemplates.test.ts`.

#### Phase 5 acceptance criteria

- [x] Arc Nominations fire only on real patterns: ≥5-untagged-cluster
  coverage, must-not-fire-when-Arc-exists, must-not-fire-on-activity-verbs,
  must-not-fire-under-floor. See `chapterRecommendations.test.ts`.
- [x] Nominated Arc is distinct from every existing Arc by title (case-
  insensitive substring gate). Implicit-domain gating is not yet
  implemented — a deliberate v1 tradeoff; the title gate is sufficient
  for the current trigger set.
- [x] Free tier at 1-Arc limit sees a paywall-framed CTA
  (`limit_arcs_total` + `chapter_arc_nomination` source); Pro sees a
  direct-create CTA with the nominated title prefilled into the manual
  Arc modal.
- [x] Dismissal sleeps the same nomination for ≥90 days via
  `chapterRecommendationDismissals.ts`.
- [x] Email includes a Next Steps hint only when the linked Chapter
  actually has recommendations — `hasAnyRecommendation` guard.

---

### Phase 6 — Next Steps v2: Goals, Activities, and Alignments

**Theme:** Extend the Next Steps framework to the lower levels of the hierarchy. Most weeks won't generate an Arc Nomination; Goal- and Activity-level suggestions keep Next Steps useful every week.

**Status:** Not started. Depends on Phase 5.

Adds three new deterministic triggers behind the same `recommendations[]` field:

- **`kind: 'goal'`** — nominates a Goal under an existing Arc when a cluster of activity in that Arc has no Goal home, or when a quiet Arc has enough activity to warrant a Goal to focus next weeks. Paywall at the 3-Goal-per-Arc Free limit.
- **`kind: 'activity'`** — suggests a next Activity under an existing Goal when the Goal has been quiet, when the prior Chapter's `next_experiments` prose surfaced an obvious candidate, or when a pattern of almost-completed activities points at one. No paywall — pure engagement nudge.
- **`kind: 'align'`** — proposes tagging untagged activities with an existing Arc/Goal. Hygiene-flavored; improves next Chapter's signal quality. No paywall.

Governance rules from Phase 5 apply uniformly. Total recommendations capped at 3 per Chapter, prioritized: `arc` > `goal` > `activity` > `align`.

#### Phase 6 acceptance criteria

- [ ] Each Chapter shows 0–3 recommendations, mixed-kind where relevant.
- [ ] Goal/Activity CTAs open existing creation flows with intelligent prefill.
- [ ] Align CTA opens a lightweight tag-assignment surface for untagged activities.
- [ ] All kinds respect the 90-day dismissal sleep and do not duplicate each other.

---

### Phase 7 — Chapter-as-invitation: add-a-line

**Theme:** Let the user deepen the Chapter *after* they read it. Never make them pay a capture tax for a good Chapter; invite them to contribute only once they've seen value.

**Status:** Not started. Can ship at any point after Phase 3; recommended after Phase 5 so the engagement payoff is clearer.

#### 7.1 Repurpose the feedback note as first-class content

Files: `src/features/chapters/ChapterDetailScreen.tsx`, `src/services/chapters.ts`, migration to a user-note column on `kwilt_chapters` (separate from feedback), `supabase/functions/chapters-generate/index.ts`.

- Today the feedback note field is for diagnostics ("what was off?"). Rename the primary affordance to: *"Anything we missed? Add a line."*
- Store as `kwilt_chapters.user_note` (or equivalent; keep `kwilt_chapter_feedback.note` as distinct diagnostic signal).
- Render the user's note as a visually distinct pull-quote inline in the Chapter body — styled italic, attributed ("— you, [date]"), so it reads as *the user's own voice* beside the AI prose.
- One-tap voice capture (OS dictation) is free; no custom recording UI needed.

#### 7.2 Next Chapter reads the note

Files: `supabase/functions/chapters-generate/index.ts` (`getPriorReadyChapter`).

- Prior Chapter context for the LLM gains a `user_note` field if present.
- Prompt rule: if the prior Chapter's user note exists, the new Chapter's `signal.caption` or opening paragraph must subtly reference it — never verbatim re-quote, but acknowledge the theme. Builds continuity from the user's own words.

#### 7.3 Digest email: the "what did we miss?" CTA

Files: `supabase/functions/_shared/emailTemplates.ts`.

- Add a secondary CTA to the digest: *"What did we miss?"* → deep-links directly into the add-a-line affordance. Tight re-engagement loop that ends in a *creative* action, not just consumption.

#### Phase 7 acceptance criteria

- [ ] User note renders inline in Chapter body as a visually distinct pull-quote.
- [ ] Voice dictation works on iOS and Android for the input field.
- [ ] Next Chapter context includes prior user note; prompt incorporates it when present.
- [ ] Digest email CTA opens directly to the add-a-line UI via universal link.

---

### Phase 8 — Cross-Chapter continuity: Next Step outcomes

**Theme:** Close the loop. The next Chapter reads whether the user acted on the prior Chapter's Next Steps, and explicitly cites those outcomes.

**Status:** Not started. Depends on Phase 5 at minimum; materially more valuable once Phase 6 is also live.

#### 8.1 Persist and read recommendation outcomes

Files: new table `kwilt_chapter_recommendation_events` (`{chapter_id, recommendation_id, action: 'acted_on' | 'dismissed' | 'ignored', acted_on_at, resulting_object_id?}`), `src/services/chapters.ts`, `supabase/functions/chapters-generate/index.ts`.

- When a user taps a Next Step CTA and completes the resulting flow (Arc created, Goal added, etc.), write an event.
- On generation, the prior Chapter's recommendation events are passed to the LLM as priority evidence.
- Prompt rule: for each `acted_on` event, the new Chapter *must* cite the outcome in `signal.caption` or the opening paragraph — *"Since you named the Fitness Arc last week, you put 4 completions against it."* For `dismissed` / `ignored`, stay silent. Validator rejects congratulatory exclamations / second-person "great job" patterns in the continuity sentence.

#### 8.2 Governance: don't re-nominate what the user just acted on

Files: recommendation trigger logic.

- If a `kind: 'arc'` recommendation was acted on in Chapter N, Chapter N+1's triggers exclude the Arc nominated (now a real Arc; its own rules take over).
- At generation time, before emitting any recommendation, check whether the nominated object already exists (user may have created it via a different path); if so, suppress it. If the user created it within the week, treat as an implicit `acted_on` for continuity citation purposes.
- If `dismissed`, sleep 90 days as before.

#### Phase 8 acceptance criteria

- [ ] Acting on a Next Step writes a recommendation event.
- [ ] Next Chapter's `signal.caption` or opening explicitly cites an acted-on Next Step with a concrete outcome.
- [ ] Dismissal correctly suppresses both citation and re-nomination.
- [ ] Nominations for objects that already exist (created out-of-band) are suppressed.

---

## Open product questions

Combined list. Each should produce a one-line decision in this doc before the referenced phase ships.

1. **Nav placement.** Chapters lives under More. If the weekly digest is the marquee re-engagement loop, does Chapters deserve a home-screen surfacing (e.g. a "Your last chapter" card on Today) or an eventual tab promotion? A surfacing on Today is low-risk and reversible; a tab is a bigger call. *Deferred — Phase 2 shipped with Chapters still under More (scope invariant held). Revisit after 4 weeks of live digest data.*
2. **Auto-enable the digest email.** Phase 2.5 flips `enabled=true` (chapter gets generated) but leaves `email_enabled=false` (email stays off until user opts in). Should we auto-enable the email for Pro users, or users who have completed onboarding? Trades deliverability risk against engagement. *Deferred — Phase 2 shipped the safer `email_enabled=false` default; reopen once we have delivery-reputation data.*
3. ~~**Cadence default.**~~ **Decided:** weekly-only, server-scheduled. Monthly / yearly / manual are cut (see Phase 2.1); monthly/yearly wrap-ups become deterministic rollups, not LLM generations. *Closed.*
4. **Shareability.** There's no share UI on the detail screen. Chapters as a share asset (a weekly "what I actually did" post-card) could be a growth loop independent of email. Named identity moments from Phase 5+ strengthen the case. *Phase 5 has landed; open for a focused decision next.*
5. ~~**Tone and length.**~~ **Decided by Phase 3:** signal-first layout with caption-as-hero + full article behind the "Read the full story" disclosure shipped. Revisit only if the signal-first layout doesn't solve the small-screen problem on its own. *Closed.*
6. ~~**Caption voice vs. article voice.**~~ **Decided:** same voice (investigative reporter) so the caption → article transition is continuous. Enforced by prompt `captionRules` + validator in `chapters-generate/index.ts`. *Closed with Phase 3.*
7. **HealthKit inclusion thresholds.** The "positive-or-neutral" floor needs concrete numbers. Suggested starting point: include when any of (≥3 active days, ≥1 workout, ≥6h avg sleep, ≥1 min mindfulness). *Decide before Phase 4 — this is the gate question blocking Phase 4 kickoff.*
8. ~~**Arc Nomination paywall copy.**~~ **Decided for v1:** shipped with existing paywall drawer copy, attributed via new `chapter_arc_nomination` source on `PaywallSource`. Contextual copy inside the paywall drawer is a future refinement (separate work item), not a gate. *Closed for shipping Phase 5; open for iterative upsell-copy work.*
9. **Recommendation max per Chapter.** Capped at 3. Is 3 too many on weekly cadence? Guess: 1–2 typical, 3 as hard cap. *Still open — Phase 5 v1 ships at-most-1, so this re-opens when Phase 6 adds the other kinds.*
10. **User note privacy posture.** The user's note is stored alongside AI output. Are there cases (sensitive content) where the user wants a note that's visible in-app but never fed to the next Chapter's LLM? Likely a toggle. *Decide before Phase 7.*
11. **What "acting on a Next Step" means.** For `kind: 'goal'`, does "acted on" require the Goal to be created, or also the first Activity under it? Lean: creation is enough; depth comes in subsequent Chapters. *Decide before Phase 8.*

---

## Amendments to related docs

### `docs/life-architecture-model.md`

The current text states: *"A Chapter is always a lookback, never a container for future planning."* This plan softens that by a deliberate sliver. Propose the amendment:

> **A Chapter is a lookback with a bounded forward sliver — 1–3 evidence-anchored Next Steps, each observed in the period, each discarded if unacted on within 90 days.**

Add a short section ("The Next Steps sliver") explaining why this is not a planning object — Next Steps are *observed* not *designed*, bounded in count, and sunset automatically if the user doesn't act on them.

### `docs/growth-loops-strategy.md`

The executive summary calls out *"Pro upsell moments are reactive, not behavioral."* Arc Nominations in Phase 5 directly address this. Update the upsell section of that doc when Phase 5 ships, citing Arc Nominations as the first behavioral upsell surface.

*Status:* Phase 5 has shipped. The growth-loops doc update is still pending and should cite `chapter_arc_nomination` as the first behavioral upsell source.

### `docs/chapters-build-plan.md`

Any references in the build plan to V2 cadence picker / multi-template UX / monthly or yearly defaults are superseded by Phase 2.1 (those features are cut, not deferred).

---

## Dependency graph

```
Phase 1 ✅ (Instrumentation + content fidelity)
   │
   ▼
Phase 2 ✅ (Weekly-only cutover + surface polish + defaults)
   │
   ├─── Phase 3 ✅ (Signal-first detail screen + short caption)
   │        │
   │        ├─── Phase 5 ✅ v1 (Next Steps — Arc Nominations)
   │        │        │
   │        │        ├─── Phase 6 ⏳ (Next Steps v2 — Goals/Activities/Align)
   │        │        │
   │        │        └─── Phase 8 ⏳ (Cross-Chapter continuity)
   │        │
   │        └─── Phase 7 ⏳ (Chapter-as-invitation — add-a-line)
   │
   └─── Phase 4 ⏳ (HealthKit — independent; evidence for 5+)
```

Legend: ✅ landed, ⏳ not started.

**Cross-plan dependencies:**
- Phase 1.2 + 1.3 (digest content bugs) overlap with **Phase 3.5 in `docs/email-system-ga-plan.md`**. Track in one plan, not both.
- Phase 1.1's `chapter_viewed` with a `from: 'email'` source is what makes the email GA plan's Phase 6 analytics funnel close.
- The digest cannot be sent at any meaningful scale until Phase 1 is complete (otherwise we're sending broken content with no measurement).
- Phase 4's client-side HealthKit background write depends on the Expo background-task setup already used for notifications.

---

## Relationship to other docs

- `docs/chapters-build-plan.md` — original forward-looking build plan; this doc continues the trajectory.
- `docs/email-system-ga-plan.md` — owns digest delivery infrastructure. This plan owns digest *destination* and *content*; the digest content model changes here (caption lead once Phase 3 ships, Next Steps hint once Phase 5 ships) in ways that plan's Phase 3.5 should accommodate.
- `docs/growth-loops-strategy.md` — Chapters is the primary engagement spine. Success metrics for that loop are only achievable after Phase 1 measurement lands; behavioral upsell only exists once Phase 5 lands.
- `docs/life-architecture-model.md` — requires the single-line amendment in §Amendments before Phase 5 ships.
