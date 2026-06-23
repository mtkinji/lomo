# Diverge: To-Do Organization Triage

Axis of variation: user-led vs. AI-assisted vs. system-detected; temporary ritual vs. durable priority signal; explicit configuration vs. inferred organization.

## Option A: Guided Triage Drawer

Kwilt detects that the Activity list is crowded enough to merit help, then offers a drawer from the Activities screen: "Sort the pile." The drawer presents a small queue of active to-dos one at a time, with calm destinations like Do soon, Schedule later, Waiting, and Set aside. Each choice updates lightweight Activity fields that already exist where possible: priority, scheduledDate/reminderAt, status, or tags. The final screen offers one next action and optionally saves the resulting buckets as views.

- Audience/persona fit: Medium for Maya because it relieves overload, but still asks her to do sorting work the app might handle.
- Design-challenge answer: Re-entry happens through simple decisions that end in one next move.
- Best when: The user has enough Activities that list scanning has stopped working.
- Fails when: The user wants dense spreadsheet-style organization or multi-select bulk editing.
- Object model: Activity-first; can reference Goals as context, but does not require anchoring.
- Capture-first stance: Pass. Capture remains unblocked; triage is optional and skippable.
- Anti-pattern check: Pass. No dashboard, no scores, no streak pressure, no forced commitment.

## Option B: AI Organize Preview

The user taps "Organize my to-dos," and Kwilt generates a proposed cleanup: suggested buckets, renamed views, stale items to set aside, unscheduled important items, and one recommended next action. Nothing changes until the user reviews a structured preview. The preview can apply individual changes or save one or more views.

- Audience/persona fit: Strong for Maya if the preview is inspectable and uses everyday language, but risky if it feels like opaque AI administration.
- Design-challenge answer: Gives the user a shape for the pile before asking them to make many small choices.
- Best when: Activities have rich titles, notes, Goal links, schedules, and status history.
- Fails when: AI suggestions feel opaque, too generic, or too confident.
- Object model: Activity-first with optional Goal context; Arcs are read-only context.
- Capture-first stance: Pass if suggestions are optional and never gate capture.
- Anti-pattern check: Risky but manageable. Must avoid anthropomorphic AI and silent auto-organization.

## Option C: Starter System Views Plus Better Discovery

Kwilt expands the default system views and teaches them better. In addition to All to-dos, Due today, and Past due, the app adds Focus candidates, Unplanned, Recently captured, and Waiting. The empty/list guide explains these views after the user has enough Activities.

- Audience/persona fit: Medium. It improves the current system, but Maya may still not know which view to choose.
- Design-challenge answer: Helps find items, but does not necessarily help the user decide what belongs where.
- Best when: The main issue is discoverability and recovery, not overload.
- Fails when: Users do not know which view answers the emotional question they are asking.
- Object model: Activity views only.
- Capture-first stance: Pass.
- Anti-pattern check: Pass if views stay practical and do not become dashboard tiles.

## Option D: Weekly Re-Entry Ritual

Kwilt periodically prepares a light "Re-enter your to-dos" review. It groups Activities into a few observations: unscheduled captures, stale commitments, due-soon work, and Goals with no next action. The user can accept a small set of proposed next actions, defer the review, or dismiss it. This borrows the background-agent weekly planning shape but narrows it to Activity organization.

- Audience/persona fit: Strong for Maya after repeated use, especially if family life creates recurring planning rhythms, but potentially premature for the immediate pain.
- Design-challenge answer: Makes organization a calm ritual instead of a feature the user has to remember.
- Best when: Users come back after drift or capture many items between app visits.
- Fails when: The user wants immediate cleanup now.
- Object model: Activity and Goal; Chapters remain retrospective input only if used later.
- Capture-first stance: Pass, as long as the ritual never blocks capture.
- Anti-pattern check: Pass if notification cadence is capped and copy avoids guilt.

## Option E: Goal-Centered Bucketing

The Activities screen shifts organization around active Goals: each Goal gets an expandable lane with its current next actions, unplanned captures, and done-recently evidence. Unanchored Activities remain a first-class lane. Views still exist, but the default mental model becomes "what is this serving?"

- Audience/persona fit: Medium for Maya. Goal lanes help when work is connected to Goals, but ordinary family tasks may remain intentionally unanchored.
- Design-challenge answer: Helps the user see the meaning of the pile, but may be too structural for a first recovery pass.
- Best when: Most Activities already have Goal links.
- Fails when: Many Activities are intentionally unanchored or are one-off life maintenance.
- Object model: Goal and Activity; Arc is contextual.
- Capture-first stance: Pass only if unanchored remains visible and respected.
- Anti-pattern check: Pass if unanchored work is not treated as failure.

## Option F: Inferred Attention Layer

Kwilt computes a global priority model for every incomplete Activity without requiring the user to organize it. The model separates three concerns: a grouping bucket, an exact rank inside the bucket, and the display vocabulary the user prefers. The default labels might be Now, Next, Later, Waiting, and Needs a look, but a user who thinks in P1/P2/P3 or numeric ranking can see the same underlying judgment through that lens. The engine uses existing signals first: due date, reminder, explicit priority, parent Goal priority, recent edits, stale scheduled dates, completion history, steps, and whether the item is unanchored. Views then become projections of this layer: Now, Next, Waiting, Unplanned, Recently captured, Stale scheduled, and Goal gaps. The user can manually re-prioritize the bucket or rank, but most of the time the app quietly keeps the list in a sensible order.

- Audience/persona fit: Strong for Maya because it removes the burden of deciding which organizational system to maintain and lets Kwilt feel helpful without power-user setup.
- Design-challenge answer: Organization becomes a living lens over Activities instead of a manual cleanup job, while still answering "what exactly should I do next?"
- Best when: The system can infer enough from Activity and Goal signals to be helpful without claiming certainty.
- Fails when: The inferred order feels mysterious or when manual re-prioritization is not respected.
- Object model: Activity-first with Goal context; Arcs remain read-only context through Goals.
- Capture-first stance: Strong pass. Capture can stay loose because organization is inferred afterward.
- Anti-pattern check: Pass if buckets/ranks are calm and inspectable, and if Kwilt avoids health scores, guilt, and overconfident AI.
