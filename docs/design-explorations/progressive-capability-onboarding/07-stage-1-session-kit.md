# Guided Overture Stage 1 Session Kit

This is the operating sheet for the first five to eight moderated sessions. It keeps recruiting, observation, coding, and device evidence separate so a good conversation cannot be mistaken for a passing onboarding program.

## Study readiness

- Build: development build from `codex/guided-overture-lab`.
- Entry: `Settings -> Developer tools -> Guided Overture lab`.
- Composition: `stage1-v3-manual-agent`.
- Participant content: never record task text, financial details, photos, names of invitees, or Agent prompts.
- Decision owner: run the pre-registered logic in `guidedOvertureResearchDecision.ts`; do not decide from average sentiment.

## Recruiting grid

Recruit five core participants and up to three additional participants. The core sample must include at least four persona patterns, one person who maintains a complex productivity system, and one person who does not identify as a productivity-app user.

| Slot | Pattern to recruit | Starting situation for the overture task | Required posture |
| --- | --- | --- | --- |
| GO-01 | Maya-like ordinary family organizer | General recommendation; no scoped intent | Does not identify as a productivity-app user |
| GO-02 | Marcus-like overloaded system user | Looking to leave or simplify an existing system | Complex productivity-system user |
| GO-03 | Nina-like AI-native operator | Heard that Kwilt has an Agent, but has no exact task link | AI-familiar; cares about control |
| GO-04 | Sarah-like values-driven builder | Wants practical help that still reflects what matters | Either posture |
| GO-05 | Best available mismatch or crossover | General download; no scoped intent | Fill the largest recruiting gap |
| GO-06 | David-like private accountability seeker | Verify invitation bypass first; view the overture only afterward | Optional |
| GO-07 | Elena-like restarter | Verify returning-user bypass first; view the overture only voluntarily | Optional |
| GO-08 | Deliberate disconfirming participant | Someone unlikely to want a life/productivity suite | Optional |

David and Elena's bypass checks are entry evidence, not comprehension evidence. Include their overture observations in the decision sample only if they subsequently view the same portfolio task under the same protocol.

## Moderator setup

Before handing over the device:

1. Record the session ID, build, composition version, and presentation mode.
2. Confirm the lab starts at the first full-screen scene and does not advance on its own.
3. Do not describe capabilities, Arcs, the Avatar inspiration, or concept-versus-live modes.
4. Read only:

> A friend said Kwilt can help with everyday life. You downloaded it. Take a look and start wherever you naturally would.

5. Stay silent until the participant chooses, exits, or asks a direct clarification question.

## Raw observation record

Record behavior and the participant's own words before coding them.

| Field | Value |
| --- | --- |
| Session ID | |
| Closest persona pattern | |
| Important mismatch | |
| Productivity posture | Complex system / not a productivity-app user / neither |
| Starting point | |
| Presentation mode | Standard / reduced motion / screen reader |
| Last scene clearly understood | |
| Progression behavior | Back / Next / Start here / Skip to Kwilt / chooser / exited |
| Forms of help recalled, verbatim | |
| First selection | |
| Needed facilitator explanation | Yes / no |
| Expected next step, verbatim | |
| Thought concept was already shipped | Yes / no |
| Agent opening matched selection | Yes / no |
| Capability-owned proposal or destination reached | |
| Observable first value reached | |
| Repair needed | Copy / pacing / composition / route / capability delivery |

## Coding rules

Code the raw record only after the session:

- `recalledCoverageTags`: count distinct forms of help, not repeated nouns. “Plan my day” and “put things on my calendar” are one form. Do not award a tag merely because the participant repeats card copy.
- `choseWithoutExplanation`: true only when the participant selects without the moderator explaining Kwilt, a capability, or what the next screen will do.
- `expectedNextStepConsistent`: true when the predicted next screen, questions, or result fits the selected offer contract. Exact wording is unnecessary.
- `mistookConceptForShipped`: true if the participant believes Money, Stories, Games, or invitation behavior is currently available because the montage showed it.
- `first value reached`: true only at the observable result in the offer contract. Opening the destination is insufficient.

Disagreements should be resolved against the raw note, not by averaging two interpretations. Keep the stricter code when the note cannot decide.

## Current evidence ledger

This ledger is intentionally conservative. “Policy proven” means the branch logic is tested; it does not mean a native entry was exercised.

### Starting points

| Starting point | Current evidence | Status before Stage 2 |
| --- | --- | --- |
| Developer Tools | Earlier auto-advance build was exercised; the manual-to-Agent revision requires a fresh simulator walkthrough | Reverification required |
| Unscoped download without assignment | Current FTUX retained; pure policy test | Proven non-disruption behavior |
| Unscoped internal assignment | Pure policy test only; not wired | Missing native proof |
| Exact task | Pure policy test; existing deep-link architecture | Missing per-task native proof |
| Invitation | Pure policy test; invitation route exists | Missing fresh invitation walkthrough |
| Resume | Pure policy test only | Missing authoritative resume-source and native proof |
| Returning user | Pure policy test only | Missing voluntary-reorientation proof |

### Live offers

| Live offer | Route arrival | Observable first value | Current status |
| --- | --- | --- | --- |
| Add a to-do before I forget | Contextual Agent opening | Approved to-do proposal creates a reopenable item | Agent opening and first-value reverification required |
| Plan tomorrow around what matters | Contextual Agent opening | Approved Plan proposal places one priority on a day | Agent opening and first-value reverification required |
| Turn an idea into a goal I can start | Contextual Agent opening | Approved Goal proposal saves a concrete Goal | Agent opening and first-value reverification required |
| Ask Kwilt to help me sort something out | Contextual Agent opening | Useful next move returned without silent mutation | Agent opening and first-value reverification required |

### Access and safety

| Requirement | Current evidence | Status |
| --- | --- | --- |
| Standard motion | Manual controls implemented; fresh simulator walkthrough pending | Reverification required |
| Reduced motion | Full manual sequence without fade implemented; fresh walkthrough pending | Reverification required |
| Screen reader | Code path and equivalent offer source; the current iOS 26.4 simulator image does not expose VoiceOver in Accessibility settings or Settings search | Missing physical-device or compatible-simulator walkthrough |
| Replay preserves onboarding state and objects | Earlier build inspected; revision remains non-mutating in code | Reverification required |
| Concept choices avoid fake destinations | Agent context carries `concept` availability and forbids false access claims | Runtime conversational proof required |

## Decision procedure

1. Complete at least five coded comprehension observations.
2. Complete the device ledger with isolated-account first-value evidence.
3. Enter the observations and device evidence using the types in `guidedOvertureResearchDecision.ts`.
4. Run its focused Jest suite after entering or changing evidence logic.
5. Accept only `advance`, `hold`, or `insufficient-evidence`; do not invent a “soft pass.”
6. If the result is `hold`, revise the named failure class and run a new composition version. Preserve the old records.

The current program is `insufficient-evidence` until moderated observations exist. The current device ledger would also hold Stage 2 because screen-reader and live first-value proofs are not complete.
