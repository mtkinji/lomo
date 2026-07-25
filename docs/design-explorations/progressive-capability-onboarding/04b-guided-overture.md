# Concept Direction: The Guided Overture

**Status:** Selected direction for a non-disruptive learning release. See
[03a-converge-guided-overture.md](03a-converge-guided-overture.md) and
[04d-guided-overture-learning-release.md](04d-guided-overture-learning-release.md). This remains a
product concept, not authorization to replace the current onboarding.

## The Insight

The opening of *Avatar: The Last Airbender* does not begin by explaining a taxonomy. It gives the
viewer a few fast, distinct demonstrations that share one visual grammar. In seconds, the viewer
understands that the world is broad, the parts are different, and they belong to one coherent
whole.

Kwilt needs a product version of that—not a literal homage and not an entertainment trailer.

For an unscoped download, the first experience should quickly demonstrate several concrete ways
Kwilt can help, then turn those demonstrations into the user's starting choices. The experience
should answer three questions without requiring the user to formulate a prompt:

1. **What kind of product is this?** A practical life-assistance suite, not just a Goals app.
2. **Could it help with something that matters to me?** The examples are recognizable tasks.
3. **What do I do now?** Tap one of those same tasks, name another need, or look around.

Internal working name: **the Guided Overture**.

The user-facing experience does not need to name the overture.

## Recommendation In One Sentence

For a new, unscoped user, show a short, skippable sequence of task vignettes made from native
Kwilt interface elements; let any vignette be tapped immediately; then settle those same
vignettes into a stable set of starting buttons under **Where should we start?**

The interaction grammar is:

```text
SHOW a few specific forms of help
  -> SETTLE them into stable choices
    -> CHOOSE one task, ask for something else, or look around
      -> DO the task in its owning capability
```

This adds the missing orientation layer to Guided Relevance while preserving:

> **One now. One next. The full map when wanted.**

## Why This Is Not A Feature Tour

| Conventional feature tour | Guided Overture |
| --- | --- |
| Explains product sections | Demonstrates recognizable tasks |
| Uses capability names and claims | Uses concrete objects, actions, and results |
| Requires swiping through disposable pages | Plays quickly and remains interruptible |
| Ends somewhere different from the tour | Resolves into the choices the user can act on |
| Teaches interface before need | Lets native value teach the capability after selection |
| Tries to achieve recall | Tries to produce recognition and a first action |

The overture is therefore not pre-work before onboarding. It is the visual form of the first
onboarding decision.

## The Scene Grammar

Every beat should use the same small structure:

1. **A concrete thing:** a to-do, transaction, app, person, game prompt, or story.
2. **One legible change:** it is placed, summarized, blocked, handed off, started, or saved.
3. **A task label:** the action the user can choose next.

The beat should be understandable without narration. Its text should name the actual task rather
than a life-domain promise.

Examples of the grammar:

```text
"Dentist at 9" + "Return package"
  -> arranged under Tomorrow
  -> PLAN TOMORROW

three recent transactions
  -> grouped into a visible spending total
  -> REVIEW RECENT SPENDING

TikTok + YouTube
  -> move behind "Blocked until 6:00"
  -> CHOOSE APPS TO BLOCK
```

The motion is not the meaning. The before-and-after state is the meaning.

## Target-Portfolio Storyboard

This storyboard describes the intended breadth of the mature suite. The shipped overture must
include only tasks Kwilt can truthfully complete at the time.

| Beat | What appears | One visible change | Choice it becomes |
| --- | --- | --- | --- |
| 1. Do | `Call the dentist` and `Return the package` | Both land in Tomorrow | **Plan tomorrow** |
| 2. Move forward | `Run a 10K` | It becomes `Walk 20 minutes tomorrow` | **Plan the next step for a goal** |
| 3. Understand | Three recent transactions | They resolve into a clear category total | **Review recent spending** |
| 4. Protect | A few distracting app icons | They move behind `Blocked until 6:00` | **Choose apps to block** |
| 5. Coordinate | `School pickup — Thursday` | It moves to Sam and is acknowledged | **Share a responsibility** |
| 6. Enjoy | A game prompt appears between several people | The first round becomes ready | **Start a game** |
| 7. Remember | A photo and one sentence | They become a saved story card | **Save a story** |

Seven beats may be too many for the first release. This is a coverage set from which to compose a
short sequence, not a requirement to play every example.

The concrete example inside a scene can be specific while the resulting choice remains reusable.
That combination is stronger than either generic promises or overly personalized guesses.

## The First-Run Rhythm

### 1. Arrive

After universal account and safety prerequisites, the user enters a calm branded stage. A direct
invite, deep link, restore target, or other exact route bypasses this sequence.

The only persistent controls needed during the overture are:

- **Skip** or **Choose now**;
- the ability to tap the current task; and
- an unobtrusive progress cue if the sequence lasts long enough to need one.

### 2. Show

Show roughly five or six beats in quick succession. A useful design target is a total experience
measured in seconds, not a stack of pages the user must work through.

Each beat should:

- use a real or faithful Kwilt UI fragment;
- contain only one transformation;
- preserve a repeated placement and timing grammar;
- be tappable as soon as its task is understood; and
- avoid depending on sound, voiceover, or reading a paragraph.

This can feel lively through pacing, color, scale, crossfade, and simple movement. It does not
require character animation, custom video, or a large illustration system.

### 3. Settle

When the last beat finishes—or when the user chooses to skip—the demonstrated tasks resolve into
a stable choice surface. The final buttons should visibly reuse the icon, color, title, and object
from the sequence.

This continuity matters. It turns the montage from entertainment into navigation and reduces the
mental jump between “what I just saw” and “what I can do.”

The final screen might read:

> **Where should we start?**
>
> Pick one. You can change course anytime.

Then show the task buttons, followed by:

- **Something else** — focuses the Agent composer;
- **Look around Kwilt** — opens the real shell; and
- optionally **Show me again** after the overture has completed once.

Do not ask **Which Kwilt apps do you want?** The user is choosing an action, not configuring a
suite.

### 4. Choose

Selecting a task should not open another generic explanation page. Agent may present one short
route preview only when it materially improves trust:

```text
Review recent spending

Kwilt Money will ask you to connect an account, then show your recent transactions.

[Continue]  [Choose something else]
```

If no meaningful setup or authority boundary exists, route directly to the owning capability.

### 5. Do

The capability produces the first real result. The user remains at that result. Kwilt does not
interrupt it with a second capability pitch.

One adjacent possibility can be held for a later Agent return, consistent with **one now, one
next, full map**.

## Three Production Forms

The Avatar-like insight can be expressed in several materially different ways.

### A. Stage, Then Settle — leading hypothesis

One central stage shows each task vignette. At the end, the vignettes shrink or transition into a
stable task list or grid.

**Best when:** Kwilt wants the strongest sense of breadth and a memorable branded opening.

**Strengths:** Fast, coherent, visually satisfying, and turns directly into navigation.

**Risks:** The settle transition needs careful craft; overly fast scenes can become decorative
noise; full-screen cuts can feel like an ad if the scenes are not made from real product grammar.

### B. Sequential Reveal

The final task-choice surface exists from the beginning. Task cards arrive, activate, or briefly
demonstrate themselves one at a time, then remain in place.

**Best when:** production budget and accessibility simplicity matter most.

**Strengths:** No complex stage-to-grid transition, immediate stability, and the user can choose
as soon as a relevant card appears.

**Risks:** Less cinematic and potentially more like a normal menu; the layout can become crowded
before the user understands the repeated rhythm.

### C. User-Paced Story Cards

Each task appears as a card the user taps or swipes through, with the full choice surface after the
last card or on skip.

**Best when:** each task needs more time or explanation than a quick beat can support.

**Strengths:** Maximum comprehension and easy manual pacing.

**Risks:** It becomes a conventional onboarding carousel, makes the user do work before value,
and loses the quick-succession quality that makes the original metaphor useful.

### Provisional preference

Prototype **Stage, Then Settle** first and keep **Sequential Reveal** as the low-motion,
lower-complexity fallback. Do not start with User-Paced Story Cards unless comprehension testing
shows that the task transformations cannot be read at montage speed.

## Budget-Conscious Visual System

The overture should be built from a tiny reusable kit:

- one stage container;
- one scene-card component;
- existing Kwilt typography, colors, icons, avatars, pills, rows, and object cards;
- basic opacity, translation, and scale transitions;
- one shared timing curve;
- the same task metadata for the vignette and the final button; and
- a static final layout that is complete even if motion never runs.

No new production dependency is conceptually required. The current app already uses native
opacity, translation, scale, and easing in its launch experience; the overture can extend that
grammar rather than introducing a separate animation platform.

The design budget should go into choosing the right examples, composing the before-and-after
states, and tuning the rhythm. That is where comprehension lives.

## Scalability Rule

The overture is a stage system, not a fixed film. Each capability should be able to register a
truthful task vignette, exact native route, setup disclosure, first-value proof, and accessible
static meaning. Kwilt's shell then selects a short, diverse set and renders them through one
shared visual grammar.

Adding capabilities must expand the candidate library without expanding the length of first-run.
A new capability can become eligible for the short overture, appear through contextual or
optional reorientation, and remain discoverable in the full map. It does not automatically earn
a permanent beat.

The system contract, selection policy, exposure levels, and capability-addition workflow are
developed in [04c-scalable-overture-system.md](04c-scalable-overture-system.md).

## Guidance Without A Blank Agent

The overture and Agent have different jobs:

| Layer | Job |
| --- | --- |
| Overture | Establish the breadth of help Kwilt can provide |
| Stable task choices | Let the user recognize and declare an initial intent |
| Agent | Interpret needs that do not fit a button and clarify genuine ambiguity |
| Capability | Own setup, permissions, action, data, and proof |
| Shell | Provide the full map whenever the user wants it |

This means landing in Agent can still be correct, but the initial Agent state should host the
overture and its task choices. It should not look like a chat transcript and should not require a
model response to render or work.

The initial prompt is not **How can I help?** It is **Where should we start?** after Kwilt has
already shown enough range to make the question answerable.

## Personalization And Ordering

The first sequence can be deterministic. Kwilt does not need to infer a person's life to make the
overture useful.

Ordering can later use only clear, bounded evidence:

1. the exact door used;
2. available capabilities and eligibility;
3. an explicit prior choice;
4. a safe resume target; and
5. declared interest the user can inspect or change.

Age should alter safety, eligibility, authority, or language where necessary. It should not be
used to decide that a person probably needs budgeting, parenting, productivity, or wellness help.

## Truthfulness Rule

The overture must never advertise a task the installed product cannot honor.

There are two legitimate uses:

- **Portfolio concept:** a design storyboard can show the intended mature breadth and expose what
  the suite must eventually support.
- **Shipped onboarding:** every shown task must route to a coherent native first-value journey in
  the current build and region.

An unavailable capability should be omitted, not shown with **Coming soon**, during first-run.
The user is choosing where to start, not watching a roadmap trailer.

## Accessibility And Control

- **Reduce Motion:** skip the choreography and show the stable task choices immediately, with the
  same examples and labels.
- **Screen reader:** do not auto-advance focus. Present a normal heading, brief explanation, and
  task buttons in reading order.
- **Pause:** pause the sequence when the app backgrounds, when assistive technology is active, or
  when the user begins interacting.
- **No sound dependency:** sound may never carry essential meaning.
- **No motion dependency:** every transformation must have a readable static before/after or a
  descriptive task label.
- **Skip is not failure:** skipping lands on the complete chooser, not past it.

## When It Appears

Show the overture only for a truly unscoped first entry or when the user explicitly chooses
**What can Kwilt do?**

Do not show it:

- before an exact invite or deep link;
- every time the app launches;
- when the user has an authoritative native resume target;
- after a migration if existing data already gives the user a meaningful destination; or
- as an interruption to advertise a new capability.

When the portfolio materially expands, Kwilt can offer a calm, optional reorientation rather
than replaying first-run onboarding.

## What We Are Refusing To Add

- A narrated brand video.
- Bespoke animated characters or illustrations.
- Seven mandatory swipe pages.
- A product-noun catalog disguised as onboarding.
- Global permission prompts before a task needs them.
- An AI-generated sequence on first load.
- A demographic quiz used to guess what the person should care about.
- A completion checklist for activating the whole suite.
- Confetti or celebration before the user has done anything.

## Capability Delta

Today, an unscoped user can be asked to choose a task or type a request, but that does not fully
communicate the breadth or coherence of the suite.

With the Guided Overture, the user can:

- understand several materially different forms of Kwilt help in a few seconds;
- interrupt as soon as one feels relevant;
- choose from the same concrete tasks they just saw;
- describe a different need without facing a blank conversation first; and
- enter a native first-value path without learning Kwilt's internal product taxonomy.

Still intentionally unsupported:

- understanding every capability before beginning;
- choosing all future interests during setup;
- inferring a life plan from one task selection; and
- activating capabilities, permissions, or shared contexts in bulk.

## Stated Bet

We're betting that a short sequence of concrete, coherent task transformations will give an
unscoped person enough breadth to understand what kind of product Kwilt is, while the settle into
buttons will make the next action obvious.

We're also betting that the sequence will feel fun because real things visibly change, not
because Kwilt invested in expensive animation or made exaggerated promises.

If people remember the sequence but still do not know what to tap, the transformations are too
decorative or the final continuity is too weak. If they skip before recognizing a relevant task,
we should reduce the beat count, improve the ordering, or use Sequential Reveal—not add more
explanation.

## Questions For The Next Checkpoint

1. Does **Show -> Settle -> Choose** feel like the right first-run grammar?
2. Which five or six tasks must define the suite's breadth in its mature state?
3. Should the sequence begin immediately after sign-in, or should a single line such as **A few
   ways Kwilt can help** establish the frame first?
4. Should tapping a beat interrupt the sequence and start immediately, or select it and wait for
   the final choice state?
5. Which production form deserves a rough prototype first: Stage, Then Settle or Sequential
   Reveal?
6. Which five or six offers should remain in the presentation budget as the capability registry
   grows?
