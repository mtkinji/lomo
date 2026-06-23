# Diverge: To-Do List Grouping Config

Axis of variation: explicit vs. adaptive grouping; per-view persistence vs. session-only presentation; deterministic list sectioning vs. AI-suggested organization.

## Option A: Simple Grouping Control In The Sort Drawer

Add a `Grouping` row to the existing sort/view controls. The user can choose `None`, `Goal`, `Schedule`, `Status`, or `Created/updated recency`, with only valid options shown for the current list. Smart order remains the default sort inside each group unless the user also selects a field sort.

- Audience/persona fit: Strong for Maya if labels are simple and defaults remain calm.
- Design-challenge answer: Gives her a visible sectioning lens without asking her to build a full custom view.
- Best when: The current Activities screen already has a sort drawer or nearby configuration surface.
- Fails when: Grouping options are too numerous or behave unpredictably with sorting.
- Object model: Activity-first, with optional Goal grouping; Arcs only appear through Goals if ever needed.
- Capture-first stance: Pass. Grouping never blocks capture or requires Activity anchoring.
- Anti-pattern check: Pass. No dashboard, score, streak, or forced setup.

## Option B: Per-View Grouping Configuration

Make grouping part of saved View configuration alongside filters and sorts. System views can have sensible defaults and custom views can save an explicit grouping. The Activities list reads the current view config and renders sections accordingly.

- Audience/persona fit: Medium-strong. Useful for recurring lenses, but riskier if Maya has to understand "view config" before the list improves.
- Design-challenge answer: Makes grouping durable for views that answer stable situations like Today, Waiting, or a household Goal.
- Best when: The team is already improving custom views or desktop/mobile parity.
- Fails when: The user only needs a temporary scan lens.
- Object model: Activity views as projections; no Activity mutation.
- Capture-first stance: Pass.
- Anti-pattern check: Pass if system defaults reduce setup rather than adding it.

## Option C: Adaptive Suggested Grouping

Kwilt detects the list shape and suggests a grouping. For example, if many items are anchored to a few Goals, it offers "Group by Goal"; if many items are scheduled, it offers "Group by when"; if many items are waiting/later, it offers "Group by Status." The user previews or accepts the display change.

- Audience/persona fit: Potentially strong later, because it removes configuration work.
- Design-challenge answer: Helps the app feel like it understands the pile without silently changing data.
- Best when: Smart order and status signals are reliable enough to explain suggestions.
- Fails when: Suggestions feel mysterious or change too often.
- Object model: Activity-first with Goal and schedule context.
- Capture-first stance: Pass if suggestions never gate capture.
- Anti-pattern check: Risky but manageable. Must avoid anthropomorphic AI and hidden authority.

## Option D: Grouped System Views

Instead of exposing a generic grouping config, add specific system views that are already grouped: "By Goal," "By Schedule," "Waiting," "Later," and "Needs review." The user picks the surface, not the grouping dimension.

- Audience/persona fit: Medium. It lowers control complexity, but may produce more navigation objects than Maya needs.
- Design-challenge answer: Provides clear entry points for common re-entry questions.
- Best when: The app wants opinionated defaults over settings.
- Fails when: The user wants to group an existing view without changing where they are.
- Object model: Activity views only.
- Capture-first stance: Pass.
- Anti-pattern check: Pass if system views stay practical and sparse.

## Chosen Direction

Use **Option A with Option B compatibility**: add a simple `Grouping` control as a presentation setting, then represent it in the same view configuration shape so saved/custom views and future desktop parity can reuse it. Defer adaptive suggestions until the underlying Smart order and status explanations have shipped and earned trust.
