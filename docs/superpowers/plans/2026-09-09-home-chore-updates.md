# Automatic household chore updates

User accepted automatic chore updates, immediate household-only visibility, factual attribution, Thanks/comments, current approval state, undo reconciliation, and compact grouping. Implementation continues in the existing main checkout; no worktree or release flag change.

## Frame and system fit

Audience: aspirational family organizers; Maya. Hero: `jtbd-move-the-few-things-that-matter`. Supporting: `jtbd-carry-intentions-into-action`, `jtbd-invite-the-right-people-in`, `jtbd-trust-this-app-with-my-life`. Extend Home so household contribution can be noticed without another task for the completer. The gap is recognition after completion, alongside the existing Maya family-life flow. No delivery score upgrade until runtime and backend evidence exists.

Chosen from the three discussed alternatives: immediate compact grouped updates, individual large posts, delayed digest. Immediate grouped updates preserve timeliness and room for other life. Bet: household contributions invite appreciation when visible without authoring friction. Learn whether families thank/respond, understand pending approval, and find volume comfortable. Revisit grouping if updates crowd out personal moments. Broader automatic activity expansion is deferred.

Chores owns Activity-backed occurrences and authenticated household-member execution, including shared-device children. Home owns presentation and conversations. System updates intentionally extend the authored-only contract. A child membership is the performer, not the caregiver's account. No proof photos, reward balances, or review notes are copied. No follower visibility, no historical backfill, no push notification, no composer or celebration prompt. Existing Home remains adult-account-only.

## Build and UI contract

Database-created system posts have null human author and a required chore membership. A source-event mapping makes retries idempotent. New completed/waiting-approval occurrences join an active group for the same household/member within 30 minutes, at most 12 items. Approval updates the same event; reopening, return for another pass, deletion, and rejected earlier-day reports remove that item. Empty groups disappear. Recipients are snapshotted when the group is created, with current household/performer authority required on every read. Chore updates cannot be authored, edited, republished, or audience-expanded through Home RPCs.

UI authority: Kwilt Expo app, existing src/ui Card/Button/Text/BottomDrawer and theme tokens. No new dependency or external exemplar. Three-second read: who helped, what they finished, pending review if any. Primary action: Thanks. Secondary: Comment. Multiple chores reveal titles/statuses via Show chores. Required states: single/grouped, waiting/mixed/approved, undone/removed, access revoked, loading/error, response counts. Reuse Home pagination, polling, conversations, moderation and reaction persistence.

## Execution

1. Add failing isolated database scenarios for automatic projection, approval/undo, grouping, future-only audiences, source authority, forged mutations, and response continuity.
2. Implement migration and source-driven projection. Verify actual Chores schema and live function contract, no fixture data added to Andrew's household.
3. Add component regressions and implement compact chore card with expandable detail; update Home union/author handling and conversation context.
4. Run focused tests, deploy authorized migration, exercise disposable live household through Chores RPC and Home RPC, clean fixtures. Review permission paths and advisors.
5. Run verify:changed once for the completed code; capture native preview screenshots as local image files and inspect actual route. Record proof and remaining release limitations.

## Verification evidence

Deployed to Kwilt Supabase `sqxwjtorodqjdfnuvprf`: `20260909135005_home_chore_updates`, `20260909135354_chore_occurrence_version_comparison`, and `20260909135513_home_chore_report_subject`. Local filenames match the deployment ledger.

Seventeen isolated PostgreSQL scenarios pass, including all existing authored Home permission/media/report tests against the upgraded schema, automatic child attribution, grouping, pending approval, responses retained through approval, removal/revocation, protected system posts, person-subject reporting, and occurrence version regression. Two focused native component tests pass for grouping, detail expansion, pending status, Thanks/comments, and earlier-day copy.

The real deployed Chores RPC initially rejected its own snapshot's ISO timestamp with `stale_chore_occurrence`; SQL timestamp text formatting differed and missing versions bypassed the old comparison. A failing local regression and rollback-only live reproduction preceded the occurrence-only timestamp fix. Comparisons now use timestamp values and reject missing versions. A second live test caught the existing report subject constraint; system reports now identify the household person and return a household-management follow-up, preserving human reply attribution.

`scripts/shared-life/live-chore-verification.sql` passes on the deployed database under the authenticated role, with separate disposable adult/child/outsider JWT subjects: definition creation, completion/retry, automatic group, approval with thanks/comments, report, outsider denial, protected mutations, and reopening. The transaction rolls back; independently queried counts confirm zero temporary users, people, or households. This is live database/RPC-role proof, not an HTTP sign-in test. The opt-in HTTP harness is also provided, but could not run because the CLI credential returned 401; no persistent fixtures were created by it.

Live grants deny authenticated direct reads of the event mapping and direct execution of its projector. Security advisors report the event mapping as RLS-without-policies, expected for the existing RPC-only design; see https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy. The new group index is currently reported unused in this small dataset. No Home-specific access regression was reported. Existing unrelated project advisories remain outside this slice.

Native verification was attempted against the current checkout, but the Mac locked again. An unlock request is pending. Development Tools includes a clearly labeled fictional automatic-update preview with no backend writes. Release flags remain unchanged; no new TestFlight build is claimed.
