# Frame: Customer proof after choosing a path

Status: implemented locally in the editorial rehearsal; native visual acceptance remains pending.
Review cadence: check in while co-designing this bounded addition.

## User intent

Add a review or customer quote about the selected capability as the next screen after path selection.

## Audience and job

Maya, representing aspirational family organizers, has chosen something she wants help with but has not yet experienced its value. Her hero job is `jtbd-move-the-few-things-that-matter`. In user voice: “Before I invest time in setup, help me see that this has made a useful difference for someone like me.”

serves: [jtbd-trust-this-app-with-my-life]

The existing family-life job flow scores “Keep using system” at 3/5 and warns against configuration burden. This proposal addresses confidence before that flow begins; it does not establish a new delivery score or prove improved activation.

## System alignment

Constraint posture: Fit the system.

Source inspection on September 29, 2026: `HouseholdStarterFlow.tsx` presents Money, Screen Time, Meals, and Goals choices. Selecting one opens an existing illustrated invitation before the capability handoff. Meals also offers a secondary chores action. The first-run brief distinguishes this rehearsal from production onboarding; source inspection here is not runtime proof.

The next-screen placement can reuse that invitation slot. A recommendation for discussion is to make it a proof-led invitation with a short outcome headline, one relevant quote, real attribution, and the existing setup action. Avoid extending the sequence with two consecutive persuasion screens. Preserve the separate chores action until its treatment is explicitly resolved; a Meals quote cannot substantiate chores.

## Design challenge

How might we help Maya recognize a believable benefit from her selected path and feel ready to start, while keeping onboarding brief and truthful?

## Evidence needed

No approved capability-specific customer quotes were found in the targeted onboarding/source/document search. This is not an exhaustive search of customer feedback. Quotes need an original source, permission for this use, and accurate attribution. If a path has no suitable quote, retain its existing introduction. Sample copy may be used in a clearly labeled design mockup but is not customer evidence.

Outcome themes to seek: Money clarity before spending; Screen Time intentional attention; Meals shared input and less dinner coordination; Goals a doable next step and follow-through. These are collection themes, not testimonials or verified outcomes.

## Scope and next decision

Initial proposal: one relevant quote per selected path; no invented rating, customer count, or extra setup requirement. The accepted implementation below adds rotation while keeping one quote visible at a time.

Resolved content direction: Andy authorized invented quotes for this design iteration. They remain visibly labeled as preview copy.

## Accepted implementation contract — September 29

Andy chose quote-only presentation, a fixed benefit-led CTA, invented draft copy for now, and a rotation of quotes. Implement within the existing editorial rehearsal. The later explicit direction supersedes the earlier headline/attribution recommendation.

- Job / three-second read: recognize the selected benefit in a relatable experience, then begin.
- Authority: explicit user direction, native accessibility, Kwilt constitution/tokens/components, existing editorial flow. No external exemplar or new component system.
- Scan order: quote → quiet preview disclosure → bottom CTA. No headline, illustration, rating, fabricated person, carousel dots, or second bottom action.
- Reuse: owned Text, Button, FullWidthActionDock; existing Back, Skip and real capability handoffs. Meals has one Meals CTA; the former secondary chores shortcut is removed from this screen to honor the single-action decision.
- Three draft quotes per path; eight seconds each; gentle opacity transition. Reduced motion or screen reader keeps one quote static. Unmount stops rotation; backgrounding pauses it.
- Quotes remain visibly marked as preview copy, not customer evidence. This does not change production onboarding routing or establish approved testimonials.
- Required checks: correct handoff on all four paths, rotation/wrap/cleanup, accessibility static state, Back/reentry, quote wrapping and bottom-button clearance.
- Proof path: existing signed-in Dev Tools → Try shoreline onboarding, using the existing checkout's Metro on port 8081. Runtime proof must be recorded separately from tests.

## Implementation evidence

Source: `/Users/andrewwatanabe/Kwilt`, branch `codex/onboarding-shoreline`, base HEAD `59e8acff8831400a436407d463c58c10f5ff5f39`, dirty shared checkout. This slice updates HouseholdStarterFlow and adds OnboardingQuote. Three draft quotes per Money, Screen Time, Meals and Goals path replace the illustrated introductions. Existing setup callbacks remain authoritative.

Focused tests verified the four handoffs and single bottom action, rotation/wrap, timer cleanup, background pause/resume, and static reduced-motion/screen-reader behavior. Native composition, actual crossfade appearance, large text, and device assistive-technology behavior remain unverified. The booted iPhone 17 Pro Simulator was displaying Journal while Journal chats were active, so this task did not take runtime ownership, install a build, or switch apps. Existing Metro PID 51113 on port 8081 points to this checkout; that fact alone does not establish native build provenance or a visual pass.

No commit, push, production routing change, or release was performed. Replace the visibly disclosed invented copy with approved sourced reviews before treating this as customer proof.
