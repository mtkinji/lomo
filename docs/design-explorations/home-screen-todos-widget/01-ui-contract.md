# Home Screen Priorities widget UI contract

Job: When someone glances at their Home Screen, they need to see the next three
to-dos Kwilt has already identified as most important so they can choose what to
do without opening another list or configuring another view.

Authority chain: Andrew's current correction -> iOS WidgetKit conventions ->
Kwilt widget typography and the existing `todaySummary.top3` projection ->
current To-dos priority language.

Three-second read: `Priorities` -> three one-line to-dos.

Primary action: Tap the widget to open Today in To-dos.

Primary information: The next three one-line to-do titles and their square
checkbox affordance.

Secondary information: Quiet Kwilt identity only.

Reveal later: Editing, scheduling, filters, and completion remain in Kwilt.

Scan order: Priorities identity -> first row -> second row -> third row.

Must not add: View configuration, metadata, dates, remaining counts,
interactive completion, a second CTA, proposal counts, streaks, large brand
banners, or a new widget data model.

Reuse map: `KwiltWidgetTypography`, `KwiltPalette`, `kwiltLogoImage`,
`todaySummary.top3`, `deepLinkToday`, and the existing medium WidgetKit family.

Nearest precedent: Kwilt's current To-dos inventory rows; the widget is denser,
read-only, uses the same square checkbox grammar, and intentionally omits row
detail.

External exemplar ledger: N/A.

Behavior sources: Ordering and titles come directly from the existing
`todaySummary.top3` App Group projection. Tapping uses the existing Today deep
link.

Required states: Placeholder, three priorities, fewer than three priorities,
empty or temporarily unavailable App Group state, and medium.

Proof path: Generator contract -> generated Swift -> WidgetKit build -> install
on the booted iPhone 17 Pro Simulator -> Home Screen refresh/relaunch.
