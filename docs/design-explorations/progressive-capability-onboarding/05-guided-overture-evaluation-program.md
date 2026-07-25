# Guided Overture Evaluation Program

**Decision being tested:** Can `Show -> Choose -> Converse -> Deliver` give an unscoped person useful bearings across a broad Kwilt suite and let Agent continue one credible task without disrupting the current onboarding experience?

The program separates three questions that are easy to blur:

1. **Comprehension:** Does the portfolio concept communicate several distinct forms of help?
2. **Choice:** Can a person select a relevant task without understanding Kwilt's capability names?
3. **Continuity:** Does Agent visibly understand the selected task and ask the right first question?
4. **Delivery:** Does the owning capability preserve approval and reach first value?

A strong answer to one is not evidence for the others.

## Current stage and safety boundary

Stage 1 is a development-only lab. It is manually opened from Developer tools. The current automatic Goals-and-Arc onboarding remains untouched.

The lab:

- does not read or write `hasCompletedFirstTimeOnboarding`;
- does not change onboarding Arc or Goal pointers;
- does not request permissions;
- does not create domain objects while a concept scene plays;
- does not auto-start after a normal download; and
- never routes a future-capability concept into a fake screen;
- never advances an overture scene without an explicit user action; and
- never lands the person on a blank Agent canvas.

## Starting-point contract

| Starting point | Stage 1 behavior | Future internal first-run behavior | Why |
| --- | --- | --- | --- |
| Developer tools | Open the lab | Not a customer entry | Manual isolation is the safety mechanism |
| Unscoped new download | Current FTUX | Guided Overture only when explicitly assigned | This is the hypothesis under test |
| Exact task deep link | Honor the exact destination | Honor the exact destination | Known intent outranks orientation |
| Invitation | Open the invitation | Open the invitation | The inviter already supplied scope |
| Authoritative resume | Resume the work | Resume the work | Do not make people re-orient before continuing |
| Returning user | Open the normal shell | Open the normal shell | Do not replay first-run as promotion |

The pure entry policy is covered by automated tests now, even though only the Developer tools row is wired into Stage 1.

## Persona pressure test

These are not six personalized onboarding variants. They are six ways to expose whether one neutral, task-first overture holds up without guessing someone's identity.

| Persona | Starting situation | Likely relevant cues | Failure to watch for | Successful signal |
| --- | --- | --- | --- | --- |
| Maya, aspirational family organizer | Organic download after a friend recommends Kwilt | Plan tomorrow; save a family story; pick a game; invite help | The experience feels like project-management setup or the family examples are vague | She can name two concrete family uses and choose one without learning a system |
| Marcus, burned-out productivity power user | Organic download while abandoning another task app | Plan tomorrow; figure out what to do first | It looks like another generic task manager or asks him to configure categories | He sees decision help, not more maintenance, and predicts the next action correctly |
| Nina, AI-native life operator | Opens after hearing Kwilt has an agent | Figure out what to do first; exact Agent handoff | The sequence overpromises AI action or hides who owns the change | She recognizes Agent as one form of help, reaches its real route, and retains control |
| Sarah, values-driven builder | Organic download seeking a coherent life tool | Plan around what matters; sort the week; start a goal in live mode | Abstract identity language or productivity scoring replaces concrete help | She sees practical action without losing the sense that choices can reflect what matters |
| Elena, life-transition restarter | Returning after a long gap | Returning-user bypass; a small next task if she voluntarily replays | Mandatory re-onboarding, guilt, or a stale plan presented as failure | She returns to the shell directly and can opt into reorientation later without penalty |
| David, private accountability seeker | Opens a specific goal invitation | Invitation bypass; invite someone to help me follow through when voluntarily exploring | Generic onboarding delays the invite or implies broad sharing | He lands on the bounded invitation and understands what is shared before accepting |

### Cross-persona copy checks

For every participant, mark each offer:

- **Concrete:** they can paraphrase the action.
- **Predictable:** they can describe a plausible next screen or result.
- **Distinct:** it does not sound like another offer with different nouns.
- **Credible:** it does not promise help beyond what they think an app can deliver.
- **Non-presumptive:** it does not imply Kwilt knows their age, finances, family structure, values, or needs.

Any offer failing two of these should leave the next composition, even if participants like its visual treatment.

## Moderated test protocol

Run five to eight qualitative sessions across at least four persona patterns. Include at least one participant who already uses a complex productivity system and one who does not identify as a productivity-app user.

Give the participant a development build at the Developer Tools entry and say only:

> A friend said Kwilt can help with everyday life. You downloaded it. Take a look and start wherever you naturally would.

Do not explain the suite, the Avatar inspiration, the capability names, or the difference between concept and live modes until after the first choice.

After the choice, ask:

1. What do you think Kwilt can help with?
2. What made you choose that starting point?
3. What did you expect to happen after you tapped it?
4. Was anything too fast, unclear, or unnecessary?
5. What would you do if none of these fit?

Continue through the Agent opening, then replay in live mode and ask the participant to begin one real task.

## Observation sheet

Record facts before interpretation:

| Field | Record |
| --- | --- |
| Participant pattern | Closest persona pattern and important mismatch |
| Starting point | Organic, exact task, invitation, resume, returning, or Dev Tools simulation |
| Motion mode | Standard or reduced motion |
| Last scene understood | Offer ID, not facilitator interpretation |
| Progression behavior | Back, Next, Start here, Skip to Kwilt, chooser, or exited |
| Offers recalled | Participant's words |
| First selection | Offer ID, `Something else`, or `Skip to Kwilt` |
| Expected next step | Participant's words |
| Agent continuity | Opening question matched selected intent, or did not |
| Actual capability destination | Route or proposal reached after Agent |
| First value reached | Observable result, or not reached |
| Repair needed | Copy, pacing, composition, route, or capability delivery |

Do not store sensitive life details or the content of created tasks in the research log.

## Automated coverage

### Unit and contract tests

- Portfolio composition is capped at six and contains at most one offer per capability.
- Live composition excludes every offer without a verified destination.
- The tour advances only on explicit `next`, supports `back`, and opens the chooser after the last scene.
- Reduced motion keeps the full manual sequence while suppressing the fade.
- Every offer builds a deterministic Agent opening and bounded context packet.
- Exact task, invitation, and resume starting points bypass generic orientation.
- Local Stage 1 never auto-starts for an ordinary download.
- Production navigation rejects the development-only route.

### Device workflow

1. Open Developer tools.
2. Open Guided Overture lab.
3. Confirm the first portfolio scene opens directly and remains until the tester acts.
4. Move forward and backward manually.
5. Choose `Start here` on a scene.
6. Confirm Agent opens with a visible question that matches the selected task.
7. Return and use `Skip to Kwilt`; confirm Agent opens with an unscoped but useful question.
8. Reach the final chooser and select another offer; confirm the same contextual handoff.
9. Replay in reduced-motion mode and confirm every scene and choice remains available without fading.
10. Play live capabilities and begin one real task through Agent.
11. Confirm any mutation is proposed and approved through the owning capability before it occurs.
12. Return to Developer tools and replay.
13. Confirm current onboarding status, existing domain objects, and permissions are unchanged until the tester deliberately approves a task in its owning capability.

## Stage 1 decision rules

The rules below are pre-registered in
`src/features/guidedOverture/guidedOvertureResearchDecision.ts`. Enter observed facts before
reviewing the aggregate result; do not soften a failed gate because the montage was well liked.

Advance to a hidden internal TestFlight lab only when all of these are true:

- Every participant can name at least three materially different forms of help after one viewing.
- At least six of eight participants, or four of five in a smaller round, choose a starting point without facilitator explanation.
- At least 80% of selected offers produce an expected-next-step description consistent with the offer contract.
- No participant hears Agent claim that a concept capability is already connected.
- Every selection and skip path reaches a relevant, non-blank Agent opening.
- Every live offer reaches the promised capability-owned proposal or starting state in device testing.
- Every live offer then reaches the observable first-value result in its offer contract; route arrival alone does not pass this gate.
- Standard, reduced-motion, and screen-reader paths expose the same choices and meaning.
- Replaying the lab does not change onboarding completion, onboarding pointers, permissions, or domain data.

Hold and revise if comprehension is weak, expectations diverge, the motion reads as advertising, or the offer set feels like six flavors of task management. Do not add more scenes to repair those failures; improve the examples, composition, or scene grammar.

Stop the program if the portfolio can communicate breadth only by promising capabilities Kwilt cannot plausibly build or if live routing repeatedly exposes shallow capability activation. In that case the product portfolio, not the overture, is the constraint.

## What Stage 1 cannot prove

- That the overture improves production activation or retention.
- That these six portfolio offers are the final composition.
- That a person who enjoys the concept will trust Kwilt with money, family, or private context.
- That the current live portfolio is broad enough to justify suite positioning.
- That the overture should replace the Goals-and-Arc journey.

Those require signed-build device evidence, fresh internal accounts, authoritative first-value events, and a separately approved experiment.

Use [`07-stage-1-session-kit.md`](07-stage-1-session-kit.md) for recruiting, coding, and the current evidence ledger.
