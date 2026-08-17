# Yes-And: Chores Capability

## Original idea

Build a **Chores** capability that is simple enough for a child to use independently, while initially testing whether Kwilt can hide shared Activity infrastructure underneath rather than forcing the adult To-dos model into the child's experience.

## Adjacencies

### 1. Yes, and what if it could give each child one calm answer to “What is mine today?”

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: moves from storing recurring work to making the next responsibility immediately understandable and doable.
- New value: a child-first daily surface with only today's relevant responsibilities, obvious completion, and a simple “I need help” path.
- Cost delta vs. original: low
- Anti-pattern check: pass, provided there are no counts designed to pressure, overdue shame, priorities, filters, or adult productivity vocabulary.

### 2. Yes, and what if it could make recurring household rhythm easier to establish than creating repeating To-dos one by one?

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: reduces the caregiver's setup and remembering burden, not only the child's completion burden.
- New value: a small starter set, plain-language recurrence, quick duplication across family members, and defaults shaped around ordinary household rhythms.
- Cost delta vs. original: medium
- Anti-pattern check: pass if starters are optional and editable; failure if onboarding becomes a household configuration project.

### 3. Yes, and what if it could support growing independence instead of permanent supervision?

- Serves: `jtbd-invite-the-right-people-in`
- Job elevation: turns chores from delegated work into a practice of trusted family participation.
- New value: the experience can simplify for younger children, then gradually reveal self-planning, rescheduling requests, or ownership of a routine as readiness grows.
- Cost delta vs. original: medium
- Anti-pattern check: pass if progression changes available actions and explanation, not scores, levels, badges, or covert monitoring.

### 4. Yes, and what if it could handle “someone needs to do this” before a parent has to assign a specific child?

- Serves: `jtbd-move-the-few-things-that-matter`
- Job elevation: supports shared household responsibility, not only top-down delegation.
- New value: a family member can claim an appropriate responsibility, or a caregiver can assign it later, without duplicate chores or a family group chat negotiation.
- Cost delta vs. original: medium
- Anti-pattern check: pass if claiming is explicit and reversible; failure if the surface becomes a competitive first-to-finish board.

### 5. Yes, and what if it could rotate recurring responsibilities without Maya rebuilding the week?

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: carries a household agreement across time instead of asking one caregiver to administer each occurrence.
- New value: simple alternation or weekly rotation for responsibilities such as dishes, trash, or pet care, with today's owner always explicit.
- Cost delta vs. original: high
- Anti-pattern check: pass if the rotation remains understandable and exceptions are explicit; failure if it requires a generic rule builder.

### 6. Yes, and what if it could replace “prove you did it” with a humane exception path?

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: protects shared truth without assuming children are dishonest or caregivers need surveillance.
- New value: most completions are trusted; a child can say “I need help” or “I couldn't do this,” and selected responsibilities can use lightweight caregiver review only when genuinely necessary.
- Cost delta vs. original: medium
- Anti-pattern check: pass; photo proof, AI judgment, punitive rejection, and a universal approval queue remain excluded.

### 7. Yes, and what if it could help the family notice contribution without turning it into compensation or performance?

- Serves: `jtbd-invite-the-right-people-in`
- Job elevation: makes participation socially meaningful rather than merely transactional.
- New value: quiet acknowledgment such as “Thanks—kitchen is ready” or a household “all cared for” moment can close the loop without points, leaderboards, or streaks.
- Cost delta vs. original: low
- Anti-pattern check: pass if acknowledgment is specific and optional; failure if praise becomes manipulative, scored, or compulsory.

### 8. Yes, and what if Screen Time could later recognize responsibility completion without Chores becoming screen-time currency?

- Serves: `jtbd-put-intention-before-impulse`
- Job elevation: lets an existing family agreement respond to real household state while keeping the responsibility worthwhile on its own.
- New value: a caregiver may explicitly reference one or two responsibility occurrences in a readable Screen Time agreement; Chores owns completion truth and Screen Time owns access policy.
- Cost delta vs. original: high
- Anti-pattern check: pass only as an opt-in downstream integration; failure if minutes, points, or entertainment become the default meaning of contribution.

## Job elevation

The offered idea is larger than recurring assigned To-dos but smaller than a household operating system. Its strongest form is a child-simple family responsibility capability: it helps a caregiver establish a rhythm, helps each person understand their part today, supports exceptions without blame, and gradually gives children more agency.

The Activity model may still supply useful primitives—title, recurrence, dated occurrence, completion, and links into Plan—but Chores should own its interaction language and may need its own narrow policy around rotation, claiming, review, and readiness. Shared storage is valuable only if it remains invisible to the child and reduces rather than transfers complexity.

No candidate missing JTBD is required yet. The existing anchors cover follow-through, bounded participation, intentional access, and trust; the gap is in product delivery and child-appropriate interaction.

## Frame recommendation

**Run the design-thinking loop with an expanded frame.**

Explore **Chores as a child-simple family responsibility capability**, not merely “recurring Activities with assignment.” Start with an Activity-backed alternative because Kwilt already has useful primitives, but compare it honestly with a narrower Chores-owned model during divergence. The decision criterion is not architectural purity; it is whether a child can answer “What is mine today?” and a caregiver can establish the rhythm with less work than their current workaround.

## Evidence update after framing

Andrew described the household's actual system after this expansion:

- there is a shared list of chores;
- any family member may choose chores to complete;
- during summer, a child completes at least two chores on each day they want Screen Time; and
- during the school year, a child completes at least twelve chores before Screen Time can be unlocked on Friday night or Saturday.

This evidence changes the recommendation. The work is not primarily assigned recurring Activities. It requires a shared pool, member-attributed completions, and seasonal threshold windows. Continue with a **Chores-owned model** and retain Activities only as an optional interoperability surface.
