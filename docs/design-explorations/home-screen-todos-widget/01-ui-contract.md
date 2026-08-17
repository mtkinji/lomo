# Home Screen To-dos widget UI contract

Job: When someone glances at their Home Screen, they need to see the next three
to-dos Kwilt has already identified as most important so they can choose what to
do without opening another list or configuring another view.

Authority chain: Andrew's current correction -> iOS WidgetKit conventions ->
Kwilt widget typography and the existing `suggested.items` projection ->
current To-dos priority language.

Three-second read: `To-dos` -> ranked next three one-line to-dos.

Primary action: Tap a row to open that exact to-do.

Primary information: The next three one-line to-do titles and their `#1`–`#3`
rank badges.

Secondary actions: Tap the title or `See all` to open Today in To-dos; tap `+`
to open Quick Add.

Reveal later: Editing, scheduling, filters, and completion remain in Kwilt.

Scan order: To-dos identity -> first row -> second row -> third row -> See all.

Must not add: View configuration, metadata, dates, remaining counts,
interactive completion, proposal counts, streaks, large brand banners, or a
new widget data model.

Reuse map: `KwiltWidgetTypography`, `KwiltPalette`, `kwiltLogoImage`,
`suggested.items`, `deepLinkToday`, and the existing medium WidgetKit family.

Nearest precedent: Kwilt's current To-dos inventory ranking; the widget is
denser, read-only, and intentionally omits row detail.

External exemplar ledger: N/A.

Behavior sources: Ordering and titles come directly from the existing
`suggested.items` App Group projection. Rows use the exact Activity deep link;
the header and `See all` use Today, and `+` uses the existing Quick Add link.

Required states: Placeholder, three to-dos, fewer than three to-dos,
empty or temporarily unavailable App Group state, and medium.

Proof path: Generator contract -> generated Swift -> WidgetKit build -> install
on the booted iPhone 17 Pro Simulator -> Home Screen refresh/relaunch.
