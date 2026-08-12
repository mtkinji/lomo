# Yes-And: Planned Meal Follow-Through

## Original idea

A committed meal can be placed on a day, scoped explicitly into Groceries, and
carried into shopping or cooking through a scheduled Activity with a live action
card.

## Adjacencies

### Yes, and what if Grocery selection became the gate to execution timing?

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: Maya can distinguish “we might make this” from “buy what this
  meal needs now” without removing either meal from the household Plan.
- New value: Ideas remain intentionally unscheduled. Once a meal is sent, it can
  remain Flexible or be placed on a day; later Grocery sends can reconcile into
  the current list rather than starting another list or requiring all-or-nothing
  finalization.
- Cost delta vs. original: low
- Anti-pattern check: pass — visible checkboxes and a count-labeled action make
  the consequential boundary explicit without a setup flow.

### Yes, and what if a placed meal showed only the next unresolved dependency?

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: The scheduled Activity helps dinner happen instead of merely
  preserving the meal title on a calendar.
- New value: One card can progress from **Review groceries** to **Get ready** to
  **Start cooking** to **Resume cooking**, while Groceries and Recipes continue
  to own the underlying state.
- Cost delta vs. original: medium
- Anti-pattern check: pass — one live next action avoids a Food dashboard or a
  stack of competing status cards.

### Yes, and what if reminders were earned from concrete readiness gaps?

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: Maya is prompted because something actionable remains, not
  because every planned meal automatically generates notifications.
- New value: Kwilt could offer a shopping reminder when selected ingredients
  remain unresolved and a cooking cue based on the placed meal's preparation
  duration. If no useful gap exists, no reminder is created.
- Cost delta vs. original: medium
- Anti-pattern check: pass with a guardrail — reminder creation is contextual,
  opt-in, removable, bounded by notification caps, and never urgency theater.

### Yes, and what if timing worked backward from the meal rather than forward from a generic alert?

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: Maya protects the actual preparation window, not just a label
  such as “Dinner” at the moment the meal should already be finished.
- New value: Choosing **Tuesday · Dinner** can prepare a suggested cooking start
  from recipe prep/cook time and optionally a small readiness moment before it.
  Unknown or untrusted recipe time stays visible and manually adjustable.
- Cost delta vs. original: medium
- Anti-pattern check: pass — this is deterministic workback from approved recipe
  evidence, not invented AI precision.

### Yes, and what if rescheduling was a reviewable repair, not an autonomous move?

- Serves: `jtbd-stay-in-control-of-ai-actions`
- Job elevation: When the day changes, Maya can repair the complete meal thread
  without editing Meal Plan, Activity, reminder, and calendar separately.
- New value: Kwilt can propose **Move tacos to Thursday** with the affected
  cooking session, reminder, and Grocery consequence stated before approval.
  Accepting applies an idempotent capability-owned change; declining preserves
  the current plan.
- Cost delta vs. original: high
- Anti-pattern check: pass with a guardrail — never move family commitments or
  external calendar events silently; show partial calendar-write failures and
  recovery.

### Yes, and what if household awareness followed the settled meal without exposing private context?

- Serves: `jtbd-invite-the-right-people-in`
- Job elevation: People can understand what is planned and when without gaining
  access to Maya's calendar, retailer account, dietary details, or reminders.
- New value: Invited household members may see the settled meal/day and current
  public-to-the-household state such as **Groceries being reviewed** or **Ready
  to cook**; organizer-only actions and private reasons stay hidden.
- Cost delta vs. original: medium
- Anti-pattern check: pass — awareness is plan-scoped and consent-first, not a
  family activity feed or surveillance surface.

### Yes, and what if completion improved the next cycle without creating another ritual?

- Serves: `jtbd-capture-and-find-meaning`
- Job elevation: The next plan begins with one useful truth instead of making
  Maya maintain meal history.
- New value: Finishing Cook Mode can offer one lightweight outcome—**Made it**,
  with an optional serving correction or note—then resolve the cooking Activity
  and preserve the Recipe-owned cook record.
- Cost delta vs. original: medium
- Anti-pattern check: pass — no streak, score, required rating, or inferred
  household identity.

## Job elevation

The idea is larger than “put a meal on the calendar,” but it should not expand
into a general Food agent. The elevated job is a **meal execution thread**:
carry one explicit household commitment across Grocery scope, useful timing,
readiness, cooking, and a small finish while each capability retains authority.

## Frame recommendation

**Run the design-thinking loop with an expanded frame.** Preserve planned meal
follow-through as the name and boundary, but compare solutions for a meal
execution thread rather than a calendar export alone. The first learning release
should still stay narrow: explicit Grocery subset selection, optional placement
for `sent` or `ready` meals, plus one cooking Activity whose card reaches Cook
Mode. Evidence-based shopping reminders and reviewable rescheduling should
remain follow-on layers, not launch requirements.
