# Diverge: First-Install Success Across Kwilt

## Design challenge

How might we help Maya, on the first install, recognize the success she came to Kwilt for and reach
that success through the right native capability, while preserving the calm, illustrated,
full-attention quality of Kwilt's best onboarding moments without making one capability journey or
the whole portfolio mandatory?

## Axis of variation

The alternatives vary primarily in **how an unknown-intent arrival recognizes a useful starting
point**:

- direct self-selection from concrete outcomes;
- recognition through a visual demonstration;
- conversational interpretation;
- learning by entering the product and trying something; or
- a staged combination of demonstration and choice.

Every alternative must separately handle **known intent**. An invite, shared object, deep link,
campaign promise, explicit restore target, or other trustworthy entry context should not be erased
to make the person complete generic orientation.

## Shared invariants

These are requirements, not differentiators:

- One brief universal Kwilt moment may establish brand, privacy, and bearings, but it cannot impose
  a Goals-shaped worldview.
- Permissions, connections, roles, and mutations remain owned by the capability that needs them.
- Notifications are not a universal prerequisite.
- A selected path must end in a real native result, not an empty destination or simulated success.
- Every flow supports **Not now**, correction, interruption, and honest resumption.
- Only ready and eligible capability paths can be promoted.
- Existing full-screen interstitials, colors, pacing, and illustrations are preferred inputs. New
  illustration work is justified only by a specific communication gap after convergence.
- The full capability map remains available, but first install does not require learning it.

---

## Alternative A: The Quiet Compass

### Sketch

Use one short illustrated Welcome moment, then ask an unscoped person a direct outcome question:

> What would make Kwilt useful today?

Show four or five concrete, currently deliverable outcomes, plus **Something else** and **Look
around**. The labels describe success rather than capabilities—for example, **Make progress on
something important**, **Get dinner figured out**, **Share household responsibilities**, or
**Understand where my money is going**. A selection routes directly into the capability-owned
first-value journey.

Known intent replaces the chooser. The person sees a brief confirmation of what will happen and
any material setup, then continues into the native path.

```text
unknown intent
  -> Welcome
  -> desired-success chooser
  -> native capability journey
  -> real result

known intent
  -> Welcome or concise intent confirmation
  -> native capability journey
  -> real result
```

### Audience and persona fit

Strong for Maya and Marcus because it is calm, explicit, and short. Nina can inspect why a path is
shown and what setup it requires. It does ask the user to make a decision before Kwilt has
demonstrated much value.

### Design-challenge answer

It preserves the current full-screen welcome quality but makes the decisive moment a compact,
task-language choice rather than a universal Arc/Goal funnel.

### System fit

High. It can reuse `FullScreenInterstitial`, current brand assets, deterministic capability
metadata, and existing native routes. The smallest extension is an outcome-offer registry plus
first-install state that records explicit entry context, chosen intent, and handoff status.

### Best when

- Most users can recognize their desired result from a few well-written options.
- Speed and implementation clarity matter more than demonstrating the breadth of the suite.
- Kwilt wants a deterministic path that works without Agent or network availability.

### Fails when

- The outcomes are too broad, too numerous, or read like renamed capabilities.
- Users do not yet understand enough about Kwilt to choose confidently.
- Portfolio changes turn the chooser into a scrolling category survey.

### Primer anti-pattern check

Passes if it remains a small decision, not a setup dashboard. It must avoid productivity language,
life-area scoring, forced commitment, inferred family structure, and any suggestion that choosing
one path defines the person's identity or permanent use of Kwilt.

---

## Alternative B: Illustrated Recognition

### Sketch

Turn the existing full-screen walkthrough into a short set of illustrated outcome stories. Each
screen shows an ordinary before-and-after moment—scattered dinner ideas becoming a usable recipe,
a household responsibility gaining a person and cadence, unclear spending becoming an understood
total, or an important intention becoming one next action. The user can choose **Start here** on
any screen or continue through a bounded sequence. A final surface repeats the seen outcomes as
stable choices.

Known intent receives only the matching illustrated story, then enters the capability. Unknown
intent sees a deliberately varied subset, never one slide per capability.

```text
unknown intent
  -> Welcome
  -> 3-4 illustrated outcome stories, interruptible
  -> choose one or name something else
  -> native capability journey

known intent
  -> matching outcome story
  -> native capability journey
```

### Audience and persona fit

Strong for a curious Maya who understands value by seeing an ordinary life moment rather than
reading abstract choices. It can make Kwilt's breadth emotionally legible. It is less efficient for
Marcus and risks feeling promotional to Nina unless every transformation is precise and currently
deliverable.

### Design-challenge answer

It makes the liked interstitial and illustration language the primary way people recognize their
desired success, while preserving a direct handoff into native capability value.

### System fit

Medium. The presentation primitives already exist, but current illustrations cover Welcome,
Notifications, and Aspirations rather than the full range of outcome stories. The concept can be
prototyped with existing assets, typography, icons, and native components before deciding whether
new illustrations are genuinely necessary.

### Best when

- Recognition through concrete imagery is materially better than reading a chooser.
- Kwilt needs to communicate that several different forms of help belong to one product.
- The sequence can remain short, interruptible, accessible, and truthful without custom animation.

### Fails when

- It becomes a carousel users tap through without comprehension.
- Every capability claims a slide and the sequence expands with the portfolio.
- The visuals imply results the native capability cannot yet produce.
- New illustration production begins before the information architecture is proven.

### Primer anti-pattern check

Passes if scenes show ordinary life becoming more workable without scores, streaks, dashboards,
or idealized transformation claims. It fails if the walkthrough becomes lifestyle advertising or
if animation competes with comprehension and reduced-motion parity.

---

## Alternative C: The Kwilt Concierge

### Sketch

Use the illustrated Welcome moment, then open Agent with a bounded starting exchange rather than a
blank composer:

> What brought you to Kwilt today?

The surface includes three or four concrete starting examples, free text, and **I'll look around**.
Agent may ask one necessary follow-up when the answer is ambiguous or changes authority—for
example, whether Screen Time is for the person or a child. It then reflects the intended outcome,
discloses material setup, and proposes one native path the user can accept or change.

Known intent is passed into Agent only when interpretation or clarification is actually required.
An exact shared recipe or chore invite routes directly to its capability rather than forcing a
conversation.

```text
unknown intent
  -> Welcome
  -> bounded Agent question + examples
  -> at most one useful clarification
  -> proposed native path
  -> real result

known exact intent
  -> native capability journey

known but ambiguous intent
  -> contextual Agent clarification
  -> native capability journey
```

### Audience and persona fit

Strong for Nina, who expects natural-language help and can express a need that does not match a
curated option. It can also serve Maya when her need is contextual. It is weaker for Marcus if it
adds latency, uncertainty, or the feeling that he must explain himself before using the app.

### Design-challenge answer

It treats Agent as the ambiguity resolver for a broad suite while keeping capability ownership and
native success intact.

### System fit

Medium. Kwilt already has Agent, workflow handoff, capability routing, and reviewed opening-message
patterns. The extension is a typed first-install intent contract, deterministic safe defaults, and
a no-network fallback. It must not depend on unconstrained model output to decide permissions,
authority, or unavailable capability promises.

### Best when

- Many high-value user needs do not fit a small stable option set.
- One contextual question can substantially improve routing.
- Agent response quality, latency, and fallback behavior are release-ready.

### Fails when

- The composer feels blank or demands a well-formed prompt.
- The exchange feels like intake, diagnosis, or a personality interview.
- Agent explains Kwilt instead of helping the user begin.
- The model suggests a path the installed product cannot fulfill.

### Primer anti-pattern check

Passes if Agent remains a bounded interface, explains its proposal, and lets the user correct or
skip. It fails if AI is anthropomorphized, claims deep understanding, infers sensitive life needs,
or turns first install into a long coaching conversation before value.

---

## Alternative D: Enter Kwilt First

### Sketch

Remove most global onboarding. After authentication, land the person in the real Kwilt shell with
a quiet, dismissible **Start something** layer. It offers a few success-shaped actions and exposes
the capability menu and Agent immediately. The person can close it and explore the actual product;
contextual first-use interstitials appear only when a capability is opened.

Known intent routes directly to the native object or capability. Unknown intent begins in the shell
and learns by choosing or exploring rather than completing a pre-product funnel.

```text
unknown intent
  -> real Kwilt shell + quiet Start something layer
  -> choose, ask, or explore
  -> contextual capability onboarding
  -> real result

known intent
  -> native object or capability
  -> contextual capability onboarding only if needed
```

### Audience and persona fit

Strong for Marcus and experienced app users who resist setup. It respects autonomy and makes the
real product available immediately. It may leave Maya without enough bearings and can make a broad
suite feel like a collection of destinations before Kwilt has explained its coherence.

### Design-challenge answer

It reaches the right capability by minimizing global onboarding and letting actual use reveal what
education is needed.

### System fit

High for known intent, medium for unknown intent. The global shell, capability menu, Agent, and
native destinations already exist. The extension is a calm start layer, contextual first-use
contracts, and routing state. It would challenge the current blocking `FirstTimeUxFlow` more
directly than the other alternatives.

### Best when

- The shell is coherent enough for a new person to explore without confusion.
- Capability empty states and local onboarding are already excellent.
- Fast access matters more than presenting a unified product point of view up front.

### Fails when

- The first view is an empty or busy product shell.
- The capability menu becomes the onboarding model by default.
- Contextual interstitials collide or repeat across capabilities.
- The user cannot tell what Kwilt is for or where to begin.

### Primer anti-pattern check

Passes if the shell remains calm, the start layer is optional, and no dashboard reports setup or
life status. It fails if discovery depends on notification dots, coachmark clutter, feature badges,
or a productivity-app command center.

---

## Alternative E: Show, Settle, Choose

### Sketch

Reconsider the existing Guided Overture hypothesis as one candidate, not the assumed answer. A
brief stage shows several materially different task transformations using a bounded shared visual
grammar. The scenes then settle into the exact choices the person can start. The user can interrupt
at any moment, choose **Something else**, or **Look around**. The sequence is deterministic and its
length never grows with the portfolio.

Known intent skips the overture and receives at most the matching transformation as a concise
confirmation. Unknown intent uses the staged sequence to understand breadth before choosing.

```text
unknown intent
  -> Welcome
  -> short, interruptible task transformations
  -> same scenes settle into choices
  -> native capability journey
  -> real result

known intent
  -> optional matching confirmation
  -> native capability journey
```

### Audience and persona fit

Strong for Maya if seeing diverse transformations creates useful bearings quickly. It can make the
suite memorable without exposing capability nouns. It risks feeling elaborate to Marcus and like
marketing theater to Nina if the transformations are not immediately actionable.

### Design-challenge answer

It combines the emotional and visual quality of Kwilt's full-screen moments with an actionable
choice surface, then hands off to capability-owned first value.

### System fit

Medium. A development-only Guided Overture already proved parts of the interaction and routing
shape, but it did not establish that this is the correct production first-install strategy. A
production version needs a truthful offer registry, accessibility-complete stable state, entry
policy, resumption, and real capability paths. Existing illustrations need not be replaced; the
shared scene language can begin with layout, icons, type, color, and simple motion.

### Best when

- Users need to see breadth before they can choose a relevant outcome.
- The transformations are understood faster than a static chooser.
- The stable reduced-motion experience is equally complete.

### Fails when

- The stage is memorable but users cannot predict what a choice will do.
- The sequence delays obvious known intent.
- Visual choreography becomes bespoke capability animation.
- Testing a montage is mistaken for proving native first-value journeys.

### Primer anti-pattern check

Passes if it remains task-focused, finite, interruptible, and accessible. It fails if it becomes a
gamified product trailer, adds artificial progress pressure, or treats the Agent or Kwilt as a
human-like guide performing life transformations.

---

## Cross-alternative comparison

| Alternative | Unknown-intent mechanism | Speed to choice | Communicates breadth | Handles unusual needs | Reuses current visual strengths | Main risk |
| --- | --- | --- | --- | --- | --- | --- |
| A. Quiet Compass | Direct outcome chooser | Fast | Low-medium | Medium via Something else | High | Renamed capability catalog |
| B. Illustrated Recognition | User-paced outcome stories | Medium | High | Low-medium | Very high | Tour length and illustration dependency |
| C. Kwilt Concierge | Bounded Agent interpretation | Variable | Medium | High | Medium | Latency, ambiguity, intake feel |
| D. Enter Kwilt First | Actual product exploration | Fastest | Medium after entry | High | Low-medium | Weak bearings and empty-shell exposure |
| E. Show, Settle, Choose | Staged transformations become choices | Medium | High | Medium via Something else | High | Choreography over comprehension |

## Tensions to resolve in convergence

1. **Bearings versus speed:** How much must Kwilt explain before a person can choose well?
2. **Recognition versus decision:** Is seeing a transformation materially better than reading a
   concrete outcome?
3. **Determinism versus expressive range:** Can a small choice set serve enough users, or is Agent
   needed at the center rather than as an escape hatch?
4. **Universal moment versus known intent:** Does every person need Welcome, or should an exact
   invite/object route bypass even that until after the requested action?
5. **Product before education:** Is entering the shell liberating or disorienting for a new user?
6. **Visual reuse versus visual expansion:** Which strategy genuinely needs imagery beyond what
   Kwilt already has?
7. **Readiness dependency:** How many capability routes can honestly reach first value today, and
   should that constrain the first production strategy or only its initial offer set?

## Divergence checkpoint

No alternative is selected here. Convergence should identify whether one model wins or whether a
reductive hybrid is justified—for example, a Quiet Compass default with Agent as **Something else**
and illustrated interstitials reserved for the universal Welcome and capability moments that truly
benefit from them.
