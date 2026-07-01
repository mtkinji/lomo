# Learning Release: Activation Experiment Drafting Loop

## Product Concept

An internal Codex/Kwilt operator loop turns activation telemetry into one job-flow-grounded experiment candidate and a reviewable Kwilt Goal draft.

V1 is not an in-app user feature. It is a product-ops learning release that tests whether this operating rhythm helps Andrew move from activation evidence to shipped experiments faster and with better product grounding.

## User Experience

Andrew starts the loop manually in Codex:

> Run the activation experiment loop.

The loop then:

1. Pulls the activation pipeline read from Supabase/PostHog or a saved query package.
2. Applies the internal-user exclusion.
3. Classifies users by activation stage.
4. Identifies the highest-leverage weakness or says there is insufficient signal.
5. Maps the weakness to a Kwilt audience, persona, JTBD, and job-flow step.
6. Produces one experiment candidate.
7. Previews a Kwilt Goal payload with phase-level Activities.

When the Kwilt-write capability is available, the final step becomes:

8. Ask Andrew to approve, edit, or skip creating the Goal and Activities.

## Existing Product Relationship

This extends existing systems rather than creating a new one:

- Analytics remain in PostHog/Supabase.
- Product interpretation uses personas, JTBDs, and job flows.
- Design reasoning uses `design-thinking-loop`.
- Durable work uses Kwilt Goals and Activities.
- Build-continuity behavior should reuse the existing control-plane direction rather than introduce a new planning object.

## Buildable Slice

Must be real:

- A documented loop or skill invocation that produces a consistent Activation Pipeline Brief.
- A stable activation-stage model:
  - Signed Up / Installed
  - Oriented
  - Identity Anchored
  - Commitment Made
  - Plan Formed
  - First Meaningful Action
  - Return Hook Set
  - Day-2 Return
  - Activated
  - Daily Habit Candidate
- A rule for excluding internal users.
- One opportunity score formula.
- One experiment candidate format.
- One Kwilt Goal draft format.

Can be thin or temporary:

- Data pulls can start as manual SQL/PostHog queries if a saved script is not ready.
- Kwilt writes can start as preview-only markdown until the write loop is ready.
- The first experiment candidate can be generated inside Codex rather than a separate automation runtime.

Intentionally excluded:

- Scheduled background automation.
- Production UI.
- Multi-experiment backlog.
- Automatic writes.
- Automatic implementation.
- Long-term experiment board.

## Release Channel

Local/internal only.

The loop should run in Andrew's Codex/Kwilt workspace first. It should not be exposed to users and should not create production-facing behavior until at least one full audit -> experiment -> Kwilt Goal -> ship -> reflect cycle proves useful.

## Brand-Goodwill Guardrails

- No user-facing shame, urgency, or optimization language.
- Do not treat users as activation scores.
- Keep any individual-user debugging out of durable product artifacts unless required and intentionally redacted.
- Prefer "meaningful active day" over raw daily active user when making product decisions.
- If the data is weak, recommend instrumentation instead of inventing confidence.

## Reversibility

The first version is reversible because it is documentation, skill behavior, and optional Kwilt drafts. If it produces noisy experiments, retire the loop without touching customer-facing app behavior.

If future write integration creates Kwilt Goals/Activities, those writes should be normal user-owned Kwilt records that Andrew can edit, complete, archive, or delete.

## Permanent Product Threshold

Turn this from a manual/internal learning release into a recurring automation only if:

- It identifies a plausible activation weakness at least two cycles in a row.
- Andrew accepts or edits the proposed experiment more often than he rejects it.
- At least one drafted experiment ships and produces interpretable learning.
- The Kwilt Goal payload feels reviewable rather than noisy.
- The loop reduces time from activation read to experiment decision.
