# Converge: Shared Chore Pool

## Decision

Choose an **Activity-backed Household Chore Program with capability-owned Chore behavior, member-attributed occurrences, and a separate token ledger**, presented through a child-simple current-agreement experience.

`Activity` remains Kwilt's canonical underlying doing object. **To-dos** is its existing user-facing representation; Kwilt does not expose a separate generic Activities surface. **Chores** becomes another capability-owned projection over the same Activity and occurrence truth. A Chore profile adds household participation, open-pool behavior, expanded availability, review, chore credit, tokens, and current-agreement behavior without creating a second task or completion store.

Assigned chore occurrences appear in the child's To-dos. A shared-pool chore remains in Chores until the child claims it, at which point the same occurrence also appears in their To-dos. Completing from either surface updates one occurrence. Qualifying completion belongs to the member who performed it and advances that child's existing show-up streak, chore progress, token ledger, and any referenced Screen Time criterion according to their separate policies.

Screen Time owns access agreements, policy evaluation, and device enforcement. Money does not treat a token redemption as an actual transaction unless a separate reviewable Money action records real payment. See [Activity-backed Chores system design](activity-backed-system-design.md) for the full boundary and decision ledger.

The program supports a mixed model: required daily chores, an elective shared pool, per-person expectations, and rules that may change over time. See the full [chore model taxonomy](chore-model-taxonomy.md).

## Qualitative scoring

| Alternative | Child simplicity | Fits actual household behavior | Caregiver administration | System coherence | Data/blast risk | Overall |
| --- | --- | --- | --- | --- | --- | --- |
| Chores Lens | Strong | Strong once Activity occurrences gain household/open-pool policy | Medium | **Strong — reuses canonical doing truth** | Medium–high | **Choose as foundation** |
| Responsibility Cards | Strong | Strong with shared-pool refinement | Strong | Strong as Chores projection, not a second domain | Medium | **Choose as experience** |
| Household Rhythm | Strong | Strong as a current-moment presentation | Strong when automatic | Medium; risks a new organizer | Medium–high | **Use as experience layer** |
| Contextual Handoff | Medium | Weak — household behavior is self-selection | Medium | Strong initially, fragmented later | Low–medium | Keep as secondary entry |

## Unifying design

The design separates four concepts that families can combine without seeing a generic rules engine:

1. **Chore** — what useful household work is available and how to do it.
2. **Availability** — when it appears or becomes countable.
3. **Participation** — required for someone, open to choose, rotating, or shared.
4. **Expectation** — what a named person needs to complete during a window.
The first release needs only two participation patterns—assigned/claimed work under **For [member]** and open work under **Household**—plus per-person count expectations. Rotation, effort weighting, and collaborative chores remain compatible extensions, not first-release controls.

The caregiver may start from recognizable patterns rather than raw rules:

- **Assigned routines** — everyone has named recurring responsibilities.
- **Everyone chooses** — the household shares an open pool and each person has a quota.
- **Daily plus choice** — named daily responsibilities plus elective chores.
- **Rotation** — deferred until the simpler patterns are proven.

These are setup recipes, not exclusive household modes. They only prefill defaults and starter sections. Within the same active program, one chore may be assigned, another open to choose, another eventually rotate, and another be completed together. Person-level expectations decide which of those completions are required or count toward a quota.

The composition hierarchy is:

1. **Current household defaults** — the behavior in effect now.
2. **Per-chore behavior** — participation, obligation, availability, repeatability, and verification.
3. **Per-person expectation** — required named chores plus an optional quota over a qualifying chore scope, with an optional effective period.
4. **Benefit link** — Screen Time or another capability evaluates the completion facts without owning the chores.

There is no required **Season** object. A caregiver may change the current expectation when household rules change. Chore availability, expectations, and benefit links may each carry an optional effective start/end when needed, while the first learning slice applies edits immediately and preserves version history.

## Chosen concept

### Child experience

The child opens the direct **Chores** capability and sees one plain-language agreement that is active now. The screen deliberately inherits the quiet inventory grammar of Groceries: a simple header, compact progress, grouped checklist rows, and no dashboard chrome. For a mixed program, the surface has two sections:

- **For Riley** — required, assigned, and already-claimed occurrences such as feed the dog or clear your dishes.
- **Household** — currently available elective chores with a direct **Take** action.

The agreement sentence explains how they combine:

- **Summer example:** `Do your daily chores and complete 2 total today before Screen Time.`
- **School-year example:** `Do your daily chores and reach 12 this week before Friday night or Saturday Screen Time.`

The household can instead require the elective count in addition to daily chores. That distinction must be written directly: `Do your daily chores, then choose 2 more.`

The child chooses an elective chore, optionally marks **I'm doing this** when collision is likely, and completes it. Claiming projects the same occurrence into the child's To-dos; assigned chores already appear there. Completion from either surface changes one canonical occurrence. The surface shows two distinct factual balances when both matter:

- `9 of 12 chores complete this week` — progress toward Screen Time.
- `17 tokens available` — earned value that may be turned in for cash.

Each available chore may show its token value—`1 token`, `2 tokens`, or `3 tokens`—without turning token value into priority or implying that the child completed multiple chores.

The child can also choose **Need help** or release a claimed chore. There are no priorities, filters, due-date editors, Goal links, Chore-specific streaks, rankings, or minute balances. A qualifying completion advances the child's existing Kwilt show-up streak once for the local performance day.

The active member is visible in the Chores header as an avatar-and-name control. That control and the capability-menu avatar open the same switcher so attribution never depends on remembering a selection made behind the drawer.

### Shared-iPad identity

On a designated shared iPad, one individually assigned caregiver's authenticated account remains beneath a restricted Household Mode:

- the switcher lists eligible dependent children and the assigned caregiver only;
- selecting a child establishes that household member as the actor and asks for the child's member code when configured;
- selecting the caregiver requires fresh Face ID, Touch ID, or device-passcode authentication;
- successful authentication exits Household Mode into the caregiver's full ordinary Kwilt;
- cancellation or failure leaves the current child context unchanged; and
- device biometrics authorize the caregiver transition but do not identify children or prove which enrolled adult supplied the authentication.

A caregiver selecting a child for view/management on a personal device remains the caregiver. View scope must not be conflated with acting as the child.

### Caregiver experience

The caregiver can:

- add, edit, pause, or retire chores in the shared household catalog;
- make each chore assigned/required for a named member or open to the Household;
- define whether a chore appears daily, once weekly, a bounded number of times per week, after a cooldown, or manually as needed;
- set its one-, two-, or three-token value;
- set a readable expectation for each participating member;
- change the current expectation when household rules change, with prior versions preserved;
- see who claimed or completed a chore;
- correct a mistaken completion without erasing the event history;
- review token earnings and confirm cash redemptions without claiming Kwilt moved money; and
- follow a contextual link to the current Screen Time agreement.

The caregiver does not assign every daily occurrence. The system is valuable precisely because family members choose from useful available work.

### Screen Time relationship

Screen Time references a deterministic Chores criterion produced by the active household program:

- household member;
- active expectation version;
- required named chores, when present;
- measurement unit: qualifying completion occurrences or qualifying tokens;
- threshold amount;
- exact eligibility window;
- qualifying chore scope; and
- completion-verification policy.

Examples:

- `At least 2 qualifying chores completed today`.
- `At least 12 qualifying chores completed in the configured school-week window before Friday night or Saturday access`.
- `At least 12 qualifying chore tokens earned in the configured window` only when the household explicitly chooses weighted Screen Time credit.

Chores supplies completion facts. Screen Time evaluates those facts alongside time window, app/category selection, usage cap, and device-delivery state. A threshold becoming true does not itself prove that the physical device applied the access change.

## Capability delta

### Today, the family cannot

- Maintain a Kwilt-owned shared list from which children choose household work.
- Attribute completion to the performing family member whether the chore was assigned or chosen from the pool.
- Evaluate different summer and school-year chore thresholds.
- Explain current chore progress and Screen Time eligibility without manually counting or repeatedly negotiating.

### After this concept ships, the family can

- Keep one household chore catalog with clear current availability.
- Let each child choose, claim when needed, complete, or ask for help.
- Preserve member-attributed completion truth across changing eligibility windows.
- See assigned and claimed chore occurrences in the child's existing To-dos without duplicating their completion state.
- Let Screen Time use an explicit completion or token threshold without confusing the two units.
- Award one, two, or three tokens for approved work and preserve a trustworthy available balance.
- Let a child set tokens aside for cash, cancel while unpaid, and let a caregiver complete redemption only after recording outside-app payment.
- Understand whether the agreement is satisfied separately from whether the child device applied it.

### Still intentionally unsupported

- Chore-to-minute conversion or an open-ended reward store.
- Competitive leaderboards, Chore-specific streaks, performance scores, or sibling comparison.
- Photo/AI proof or detailed surveillance.
- Arbitrary boolean policy builders.
- Automatic assignment of every chore.
- Showing every merely available pooled chore in personal To-dos.

## Accepted trade-offs

- Extend the canonical Activity and occurrence foundation to support household authority, open participation, bounded availability, review, and member-attributed completion.
- Keep those extensions progressively disclosed so ordinary personal To-dos do not inherit Chore administration.
- Show a completion count because it communicates a real family agreement, and show a separate token balance because tokens are real household currency.
- Accept an append-only token ledger and explicit cash-redemption lifecycle while keeping actual payment outside Chores.
- Keep Screen Time policy configuration in Screen Time even though current progress is visible in Chores.

## Rejected trade-offs

- Do not create a second Chore task or completion store merely because the lifecycle differs.
- Do not duplicate chore truth when one occurrence is projected into both Chores and To-dos.
- Do not make caregiver assignment the default organizing mechanism.
- Do not let Screen Time own the chore catalog or mutate completion.
- Do not equate eligibility with successful device enforcement.

## System implications

### Shared Activity foundation

- **Activity definition:** stable description and reusable series identity.
- **Activity occurrence:** a concrete claimable/completable opportunity; completing it never retires the definition.
- **Responsibility and participation references:** named assignee, eligible household scope, and performer attribution.
- **Canonical completion fact:** one occurrence history shared by To-dos, Chores, streaks, and downstream criteria.

### Chores-owned concepts

- **Chore profile:** household-owned policy that makes an Activity participate in Chores.
- **Availability rule:** when the chore may be chosen and when it may qualify again, including daily, once-weekly, bounded-repeat, cooldown, and manual availability.
- **Participation rule:** whether a chore is required for someone, open to choose, rotating, or shared.
- **Claim:** optional, temporary intent by a member to prevent duplicate effort; not required for every chore.
- **Completion event:** immutable member-attributed occurrence fact with local time, qualification state, token award, and correction history.
- **Token ledger event:** immutable earn, adjustment, reservation, redemption, or release entry.
- **Cash redemption:** child reservation plus caregiver-recorded manual payment. Reserved tokens remain the child's property and become permanently redeemed only with settlement; Kwilt does not claim it transferred money.
- **Member expectation:** required named chores plus an optional count threshold over a qualifying scope and window.
- **Effective period:** optional start/end dates on a chore's availability, a person's expectation, or a benefit link; not a named container that every household must manage.
- **Current agreement projection:** readable progress derived from the active Screen Time criterion without owning that policy.

### Ownership boundary

- Household owns membership and capability grants.
- Household Mode owns the shared-device designation, assigned caregiver, member-code actor selection, caregiver re-entry, and safe relock boundary.
- Chores owns catalog, availability, claim, completion, correction, and aggregate completion facts.
- Screen Time owns access-policy evaluation, overrides, delivery versions, and managed-device receipts; it may reference the active Chores expectation version.
- Home may receive a compact projection.
- Chat may propose changes but cannot silently add chores, record completion, or change the current household expectation.
- To-dos projects assigned and claimed Chore occurrences from the canonical Activity foundation; it does not own the Chore profile or household agreement.
- Plan integration is deferred until a concrete user story requires it.

### Integrity requirements

- Claims and completions must be idempotent and attributable to a household member.
- Two family members cannot unknowingly receive credit for the same single-use availability instance.
- Repeating availability must create distinct occurrence identities instead of reusing one checkbox.
- Offline completion must reconcile without losing actor, eligibility-window, or correction truth.
- Token balance must derive from ledger entries rather than a mutable counter.
- Completion credit and token value must remain separate units in evaluation and copy.
- Agreement evaluation must use an explicit local-time window and policy version.
- A later correction must deterministically re-evaluate eligibility and produce a truthful Screen Time update rather than silently changing history.

## Reductive design decisions

The smallest elegant version contains:

- one household chore catalog;
- one child-facing **For [member]** section and one open **Household** list;
- one shared active-member control shown in the capability menu and Chores header;
- choose or claim, complete, and need-help actions;
- attributed completion history;
- per-person count expectations;
- one current per-person expectation with preserved version history;
- one optional Screen Time threshold link; and
- one-, two-, and three-token chore values;
- an earned/reserved/redeemed token ledger with manual cash settlement; and
- a factual progress sentence.

It refuses to add:

- a chore dashboard;
- a separate family account or full multi-account session switcher;
- per-child assignment queues;
- categories, tags, priorities, or custom views;
- Chore-specific streaks, levels, or celebrations tied to volume;
- token leaderboards, token-to-Screen-Time conversion, and a generic reward catalog;
- proof uploads;
- a generic rules engine; or
- copied Activity mirroring or duplicated completion state.

This concept replaces manual counting and repeated unlock negotiation. It does not replace personal To-dos or general family planning.

## Activation path

The best Chores activation moment is inside a named child's Household setup or Screen Time agreement when the caregiver chooses to make access depend on chores. A shared iPad may separately enter Household Mode from **Set up for your household**, **Settings > Household > Household devices**, or a contextual offer after a dependent or household-facing capability is added.

Kwilt should offer a small, contextual setup:

1. Start from **Assigned routines**, **Everyone chooses**, **Daily plus choice**, or a blank program. This is a setup shortcut only.
2. Add a few chores and choose how each one works: required for someone, open to choose, or shared.
3. State each child's expectation in one sentence, including which chores count and whether required chores are inside or additional to the threshold.
4. State the expectation that applies now; when the household changes it later, preserve the prior version.
5. Preview exactly what the child will see.
6. Optionally connect the completion criterion to Screen Time and separately show whether the managed device is ready.

A household may also activate Chores without Screen Time and use the shared pool on its own. There should be no promotional modal for households without relevant family setup.

Natural adoption means family members begin choosing and completing chores without caregiver prompting, and the caregiver stops manually counting or repeatedly deciding the same access question.

## Bet

We're betting that reusable chore definitions, distinct completion occurrences, and separate completion/token ledgers can replace the laminated sheet without turning the family agreement into accounting software. If children or caregivers cannot explain the difference between chores completed, tokens earned, and Screen Time eligibility, we would simplify the displayed model before adding rotation or more reward types.

## Success signal

For at least one summer-style daily window and one school-year weekend window:

- a child independently finds and completes qualifying chores;
- the system attributes and counts them correctly;
- repeatable chores produce the correct number of independent opportunities;
- one-, two-, and three-token chores post the correct immutable ledger entries;
- another family member sees accurate availability;
- the caregiver does not manually recount or issue a routine unlock;
- the child can explain why Screen Time is or is not currently available; and
- Kwilt distinguishes agreement eligibility from managed-device application.

## Locked system decisions and remaining questions

The shared Activity foundation, projection rules, member attribution, existing show-up streak behavior, decision not to require a Season object, Groceries-like Chores inventory, shared identity-control treatment, and caregiver-anchored shared-iPad model are locked in [Activity-backed Chores system design](activity-backed-system-design.md) and [Caregiver-anchored Household Mode](../shared-household-device-profiles/03-converge.md).

The next system-design checkpoint should resolve series-versus-occurrence assignment, claim expiry, caregiver review placement, caregiver-recorded dependent completion, bounded occurrence presentation, and correction explanations. The household may still explicitly choose occurrence-count versus token-weighted Screen Time criteria and trusted versus reviewed completion per Chore profile.
