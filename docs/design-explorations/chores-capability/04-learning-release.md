# Learning Release: Child-readable Chore Agreement

## Concept To Build

Build a quiet Chores inventory where the list remains primary and an anchored bottom agreement bar tells the child what remains, by when, why it matters, and—when enabled—their current token balance.

## Capability Delta

Today, the child can:

- open the Kwilt-Labs-gated Chores capability;
- distinguish personal rows from available household rows after explanation;
- take, release, and complete local sample occurrences; and
- see token values and a fixed progress calculation.

Today, the child cannot reliably:

- understand what period the progress calculation describes;
- tell whether the count is a daily assignment, weekly choice quota, or all-time total;
- understand `Release` without caregiver explanation; or
- see the actual household agreement without allowing progress chrome to dominate the list.

After this release, the child can:

- read assigned and claimed work under **My chores**;
- understand **Choose a chore** as the available family pool;
- use **Take** and a secondary **Return to family list** menu action to move an open chore into or out of their list;
- read one next-action sentence assembled from the active expectation;
- distinguish daily assigned work from an additional weekly choice quota;
- see why the agreement matters when it is connected to Screen Time;
- see their current token balance and each chore's token value through one quiet savings treatment; and
- open **How my chores work** for the full agreement only when they need it.

Still intentionally not supported:

- production caregiver configuration of expectations;
- Screen Time policy evaluation or device enforcement;
- household-authorized backend reads or writes;
- projection into production To-dos;
- production recurrence, claim expiry, corrections, notification delivery, token redemption, or shared-device authentication.

## User Experience

The screen opens with `Chores`, the existing active-member control, **My chores**, and **Choose a chore**. The current top progress labels and progress bar are removed.

Rows retain the shared To-do visual grammar. Assigned and claimed rows use the shared squared completion control. Attempting completion opens the taller chore detail drawer without changing the occurrence. The drawer makes optional photo capture easy and owns the explicit **Mark done** or **Submit for approval** action. A checked control means the occurrence is genuinely complete and can be unchecked by the child who performed it. Review-required work changes to **Waiting for approval** only after explicit submission; it does not show a completed check or award credit until approval. Available rows use a plus icon with **Take**. A claimed open-pool row uses a quiet ellipsis; its menu contains a neutral minus-icon **Return to family list** action. It never uses a trash icon or red styling. Returning a chore removes it from **My chores**, restores it to **Choose a chore**, and briefly offers `Undo`.

When tokens are enabled, each row shows a small monochrome circle-dollar-sign outline with explicit secondary text, such as `[circle dollar sign] 2 tokens`. The anchored agreement bar uses the same quiet treatment for the child's current balance, such as `[circle dollar sign] 8 tokens`. The icon has no fill, badge, or reward color. Accessibility labels retain the earning distinction: `Earns 2 tokens` for a chore and `8 tokens` for the balance.

The bottom agreement bar is part of the screen structure, separated by a quiet top divider rather than presented as a floating card. It composes only the clauses that are active for the selected child:

- assigned daily work: `1 chore left today`, `2 chores left today`, or `Daily chores done`;
- a quota scoped specifically to the open family pool: `Choose 3 more by Friday`;
- a quota that includes any qualifying chore: `3 chores left by Friday`;
- pending reviewed work: `1 waiting for approval`;
- completed agreement: `All chores done for this week`; and
- connected benefit: `Needed for weekend Screen Time`.

The distinction between `Choose 3 more` and `3 chores left` is derived from the expectation's qualifying scope. The interface must not infer whether assigned chores count toward a quota.

Tapping the agreement text opens **How my chores work**. For the first mixed sample agreement, the sheet reads:

- **Every day** — `Finish your daily chores.`
- **By Friday** — `Choose 12 chores from the family list.`
- **Weekend Screen Time** — `Finish both parts for weekend Screen Time.`
- **Your tokens** — the circle-dollar-sign outline and explicit current balance, followed by `Each chore shows how many tokens it earns.`

Only applicable sections appear. If tokens are disabled, token vocabulary and iconography disappear. If no expectation is active, progress language and the agreement sheet disappear rather than inventing a target. A token-enabled household with no expectation may show a small balance-only treatment without a full-width agreement message.

Review-required work becomes `Waiting for approval`. The agreement bar acknowledges the pending state so completion never appears to have been ignored. Token balance and any approval-gated qualifying count update only after approval. The caregiver review experience remains otherwise unchanged in this slice.

## Existing Product Relationship

This release refines the existing Chores learning screen rather than introducing another destination. It keeps the shared Activity/To-do row grammar, capability shell, active-member control, local occurrence adapter, detail drawer, and caregiver review flow.

It replaces the misleading fixed top progress calculation with an expectation projection. Chores owns the child-facing completion and token facts. Screen Time still owns access policy and device enforcement; no Chores copy claims that device access has been applied.

## Buildable Slice

Must be real:

- removal of the current top labels and progress bar;
- **My chores** and **Choose a chore** section hierarchy;
- plus-icon **Take** and a claimed-chore ellipsis containing the neutral minus-icon **Return to family list** action;
- a reusable semantic circle-dollar-sign icon used with explicit token text for row values and current balance;
- an explicit sample expectation with separate assigned-work, choice-quota, deadline, qualifying-scope, benefit, and token-policy facts;
- deterministic projection of the applicable agreement-bar clauses;
- the anchored bottom agreement bar and **How my chores work** sheet;
- incomplete, partially complete, complete, pending-approval, tokens-disabled, and no-expectation behavior;
- accessibility labels that preserve meaning when visible copy relies on iconography; and
- focused logic and screen tests plus Simulator evaluation through the real capability menu.

Can be thin or temporary:

- realistic local-only expectation fixtures behind Kwilt Labs;
- Charlie's mixed agreement as the primary visual scenario;
- one secondary member fixture demonstrating omitted clauses or disabled tokens;
- local persistence and simulated caregiver approval; and
- a provisional semantic token glyph that can be visually refined without changing its meaning.

Intentionally excluded:

- a generic caregiver rules builder;
- a dashboard, percentage, progress bar, streak, leaderboard, or reward catalog;
- duplicate completion truth or a second production task store;
- claims that Screen Time is unlocked or delivered;
- production data migrations, household authorization, or notification infrastructure; and
- broader redesign of caregiver review, child photo evidence, or chore creation.

## Release Channel

`Local build`, gated behind Kwilt Labs. The next session should run in the native Simulator or a signed local device with realistic state transitions. This is sufficient to test child comprehension before committing to production expectation persistence or caregiver configuration.

## Brand-Goodwill Guardrails

- The list remains visually more important than the agreement bar.
- The bar states the next useful fact; it does not score the child.
- Missing or late work receives no shame, urgency color, or loss framing.
- Tokens remain optional and disappear completely when disabled.
- The interface never infers which chores count toward an agreement.
- Screen Time language describes the agreement, not enforcement success.

## Reversibility

The agreement projection consumes explicit learning-fixture facts behind the existing Labs gate. The top progress treatment can be removed without migrating production data, and the local expectation adapter can later be replaced by household-authorized expectation and Screen Time references without changing the child-facing composition contract.

## Permanent Product Threshold

Promote the expectation experience beyond Labs only after children can explain what remains, the relevant time window, the difference between assigned and chosen work, and the purpose of the agreement without caregiver coaching. Permanent implementation also requires household-authorized expectation versions, truthful token-ledger balance, deterministic approval/correction handling, and Screen Time criteria that remain separate from device-delivery proof.
