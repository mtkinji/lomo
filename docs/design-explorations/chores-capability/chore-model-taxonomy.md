# Chore Model Taxonomy

## Why a taxonomy is necessary

“Chores” is not one household behavior. Different families disagree—reasonably—about who chooses work, whether the same person should repeat it, what fairness means, whether completion needs review, and whether chores connect to money or privileges.

The product mistake would be to choose one household philosophy and then accumulate exceptions until the app becomes a generic rules engine. The better path is to identify a small number of independent dimensions that can compose into recognizable family patterns.

This inventory combines Andrew's described household practice, Kwilt's existing Household and Screen Time contracts, and current product patterns observed in family chore tools as of August 17, 2026.

## Evidence from current products and family guidance

- [Cozi Chores](https://www.cozi.com/blog/cozi-chores/) centers individual family-member lists with daily or weekly recurrence.
- [Skylight Tasks](https://skylight.zendesk.com/hc/en-us/articles/36846381293979-Using-the-Tasks-Tab-Routines-and-Chores) distinguishes routines from chores and supports **Up for Grabs** work that anyone can claim and complete.
- [Greenlight Family Hub](https://help.greenlight.com/hc/en-us/articles/52141594156571-How-do-Chores-work-on-Greenlight-Family-Hub) supports assignment or **Up for grabs**, recurrence, time-of-day windows, optional rewards, and optional caregiver review.
- [Homey](https://www.homeyapp.net/glossary/) separates unpaid recurring **Responsibilities** from paid irregular **Jobs**, supports free-for-all jobs, and can gate privileges or allowance on weekly responsibility completion.
- [S'moresUp](https://www.smoresup.com/pricing) exposes assigned, rotating, collaborative, competitive, and bonus chore types plus approval and proof workflows.
- [Sweepy](https://sweepy.com/) organizes work by room condition and effort, can generate a daily schedule from available effort, and adds household competition and child approval.
- [Nipto](https://nipto.app/) treats effort points as a fairness and reward system across couples, roommates, or families.
- The [American Academy of Pediatrics](https://www.healthychildren.org/English/family-life/family-dynamics/communication-discipline/Pages/Chores-and-Responsibility.aspx) emphasizes age-appropriate expectations, routines, family discussion, and the reality that different households have different rules and cultures.
- The [Child Mind Institute](https://childmind.org/article/how-can-i-get-my-kids-to-do-chores/) recommends specific, manageable chores, regular routines, some child choice, and proactive family agreements; it also describes rewards as a legitimate but family-dependent choice rather than a universal requirement.

The market evidence is useful for pattern discovery, not as proof that leaderboards, points, photo proof, or allowance coupling belong in Kwilt.

## Household chore archetypes

These are recognizable operating models. A household may combine several.

### 1. Fixed personal responsibilities

Each person owns the same recurring responsibilities: feed the dog, empty the dishwasher, take out bedroom trash.

- Strength: predictable and easy to understand.
- Tension: may become unfair as schedules change; one person can feel permanently stuck with an undesirable job.
- Essential primitive: named responsibility plus recurrence.

### 2. Shared chore pool

The household maintains a list of useful work. Anyone eligible can choose or claim an available chore.

- Strength: autonomy and flexible contribution.
- Tension: popular chores may disappear first; difficult or unpleasant chores may remain.
- Essential primitive: open availability plus attributed claim/completion.

### 3. Mixed baseline plus choice

Each person has a small set of non-negotiable daily responsibilities and chooses additional work from a shared pool.

- Strength: combines dependable household care with autonomy.
- Tension: the product must explain whether baseline chores count toward a broader quota.
- Essential primitive: required named set plus elective qualifying scope.

### 4. Rotating roster

Responsibility moves among household members by day, week, or completion: dishes this week, trash next week.

- Strength: distributes undesirable work and builds broader competence.
- Tension: swaps, absences, and partial weeks can make “whose turn?” ambiguous.
- Essential primitive: deterministic rotation with visible current owner and explicit exceptions.

### 5. Room or zone stewardship

One person or team owns an outcome area—kitchen, bathrooms, pets, outdoor care—rather than a flat set of tasks.

- Strength: clear ownership and less fragmented work.
- Tension: zones differ greatly in effort; “clean enough” can be subjective.
- Essential primitive: area plus concrete included responsibilities or observable completion standard.

### 6. Routine blocks

Chores are organized around moments such as Morning, After school, Dinner, Bedtime, or Saturday reset.

- Strength: matches how younger children understand the day and supports habit formation.
- Tension: can become an inflexible checklist when the day changes.
- Essential primitive: time/context block with a small ordered set.

### 7. Family swarm or collaborative reset

Everyone works together for a bounded period or until a shared outcome is reached: ten-minute pickup, kitchen reset, prepare for guests.

- Strength: shared effort and immediate household improvement.
- Tension: individual attribution may be undesirable or impossible.
- Essential primitive: team session or shared completion rather than individual credit.

### 8. Automatically balanced workload

The system recommends or assigns work based on effort, availability, recent contribution, or room need.

- Strength: reduces caregiver planning and can improve fairness.
- Tension: opaque assignment feels controlling; inferred fairness may ignore ability, preference, or invisible labor.
- Essential primitive: explainable suggestion with easy override, never silent reassignment.

### 9. Contribution quota

Each person completes a required amount during a window: two per day, twelve per week, or three before Saturday recreation.

- Strength: supports choice while preserving a clear expectation.
- Tension: raw counts treat “wipe table” and “clean bathroom” as equal unless the household wants that simplicity.
- Essential primitive: person-specific threshold, qualifying scope, and exact counting window.

### 10. Weighted fairness

Chores carry effort, time, or difficulty values; household contribution is balanced by weight rather than count.

- Strength: can represent materially different work.
- Tension: invites negotiation about values, gamification, and optimization for easy points.
- Essential primitive: simple household-defined weight with visible rationale.

### 11. Privilege gate

Completion satisfies a proactive agreement for Screen Time, car use, social plans, or another privilege.

- Strength: makes expectations and consequences predictable.
- Tension: can become punitive or transactional if every contribution has an exchange rate.
- Essential primitive: boolean eligibility criterion over completion facts, distinct from delivery/enforcement.

### 12. Allowance gate

Required chores determine whether a flat allowance is paid, sometimes all-or-nothing and sometimes proportional.

- Strength: connects contribution to a clear family contract.
- Tension: families disagree about whether ordinary household care should be paid.
- Essential primitive: allowance-owned policy referencing chore completion.

### 13. Paid jobs or bonus work

Ordinary responsibilities are unpaid; irregular or larger jobs can be claimed for money or another explicit reward.

- Strength: separates belonging-based contribution from extra earning.
- Tension: children may favor paid jobs while avoiding baseline care.
- Essential primitive: explicit job/reward contract separate from ordinary chores.

### 14. Points and reward catalog

Each chore earns points, stars, tokens, or credits that can be redeemed for rewards.

- Strength: flexible motivation and visible accumulation.
- Tension: turns household contribution into a currency economy and invites gaming.
- Essential primitive: ledger plus reward pricing and redemption.

### 15. Competition or leaderboard

Members compete by volume, points, streaks, or weekly rank.

- Strength: motivating for some playful households.
- Tension: sibling comparison, shame, inequitable ability, and work chosen for score rather than household need.
- Essential primitive: comparable score and competition window.

### 16. Skill-building progression

Chores are selected and explained as life skills. Instructions or expectations mature as the child gains competence.

- Strength: supports independence rather than permanent supervision.
- Tension: too much scaffolding becomes curriculum administration.
- Essential primitive: age/readiness-sensitive guidance and gradually reduced assistance.

### 17. Need-based home care

Work becomes available because something needs care, often after a completion-relative interval: vacuum when the room needs it, clean the filter thirty days after it was last done.

- Strength: avoids artificial calendar recurrence and unnecessary work.
- Tension: “needs care” may be subjective or require sensor/manual input.
- Essential primitive: availability state that can be triggered manually, by elapsed time, or later by integrations.

### 18. Household checklist without attribution

The family cares only that the work is done, not who receives credit.

- Strength: lowest-friction coordination among trusted adults or teams.
- Tension: cannot support per-person expectations or privilege rules.
- Essential primitive: shared completion with optional actor attribution.

## Independent design dimensions

A unifying system should compose these dimensions instead of encoding eighteen exclusive modes.

| Dimension | Supported choices | Why it matters |
| --- | --- | --- |
| Participation | Assigned, open to choose, rotation, team | Who may or must act |
| Obligation | Required, elective, bonus/extra | Whether choosing not to do it violates an agreement |
| Availability | Always, specific days, routine block, manual need, after-completion interval | When work is valid and countable |
| Repeatability | Once per occurrence, repeatable after cooldown, unlimited team contribution | Prevents duplicate or farmed completion |
| Expectation | Named must-do set, count quota, weighted quota, time quota, shared outcome | What “enough” means |
| Window | Daily, weekly, weekend, seasonal, custom local-time interval | When progress resets or becomes eligible |
| Verification | Trusted completion, caregiver review, team confirmation, evidence-required | When completion becomes qualifying truth |
| Benefit | None, privilege gate, allowance gate, paid job, reward ledger | What another capability may do with completion |
| Fairness | Equal count, effort weight, rotation, ability-adjusted expectation | How contribution is balanced |
| Visibility | Personal, household, caregiver-only detail | Who can see work and history |
| Guidance | Title only, short steps, visual cue, readiness-based instructions | How independently a member can succeed |
| Exceptions | Need help, release claim, swap, skip with reason, caregiver correction | How real life changes the agreement |

## Kwilt recommendation

Kwilt should support multiple chore philosophies through an **Activity-backed Household Chore Program**, but launch with a deliberately small subset. The program describes the household's current agreement and preserves prior versions; it is not an exclusive program type or a required seasonal container. A Chore profile attaches household behavior to the canonical Activity and occurrence foundation; it does not create a parallel task or completion store.

The program is not a generic rules engine. It is a readable family agreement made from four concepts:

1. **Chore** — an Activity configured as useful household work, with the instructions needed to do it.
2. **Availability** — when that chore can be chosen or is expected.
3. **Participation** — assigned, open to choose, rotating, or done together.
4. **Expectation** — what a named person needs to complete during a window.
Each chore chooses its own participation, obligation, availability, repeatability, and verification behavior. Household defaults make setup fast, but a chore may override them. Person-level expectations then evaluate a named set or qualifying scope across those different chores. Chore availability, expectations, and benefit links may each have an optional effective start/end; **Season** is not a required object.

For example, the household's current summer rules may contain all of these at once:

- **Feed the dog** — required for Charlie every morning.
- **Unload the dishwasher** — open to anyone, available once daily.
- **Vacuum the family room** — open to anyone, available again three days after completion.
- **Take out the trash** — rotates weekly.
- **Ten-minute reset** — completed together and excluded from individual quotas.

Verification and benefit links are attached at the narrowest useful level. A risky or consequential chore may need caregiver confirmation while ordinary chores count immediately. Screen Time can reference a person's qualifying completion facts without changing how every chore works.

### Defaults, not modes

Patterns such as **Assigned routines**, **Everyone chooses**, and **Daily plus choice** are setup recipes. Selecting one pre-fills sensible household defaults and starter sections; it never locks the program or individual chores into that pattern.

Resolution stays understandable:

1. The current household configuration supplies defaults.
2. The chore supplies its specific behavior and may override those defaults.
3. The person's expectation states which completions count and what is required.
4. A benefit such as Screen Time evaluates the resulting facts.

## Progressive support boundary

### First learning slice

- Required daily chores.
- Open elective chore pool.
- Reusable chore definitions with daily, weekly, bounded-repeat, and manual availability.
- Canonical member-attributed Activity occurrences shared across Chores and To-dos.
- Per-person completion-count thresholds.
- Daily and weekly/weekend windows.
- One current expectation applied immediately, with prior versions preserved.
- Trusted completion or caregiver confirmation.
- Optional Screen Time eligibility link.
- Per-chore token values, an append-only token ledger, and caregiver-recorded cash redemption.

### Next only when real use demands it

- Rotation.
- Completion-relative recurrence.
- Team chores.
- Swaps and temporary exemptions.
- Readiness-based guidance.

### Deliberately outside the current Kwilt direction

- Leaderboards and sibling ranking.
- Separate Chore streaks, volume streaks, and punitive urgency. A qualifying Chore completion may advance the performing child's existing Kwilt show-up streak.
- Minute-per-chore conversion or a generic reward store.
- AI/photo adjudication.
- Opaque auto-assignment.
- Household KPI dashboards.

The initial token ledger remains Chores-owned because tokens represent verified household contribution. Cash redemption is a caregiver-confirmed settlement record, not an automatic Money transaction or claim that Kwilt moved funds. A later Money integration may offer a reviewable transaction or budget projection, but Chores must not silently create spending evidence.

## The household described by Andrew

Andrew's household is a composition, not an edge case:

- **Mixed baseline plus choice:** some chores can be required daily; others are elective and selected from a shared pool.
- **Contribution quota:** each child has an individual completion expectation.
- **Time-varying expectation:** Summer and School year use different windows and thresholds without requiring named Season records.
- **Privilege gate:** Screen Time evaluates whether the current threshold is satisfied.
- **Weighted token economy:** each chore may award one, two, or three tokens, and accumulated tokens may be turned in for cash.
- **Separate units:** a completed chore occurrence and its awarded tokens remain distinct facts unless the family explicitly chooses a token-based Screen Time threshold.
- **Shared Activity truth:** an assigned chore appears in the child's To-dos; a pooled chore appears there after the child claims it. Completion from either surface updates the same occurrence.
- **Show-up attribution:** every qualifying completion advances the performing child's existing show-up streak regardless of whether the chore was assigned or chosen from the pool.

The unifying system should express this in family language:

> **Summer**
>
> Charlie completes his daily chores and chooses from the family list until he has 2 qualifying chores today. Then Screen Time can become available.

> **School year**
>
> Charlie completes his daily chores and chooses from the family list until he has 12 qualifying chores in the school-week window. That can make Screen Time available Friday night and Saturday.

Whether daily chores count toward the numeric threshold or are required in addition to it must be an explicit one-line choice, not inferred behavior.

### Replacing the laminated sheet

The current paper sheet has one checkbox per chore, which collapses a reusable definition and its completion history into the same mark. Kwilt should separate them:

- **Activity definition with Chore profile:** `Unload the dishwasher` with household availability and token value.
- **Available occurrence:** a specific chance to complete it, such as Wednesday's daily occurrence or one of three allowed weekly occurrences.
- **Completion event:** Charlie completed that occurrence Wednesday at 4:12 PM; it qualified for the school-week count and earned two tokens.

Common availability patterns become:

- **Required daily:** one fresh occurrence per local day; the day's requirement is independently satisfied or missed.
- **Optional once weekly:** appears in the shared pool until completed, then returns next week.
- **Repeatable during the week:** returns until a configured weekly maximum is reached, or after a simple cooldown.
- **As needed:** a caregiver makes it available again when the household needs it.

Crossing out a completion never retires the chore definition. It closes only that available occurrence and appends history.

### Two ledgers, never one ambiguous score

The child may see both:

- `8 of 12 chores complete this week` — Screen Time agreement progress measured in qualifying completion occurrences.
- `17 tokens available` — earned household currency that may be redeemed for cash.

A two-token chore creates one completion occurrence and a two-token earning event. A three-token chore creates one completion occurrence and a three-token earning event. If the household instead wants token weight to accelerate the Screen Time threshold, the agreement must say `Earn 12 chore tokens this week`, not `Complete 12 chores`.

The token ledger should be append-only:

- approved completion earns tokens;
- correction posts an adjustment rather than rewriting history;
- a cash-out request reserves tokens;
- caregiver confirmation finalizes the redemption; and
- cancellation or rejection releases the reserved tokens.

## Core conclusion

The unifying idea is not “one flexible chore object.” It is:

> **A household names useful work, chooses how each kind becomes available, and states each person's current agreement in one readable sentence.**

That supports assigned routines, open pools, mixed systems, rotations, quotas, and privilege gates without presenting families with database fields or boolean logic.
