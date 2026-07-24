# Yes-And: Automatic Living Plan Maintenance

## Original idea
After Maya chooses a living target and connects accounts, Kwilt automatically creates and maintains her categories and budgets from the complete evidence set without requiring her to review a plan.

## Adjacencies

**Yes, and what if it could...** treat every account connection change as a new version of the household money story.

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: The plan stays useful as evidence expands instead of becoming stale after onboarding.
- New value: Adding, removing, relinking, or resyncing an account triggers a deterministic recomputation with a before/after receipt.
- Cost delta vs. original: medium
- Anti-pattern check: pass if account changes feed one canonical evidence set rather than creating account-specific planning dashboards.

**Yes, and what if it could...** prevent transfers and cross-account duplicates from changing the plan just because more accounts are visible.

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: Maya can connect her real account set without inflating income or spending.
- New value: Cross-account transfer pairing, pending/settled deduplication, and account-scope provenance become allocator prerequisites.
- Cost delta vs. original: high
- Anti-pattern check: pass if uncertainty lowers confidence or holds the prior plan instead of inventing precision.

**Yes, and what if it could...** create a small set of household-meaningful categories instead of mirroring provider taxonomy.

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: Maya receives a usable budget system, not a bank-category report she must clean up.
- New value: The allocator can propose category identity, group related merchants, and attach budget receipts in one setup pass.
- Cost delta vs. original: high
- Anti-pattern check: pass if categories stay concrete and editable, provider labels remain evidence only, and the first release refuses excessive fragmentation.

**Yes, and what if it could...** use confidence-gated autonomy so Maya only has to think when Kwilt genuinely cannot choose safely.

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: Automation removes admin without hiding uncertainty.
- New value: High-confidence fixed and stable-variable allocations update automatically; weak or changed evidence preserves prior values, leaves capacity unassigned, or asks one focused question.
- Cost delta vs. original: medium
- Anti-pattern check: pass if the system never converts low confidence into a generic review queue.

**Yes, and what if it could...** preserve every deliberate amount Maya sets while the rest of the plan continues to adapt.

- Serves: `jtbd-carry-intentions-into-action`, `jtbd-trust-this-app-with-my-life`
- Job elevation: The system learns the boundary between help and ownership.
- New value: User overrides become durable constraints with provenance, not numbers the next sync can erase.
- Cost delta vs. original: medium
- Anti-pattern check: pass if an override is visible on demand and only challenged when it makes the target impossible.

**Yes, and what if it could...** keep explanations out of the default path while making every number inspectable.

- Serves: `jtbd-trust-this-app-with-my-life`, `jtbd-review-budget-reality-before-spending`
- Job elevation: Maya gets immediate budget reality without losing the ability to ask, "Why this amount?"
- New value: Summary shows the resulting plan state; Category Detail exposes one compact source receipt; a full change history exists behind an explicit action.
- Cost delta vs. original: low
- Anti-pattern check: pass if receipts are progressive disclosure rather than a permanent plan dashboard.

**Yes, and what if it could...** distinguish visible maintenance from the few changes that deserve interruption.

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: Maya is protected from both silent harm and notification fatigue.
- New value: Every promoted plan change leaves a compact visible receipt. Material exceptions such as fixed commitments exceeding the target, missing trustworthy income, or an account removal invalidating major evidence trigger one focused decision.
- Cost delta vs. original: medium
- Anti-pattern check: pass if materiality is deterministic, explanations are concrete, and no urgency or shame is added.

## Job elevation
The feature is larger than auto-generating amounts. It becomes an automatic living-plan maintenance capability: one chosen target governs a changing evidence set, while Kwilt absorbs account and spending complexity and only asks for attention when a trustworthy plan cannot be maintained automatically.

No missing anchor is required. The expansion deepens `jtbd-carry-intentions-into-action` under the trust constraints of `jtbd-trust-this-app-with-my-life`.

## Frame recommendation
**Run the design-thinking loop with an expanded frame.**

The expanded frame is: build an automatic, account-aware living-plan maintenance system that creates categories and budgets after onboarding, recomputes them as included accounts and spending patterns change, preserves overrides, visibly records every active-plan change, and interrupts only for material unresolved states.

This is a direct expansion of the user's clarified offer, not a different product frame.
