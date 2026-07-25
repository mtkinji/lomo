# Frame: progressive-capability-onboarding

## Review cadence

Check in after each phase. This work changes the relationship between Kwilt, its capabilities,
and the first value a new user experiences, so the frame should be reviewed before solution
divergence.

## What the user said

> The whole concept of the "mega app" really disrupts the current onboarding concepts we have
> now. It feels like we ought to onboard users in an almost completely different way, with
> progressive onboarding when they try to experience a new capability set. We need a very
> comprehensive deep dive and exploration around this.

## Restated in user voice

When I come to Kwilt, I usually have one live need, not a desire to configure an entire life
operating system. Help me get a meaningful result in the part of Kwilt I need now, then teach and
configure other capabilities only when I choose or naturally reach for them, so Kwilt can become
more useful over time without feeling overwhelming, presumptuous, or fragmented.

## Target audience

`audience-aspirational-family-organizers` - Aspirational family organizers.

This is the strongest pressure-test audience for the unified app. Maya can plausibly need Goals,
To-dos, Plan, Money, Screen Time, Stories, Recipes, or family participation, but she is not looking
for a powerful system to configure. If the onboarding model works for Maya, it is more likely to
make Kwilt's breadth feel helpful rather than burdensome.

The design must still preserve the needs of:

- Sarah, whose first useful outcome may be a Goal inside an identity Arc.
- Marcus, who is highly sensitive to setup and system-maintenance overhead.
- Nina, who needs scope, permissions, evidence, and control to become progressively explicit.
- Returning users whose data already exists and who should not be treated as conceptually new.

## Representative persona

Maya, arriving with one concrete family need.

- Current situation: She heard that Kwilt can help with something immediate, such as organizing
  family commitments, setting up Screen Time, or making sense of household money.
- What she is trying to become/do: Get that immediate area under control without first learning
  the entire Kwilt model.
- Emotional state or tension: Hopeful, busy, and alert to anything that looks like another system
  she will have to maintain.
- What would make this feel wrong: A capability catalog before value, an identity survey unrelated
  to her reason for arriving, global permission requests, empty setup ceremonies, or repeated
  tours that interrupt real work.

## Hero anchor

`jtbd-move-the-few-things-that-matter` - Help me make real progress in the few areas I most want
to grow.

The platform-level trust guardrail is `jtbd-trust-this-app-with-my-life`: Kwilt must earn the right
to hold more of Maya's life rather than treating install or account creation as blanket consent.

## Job flow step

The existing Maya flow does not explicitly model adoption of a broad capability platform. Its
closest underserved steps are:

- **Know the next doable action** - score 2. Kwilt has helpful surfaces, but they are not yet a
  cohesive path from intent to value.
- **Schedule or hand off** - score 2. Cross-capability setup and participation are not cohesive.
- **Keep using the system because it feels helpful, not fussy** - score 3. Too much configuration
  makes adoption fragile.

For this exploration, use this provisional platform-adoption flow:

1. Arrive with one live need or an invited context.
2. Understand what Kwilt can do for that need without learning its full taxonomy.
3. Enter one capability and reach a meaningful result with the least necessary setup.
4. Grant only the data, permission, role, or connection required for that result.
5. Return directly to the useful state created.
6. Notice relevant adjacent capabilities when a real next need emerges.
7. Add, ignore, pause, or resume capabilities without losing the coherence of one Kwilt.
8. Trust Kwilt more as it demonstrates continuity across capabilities.

This provisional flow should become a first-class job-flow artifact if the direction survives
convergence. It should not be forced into the Goals-only flow.

## Active anchors

- `jtbd-move-the-few-things-that-matter` - Entry should resolve the user's live need, not showcase
  product breadth.
- `jtbd-trust-this-app-with-my-life` - Capability access, data scope, permissions, and cross-domain
  reuse must be earned and inspectable.
- `jtbd-carry-intentions-into-action` - Orientation succeeds only when it produces an actionable
  first result.
- `jtbd-get-help-without-retelling-my-life` - Later capabilities should reuse already-authorized
  context without making the user repeat setup, while never assuming blanket access.

## serves snippet

```yaml
serves: [jtbd-move-the-few-things-that-matter, jtbd-trust-this-app-with-my-life, jtbd-carry-intentions-into-action, jtbd-get-help-without-retelling-my-life]
```

## Friction we're addressing

The current first-time experience equates onboarding to the Goals/Arcs capability: authenticate,
show three introductory panels, request notifications, complete a Goal+Arc workflow, and land on
the created Arc. That was coherent when Goals was effectively the product. In unified Kwilt, it
quietly tells every user that Goals is the prerequisite mental model for Money, Games, Screen
Time, Stories, Recipes, or any future capability.

At the same time, many later teaching moments already behave progressively, but each is encoded as
a capability-specific or screen-specific dismissal flag. There is no shared model for whether a
user has encountered, activated, configured, gained value from, paused, or needs to resume a
capability. Adding more capability-specific flags will create interruption conflicts and make the
experience impossible to reason about as a whole.

The danger is two-sided:

- **Too much global onboarding:** Kwilt becomes a mega-app tour, asks irrelevant questions and
  permissions, and creates empty structures the user may never need.
- **Too little shared onboarding:** every capability behaves like a separate app, repeats setup,
  loses context, and never teaches why one Kwilt is more valuable than a folder of products.

## System alignment

Constraint posture: `Question the system`

The unified capability platform is already the accepted product direction, and its permission and
lifecycle principles are compatible with progressive activation. The constraint under review is
the assumption that Kwilt has one mandatory, Goals-shaped first-time funnel and one global
completion state.

See [00-system-alignment.md](00-system-alignment.md) for the full current-state audit.

### Constraints to preserve

- One public application and one account/session.
- One global shell with capability-owned local interaction contracts.
- No imported standalone app shells or duplicated global infrastructure.
- Permissions are requested when a capability needs them, not in global onboarding.
- Household or participation structures are created at the moment of real participation, not as
  empty first-run ceremony.
- Arcs and Goals keep their identity and action semantics.
- Capability setup should end in the native capability surface that now contains value.
- The user can always decline, defer, leave, and return without penalty.

### Constraints we may challenge

- New users must complete Goal+Arc creation before entering Kwilt.
- Notifications belong in universal first-time setup.
- One boolean can represent onboarding completion for the whole product.
- All users need the same first destination.
- Product education must happen before use rather than at the moment of intent.
- First-use coachmarks can be independently scheduled without a shared attention policy.

### Design implication

Global first run should become a thin orientation and routing layer. The substantive creation,
permission, connection, role, and education work should be owned by the capability whose value it
unlocks. The current Goal+Arc flow is not discarded; it is reclassified as the excellent
first-value path for a user starting with Goals.

Kwilt therefore needs an onboarding operating model, not merely a new sequence of screens:

1. **Account entry** - establish identity and recover existing state.
2. **Intent routing** - understand or infer the user's live starting need.
3. **Capability activation** - produce first value with minimum necessary setup.
4. **Contextual learning** - teach deeper behavior only after a relevant action or return.
5. **Cross-capability expansion** - introduce adjacency when it advances the current job.
6. **Re-entry and recovery** - resume incomplete setup or reorient after time away.

## Aspirational design challenge

How might we help Maya enter Kwilt through the need that matters now, reach a meaningful result in
one capability, and gradually discover a coherent life system, while preserving calm, consent,
capability depth, and the feeling that Kwilt remembers rather than repeatedly onboards her?

## Out of scope

- Choosing final UI layouts or copy before divergence.
- Rebuilding the current Goal+Arc workflow.
- Implementing a capability marketplace, downloadable mini-apps, or separate app shells.
- Forcing every capability into the same setup template.
- Defining pricing or entitlement packaging, except where it affects the activation boundary.
- Beginning implementation before the exploration converges and Andrew explicitly approves it.

## Open question

Does the central reframing feel right: **Goal+Arc onboarding becomes one capability's first-value
journey, while global Kwilt onboarding becomes a thin intent-routing and trust-establishment
layer**?
