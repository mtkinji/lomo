## Chapters — Build Plan (Mature Model)

This doc tracks the build plan for **Chapters** as the reflection layer of Kwilt: AI-generated lookbacks that turn Activities into narrative, patterns, and gentle next experiments.

This plan assumes:

- Chapters are generated **server-side** via a **scheduled Supabase Edge Function**.
- Inputs (Arcs/Goals/Activities) are available in Supabase for **signed-in users** via the existing domain sync tables (`kwilt_arcs`, `kwilt_goals`, `kwilt_activities`).
- Email notifications (“Your Chapter is ready”) are **opt-in**.
- Chapters support **templates** so weekly/monthly/yearly reflection and report-style exports can coexist without diluting the meaning of reflection.

---

### North star (what “mature Chapters” means)

- **Templates**: a user can have one or more Chapter templates, each with:
  - cadence (weekly/monthly/yearly),
  - inclusion filter (subset of activities),
  - output format (reflection vs report),
  - delivery (in-app only vs in-app + email).
- **Skimmable, consistent detail**: every Chapter has a predictable section order (story → where time went → forces → highlights → patterns → next experiments).
- **Transparency**: every Chapter shows “what’s included” (counts + filter summary) to avoid black-box distrust.
- **Delivery**: a Chapter arriving should feel like a calm “review moment” (in-app card + optional email), not a nag.

---

### Phase 0 — Product decisions (1–2 hours)

- **Period definitions**
  - Weekly: ISO week (Mon–Sun) in user timezone.
  - Monthly: calendar month in user timezone.
  - Yearly: calendar year in user timezone.
- **Consent / privacy**
  - Require signed-in + user consent for history-based generation.
  - Keep email content minimal by default (preview + review CTA).
- **V1 ship line**
  - Start with one template: **Weekly Reflection**.
  - Schema supports multi-cadence + filters from day one.

---

### Phase 1 — Backend foundation (schema + generation) (1–2 days)

#### 1.1 Supabase schema (migration)

Add two owner-only tables (RLS) keyed by `auth.users.id`:

- **`kwilt_chapter_templates`**
  - `id` (uuid)
  - `user_id` (uuid, FK auth.users)
  - `name` (text)
  - `kind` (`reflection` | `report`)
  - `cadence` (`weekly` | `monthly` | `yearly`)
  - `timezone` (text; snapshot per template)
  - `filter_json` (jsonb; reuse client filter-group semantics)
  - `email_enabled` (bool)
  - `email_recipient` (text, nullable; default user email)
  - `detail_level` (`short` | `medium` | `deep`, nullable)
  - `tone` (`gentle` | `direct` | `playful` | `neutral`, nullable)
  - `enabled` (bool)
  - `created_at`, `updated_at`

- **`kwilt_chapters`**
  - `id` (uuid)
  - `user_id` (uuid)
  - `template_id` (uuid FK)
  - `period_start` (timestamptz)
  - `period_end` (timestamptz)
  - `period_key` (text; e.g. `2026-W04`, `2026-01`, `2026`)
  - `input_summary` (jsonb; counts + filter snapshot + hashes)
  - `output_json` (jsonb; title/story/sections/stats/highlights/insights)
  - `status` (`ready` | `pending` | `failed`)
  - `error` (text nullable)
  - `emailed_at` (timestamptz nullable)
  - `created_at`, `updated_at`
  - Unique constraint: `(user_id, template_id, period_key)`

#### 1.2 Edge Function: `chapters-generate`

Create a Supabase Edge Function that supports:

- **Scheduled run**
  - Finds enabled templates.
  - Determines whether a Chapter is due for the last complete period (week/month/year).
  - Generates idempotently (unique constraint prevents duplicates).
- **Manual run**
  - Generate now for a template (and optionally a custom range later).

Core steps per generation:

- Fetch `kwilt_arcs`, `kwilt_goals`, `kwilt_activities` for `user_id`.
- Apply template filters to Activities (status/tags/arc/goal/type, etc.).
- Compute `input_summary` (counts, included IDs, etc.).
- Call the AI proxy (or existing server-side AI tool path) to produce `output_json`.
- Upsert Chapter to `ready` (or `failed` with error + retry posture).

#### 1.3 Scheduling

- Run the scheduled job **daily** (safer than weekly; it only creates what’s due).
- Retry behavior:
  - `pending`/`failed` with backoff (avoid spamming cost/credits).

---

### Phase 2 — Email “Chapter ready” delivery (0.5–1 day)

- Add `buildChapterReadyEmail(...)` to `supabase/functions/_shared/emailTemplates.ts`.
- Email is sent only when:
  - template has `email_enabled`,
  - user consent allows history-based processing,
  - Chapter transitions to `ready`,
  - `emailed_at` is null (idempotent).
- Email contents:
  - subject includes period range,
  - short preview,
  - CTA “Review Chapter” deep link to Chapter detail in-app (web fallback ok).

---

### Phase 3 — Client UI (Chapters canvas) (2–4 days)

- Replace placeholder `src/features/chapters/ChaptersScreen.tsx` with:
  - Latest ready Chapter card,
  - history list (chronological),
  - “Generate now” entrypoint,
  - visible template + “what’s included” summary.
- Add `ChapterDetailScreen` with the stable section order:
  - Story → Where time went → Forces → Highlights → Patterns → Next experiments
- Add export actions:
  - Copy / Share
  - (Optional) “Email recap” entrypoint for report templates

---

### Phase 4 — Template settings (1–3 days)

Add a Settings surface for Chapters templates:

- enable/disable templates
- cadence selection (weekly/monthly/yearly)
- filter editor (start minimal: status + tags + arc scope)
- email toggle + recipient confirmation
- tone/detail-level controls (wired to `UserProfile` defaults)

---

### Phase 5 — Report templates (manager + annual) (2–4 days)

Add built-in presets (as templates) that are explicitly **report outputs**:

- **Work Update (Weekly)**: include only `done` + tag=work; output groups by goal/arc and includes totals.
- **Annual Accomplishments (Yearly)**: include only `done`; optionally filter by work tag; output grouped and export-friendly.

Report templates should prioritize share/export UX and keep language professional.

---

### Phase 6 — Hardening & governance (ongoing)

- **Observability**: generation metrics + failure reasons + content size.
- **Cost controls**: strict quotas/credits; degrade gracefully (pending + retry).
- **Data freshness**: if server sync is stale, surface that in `input_summary` and UI (“Last synced…”).
- **Privacy**: default email should not include full activity details unless the user explicitly chooses a report template designed for sharing.


