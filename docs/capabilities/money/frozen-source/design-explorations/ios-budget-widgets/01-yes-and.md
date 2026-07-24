# Yes-And Expand: ios-budget-widgets

Original idea: Use iOS widgets to reproduce the behavior-changing effect of aispendtracker's tiny percent counter before Kwilt has a unified desktop app.

## Adjacencies

**Yes, and what if it could...** show the one budget lane most likely to drift this week.

- Serves: `jtbd-put-intention-before-impulse`
- Job elevation: Moves the budget from "available if I check" to "already in view."
- New value: The user does not need to pick from all budgets each time.
- Cost delta vs. original: low
- Anti-pattern check: pass if the user chooses the lane; failure if Kwilt silently guesses and feels creepy.

**Yes, and what if it could...** rotate between a small set of pinned lanes.

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: Lets multiple household resources stay visible without creating a dashboard habit.
- New value: Takeout, groceries, and subscriptions can all get ambient visibility.
- Cost delta vs. original: medium
- Anti-pattern check: pass if limited to 2-3 pinned lanes; failure if the widget becomes a dense category board.

**Yes, and what if it could...** deep-link directly into the budget review or correction surface.

- Serves: `jtbd-review-budget-reality-before-spending`
- Job elevation: The glance becomes a path to intentional action when the number raises concern.
- New value: A running-hot widget can open the relevant lane rather than the generic app home.
- Cost delta vs. original: low
- Anti-pattern check: pass if the widget itself stays simple; failure if every state gets a different CTA.

**Yes, and what if it could...** become the mobile version of a future cross-suite ambient meter.

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: Establishes a portable pattern for "resource I care about, shown close to where I act."
- New value: The eventual desktop suite can inherit a validated meter grammar.
- Cost delta vs. original: low now, high later
- Anti-pattern check: pass if treated as a pattern seed; failure if current mobile work overfits future desktop architecture.

**Yes, and what if it could...** reveal freshness and confidence without making the user read sync plumbing.

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: Makes the ambient number trustworthy enough to act on.
- New value: The widget can say `Updated 8:34 AM` or `Needs sync` instead of pretending precision.
- Cost delta vs. original: low
- Anti-pattern check: pass if freshness is short and plain; failure if provider jargon leaks into the widget.

**Yes, and what if it could...** help the user notice pace, not just amount spent.

- Serves: `jtbd-put-intention-before-impulse`
- Job elevation: Turns a budget from a retrospective limit into a live behavioral guide.
- New value: `42% used · on pace` is more actionable than dollars alone.
- Cost delta vs. original: low
- Anti-pattern check: pass if pace labels are calm; failure if they become scolding advice.

## Frame Recommendation

Run the loop with an expanded frame: **iOS budget widgets as ambient resource meters**.

The original offer is strong, but the job is bigger than "add a widget." The useful frame is a reusable ambient meter pattern that starts on iOS because it can stand in for the desktop menu-bar utility before Kwilt has a unified desktop shell.
