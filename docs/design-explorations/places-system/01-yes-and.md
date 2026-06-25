# Yes-And: Places System

## Original idea

Create a coherent Places system so Kwilt can represent, learn, and use place relevance across Activities, Recommended, Location Triggers, Quick Add, Phone Agent, reminders, and future automation.

## Adjacencies

**Yes, and what if it could make place intent explicit instead of treating coordinates as meaning?**

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: the user is helped because Kwilt understands whether the place means "remind me there," "this is doable there," "I made this there," or "I completed this there."
- New value: a place relationship becomes explainable and editable instead of a hidden field.
- Cost delta vs. original: low
- Anti-pattern check: pass; this increases inspectability without adding setup.

**Yes, and what if it could make Quick Add and Phone Agent share the same proposal contract?**

- Serves: `jtbd-capture-and-find-meaning`
- Job elevation: the user can capture messy place-bearing language from text, voice, or the app without each surface inventing different rules.
- New value: "Remind me at Trader Joe's" can become a clear Activity/place proposal wherever it was captured.
- Cost delta vs. original: medium
- Anti-pattern check: pass if proposals require confirmation before triggers or durable memory.

**Yes, and what if it could give Recommended a trustworthy place signal?**

- Serves: `jtbd-move-the-few-things-that-matter`
- Job elevation: the next doable action can reflect where the user actually can act, not only dates, priority, or generic errand categories.
- New value: place helps choose one to three useful Activities without making the user scan a pile.
- Cost delta vs. original: medium
- Anti-pattern check: pass if weak place signals remain bounded and confidence-gated.

**Yes, and what if it could create an audit trail for place changes?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: the user can trust AI and location behavior because they can see what was saved, why, and how to undo it.
- New value: Phone Agent and future saved places become safer because there is a visible history of place relationships.
- Cost delta vs. original: medium-high
- Anti-pattern check: pass, but only if audit stays quiet and accessible rather than becoming a management chore.

**Yes, and what if it could separate place context from saved place memory?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: Kwilt can use a recent explicit trigger or one-time place reference without implying it now permanently knows a location about the user.
- New value: the system can be useful before durable learned places exist.
- Cost delta vs. original: low
- Anti-pattern check: pass; avoids silent surveillance.

**Yes, and what if it could teach trust through existing surfaces instead of onboarding?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: the user learns place behavior at the moment of value, not through an abstract permissions explanation.
- New value: copy and controls can appear when accepting a trigger, editing an Activity's place, or reviewing a Phone Agent proposal.
- Cost delta vs. original: low
- Anti-pattern check: pass; avoids a promotional onboarding moment.

**Yes, and what if durable places lived in Settings rather than the main app canvas?**

- Serves: `jtbd-move-the-few-things-that-matter`
- Job elevation: repeated real behavior can eventually reduce setup, while keeping the doing surface focused on Activities.
- New value: the user has an understandable place to inspect, rename, delete, or forget durable Places without making Places a fifth primary object.
- Cost delta vs. original: medium
- Anti-pattern check: pass if Settings-managed Places are earned, confirmed, editable, and deletable, and are never required before capture.

## Job-Elevation Note

The elevation is not "make a location feature bigger." The elevation is "make place a trustworthy action relationship." Places should help Kwilt know when an intention becomes doable, while keeping the user in control of what is remembered and acted on. Durable Places can exist as Settings-managed supporting records, but the main action remains Activity-first.

## Frame Recommendation

**Run design-thinking-loop with an expanded frame** - The original brief should not be framed as a phased roadmap. It should be framed as a system concept: Evidence-Gated Places, a shared interpretation layer for place reference, intent, evidence, context, and memory across existing Kwilt surfaces.
