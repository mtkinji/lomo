# Evaluate Learning: ios-budget-widgets

## Learning Questions

- Does an ambient percent counter change spending behavior before the user opens the app?
- Is `% used` alone strong enough, or does it need remaining amount and pace to be trusted?
- Does freshness copy protect trust when widget data is not real-time?
- Do multiple lane widgets help without making the home screen feel like a dashboard?
- Does the Lock Screen variant catch spending impulses earlier than Home Screen alone?
- Do interactive widget actions make app controls feel easier, or do they create confusion?
- Does full Plaid sync reliability make the widget trusted enough to act on?
- Does Screen Time/app-control state match what the widget says?
- Does the widget feel like support rather than shame or monitoring?
- Does this validate a future cross-suite ambient meter pattern for desktop?

## Evidence That Supports The Bet

- The widget stays installed after initial novelty.
- The user glances at it without deliberately opening Kwilt Money.
- The user reports spending decisions being paused, delayed, reduced, or reconsidered because the number was visible.
- Taps from the widget go to lane detail or review when the state is concerning.
- Lock Screen widgets are noticed before opening spend-triggering apps.
- Interactive actions are used intentionally and match later in-app review history.
- Plaid updates, webhook sync, app refresh, and widget snapshots agree within the stated freshness window.
- Screen Time/app-control state shown in the widget matches the actual app behavior.
- The user describes the value in plain terms: "I saw the percent before I spent."
- No confusion arises about whether the data is live or stale.

## Evidence That Disconfirms The Bet

- The widget is ignored after setup.
- The user opens Kwilt Money directly instead of relying on the widget.
- The percent creates anxiety without useful action.
- Stale data causes mistrust.
- The user wants transaction explanation more than ambient visibility.
- Multiple lanes make the experience feel like clutter.
- Lock Screen display feels too sensitive or too noisy.
- Interactive actions create accidental unlocks or distrust.
- Plaid sync drift makes the widget feel untrustworthy.
- Screen Time/app-control state and widget state disagree.

## Brand-Goodwill Evidence

- The widget is described as calming or grounding.
- The user does not feel judged by `running hot` or `maxed out` states.
- Removing or changing the widget lane feels obvious.
- No sensitive transaction detail appears in screenshots or on the home screen.

## Instrumentation

Track or observe:

- Widget lane selected.
- Widget snapshot generated.
- App opened from widget deep link.
- Lane viewed after widget tap.
- Widget family installed or configured: Home Screen small/medium, Lock Screen accessory.
- Interactive widget action invoked.
- App-control review/open/leave-blocked outcome.
- Snapshot freshness at tap time.
- Plaid webhook received, sync completed, cursor advanced, meter recomputed.
- Manual notes from self-use: "saw widget before spending," "ignored widget," "data felt stale," "wanted detail."

Do not track:

- Exact home-screen placement.
- Lock/unlock behavior.
- Merchant details in widget-specific analytics.
- Household member behavior.
- Shame-coded events such as "failed to resist."

## Decision Rule

After at least two weeks of Andrew/self-use with one real or realistic lane:

- Proceed to permanent implementation if Home Screen and Lock Screen widgets remain installed, are trusted, sync reliably, and produce at least three remembered moments where visible budget state or widget interaction changed behavior.
- Revise if the widget is useful but needs simpler lane selection, clearer freshness, safer Lock Screen privacy, or narrower interactive actions.
- Reframe if the widget is ignored but the in-app review gate changes behavior.
- Retire if the ambient number creates anxiety, confusion, unreliable app-control outcomes, or no behavior change.

## Expected Next Action

If the learning supports the bet, keep the iOS widget system as a first-class Kwilt Money surface and consider the future desktop menu-bar meter as the same ambient-meter family.
