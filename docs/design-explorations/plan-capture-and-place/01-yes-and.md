# Yes-And: plan-capture-and-place

Original idea: Let Plan mode add new todos directly to the calendar, including tapping a calendar slot to place an existing or new Activity.

**Yes, and what if it could...** create a new Activity with the tapped time already filled in.

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: the user moves from "I should do something here" to a real scheduled commitment in one place.
- New value: capture and scheduling become one flow without requiring a tab switch.
- Cost delta vs. original: low
- Anti-pattern check: pass, as long as Arc/Goal remain optional.

**Yes, and what if it could...** search existing Activities from the same slot drawer.

- Serves: `jtbd-move-the-few-things-that-matter`
- Job elevation: open time becomes a decision aid, not only a blank capture form.
- New value: the user can rescue existing meaningful work instead of creating duplicates.
- Cost delta vs. original: medium
- Anti-pattern check: pass, if the search is scoped and not a new dashboard.

**Yes, and what if it could...** show the slot duration as the default estimate.

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: the system translates time context into a practical Activity shape.
- New value: fewer fields to maintain; a 30-minute slot naturally creates a 30-minute Activity.
- Cost delta vs. original: low
- Anti-pattern check: pass, if the user can edit the estimate.

**Yes, and what if it could...** warn before creating a calendar conflict.

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: explicit safety makes Plan feel dependable enough for real daily use.
- New value: tapped slots respect actual busy intervals instead of blindly writing events.
- Cost delta vs. original: low
- Anti-pattern check: pass, because it prevents surprise rather than adding anxiety.

**Yes, and what if it could...** use the same post-commit peek as scheduled recommendations.

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: new and existing placements become inspectable, movable, and reversible.
- New value: the feature feels like an extension of Plan instead of a special mode.
- Cost delta vs. original: low
- Anti-pattern check: pass.

**Yes, and what if it could...** later support natural-language capture like "call Dad for 20 minutes here."

- Serves: `jtbd-capture-and-find-meaning`
- Job elevation: capture stays lightweight even when the thought is messy.
- New value: richer Activity details and optional AI enrichment could follow the normal Quick Add path.
- Cost delta vs. original: high
- Anti-pattern check: defer; do not let AI become a requirement for V1.

**Yes, and what if it could...** later let an AI planning assistant fill a selected open block from a short list of likely Activities.

- Serves: `jtbd-move-the-few-things-that-matter`
- Job elevation: Plan can help choose, but the user still confirms the specific Activity.
- New value: richer decision relief.
- Cost delta vs. original: high
- Anti-pattern check: only acceptable with transparent suggestions and no silent auto-placement.

## Frame Recommendation

**Run design-thinking-loop with the original frame** - the offered idea is already the right frame. The expansion should stay slot-aware and Activity-first: create new or place existing from open time in Plan.
