# Converge: Shared Chore Pool

## Decision

Choose a **Chores-owned Household Chore Program with member-attributed completions**, presented through a child-simple current-agreement experience.

Chores is a separate capability and source of truth. It owns the household chore catalog, how each chore participates in the family's program, whether it is currently available, who chose or completed it, and whether that completion qualifies. Screen Time owns access agreements, policy evaluation, and device enforcement. Activities and To-dos do not own or mirror chore completion by default.

The program supports a mixed model: required daily chores, an elective shared pool, per-person expectations, and seasonal changes. See the full [chore model taxonomy](chore-model-taxonomy.md).

## Qualitative scoring

| Alternative | Child simplicity | Fits actual household behavior | Caregiver administration | System coherence | Data/blast risk | Overall |
| --- | --- | --- | --- | --- | --- | --- |
| Chores Lens | Strong surface, weak underlying fit | Weak — assumes assignment and Activity occurrences | Medium | Strong only superficially | Medium | Reject as canonical model |
| Responsibility Cards | Strong | Strong with shared-pool refinement | Strong | Strong if kept narrow | High but honest | **Choose as domain** |
| Household Rhythm | Strong | Strong as seasonal/current presentation | Strong when automatic | Medium; risks a new organizer | Medium–high | **Use as experience layer** |
| Contextual Handoff | Medium | Weak — household behavior is self-selection | Medium | Strong initially, fragmented later | Low–medium | Keep as secondary entry |

## Unifying design

The design separates five concepts that families can combine without seeing a generic rules engine:

1. **Chore** — what useful household work is available and how to do it.
2. **Availability** — when it appears or becomes countable.
3. **Participation** — required for someone, open to choose, rotating, or shared.
4. **Expectation** — what a named person needs to complete during a window.
5. **Season** — which household agreement is active now.

The first release needs only two participation patterns—**Yours each day** and **Choose from the family list**—plus per-person count expectations. Rotation, effort weighting, and collaborative chores remain compatible extensions, not first-release controls.

The caregiver should configure recognizable patterns rather than raw rules:

- **Assigned routines** — everyone has named recurring responsibilities.
- **Everyone chooses** — the household shares an open pool and each person has a quota.
- **Daily plus choice** — named daily responsibilities plus elective chores.
- **Rotation** — deferred until the simpler patterns are proven.

## Chosen concept

### Child experience

The child opens **Chores** and sees one plain-language agreement that is active now. For a mixed program, the surface has two sections:

- **Yours today** — required daily care such as feed the dog or clear your dishes.
- **Choose from the family list** — currently available elective chores.

The agreement sentence explains how they combine:

- **Summer example:** `Do your daily chores and complete 2 total today before Screen Time.`
- **School-year example:** `Do your daily chores and reach 12 this week before Friday night or Saturday Screen Time.`

The household can instead require the elective count in addition to daily chores. That distinction must be written directly: `Do your daily chores, then choose 2 more.`

The child chooses an elective chore, optionally marks **I'm doing this** when collision is likely, and completes it. The surface shows factual progress such as `1 of 2 complete today` or `9 of 12 complete for this weekend`.

The child can also choose **Need help** or release a claimed chore. There are no priorities, filters, due-date editors, Goal links, points, streaks, rankings, or minute balances.

### Caregiver experience

The caregiver can:

- add, edit, pause, or retire chores in the shared household catalog;
- place each chore under **Yours each day** or **Choose from the family list**;
- define when a chore is available and how soon it may qualify again;
- set a readable expectation for each participating member;
- define Summer and School-year agreements, then see which one is active;
- see who claimed or completed a chore;
- correct a mistaken completion without erasing the event history; and
- follow a contextual link to the current Screen Time agreement.

The caregiver does not assign every daily occurrence. The system is valuable precisely because family members choose from useful available work.

### Screen Time relationship

Screen Time references a deterministic Chores criterion produced by the active household program:

- household member;
- active season/program version;
- required named chores, when present;
- qualifying completion count;
- exact eligibility window;
- qualifying chore scope; and
- completion-verification policy.

Examples:

- `At least 2 qualifying chores completed today`.
- `At least 12 qualifying chores completed in the configured school-week window before Friday night or Saturday access`.

Chores supplies completion facts. Screen Time evaluates those facts alongside time window, app/category selection, usage cap, and device-delivery state. A threshold becoming true does not itself prove that the physical device applied the access change.

## Capability delta

### Today, the family cannot

- Maintain a Kwilt-owned shared list from which children choose household work.
- Attribute completion to the choosing family member without pre-assigning a To-do.
- Evaluate different summer and school-year chore thresholds.
- Explain current chore progress and Screen Time eligibility without manually counting or repeatedly negotiating.

### After this concept ships, the family can

- Keep one household chore catalog with clear current availability.
- Let each child choose, claim when needed, complete, or ask for help.
- Preserve member-attributed completion truth across seasonal eligibility windows.
- Let Screen Time use an explicit count threshold without turning each chore into a spendable reward.
- Understand whether the agreement is satisfied separately from whether the child device applied it.

### Still intentionally unsupported

- Chore-to-minute conversion, points, allowance, prices, wallets, or redemption.
- Competitive leaderboards, streaks, performance scores, or sibling comparison.
- Photo/AI proof or detailed surveillance.
- Arbitrary boolean policy builders.
- Automatic assignment of every chore.
- Treating Chores as Activities or showing chores in personal To-dos by default.

## Accepted trade-offs

- Introduce a new canonical doing object outside the four-object model because the actual behavior is a shared household opportunity pool, not personal planning.
- Accept new domain, synchronization, and policy-evaluation work to avoid forcing Activity semantics onto children and caregivers.
- Show a completion count because it communicates a real family agreement, while refusing adjacent gamification or currency mechanics.
- Keep seasonal Screen Time policy configuration in Screen Time even though current progress is visible in Chores.

## Rejected trade-offs

- Do not preserve Activity reuse merely to reduce initial schema work.
- Do not duplicate chore truth into both Chores and To-dos.
- Do not make caregiver assignment the default organizing mechanism.
- Do not let Screen Time own the chore catalog or mutate completion.
- Do not equate eligibility with successful device enforcement.

## System implications

### Chores-owned concepts

- **Chore definition:** stable household-owned description of useful work.
- **Availability rule:** when the chore may be chosen and when it may qualify again.
- **Participation rule:** whether a chore is required for someone, open to choose, rotating, or shared.
- **Claim:** optional, temporary intent by a member to prevent duplicate effort; not required for every chore.
- **Completion event:** immutable member-attributed fact with local time, qualification state, and correction history.
- **Member expectation:** required named chores plus an optional count threshold over a qualifying scope and window.
- **Season:** a named, versioned program such as Summer or School year with an explicit activation schedule.
- **Current agreement projection:** readable progress derived from the active Screen Time criterion without owning that policy.

### Ownership boundary

- Household owns membership and capability grants.
- Chores owns catalog, availability, claim, completion, correction, and aggregate completion facts.
- Screen Time owns seasonal agreements, eligibility evaluation, overrides, delivery versions, and managed-device receipts.
- Home may receive a compact projection.
- Chat may propose changes but cannot silently add chores, record completion, or change a seasonal agreement.
- Activities/Plan integration is deferred until a concrete user story requires it.

### Integrity requirements

- Claims and completions must be idempotent and attributable to a household member.
- Two family members cannot unknowingly receive credit for the same single-use availability instance.
- Offline completion must reconcile without losing actor, eligibility-window, or correction truth.
- Agreement evaluation must use an explicit local-time window and policy version.
- A later correction must deterministically re-evaluate eligibility and produce a truthful Screen Time update rather than silently changing history.

## Reductive design decisions

The smallest elegant version contains:

- one household chore catalog;
- one child-facing **Yours today** section and one elective family list;
- choose or claim, complete, and need-help actions;
- attributed completion history;
- per-person count expectations;
- Summer and School-year program profiles with one active at a time;
- one optional Screen Time threshold link; and
- a factual progress sentence.

It refuses to add:

- a chore dashboard;
- per-child assignment queues;
- categories, tags, priorities, or custom views;
- points, coins, streaks, levels, or celebrations tied to volume;
- allowance and Screen Time wallets;
- proof uploads;
- a generic rules engine; or
- automatic Activity mirroring.

This concept replaces manual counting and repeated unlock negotiation. It does not replace personal To-dos or general family planning.

## Activation path

The best activation moment is inside a named child's Household setup or Screen Time agreement when the caregiver chooses to make access depend on chores.

Kwilt should offer a small, contextual setup:

1. Choose **Assigned routines**, **Everyone chooses**, or **Daily plus choice**.
2. Add a few chores under **Yours each day** and/or **Choose from the family list**.
3. State each child's expectation in one sentence, including whether daily chores count toward the threshold.
4. Create the Summer and School-year versions, then choose when each applies.
5. Preview exactly what the child will see.
6. Optionally connect the completion criterion to Screen Time and separately show whether the managed device is ready.

A household may also activate Chores without Screen Time and use the shared pool on its own. There should be no promotional modal for households without relevant family setup.

Natural adoption means family members begin choosing and completing chores without caregiver prompting, and the caregiver stops manually counting or repeatedly deciding the same access question.

## Bet

We're betting that five separable concepts—chore, availability, participation, expectation, and season—can express genuinely different household models while still producing one child-legible agreement. If families need a generic rule builder to represent normal practice, or if caregivers spend more time configuring the program than they previously spent managing chores, we would narrow the supported patterns before adding rotation, weighting, or rewards.

## Success signal

For at least one summer-style daily window and one school-year weekend window:

- a child independently finds and completes qualifying chores;
- the system attributes and counts them correctly;
- another family member sees accurate availability;
- the caregiver does not manually recount or issue a routine unlock;
- the child can explain why Screen Time is or is not currently available; and
- Kwilt distinguishes agreement eligibility from managed-device application.

## Open decision before a learning release

Should a child's completion count immediately toward the Screen Time threshold, or should Screen Time-linked chores require lightweight caregiver confirmation before they qualify?
