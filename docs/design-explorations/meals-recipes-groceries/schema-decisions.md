# Household Food Schema Decisions

Status: implementation preflight
Last updated: August 5, 2026

This record resolves the decisions required before the first Household Food
database migration. Contract tests are authoritative where prose and code ever
drift.

## Identity

- Food aggregates are owned and acted on by Kwilt `Person` identity.
- Supabase `auth.users.id` authenticates a session; it is not persisted as a
  second food-domain owner when a Person identifier exists.
- Every server mutation resolves the authenticated user to the permitted
  Person before applying capability rules.
- Public creator identity is a separate, explicit profile. Account, Person,
  Household, and contact names never become public by inference.

## Recipe lifecycle and immutable references

- `Recipe` is stable administrative identity with `active`, `archived`, and
  recoverable `deleted` states.
- Approved content lives in immutable `RecipeVersion` records.
- Finalized Meal Plans, independent copies, and publications reference an exact
  version identifier. Archive or later editing never rewrites the snapshot.
- Soft-deleted identities and unreferenced private artifacts follow the account
  deletion/retention policy. Immutable versions required by an authorized plan,
  copy, publication audit, or rights case are retained only as long as that
  purpose requires and are no longer generally discoverable.

## Import artifacts

- Import artifacts are encrypted by the storage provider and owner-scoped by
  RLS. Paths begin with the resolved Person identifier, never user-controlled
  metadata.
- A temporary artifact expires after seven days by default. Save, cancel,
  expiry, or account deletion queues deletion unless the user explicitly keeps
  a user-owned family image as a Recipe media asset.
- URL response bodies are processed transiently and are not persisted.
- Field evidence may retain a bounded source crop/reference during review; it
  does not enter standard analytics or model-training data.

## Public identity and publication

- `PublicCreatorProfile` is opt-in and may use a chosen public name, avatar,
  and bio independent of private identity.
- Child accounts cannot create a public profile or publish in the initial
  policy. A future adult-reviewed flow requires a separate safety decision.
- `RecipePublication` pins an immutable Recipe version plus attribution,
  rights attestation, public-approved media, and selected distribution scopes.
- Withdrawal removes discovery and new access. Minimal publication, moderation,
  lineage, and rights-case records may remain in a non-public audit boundary.
- AI may prepare metadata and a preview. Only the authorized person selects
  public identity, attests rights, changes distribution, or publishes.

## AI evidence and privacy

- Recipe extraction records model version, prompt version, field confidence,
  warnings, and source evidence references inside the owner-scoped draft.
- Standard analytics may record source type, confidence/warning buckets,
  correction count, latency/cost bucket, proposal outcome, and receipt outcome.
- Standard analytics never contain images, source URLs, Recipe text, private
  names, correction text, family responses, grocery contents, or rationales.
- User corrections improve the current draft. Reuse for personalization or
  model improvement requires a separate explicit product/privacy decision.

## Proposal ledger

- Food reuses the canonical capability proposal and mutation-receipt lifecycle.
- Native and conversational origins require the same capability operation,
  evidence, expected version, idempotency, confirmation, and receipt.
- The current persisted ledger is conversation-thread-owned. Preflight Task 5
  confirmed that native Food requires a channel-neutral `origin_channel` and
  nullable conversation references; a synthetic Chat thread and a parallel
  Food proposal table are both prohibited.
- The narrow migration and existing-field map are recorded in
  `proposal-ledger-compatibility.md`. It must preserve the current proposal,
  decision, reservation, receipt, undo, and exact-return lifecycle.

## Supabase implementation constraints

- Every exposed table has RLS enabled and explicit grants. New public tables
  cannot assume automatic Data API exposure.
- Policies use `TO authenticated` plus owner/grant predicates and indexed
  authorization columns; `raw_user_meta_data` is never authorization evidence.
- `UPDATE` policies include both `USING` and `WITH CHECK`.
- Security-definer RPCs are exceptional, revoke default `PUBLIC` execution,
  validate `auth.uid()`/resolved Person inside the function, fix `search_path`,
  and expose only the narrow intended signature.
- Temporary Storage upsert policy, if used, must cover `INSERT`, `SELECT`, and
  `UPDATE`; deletion is separately authorized.
- Edge Functions preserve user JWT/RLS scope for user-owned operations, keep
  secret keys server-only, bound execution, and make retries idempotent.

## Current Supabase compatibility review

Reviewed August 5, 2026. Relevant current changes are the move away from
automatic Data API/GraphQL exposure for new public tables, current Edge
Function user-auth wrappers and CORS guidance, and Storage's operation-specific
RLS requirements. The planned schema uses explicit grants/RLS and does not
depend on GraphQL, extension-version pinning, Management API log endpoints, or
self-hosted gateway behavior.
