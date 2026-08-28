# Evaluate Learning: Home Screen Intent Launcher

## Learning questions

1. Does one configurable launcher replace the practical need for separate Chat and Focus widgets?
2. Are four icon-only shortcuts recognizable and confidently tappable at the real medium-widget size?
3. Do users understand Edit Widget configuration without an in-app manager?
4. Are the default shortcuts useful before configuration?
5. Does the bounded destination list contain the parts of Kwilt people actually want to reach?
6. Does Ask Kwilt remain visually primary when it sits below the shortcut rail?
7. Is a compact active-Focus state sufficient, or do users still keep the standalone Focus widget for its larger countdown?
8. Do cold-start, warm-start, repeated-tap, and persisted-navigation cases land at the exact selected destination?

## Evidence plan

Evidence supporting the bet:

- Andrew keeps the launcher installed for at least 7–14 ordinary days.
- The launcher replaces the separate Chat/Focus Home Screen footprint during dogfood.
- At least three different configured destinations are used naturally across multiple days.
- Editing any of the four slots produces the selected shortcut without stale or surprising positions.
- Ask Kwilt produces natural first sends without empty-thread, inherited-context, or microphone regressions.
- Focus starts and stops refresh the configured Focus shortcut promptly and return to the correct controls.
- Qualitative notes describe the launcher as a dependable front door rather than another menu.

Evidence disconfirming the bet:

- Symbols are confused with one another, forgotten after configuration, or produce frequent mistaps.
- Users repeatedly open the app icon and navigate instead of using configured shortcuts.
- Edit Widget configuration is difficult to discover or unreliable.
- Most users retain separate Chat or Focus widgets because the compact states are insufficient.
- Default destinations feel arbitrary enough that the first impression is poor.
- Deep links land at parent shells, stale persisted routes, or unavailable capability states instead of the selected destination.

## Instrumentation

Use existing privacy-safe widget-open attribution with route name only. Do not add prompt text, object names, calendar titles, financial values, household data, or persistent behavioral profiles.

For the first Andrew-only learning release, keep a manual note with:

- configured shortcut order;
- naturally used destination;
- whether the launcher shortened the path;
- whether the destination was exact;
- whether all four symbols and Focus state remained recognizable;
- any configuration, lifecycle, or appearance friction.

## Decision rule

Evaluate after 7–14 days and at least ten natural launcher opens spanning three configured destinations.

- **Promote** when the launcher remains installed, replaces the separate footprint, routes reliably, and four choices stay legible.
- **Revise individual symbols** when the four-position contract is valuable but a destination remains ambiguous; do not restore labels globally from one weak symbol.
- **Revise configuration** when destination selection or defaults cause friction, without adding automatic ranking.
- **Retain standalone Focus or Chat alternatives** when their dedicated state or one-tap identity continues to earn separate space.
- **Block TestFlight expansion** for any private-content leak, wrong destination, automatic recording, empty-thread regression, stale Focus state, or native configuration failure.

## Expected next action

If the bet holds, update widget discovery to feature the launcher, decide whether the small Chat and Focus configurations should remain as alternate sizes, and separately frame Lock Screen or Action Button variants. Do not expand the destination list from hypothetical coverage; add choices only when dogfood reveals a repeated missing destination.
