# Yes-And: Automatic Place Assignment From The To-Do

## Original idea

Use the to-do itself as evidence for its Place, so “Pick up prescriptions from Costco” can become related to Costco with little or no additional setup.

## Adjacencies

**Yes, and what if it could separate recognizing Costco from choosing a physical Costco?**

- Serves: `jtbd-capture-and-find-meaning`
- Job elevation: Kwilt preserves useful meaning immediately without pretending the title contains more precision than it does.
- New value: the Activity can receive a broad `Costco` Place target and `pickup` intent before any map search or coordinates exist.
- Cost delta vs. original: low
- Anti-pattern check: pass; no capture interruption and no false certainty.

**Yes, and what if it could resolve against the user's formal Saved Places before searching the map?**

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: a known “My Costco” turns natural language into accurate reusable context automatically.
- New value: an exact or strongly preferred Saved Place can produce an immediate Activity-to-Place link without another chooser.
- Cost delta vs. original: medium
- Anti-pattern check: pass if the link is inspectable, correctable, and never enables an alert.

**Yes, and what if current location could disambiguate “this Costco”?**

- Serves: `jtbd-capture-and-find-meaning`
- Job elevation: capturing the task while physically at Costco becomes the easiest and most accurate assignment path.
- New value: title evidence plus a foreground current-location reading plus a matching nearby search result can resolve one specific store.
- Cost delta vs. original: medium
- Anti-pattern check: pass if current location is read only after an explicit user action or existing foreground permission, never silently in the background.

**Yes, and what if unresolved brands stayed useful without becoming coordinates?**

- Serves: `jtbd-move-the-few-things-that-matter`
- Job elevation: Costco-related Activities remain findable and can participate in an explicit errands/Costco context even before a branch is chosen.
- New value: `Any Costco` or brand-level context can support search and grouping without a misleading geofence promise.
- Cost delta vs. original: low
- Anti-pattern check: pass if broad targets do not receive proximity claims or notification behavior.

**Yes, and what if ambiguity were deferred until a behavior actually needs resolution?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: capture stays fast, but directions, an alert, or “near me” behavior can ask the smallest necessary follow-up later.
- New value: “Which Costco?” appears at the value moment instead of becoming capture-time setup.
- Cost delta vs. original: low
- Anti-pattern check: pass; avoids a place-setup funnel.

**Yes, and what if repeated accepted links could earn a formal Saved Place?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: Kwilt can reduce future assignment effort while keeping durable location memory user-approved.
- New value: after repeated use of the same specific Costco, Kwilt can ask once, “Remember this as your Costco?”
- Cost delta vs. original: medium
- Anti-pattern check: pass only if the Saved Place is created after explicit confirmation and remains editable/deletable.

**Yes, and what if corrections trained only the user's matching preferences?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: changing Costco A to Costco B improves the next assignment without creating an opaque global AI rule.
- New value: correction evidence can strengthen one user's preferred Place aliases and suppress rejected matches.
- Cost delta vs. original: medium
- Anti-pattern check: pass if provenance and undo remain visible and sensitive place categories are not inferred.

## Automatic Assignment Ladder

| Evidence available | Automatic result | User interruption |
| --- | --- | --- |
| Title contains `Costco`; no saved/current context | Create broad `Costco` Place target and `pickup` intent | None |
| One strongly matching user-approved Saved Place | Link Activity to that Saved Place | None; show a correctable result |
| Multiple matching Saved Places | Keep broad target; retain ranked candidates | Ask only when the user opens Place or needs a specific location |
| Explicit “this Costco” plus foreground current location and one verified nearby result | Link to the specific task-scoped place candidate | None; make the inferred result easy to change |
| Search produces multiple plausible nearby Costcos | Keep broad target and candidate set | Ask “Which Costco?” only for directions, alert, save, or explicit resolution |
| User asks for an arrive/leave alert | Resolve one specific coordinate-backed place | Confirmation required before permission/geofence |
| Repeated accepted links to the same store | Offer to create or reuse a Saved Place | Explicit confirmation required for durable memory |

## Travel-Mismatch Refinement

The user's travel example provides a stronger signal than a bare place mention:

> I am visiting family in another state and capture “Pick up something from Costco.” I might mean a Costco near me on this trip, or my saved home Costco for when I return.

Kwilt should not silently decide between those intentions. If it has a foreground current-region signal and a user-approved home Costco, it should recognize the meaningful mismatch and offer a lightweight, non-blocking resolution after capture:

```text
Which Costco?

Nearby
Costco · <current city/state> · <distance>

My Costco
Costco · <home city/state>

Any Costco                       Choose another
```

The choice is not only address resolution; it determines when the Activity can become relevant:

- **Nearby** links the Activity to the selected trip-area Costco and makes it eligible in the current local/errands context.
- **My Costco** links it to the existing Saved Place and keeps it quiet during travel until the home context becomes relevant again.
- **Any Costco** preserves a brand-level target without pretending one branch is required.
- **Choose another** opens the normal Place search with nearby and saved results clearly labeled.

Activation must be evidence-gated. Show the travel-mismatch choice only when Kwilt has both sides of the fork: a current foreground region or explicit trip scope, plus a plausible saved/home match that is materially far away. Without current-location permission, offer `My Costco` and `Choose nearby…`; request foreground location only if the user chooses the nearby path.

Do not persist a passive travel history. The current region is an ephemeral resolution input. Persist only the user's chosen Activity-to-Place link and its provenance.

## Job-Elevation Note

The bigger opportunity is not automatic geocoding. It is automatic semantic assignment with honest resolution levels: understand the place target immediately, recognize when nearby and home are both plausible, resolve the user's intended context with one small choice, and promote it to durable Place memory only when the user approves.

## Frame Recommendation

**Run design-thinking-loop with an expanded frame** - Keep the Place-first Activity sheet as the immediate UI slice, but expand its downstream model to include confidence-gated automatic `PlaceTarget` and `PlaceLink` assignment from Activity language. Do not expand the frame to automatic Saved Place creation or automatic alerts.
