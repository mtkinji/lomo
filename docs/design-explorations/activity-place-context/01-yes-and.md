# Yes-And: Activity Place Context

## Original idea

Let the user attach the place where they are now to an Activity as relevance context, without requiring an enter/leave notification.

## Adjacencies

**Yes, and what if it could make the Activity easier to recognize later?**

- Serves: `jtbd-capture-and-find-meaning`
- Job elevation: the place becomes meaningful retrieval context, not merely coordinates.
- New value: Activity Detail, search, and compact metadata can show where the Activity belongs.
- Cost delta vs. original: low
- Anti-pattern check: pass; it enhances an existing Activity instead of adding a management surface.

**Yes, and what if it could help Recommended only when the place is actually relevant now?**

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: place-linked work can become easier to choose at the right moment.
- New value: a confirmed current-place match, explicit place view, or search can make an already-actionable Activity more relevant.
- Cost delta vs. original: medium
- Anti-pattern check: pass if a saved coordinate alone never becomes a broad priority boost.

**Yes, and what if an alert could be added later without reselecting the place?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: Maya can start with context and add attention only when she discovers she needs it.
- New value: Place and Alert become progressive layers rather than an all-or-nothing setup.
- Cost delta vs. original: low
- Anti-pattern check: pass; alert remains explicit.

**Yes, and what if “Use current location” captured a durable place snapshot?**

- Serves: `jtbd-capture-and-find-meaning`
- Job elevation: the easiest capture path remains understandable after Maya has moved elsewhere.
- New value: the saved value can become an address or stable place label rather than the ambiguous phrase “Current location.”
- Cost delta vs. original: low-medium
- Anti-pattern check: pass if reverse geocoding is best-effort and never blocks Save.

**Yes, and what if repeated use could later earn a Saved Place?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: repeated context could reduce future setup without silent memory.
- New value: after evidence, Kwilt could ask whether to remember “School” or “Home.”
- Cost delta vs. original: medium
- Anti-pattern check: pass only with an explicit later confirmation; excluded from this release.

## Job-Elevation Note

The larger opportunity is not more location automation. It is a layered Place contract: context first, optional alert second, durable memory only after it is earned.

## Frame Recommendation

**Run design-thinking-loop with the original frame** - The insight is already the right-sized wedge. It clarifies the first useful layer of the existing Places system without expanding into saved-place learning or ambient automation.
