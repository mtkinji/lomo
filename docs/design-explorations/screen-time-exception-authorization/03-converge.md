# Screen Time exception authorization — converge

## Chosen direction

**Management-only recovery, reduced further: remove temporary opening from the bottom guide and do not add a new exception setting.**

The guide remains an explanation and redirection surface. It shows why the active rule is in force and offers a prerequisite action only when the rule actually has one. An authorized self-adult, household owner, or caregiver with scope for the affected child may also choose **Manage rules** and leave the current context for the canonical Screen Time management surface. A child or unauthorized household member never sees that management action.

Changes that weaken protection—pausing, disabling, deleting, or relaxing the rule—require fresh authorization before they are saved. Family changes require both caregiver-scoped account authority and appropriate fresh authentication; possession of the child or shared device is not sufficient proof.

## Qualitative scoring

| Alternative | Persona and JTBD fit | System alignment | Data and migration risk | Reductive quality | Overall |
| --- | --- | --- | --- | --- | --- |
| A. Rule-local authenticated exception | Strong flexibility; weaker impulse boundary | Extends existing rule and guide models | Medium | Adds one setting and preserves two escape paths | Good |
| B. Master gate | Simple but weakens unrelated rules | Adds a cross-rule preference | Medium-high because scope/sync is ambiguous | Small UI, broad hidden coupling | Reject |
| C. Management-only recovery | Strongest match for intention-before-impulse and trust | Reuses canonical management navigation | Low-medium | Removes the guide override and avoids a new setting | **Choose** |
| D. Delayed commitment changes | Strong commitment device; higher lockout concern | Adds pending temporal policy state | High | Too much state for the job | Defer |

## Why this wins

Authentication proves who is acting; it does not prove that the action is deliberate. Keeping **Open for 20 minutes** in the intervention surface would preserve the same hot-path escape and merely add one familiar confirmation.

Moving all weakening changes into rule management creates a structural pause. It also gives the person the right tool for the actual problem: if the rule is wrong, change the rule; if the rule is right, do what it asks. The design no longer needs a separate exception preference, activation delay, or guide-specific override state.

## Capability delta

### Today, the user can

- Open blocked apps for 20 minutes directly from the bottom guide when projected authority allows it.
- Reach rule management only through the guide’s task-first path or separate Settings navigation.
- Encounter permissive temporary-opening defaults in personal and family projections.

### After this change, the user can

- Understand which rule or rules are keeping the selected app paused.
- Follow a contextual prerequisite action when the rule points to something concrete that can be done now.
- See when a scheduled or usage-based rule will release without being given a misleading task action.
- If authorized, choose **Manage rules** and reach the canonical personal or family Screen Time management surface.
- Authenticate before saving a change that weakens protection.

### Still intentionally not possible

- Open an app temporarily from the bottom guide.
- Reveal rule-management actions to a child or unauthorized household member.
- Treat a shared device passcode as proof of caregiver identity.
- Clear, pause, or weaken unrelated rules as a side effect.
- Request caregiver approval from the child guide in this slice.

## Before and after user stories

**Before:** When a rule intervenes, Marcus can tap **Open for 20 minutes** in the same impulse moment, so the guardrail can collapse into a suggestion.

**After:** When a rule intervenes, Marcus sees either the concrete prerequisite he can act on or the time/usage condition that remains in force. If the rule itself is no longer right, he deliberately leaves that moment, opens rule management, authenticates, and changes the rule there.

**Before:** A caregiver may be offered a bounded exception action without first seeing or managing the agreement that produced it.

**After:** An authorized caregiver can follow **Manage rules** to the affected child’s Screen Time agreement, while the child sees neither an override nor a management link.

## Interaction hierarchy

- **Actionable prerequisite:** the rule-derived action is primary; **Manage rules** is a secondary text link for an authorized adult.
- **Schedule, time-of-day, or usage-limit rule:** there is no invented prerequisite action. The guide states when access returns or what limit was reached. **Manage rules** remains a quiet text link for an authorized adult; dismissal is the ordinary response.
- **Child or unauthorized member with no actionable prerequisite:** no footer action is required; the close affordance preserves the current page.
- **Mixed overlapping rules:** show a prerequisite action only when it is truthful for the set. **Manage rules** opens an overview that represents every affected rule rather than implying one action will clear them all.
- **Always available:** close the guide and remain on the current page.
- **Never present:** **Open for 20 minutes**.

The button label is not universally **Do this first**. It is derived from the available resolution, such as returning to Focus, completing a prerequisite, or reviewing relevant Money evidence. When the rule has no immediate resolution, the guide remains informational.

## System implications

- Remove the temporary-open branch from `ScreenTimeUnlockGuide` and its guide-action projection.
- Replace the fixed `onDoThisFirst` contract with an optional, typed requirement action derived from trigger and handoff reason. Scheduled and usage-limit states project no requirement action.
- Project a distinct `canManageRules` capability from actor authority and the active rule subjects.
- Route authorized personal actors to personal Screen Time management and scoped caregivers to the affected child’s family Screen Time surface.
- Keep navigation non-automatic: the current page remains until the person explicitly chooses an action.
- Migrate existing and new rule projections to temporary opening unavailable. Retain old persisted fields only as compatibility input if needed; they must not restore the guide action.
- Protect rule-weakening mutations at their canonical command boundary, not only in the button component.
- Preserve no-change semantics when authentication is cancelled, unavailable, or fails.
- Existing bounded-override backend capability may remain for separately designed caregiver workflows, but this release does not expose it through the guide or a new preference.

## Reductive design decisions

- Do not add **Allow temporary exceptions**.
- Do not add a global Screen Time master gate.
- Do not add a custom Kwilt passcode.
- Do not add a cooldown timer or pending-policy state.
- Do not add a child request flow, family receipt feed, or new settings dashboard.
- Replace the guide’s override action with truthful, rule-derived resolution plus one quiet contextual link to existing management.
- Retire guide-specific opened, applying, failed, and busy states once no guide action can invoke a temporary opening.

## Activation and education

The guide is the natural activation moment; no onboarding campaign or notification is needed. For existing rules, the first relevant guide encounter may include one calm sentence: **Temporary opening is no longer available here. An authorized adult can manage the rule if something changed.**

This message should be shown only where its absence would make the removed action feel broken. It should not repeat indefinitely or compete with the rule’s actual instruction.

Natural adoption looks like one of these:

- the user follows a real prerequisite and returns to the intended app;
- the user understands a scheduled or usage-based boundary and dismisses the guide; or
- an authorized adult uses **Manage rules**, changes the actual policy, and returns with the guide state reconciled.

## Accepted trade-offs

- A legitimate urgent exception now takes more steps.
- The guide becomes less flexible in exchange for becoming a trustworthy commitment boundary.
- Some legacy temporary-open code may remain dormant until a separate cleanup or caregiver workflow proves it unnecessary.

## Rejected trade-offs

- We will not preserve convenience by leaving the override one authentication prompt away.
- We will not make every rule weaker because one rule occasionally needs flexibility.
- We will not remove recovery or conceal how an authorized adult can change a mistaken rule.

## Stated bet

We’re betting that people use Screen Time rules because they want the intervention moment to hold, and that an explicit **Manage rules** path provides enough recoverability without undermining that promise. If authorized adults experience legitimate lockout or cannot identify the right rule-management surface, we would revisit the management routing and recovery design before restoring a quick exception.

## Success signal

In local and physical-device evaluation:

- no actor sees **Open for 20 minutes** in the bottom guide;
- children and unauthorized members see no management action;
- authorized self-adults and caregivers reach the correct canonical management surface;
- prerequisite actions appear only when the active rule has a concrete, truthful resolution;
- schedule, time-of-day, and usage-limit rules communicate their boundary without showing **Do this first**;
- cancelling or failing authentication leaves every rule unchanged;
- completing the prerequisite or changing the rule reconciles the guide without clearing unrelated restrictions;
- the guide remains calm, compact, and usable with large text and overlapping rules.
