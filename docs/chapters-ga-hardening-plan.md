## Chapters — GA-hardening & Engagement-readiness Plan

**Goal:** Get the Chapters feature to a quality bar worthy of being the destination for Kwilt's weekly re-engagement email (the "Chapter Digest"). The feature is shipped and non-trivial — the gap is polish, measurement, defaults, and a small number of product decisions that have been deferred.

**Strategy source:** Splits off from `docs/email-system-ga-plan.md`. The email GA plan owns delivery infrastructure; this plan owns the destination. Builds on the already-executed portions of `docs/chapters-build-plan.md` (backend + generation + detail screen + digest email template are all shipped).

**Why now:** The weekly Chapter Digest is the marquee re-engagement loop coming out of the email GA work. The digest is only worth sending if the thing it links to is worth reading, measurable, and has a believable "this is on" signal for the user.

**Scope invariant:** No changes to the fundamental app shell / canvas UX layers. All UI changes are additive (new sections, new settings, new empty-state copy) or corrective (unread indicator, missing `topArcs` block). No new primary nav entry without an explicit product decision (see §Open product questions).

**Estimated duration:** ~2 days focused work (Phase A + Phase B). Phase C is separate product conversation before any engineering.

---

## What's there today (honest readout)

- **Backend generation** — solid. Scheduled + manual runs, deterministic metrics + LLM-written narrative with citation validation, structured `output_json` with `sections.story.body`, strict validator, anti-hallucination prompt rules.
- **ChapterDetailScreen** — good. Magazine-style "Kwilt report" with kicker / headline / dek / metrics band / long structured story (markdown subheads) / bullet sections / expandable forces block.
- **ChaptersScreen** — adequate. Latest chapter card + chronological history. Matches the old `docs/ux-flow.md` list pattern *except* no snippet on history cards and no unread indicator.
- **Digest email** — broken in content. Reads `outputJson.narrative`, but the generator writes `outputJson.sections.story.body` → snippet is very likely empty in production. Passes `period.key` (e.g. `2026-W15`) as human label → subject/preheader copy is technical.
- **Defaults** — off. App-side default template creation sets `email_enabled: false`. No user receives the digest today unless the DB row has been hand-flipped.
- **Analytics** — absent. No `chapter_generated`, `chapter_viewed`, `chapter_shared`, or `chapter_digest_opened` events. We cannot currently measure whether chapters drive engagement at all.
- **In-app settings** — thin. Backend has `email_enabled`, `detail_level`, `tone`, `filter_json` per template. Zero UI surfaces these.

**Bottom line:** The read experience is stronger than the surrounding apparatus. The work here is mostly polish, measurement, and defaults — not a feature rebuild.

---

## Scope boundary (what's in each doc)

| Doc | Owns |
|---|---|
| `docs/chapters-build-plan.md` | Original forward-looking feature build plan (schema, generation, detail screen). Execution largely complete through Phase 3. |
| `docs/email-system-ga-plan.md` | Email delivery infrastructure — universal-link handoff, CTA URL migration, **digest email content bugs (Phase 3.5)**, unsubscribe, deliverability. |
| `docs/chapters-ga-hardening-plan.md` (this doc) | Everything else needed before the digest can go out at scale: analytics, in-app settings surface, unread state + snippets, unused UI blocks, default template flip, content freshness. |

---

## Phase A — Instrumentation & content fidelity (~0.5 day)

**Theme:** Before we do any other polish, make the feature measurable and stop it from lying. This phase unblocks every judgement call downstream (is the polish working? is the email converting? should cadence default to weekly or monthly?).

**Status:** Not started

### A.1 Add Chapters analytics events

Files: `src/services/analytics/events.ts`, `src/features/chapters/ChaptersScreen.tsx`, `src/features/chapters/ChapterDetailScreen.tsx`, `src/features/chapters/ChapterGenerateDrawer.tsx`.

New events:

| Event | Properties | Fires from |
|---|---|---|
| `chapter_list_viewed` | `{ chapter_count }` | `ChaptersScreen` mount |
| `chapter_generate_started` | `{ cadence, source: 'plus' \| 'empty_state' \| 'retry' }` | `ChapterGenerateDrawer` submit |
| `chapter_generate_succeeded` | `{ cadence, period_key, duration_ms }` | on `ready` |
| `chapter_generate_failed` | `{ cadence, reason }` | on `failed` |
| `chapter_viewed` | `{ period_key, from: 'list' \| 'email' \| 'push' \| 'deep_link' }` | `ChapterDetailScreen` mount |
| `chapter_section_expanded` | `{ section: 'forces' \| 'patterns' \| ... }` | expandable section tap |
| `chapter_shared` | `{ method: 'copy' \| 'system_share' }` | future; stub now |

The `from` dimension on `chapter_viewed` is what lets us attribute an open to the digest email (combined with the Phase 6 `EmailDeepLinkConverted` event on `utm_source=email`).

### A.2 Fix the digest snippet field bug

Files: `supabase/functions/_shared/emailTemplates.ts` (`buildChapterDigestEmail`), `supabase/functions/chapters-generate/index.ts` (caller).

- The email template reads `outputJson.narrative`; the generator writes `outputJson.sections.story.body`. Reconcile on the canonical schema field.
- Truncate the snippet intelligently (first paragraph, ~280 chars) rather than the middle of a sentence.
- Add a test fixture from a real `output_json` so this can't silently regress.

### A.3 Humanize period labels in the digest

Files: `supabase/functions/_shared/emailTemplates.ts`, `supabase/functions/_shared/periodLabels.ts` (new).

- Stop passing `period.key` (e.g. `2026-W15`) as the label.
- Produce human copy by cadence: weekly → `"the week of Apr 13"`, monthly → `"April 2026"`, yearly → `"2026"`, custom → `"Apr 13 – Apr 20"`.
- Update subject/preheader to match the pattern in `email-system-ga-plan.md` Phase 5 (subject = headline, preheader = complementary hook, never duplicates).

### Phase A acceptance criteria

- [ ] All 7 events show up in PostHog within 1 hour of deploy with non-zero counts in staging/dev.
- [ ] A test fixture proves the digest email snippet renders a non-empty preview from a real `output_json`.
- [ ] Subject/preheader for the digest never contains a raw period key (regex check in CI or a test).

---

## Phase B — Surface, state, and defaults (~1 day)

**Theme:** Make the feature feel "on" and cared-for. Add the small UI + settings work that separates "we shipped it" from "we trust it enough to email users about it weekly."

**Status:** Not started

### B.1 Chapter list polish

Files: `src/features/chapters/ChaptersScreen.tsx`.

- Add a one-line snippet (first sentence of `story.body`, ellipsized) to each history-card, matching the pattern `docs/ux-flow.md` already describes.
- Add an unread indicator — simple dot, derived from a per-chapter `read_at` timestamp stored in `AsyncStorage` initially (no migration needed for V1; a proper column can come later if the metric turns out to matter).
- On `ChapterDetailScreen` mount, mark the chapter read.

### B.2 Render the unused `topArcs` block

Files: `src/features/chapters/ChapterDetailScreen.tsx`.

- `topArcs` is already computed but never rendered. Add it between the metrics band and the main story as a compact row of 1–3 Arc chips. This directly connects each Chapter to the Arcs it reflects on, which is part of what makes a Chapter feel like "your" chapter rather than "a generated essay."

### B.3 Chapters digest settings surface

Files: new `src/features/chapters/ChapterDigestSettingsScreen.tsx`, `src/navigation/RootNavigator.tsx` (register inside `MoreStack` or `SettingsStack`), `src/services/chapters.ts`.

Minimal V1 — a single screen accessible from both `MoreChapters` ("Digest settings" link) and the app-wide Notifications settings screen:

- Toggle: **Email me when a new chapter is ready**. Writes to the default template's `email_enabled`.
- Toggle: **Auto-generate my weekly chapter** (controls whether the daily cron creates one). Writes to `enabled`.
- Read-only preview: cadence (weekly), timezone (user's current), "what's included" summary (counts).

Intentionally deferred to V2 (tracked in `chapters-build-plan.md` Phase 4): cadence picker, tone selector, filter editor, multi-template UX.

### B.4 Default template: `enabled=true`, `email_enabled=false`

Files: `src/services/chapters.ts` (default template creation), plus a one-shot migration in `supabase/migrations/` for existing users.

- Flip `enabled` to **true** by default so every user gets a chapter generated at the end of their first full week. (Today it's false and cron skips them.)
- Leave `email_enabled` as **false** by default for V1 — the user opts into the digest from B.3, the app doesn't opt them in by surprise.
- The onboarding flow can surface the digest opt-in at the "your first chapter is ready" moment, keeping the offer contextual rather than upfront-overwhelming.

### B.5 Empty / pending / failed state copy

Files: `src/features/chapters/ChaptersScreen.tsx`, `ChapterDetailScreen.tsx`.

- Empty (no chapters yet, < 1 full week): "Your first chapter arrives next [day]. It'll recap the week of [date range] using the Arcs you're showing up for."
- Pending (generation running): progress state rather than blank.
- Failed: human-readable "We couldn't write this chapter. Tap to retry." instead of the current generic placeholder.

### Phase B acceptance criteria

- [ ] History cards show snippet + unread indicator; read state clears on detail view.
- [ ] `topArcs` row renders in detail screen for chapters with ≥1 arc.
- [ ] New Digest Settings screen reachable from `MoreChapters` and Notifications; both toggles persist and round-trip through the server template.
- [ ] New signups created after the default flip get `enabled=true, email_enabled=false`; a backfill migration covers existing users.
- [ ] Empty / pending / failed states all have on-brand copy and a next action.
- [ ] No changes to primary nav or app shell; Chapters remains under More.

---

## Phase C — Open product questions (decision first, code later)

These are the questions I'm deliberately *not* executing against until there's an explicit product decision. Each affects the business case for the weekly digest, so each is worth a 30-minute conversation before the digest launches at scale.

1. **Nav placement.** Chapters lives under More. If the weekly digest is the marquee re-engagement loop, does Chapters deserve a home-screen surfacing (e.g. a "Your last chapter" card on Today) or an eventual tab promotion? A surfacing on Today is low-risk and reversible; a tab is a bigger call.
2. **Auto-generation vs opt-in.** Phase B flips `enabled=true` (chapter gets generated) but leaves `email_enabled=false` (email stays off until user opts in). Should we be *more* aggressive and auto-enable the email for Pro users, or users who have completed onboarding? This trades deliverability risk against engagement.
3. **Cadence default.** Weekly is the assumed default. Is there a user cohort (low-activity users) for whom monthly would feel more proportional and less nagging? Should we ship a "pick your cadence" onboarding step, or default weekly and let users downshift after one digest?
4. **Shareability.** There's no share UI on the detail screen. Chapters as a share asset (a weekly "what I actually did" post-card) could be a growth loop independent of email. Is this in scope for Chapters GA or a Q3 growth-loops item?
5. **Tone and length.** Current chapters run long (article-style). On a small phone in Apple Mail, is that the right shape, or do we want a "short/medium/deep" detail selector in settings from day one?

Each of these should produce a one-line decision in this doc before Phase A/B go live, so we're not optimizing blind.

---

## Dependency graph

```
Phase A (Instrumentation + content fidelity)
  ├── A.1 analytics events
  ├── A.2 snippet field bug
  └── A.3 humanize period labels
        │
        ▼
Phase B (Surface, state, defaults)
  ├── B.1 list polish (snippet + unread)
  ├── B.2 topArcs rendering
  ├── B.3 digest settings screen
  ├── B.4 default template enabled=true
  └── B.5 empty/pending/failed state copy
        │
        ▼
Phase C (Open product questions — decision before code)
```

**Cross-plan dependencies:**
- Phase A.2 + A.3 (digest content bugs) are the actual content of **Phase 3.5 in `docs/email-system-ga-plan.md`**. Track them there if the email plan owns the `emailTemplates.ts` edits; track here if this plan does. Not in both.
- `chapter_viewed` with a `from: 'email'` source (A.1) is what makes the email GA plan's Phase 6 analytics funnel actually close.
- The digest cannot be sent at any meaningful scale until Phase A is complete (otherwise we're sending broken content with no measurement).

---

## Suggested sequencing (solo developer)

| Slot | Work | Unblocks |
|---|---|---|
| Day 1 AM | Phase A (all three tasks) | Email digest content correct + measurable |
| Day 1 PM | Phase B.1 + B.2 (visual polish) | Better first impression for post-digest visits |
| Day 2 AM | Phase B.3 + B.5 (settings + states) | User can opt in / see something is happening |
| Day 2 PM | Phase B.4 (default flip + backfill migration) | Auto-generated chapters for everyone |
| *Before first at-scale digest send* | Phase C decisions recorded as one-line commitments in this doc | — |

---

## Relationship to other docs

- `docs/email-system-ga-plan.md` — runs in parallel; depends on Phase A for the digest to not ship broken.
- `docs/chapters-build-plan.md` — original forward-looking build plan; this doc continues the trajectory post-V1.
- `docs/growth-loops-strategy.md` — Chapters digest is the primary W-loop. Success metrics for that loop are only achievable after Phase A measurement lands.
