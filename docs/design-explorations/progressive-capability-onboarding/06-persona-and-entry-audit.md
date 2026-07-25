# Guided Overture Persona And Entry Audit

**Review type:** Delivery and audience-fit review of the Stage 1 onboarding program.

**Evidence boundary:** This audit uses the current persona taxonomy, job-flow scores, implemented Stage 1 composition, entry-policy tests, and signed-in simulator behavior. It is a structured product review, not participant evidence. No persona delivery score changes are justified yet.

## Decision

The Guided Overture is ready for moderated Stage 1 comprehension testing across the six canonical persona patterns. It is not ready to replace first-run or graduate to TestFlight based on this audit alone.

Two weaknesses were corrected during review:

1. The original relationship beat, **Remember what I promised someone**, organized an individual commitment but did not demonstrate people connecting. It is now **Invite someone to help me follow through**.
2. The original portfolio treated Agent as a fallback or one destination among many. The revised contract makes Agent the continuous host after every selection while the sixth beat still demonstrates an explicitly Agent-shaped task.

The six-beat portfolio now deliberately demonstrates:

| Outcome promised by the suite | Concrete task evidence |
| --- | --- |
| Be more productive | Plan tomorrow; figure out what to do first this week |
| Be happier | Turn a family photo into a story; pick a game everyone can play |
| Save money | Catch a bill before it surprises me |
| Connect with each other | Invite someone to help me follow through; pick a shared game |
| Bring an unlisted need | Agent is demonstrated and `Something else` remains available |

## Persona Review

### Maya — aspirational family organizer

- **Hero JTBD:** `jtbd-move-the-few-things-that-matter`.
- **Relevant weak job steps:** See what matters (2), know the next doable action (2), schedule or hand off (2), family participation (2).
- **Overture fit:** Strong enough to test. Planning, family stories, games, and a private invitation are recognizable without setup language.
- **Live proof:** Add a to-do opens focused Quick Add; Plan opens the real planning surface.
- **Remaining gap:** The current app still does not deliver the ordinary household handoff implied by the mature-suite concept. Portfolio interest cannot be counted as activation evidence.

### Marcus — burned-out productivity power user

- **Hero JTBD:** `jtbd-move-the-few-things-that-matter`.
- **Relevant weak job steps:** Notice noise (2), decide next action (3), review whether work is worth doing (3).
- **Overture fit:** Strong enough to test. **Plan tomorrow around what matters** and **Figure out what to do first this week** frame decision relief rather than task volume.
- **Live proof:** Every overture exit now carries deterministic opening copy and bounded intent into Agent in code.
- **Remaining gap:** The Agent continuation and capability handoff need fresh simulator and first-value proof. Relevant opening copy cannot compensate for a shallow or generic response.

### Nina — AI-native life operator

- **Hero JTBD:** `jtbd-trust-this-app-with-my-life`.
- **Relevant job step:** Arrive with visible scope and an exact return destination (4), followed by inspectable and reversible help.
- **Overture fit:** Conditional pass. Agent is both a demonstrated form of help and the continuous conversational host after any selection, without silently applying a change.
- **Entry contract:** An exact task or resume bypasses orientation and retains its destination.
- **Remaining gap:** The overture itself does not demonstrate evidence, approval, receipt, or undo. Nina's trust judgment happens in the owning Agent workflow after selection.

### Sarah — faith- and values-driven builder

- **Hero JTBD:** `jtbd-see-who-im-becoming`.
- **Relevant job steps:** Sense direction (3), choose an expressive goal (3), notice non-metric progress (3).
- **Overture fit:** Conditional pass. **Plan tomorrow around what matters** preserves a values cue while staying action-focused; live mode includes **Turn an idea into a goal I can start**.
- **Deliberate trade-off:** The portfolio does not teach Arc terminology or make identity formation the universal setup requirement.
- **Remaining gap:** Testing must determine whether Sarah still perceives Kwilt as more than practical organization. If not, improve a task transformation before adding abstract explanation.

### Elena — life-transition restarter

- **Hero JTBD:** `jtbd-recover-when-i-drift-from-an-arc`.
- **Relevant weak job steps:** Realize drift (2), let go (2), choose a return-specific next step (3).
- **Entry contract:** Strong. A returning user goes to the normal shell; the overture is not replayed as a promotional interruption.
- **Voluntary reorientation fit:** **Figure out what to do first this week** is the least presumptive current offer if Elena chooses to revisit what Kwilt can do.
- **Remaining gap:** Stage 1 does not build the explicit, shame-free return path her job flow still needs. Onboarding must not be mistaken for drift recovery.

### David — private accountability seeker

- **Hero JTBD:** `jtbd-invite-the-right-people-in`.
- **Relevant weak job steps:** Recipient follow-along (2), adjust or end sharing (2), with visibility clarity still essential.
- **Entry contract:** Strong. A real invitation bypasses generic orientation and opens its exact destination.
- **Portfolio fit:** Improved. **Invite someone to help me follow through** demonstrates connection through a bounded goal rather than a feed or generic social claim.
- **Remaining gap:** The portfolio scene is a concept. The eventual capability must show exactly what the invitee can see and make revocation obvious before the offer can enter live mode.

## Starting-Point Review

| Starting point | Required behavior | Current evidence | Assessment |
| --- | --- | --- | --- |
| Development lab | Fresh isolated session | Dev Tools passes a new session ID; simulator replay proved reset | Proven for Stage 1 |
| Unscoped new download | Current FTUX in Stage 1; assigned overture only in a future internal variant | Pure entry-policy tests | Contract proven; production wiring intentionally absent |
| Exact task | Bypass orientation | Entry-policy tests; existing native deep-link architecture | Policy proven; each future task needs its own route proof |
| Invitation | Bypass orientation | Entry-policy tests and existing invitation route | Policy proven; invitation UX not re-tested in this slice |
| Resume | Bypass orientation | Entry-policy tests | Policy proven; authoritative resume-source selection remains future work |
| Returning user | Open shell without replaying first-run | Entry-policy tests | Policy proven; voluntary reorientation remains future work |

## Portfolio Composition Assessment

The Stage 1 v3 composition keeps the fixed six-beat budget and one-offer-per-capability rule while replacing timed playback with manual progression:

1. Plan tomorrow around what matters.
2. Catch a bill before it surprises me.
3. Turn a family photo into a story.
4. Pick a game everyone can play.
5. Invite someone to help me follow through.
6. Figure out what to do first this week.

This is an editorial research composition, not a claim that these are the six permanent offers. Its purpose is to test whether participants understand materially different kinds of help and find a plausible starting point.

## Priority Gaps Before Stage 2

1. **Participant comprehension evidence:** Five to eight moderated sessions across at least four persona patterns.
2. **Sarah differentiation:** Determine whether task-first orientation still communicates a life-direction product, not only a helpful utility suite.
3. **Nina trust handoff:** Confirm that Agent's first screen and first response make scope and control visible.
4. **Elena reorientation:** Define a voluntary, shame-free “what has changed?” return path separately from first-run.
5. **Capability truth:** Keep Money, Stories, Games, and invitation scenes in concept mode until their native entry and first-value proofs exist.

## Next Design Challenge

How might one neutral, task-first opening help Maya, Marcus, Nina, and Sarah recognize a relevant form of help—while exact invitations, resumes, and returning sessions bypass it—without hiding Kwilt's deeper identity model or pretending future capabilities already work?
