# Recipe Image Generation Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Do not use subagents or create another worktree unless Andrew explicitly approves parallel execution.

**Goal:** Generate, review, publish, and replace cookbook-quality images for the 500 DB-backed catalog meals without requiring a new mobile build.

**Architecture:** A durable server-side job queue selects only published catalog versions lacking approved media. Generation is asynchronous and idempotent. Original and derivative files live in a permanent recipe-media Storage bucket; DB media rows pin rights, prompt/model provenance, QA results, crops, alt text, and lifecycle. Only editorially approved assets become publication media, so generation never changes what users see by itself.

**Tech Stack:** Supabase Postgres/Storage/Edge Functions/Cron, OpenAI Images API, TypeScript/Deno, deterministic scoring, editorial review tooling, Jest/Deno tests.

---

## Task 1: Define media and job lifecycles

- [ ] Add permanent private `recipe-catalog-media` originals and public delivery derivatives, or a private bucket plus signed delivery if product policy requires it.
- [ ] Extend media metadata with recipe version, source kind, prompt version, model, generation ID, checksum, width/height, crop focal point, QA results, rights, cost, and lifecycle.
- [ ] Add `kwilt_recipe_image_jobs` with states `missing`, `queued`, `generating`, `generated`, `editorial_review`, `approved`, `published`, `rejected`, and `failed`; enforce valid transitions in an RPC.
- [ ] Claim jobs with `FOR UPDATE SKIP LOCKED`, leases, bounded retries, idempotency keys, and dead-letter visibility.

## Task 2: Implement deterministic prioritization

- [ ] Add a pure scorer and tests using hard coverage constraints, active Collection wave completion, current discovery position, current artwork mismatch, aggregate opens/plans/cooks/searches, category/cuisine/visual-form gaps, age, and retry penalty.
- [ ] Exclude private query text and user identity from prompts and ranking inputs.
- [ ] Select a first wave of 48 that covers every visible discovery position, every active editorial Collection, and a broad category/cuisine/visual-form matrix.
- [ ] Emit an inspectable score breakdown for each queued meal so editorial priority is explainable.

## Task 3: Build the cookbook art-direction prompt

- [ ] Add a versioned prompt builder with tests for exact dish title, visible defining ingredients, cooking method, culturally plausible presentation, crop-safe composition, and recipe-specific negative constraints.
- [ ] Enforce the shared direction: modern cookbook, believable home-cooked texture and portion, natural window light, quiet warm surface, appetizing but not glossy or synthetic.
- [ ] Exclude hands, people, text, logos, packaging, impossible ingredients, excessive garnish, and culturally careless substitutions.
- [ ] Generate 4:3 or square master files large enough for card and Recipe Home derivatives.

## Task 4: Generate and run automated QA

- [ ] Add a server-only generator function that reads the exact immutable recipe version and never exposes the API key to clients.
- [ ] Upload output by content-addressed path, create media metadata, and record cost/model/prompt provenance.
- [ ] Run dimension/format, semantic dish match, duplicate similarity, text/logo/safety, and crop checks; reject automatically when a hard gate fails.
- [ ] Retry only retryable failures and cap attempts/cost per recipe and per run.

## Task 5: Editorial review and publication

- [ ] Create 12-image contact sheets plus full-resolution review links showing recipe title, roster ID, prompt version, QA flags, and mobile card/detail crops.
- [ ] Require explicit checks for dish and ingredient truth, cultural plausibility, appetite, cohort coherence, crop safety, rights, and useful alt text.
- [ ] Approval creates/pins an approved media asset; publishing atomically replaces the publication media reference and leaves the prior asset auditable.
- [ ] Rejection records structured reasons that inform a revised prompt without training on private user content.

## Task 6: Prove DB-only replacement

- [ ] Publish one approved image to an internal catalog publication and confirm the already-installed app refreshes it from the DB/Storage URL.
- [ ] Replace that image with a second approved asset and prove cache-busted rendering without a native build or JS update.
- [ ] Complete the 48-image wave, review as contact sheets, then queue later waves based on real discovery/cook usage and coverage gaps.
- [ ] Record generation cost, approval rate, mismatch rate, duplicate rate, and time-to-publish; do not optimize ranking for engagement alone.
