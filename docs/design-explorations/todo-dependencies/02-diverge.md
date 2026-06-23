# Diverge: To-Do Dependencies

## Axis Of Variation

The core variation is **relationship-as-step continuity vs relationship-as-actionability signal vs relationship-as-proposed organization**. All options preserve the four-object model: dependencies live between Activities, not as a new Plan or Project object.

## Option 1: Attach Existing To-Do

From any Activity's steps area, the user can choose "Link to-do" and search existing incomplete Activities. The selected to-do appears as a linked row inside the current Activity, using the existing linked-step visual language. The linked child remains a normal Activity elsewhere. The parent row mirrors the linked Activity's completion and opens it on tap. The user can unlink without deleting either Activity. This extends the current step-derived related Activity behavior rather than inventing a new UI pattern.

- Audience/persona fit: strong for Maya because it fixes the specific gap without introducing a new surface.
- Design-challenge answer: she can say "this waits on that" from the current Activity and keep the list oriented.
- Best when: the product wants a low-friction bridge from existing linked-step behavior to manual dependency creation.
- Fails when: dependency status needs to affect Smart order, Waiting, Recommended, or scheduling in a durable way, because the existing related-Activity substrate is mostly provenance and undo safety.
- Object model: Activity-to-Activity link represented through the parent Activity's step list.
- Capture-first stance: pass; capture is unaffected and linking can happen later.
- Primer anti-pattern check: pass if copy avoids project-management language and the relationship is reversible.

## Option 2: Waiting On / Unlocks Relationship

Add a first-class Activity dependency relationship on top of the existing related-Activity behavior. A to-do can be "waiting on" one or more other Activities, and an Activity can show what it "unlocks." Users can attach an existing to-do or create a new prerequisite inline. The relationship feeds actionability: blocked Activities can move to Waiting, be excluded from Recommended, and explain "Waiting on: Call the school." Completing the prerequisite can surface the unblocked Activity quietly.

- Audience/persona fit: strongest for Maya because it answers the list-orientation job, not only the detail-screen link gap.
- Design-challenge answer: blocked work stops pretending to be ready, while the user sees the concrete next thing.
- Best when: dependencies should become part of priority/actionability, scheduling, and future AI suggestions.
- Fails when: the first implementation overexposes graph mechanics or asks users to maintain many relationships.
- Object model: Activity-to-Activity relationship, projected into Activity detail, list state, and priority reasons.
- Capture-first stance: pass; dependencies are optional retroactive alignment and can be added after capture.
- Primer anti-pattern check: pass if the UI uses "Waiting on" and "This unlocks" rather than dependency dashboards.

## Option 3: Inline Prerequisite Capture

Inside an Activity, the user adds a step and chooses "Make this a to-do" or "Add prerequisite." Kwilt creates a new Activity, links it back, and marks the parent as waiting until the prerequisite is done. This keeps the creation path simple and avoids search/attachment in V1. Existing to-dos can still be linked later in a follow-up version.

- Audience/persona fit: good for capture-in-motion, especially when Maya notices a missing prerequisite while looking at the parent.
- Design-challenge answer: she can capture the blocking thing without leaving the flow.
- Best when: V1 wants to avoid search, duplicate matching, and arbitrary many-to-many relationships.
- Fails when: the real need is to connect already-captured to-dos, which is the gap named in the request.
- Object model: Activity step conversion plus parent waiting metadata.
- Capture-first stance: mostly pass; it helps capture, but it does not solve retroactive attachment.
- Primer anti-pattern check: pass if creation remains optional and does not require choosing a Goal/Arc.

## Option 4: AI-Suggested Dependencies

Kwilt detects possible dependency language across Activities and offers proposals like "Looks like 'Book appointment' may be waiting on 'Call insurance'." The user can accept, edit, or dismiss. Accepted relationships feed Waiting and Smart order; dismissed proposals do not reappear casually.

- Audience/persona fit: useful later for Maya's crowded list, but too magical as the first dependency experience.
- Design-challenge answer: it can reveal hidden blockers without forcing manual organization.
- Best when: there is enough data and trust for proposal-first AI organization.
- Fails when: users cannot inspect or reverse changes, or when false positives make Kwilt feel presumptuous.
- Object model: Activity-to-Activity relationships proposed by AI and confirmed by the user.
- Capture-first stance: pass if proposals never block capture.
- Primer anti-pattern check: pass only as explicit proposals; silent relationship creation fails the trust bar.
