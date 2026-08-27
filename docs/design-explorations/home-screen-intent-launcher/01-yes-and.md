# Yes-And: Home Screen Intent Launcher

## Original idea

A ChatGPT-like medium Home Screen widget becomes the fastest way into the parts of Kwilt that matter most, with Chat visually dominant and direct shortcuts into Focus and Kwilt's Plan calendar.

## Adjacencies

**Yes, and what if it could...** replace the separate small Chat and Focus launchers with one medium Kwilt surface rather than adding another widget to the gallery.

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: make Kwilt feel like one calm life system instead of a growing collection of disconnected tools.
- New value: the same Home Screen footprint gains a clear hierarchy and room for several high-frequency entries.
- Cost delta vs. original: low
- Anti-pattern check: pass if the old widgets are deliberately retired or retained only as alternate sizes; failure if all three become competing defaults.

**Yes, and what if it could...** open today's Kwilt Plan calendar directly, preserving the selected day and connected-calendar context.

- Serves: `jtbd-move-the-few-things-that-matter`
- Job elevation: shorten the “what does today actually hold?” step before choosing the next action.
- New value: Calendar becomes a deterministic counterpart to open-ended Chat and immediate Focus.
- Cost delta vs. original: low
- Anti-pattern check: pass; this opens the existing Plan surface rather than projecting a dense calendar dashboard into the widget.

**Yes, and what if it could...** offer quick To-do capture as a selectable doorway, opening the To-dos screen with Quick Add already focused and never requiring an Arc or Goal first.

- Serves: `jtbd-capture-and-find-meaning`
- Job elevation: preserve a concrete intention before it disappears without turning capture into filing work.
- New value: completes a useful quartet: ask, focus, see the day, capture.
- Cost delta vs. original: low
- Anti-pattern check: pass because unanchored capture remains first-class; failure if the widget asks for classification or AI enrichment choices before capture.

**Yes, and what if it could...** let the Focus shortcut become a compact countdown while a session is active and return directly to the existing controls.

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: preserve continuity after the user crosses from intention into action.
- New value: the combined widget genuinely replaces the existing Focus widget instead of only replacing its resting-state launcher.
- Cost delta vs. original: medium
- Anti-pattern check: pass if it is calm status, not pressure; failure if time remaining becomes an urgency treatment or completion score.

**Yes, and what if it could...** give each shortcut one stable, plain-language promise instead of changing destinations based on inferred behavior.

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: let the user build muscle memory and trust that every tap goes exactly where expected.
- New value: a launcher can remain useful without collecting or interpreting private usage history.
- Cost delta vs. original: low
- Anti-pattern check: pass; no opaque ranking, auto-personalization, or surprise navigation.

**Yes, and what if it could...** let the user choose every shortcut in the upper row while keeping Ask Kwilt stable as the full-width lower action.

- Serves: `jtbd-move-the-few-things-that-matter`
- Job elevation: let the launcher reflect the parts of Kwilt that actually matter in a person's current life.
- New value: Focus, Calendar, To-dos, Quick Add, Goals, Meals, Money, Chores, Games, and other stable destinations can compete for a small number of user-chosen positions.
- Cost delta vs. original: medium
- Anti-pattern check: pass when useful defaults make configuration optional; failure if the widget becomes a miniature app grid or requires setup before first use.

**Yes, and what if it could...** establish one shared launcher contract for later Lock Screen, Action Button, Spotlight, and Shortcuts entries.

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: make the fastest trustworthy route consistent wherever intention appears.
- New value: the Home Screen release becomes the first expression of a broader entry system rather than one-off deep links.
- Cost delta vs. original: medium
- Anti-pattern check: pass if each surface stays user-initiated and purpose-specific; failure if Kwilt starts competing for attention or duplicating the full launcher everywhere.

## Job elevation

The idea is larger than merging two widgets. It creates a recognizable **front door to Kwilt** for moments when the user already knows whether they want to ask, focus, inspect the day, or capture something. The elevation is not more shortcuts; it is dependable access to the right depth of Kwilt without first navigating its capability structure.

The first release should still be deliberately bounded. A stable Ask Kwilt action plus a short configurable row is more coherent than either a two-action widget that does not use the medium form well or a large launcher grid that asks the user to reconstruct Kwilt's navigation.

## Frame recommendation

**Run design-thinking-loop with the expanded frame.** Build toward a medium **Kwilt Launcher** with a stable full-width `Ask Kwilt` entry along the bottom and a user-configurable shortcut row across the top. Ship useful defaults, including Focus, Calendar, and To-dos/Quick Add, but let users replace them from a bounded list of real Kwilt destinations. When Focus is selected, its shortcut becomes a countdown and controls return while active.

Keep custom URLs, arbitrary labels, automatic ranking, Lock Screen/Action Button variants, content previews, and in-widget mutations out of the first learning release.
