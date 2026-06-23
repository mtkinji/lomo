# Yes-And: To-Do Action Contexts

Original idea: Customer feedback says Kwilt should help the user identify the next doable task when she is leaving home, away from home, or sitting at her computer, with the least amount of friction the context allows.

**Yes, and what if it could...** preserve the new grouping feature as a general scan lens while adding context as a separate action signal.

- Serves: `jtbd-move-the-few-things-that-matter`
- Job elevation: The user can still group a crowded list by Goal, Schedule, or Status, but Kwilt also helps her answer "what should I do next in this situation?"
- New value: Grouping remains valid and bounded instead of becoming responsible for every low-friction action moment.
- Cost delta vs. original: low
- Anti-pattern check: pass, if context is framed as doable-here orientation rather than productivity optimization.

**Yes, and what if it could...** introduce a few practical context modes such as Away, At computer, Calls/messages, and At home.

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: The user can carry a captured intention into the moment where it is naturally actionable, whether she opens Kwilt or Kwilt surfaces the action some other way.
- New value: The product promise changes from "organized list" to "least-friction next move."
- Cost delta vs. original: medium
- Anti-pattern check: pass, if these are plain list lenses and not a required tagging methodology.

**Yes, and what if it could...** infer context gently from existing signals before adding a new field or requiring a view choice.

- Serves: `jtbd-capture-and-find-meaning`
- Job elevation: Tags, location metadata, Activity type, schedule windows, and AI enrichment can make captured work easier to recover without requiring perfect setup.
- New value: Existing Activities can benefit from context-aware suggestions where signals already exist.
- Cost delta vs. original: medium
- Anti-pattern check: pass, if inference is inspectable and easy to correct.

**Yes, and what if it could...** let context-aware surfaces still use grouping when a list is the right delivery channel.

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: Context answers "what is the lowest-friction next move here"; grouping answers "how should this visible subset be sectioned."
- New value: The new grouping implementation becomes more useful without taking on semantic responsibility it should not own.
- Cost delta vs. original: low
- Anti-pattern check: pass, if grouping is still presentation only and never mutates Activities.

**Yes, and what if it could...** distinguish location triggers from contextual next-action help.

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: The user can get help with "what should I do while I am out?" without granting always-on location permission, opening the app at the perfect time, or configuring a trigger.
- New value: Context usefulness does not depend on OS permission, geofencing, a perfectly configured trigger, or an in-app visit.
- Cost delta vs. original: medium
- Anti-pattern check: pass, if location permission remains optional and tied to explicit trigger behavior.

**Yes, and what if it could...** become an input to Recommended later.

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: Recommended can stop being globally "important" and become "important, doable, and low-friction in this context."
- New value: The top suggestion becomes more credible because it respects where the user is and what tools she has.
- Cost delta vs. original: high
- Anti-pattern check: pass, if recommendations explain the context signal and avoid hidden authority.

**Frame Recommendation:** Run design-thinking-loop with an expanded frame. The feedback is not a reason to discard grouping; it shows grouping is one layer in a larger action system. The better frame is "contextual next action": help Maya identify the next thing she should do with the least amount of friction based on current context, whether Kwilt knows that context automatically or the user supplies it.
