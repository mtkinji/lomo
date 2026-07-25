# Converge: Agent-Hosted Context-First Task Routing

> **Status: Reopened.** The suite-level product reset in
> [04a-suite-onboarding-point-of-view.md](04a-suite-onboarding-point-of-view.md) preserves Agent,
> exact-route, task-language, and capability-ownership principles but finds that a pure task
> router is not sufficient guidance for mostly unscoped downloads.

## Decision

Choose a reduced hybrid: **Agent-Hosted Context-First Task Routing**.

This combines:

- **Follow the Door They Used** when the user has made an explicit, exact request;
- **Choose a Starting Task** inside the Agent workspace when the arrival is unscoped;
- **Ask Kwilt First** through the composer when the visible task entries do not cover the need;
- **Open House** as an always-available escape into the real capability shell.

Do not adopt the behavioral or predictive parts of Confirmed Adaptive Weave in V1. The router is a
small deterministic precedence rule, not a personalization engine.

Agent is the default **unscoped** front door, but conversation is not a tollgate. The first Agent
state shows concrete task entries that work deterministically and a composer for anything else.
Exact invites, deep links, shortcuts, object links, and safe resume targets bypass this front door.

The core contract is:

> Take the user directly to the concrete task they invoked. If Kwilt does not know the task, ask
> what they want to do first inside Agent. Then let the owning capability create the first real
> value and return the authoritative result.

## Why this wins

Maya should not have to choose “Money,” “Goals,” or “Family” as abstract product areas, and she
should not have to compose a prompt before Kwilt has helped. The Agent workspace can be the
coherent front door while immediately offering tasks such as **Review my recent spending**,
**Add a to-do**, or **Finish choosing apps for Jordan**. The Agent interprets ambiguity; the
owning capability still owns data, permission, mutation, and proof.

The task is the bridge between a broad Kwilt and a deep capability:

```text
explicit arrival context or one task choice
  -> owning capability's native first-value path
    -> real object, connection, policy, game, or saved content
      -> return to that native value
```

This preserves one coherent Kwilt without forcing the user to comprehend it all before acting.

## Alternative scoring

Ratings are qualitative: **strong**, **mixed**, or **weak**.

| Alternative | Maya/task fit | Active JTBD fit | Trust and consent | Lifecycle coverage | System alignment | Blast radius / risk |
| --- | --- | --- | --- | --- | --- | --- |
| Choose a Starting Task | strong | strong | strong | mixed | strong | medium |
| Follow the Door | strong | strong | strong when context is explicit | strong | strong | medium |
| Ask Kwilt First | strong when task entries are immediate | strong for ambiguity | mixed if conversation is required | strong | strong | medium-high |
| Open House | weak-mixed | mixed | strong autonomy | weak-mixed | strong | low centrally, high per capability |
| Confirmed Adaptive Weave | strong | strong | mixed due inference creep | strong | mixed | high |
| **Agent-Hosted Context-First Task Routing** | **strong** | **strong** | **strong** | **strong** | **strong** | **medium and bounded** |

### Audience and anchor rationale

- `jtbd-move-the-few-things-that-matter`: a task gives Maya something she can start now.
- `jtbd-carry-intentions-into-action`: orientation ends in a real result, not product education.
- `jtbd-trust-this-app-with-my-life`: exact context, permissions, and data use remain visible and
  correctable.
- `jtbd-get-help-without-retelling-my-life`: explicit arrival and resumable activation prevent
  redundant setup.
- `jtbd-invite-the-right-people-in`: invitations route to the correct person, role, Space, and
  capability-owned review step.

## Routing precedence

The router uses the first applicable rule:

1. **Honor an explicit task invocation.** A person who taps an invite, deep link, widget, shortcut,
   share action, object link, or concrete Chat action goes directly to the owning capability's
   appropriate review or action surface. Do not add a redundant global confirmation.
2. **Resume an unfinished capability task.** If Kwilt has a valid, safe resume target, offer a
   task-specific continuation such as **Continue connecting your checking account?** The user can
   continue, dismiss, or choose another task.
3. **Recognize existing value.** Existing Money, Games, Goals, or other capability data routes to
   the native useful state. Do not replay beginner setup just because the unified app is new.
4. **Land unscoped arrivals in an Agent-hosted task router.** Use **What do you want to do first?**
   with a short list of verified starting tasks and a visible composer for a need that is not
   represented. Rendering and selecting these tasks must not require a model response.
5. **Preserve an autonomy path.** **Look around Kwilt** opens the real shell. If Agent inference is
   unavailable, the concrete task entries and shell path still work.

This order distinguishes explicit intent from inference. A direct tap is authoritative routing
evidence. Existing data is evidence of prior value. Neither is blanket consent for unrelated data
use or capability activation.

## Global prerequisites and approval boundary

There are four different things that can look like “approval.” Kwilt should not collapse them into
one onboarding bundle.

| Boundary | Examples | When it appears | Owner |
| --- | --- | --- | --- |
| Global prerequisite | Sign in or restore the account; resolve a blocking account migration; confirm app-wide legal or age eligibility only when genuinely required | Before the Agent or exact destination, because Kwilt cannot safely operate without it | Kwilt platform |
| Optional app-wide choice | Analytics or marketing preferences where the user has a meaningful choice | Non-blocking and separately recoverable; before entry only when law or platform policy requires it | Kwilt platform |
| Capability enablement | Notifications, location, calendar, photos, microphone, Screen Time authorization, Plaid connection, household role, subscription entitlement | Immediately before the selected task first needs it | Owning capability |
| Action approval | Create, send, share, move money, apply a child-device policy, or another consequential mutation | After the exact proposed action is visible and before mutation | Owning capability, with Agent presenting the proposal when relevant |

The default pre-Agent gate is therefore intentionally small:

1. restore or authenticate the correct account;
2. resolve only blocking account/data-safety conditions;
3. collect versioned legal or eligibility acceptance only if Kwilt actually requires explicit
   app-wide acceptance.

The current sign-in surface links Terms and Privacy but does not establish a separate, versioned
acceptance step. This concept does not invent one. If product or legal requirements later demand
it, that acceptance belongs in the global prerequisite layer—not inside a capability.

Notifications are not global merely because several capabilities can use them. The task that
creates a reminder, alert, invitation update, or other notification-producing behavior should
explain the specific value and request permission there. The same rule applies to every other
device or data permission.

## Task-entry contract

Every selectable entry must:

- start with a concrete verb;
- name the object or decision;
- open a task the user can begin now;
- have one owning capability;
- name the event or state that constitutes first value;
- land on the native result;
- declare any permission, connection, role, device, or entitlement needed before that result;
- remain skippable unless the user explicitly invoked an operation that cannot proceed without it.

Provisional mappings:

| Starting task | Owning capability | Minimum meaningful outcome | Enablement boundary |
| --- | --- | --- | --- |
| Add a to-do | To-dos | A durable Activity appears in the normal inventory | None for basic capture |
| Plan what I'll do today | Plan | The user has chosen or placed at least one real Activity for today | Calendar only if exporting or placing externally |
| Start a goal | Goals and Arcs | A concrete Goal and its identity Arc are created and visible together | AI use is explained; no unrelated device permission |
| Review my recent spending | Money | The native Summary shows trustworthy transaction-backed information | Account connection at the moment real data is requested |
| Choose which apps my child can use | Screen Time | The correct child/device policy is selected, applied, and acknowledged | Role, Family Controls, and device authorization in context |
| Start a game | Games | A playable local or joined game state exists | Network or participation setup only when required |
| Save a story or memory | Stories and Memories | A durable piece of content is saved and reopenable | Photos or microphone only after the corresponding action |

These are product-contract examples, not final launch copy. Before a task appears in the chooser,
its owning capability must prove that the described path and outcome really exist.

## Capability delta

### Today, the user cannot

- enter unified Kwilt through a non-Goals task without first completing Goals-shaped onboarding;
- understand why a specific capability is being suggested without learning the capability menu;
- resume a partially configured capability through a shared, truthful continuation rule;
- distinguish global Kwilt entry from capability activation;
- receive permission education only at the task that needs the permission;
- move from an invitation or migrated record directly into the correct native first-value path.

### After this concept ships, the user can

- enter through the exact task they invoked or choose one concrete starting task in Agent;
- reach a real first result in the owning capability;
- leave and safely resume incomplete activation;
- decline a permission or setup step and continue using the rest of Kwilt;
- use **Look around Kwilt** without completing a setup quiz;
- use the Agent composer only when their need does not fit a clear task entry;
- return later to the native capability state without replaying global onboarding.

### Still intentionally not possible

- Kwilt cannot infer identity, family situation, or sensitive intent from passive behavior.
- A capability cannot activate itself or access another capability's data because it seems relevant.
- The Agent cannot claim setup or first value without an authoritative capability result.
- The shell cannot display completion percentages, setup badges, or adoption pressure.
- Cross-capability recommendations cannot appear merely to promote breadth.
- Ordinary personal entry cannot create an empty Household or sharing structure.

## Reductive design pass

### Smallest elegant version

The minimum coherent product is:

1. a deterministic entry resolver;
2. one Agent-hosted task-choice state for unscoped arrivals;
3. capability-owned activation paths;
4. minimal resume and first-value state;
5. one shared rule that prevents competing education and permission surfaces.

It is not a new onboarding hub, setup center, or capability marketplace. Agent is the host, but
the first state is a deterministic task launcher, not an empty conversation and not an AI-generated
answer.

### Existing behavior to preserve

- Account restoration and new-versus-returning-user detection.
- The launch screen as a brief brand transition.
- Option G as the real global capability map.
- Goal+Arc creation as the Goals capability's meaningful first-value flow.
- Exact deep-link and Chat return destinations.
- Capability-native inventory, detail, settings, and receipt surfaces.
- Existing contextual education that already appears at a relevant action, once it participates in
  the shared attention rule.

### Existing behavior to replace or reclassify

- The global **Welcome -> Notifications -> Build your path forward** sequence is replaced by the
  task router for new unscoped users.
- Global notification permission leaves first-run onboarding. The first notification-producing
  task explains and requests it in context.
- Goal+Arc creation is reclassified from global Kwilt completion to Goals activation.
- `hasCompletedFirstTimeOnboarding` can no longer be the semantic owner of every first-use state.
  Existing users need a non-disruptive migration to “globally oriented.”
- The returning-user permissions flow should become capability-specific health or enablement,
  rather than a universal reinstallation ceremony.

### UI and concepts we refuse to add

- No onboarding progress bar spanning capabilities.
- No “Your Kwilt is 30% set up.”
- No checklist of capabilities to activate.
- No permanent onboarding checklist disguised as the Agent home.
- No feature-tour carousel.
- No badges for untouched or dormant capabilities.
- No “recommended for you” capability shelf in V1.
- No global permissions page before value.
- No new user-maintained category describing which type of Kwilt user they are.

### What would make this clutter for Maya

- More than one question before she reaches the selected capability.
- Task choices that describe aspirations instead of actions.
- A task list so long that it reproduces the capability menu.
- Explanations of Kwilt's entire architecture.
- A second success modal after the capability already shows the result.
- An adjacent-capability suggestion during the first-value moment.

## Minimum shared state

V1 needs only enough platform state to route and resume truthfully:

- whether global orientation has been crossed, with a version for safe future migration;
- per capability: never started, in progress, or first value reached;
- an optional validated resume target for in-progress activation;
- the capability-owned first-value event or timestamp;
- runtime attention ownership so two educational or permission surfaces do not compete.

V1 does **not** need:

- introduced, interested, dismissed, active, power-user, or churn-risk classifications;
- a universal configuration-completeness score;
- a persisted queue of promotional prompts;
- behavioral propensity or next-best-capability models;
- a global copy of capability-specific connection, device, or policy health.

Capability configuration remains owned by the capability. The shared layer knows only what it must
know to route, resume, and avoid lying.

## Activation path

### Unscoped new user

```text
authenticate
  -> resolve only true global prerequisites
    -> Agent: What do you want to do first?
      -> tap a concrete task or describe something else
        -> native capability activation
          -> request only required enablement
            -> create/show real first value
              -> stay on native result or return an authoritative receipt to Agent
```

### Explicit or invited user

```text
tap invite/deep link/shortcut
  -> authenticate or restore if needed
    -> resolve only true global prerequisites
      -> native capability review/action surface
        -> capability-owned confirmation and enablement
          -> real result
```

### Returning or interrupted user

```text
restore account
  -> exact prior value when healthy
  -> or one task-specific resume offer when incomplete
  -> or normal shell when neither applies
```

### Ambiguous need

```text
Agent composer
  -> bounded interpretation
    -> explicit task recommendation
      -> native capability path and authoritative result
```

## Education and attention policy

- Teach the task in the capability where the relevant control and result are visible.
- Show at most one educational, permission, celebration, paywall, or expansion surface at a time.
- A first-value result outranks celebration; the native result should usually be sufficient.
- Permission rationale appears immediately before the action that needs it.
- The task router itself does not invoke a model, request device permission, or initialize every
  capability.
- Declining permission suppresses repeated pressure and leaves a truthful capability-local recovery
  path.
- The first learning release will not show post-value cross-capability recommendations. Expansion
  should be learned separately after basic routing proves itself.

## Accepted trade-offs

- Kwilt must author and maintain a small task-to-capability contract.
- Some users will still choose **Look around Kwilt**, so capability empty states must remain strong.
- A broad or unusual need may require Agent interpretation before a native route is clear.
- Minimal shared activation state adds platform work before every capability can fully participate.
- Existing onboarding flags cannot all be migrated at once; capability-specific cleanup will be
  incremental.
- Agent becomes a more consequential availability and accessibility surface, although deterministic
  task entries and exact routes remain usable when inference is unavailable.

## Rejected trade-offs

- We will not make conversation mandatory merely because Agent hosts unscoped entry.
- We will not send explicit deep links, invitations, object links, or safe resumes through a
  redundant Agent interstitial.
- We will not display the full capability catalog as the first assignment.
- We will not preserve Goals as universal onboarding for implementation convenience.
- We will not use behavioral inference to remove one explicit choice.
- We will not ask every capability to share one visual onboarding template.
- We will not trade privacy or calm for faster breadth adoption.

## Stated bet

We're betting that Agent can feel like Kwilt's coherent front door when it begins with concrete,
one-tap tasks rather than an empty prompt, and that one real capability-owned result will create
better comprehension and trust than a global tour or a bundle of speculative permissions.

If that is not true—if users complete the task but cannot understand where they are, how to return,
or what Kwilt is—we will revisit with stronger shell orientation and native capability landmarks,
not by restoring a long universal tour or making conversation mandatory.

## Success signal

The concept is working when:

- an unscoped new user can choose a concrete task in Agent without composing a prompt or asking
  what the capability labels mean;
- the same task can be started when model inference is unavailable;
- an explicitly routed user reaches the expected native surface without redundant global steps;
- the selected capability produces its declared first-value result;
- permission denial does not block unrelated Kwilt use;
- the user can later return to the capability through the shell or exact resume path;
- no global onboarding prompt competes with capability education or value;
- the user can explain Kwilt as “the place where I did this task” before needing to understand the
  rest of the system.

## Convergence recommendation

Proceed with **Agent-Hosted Context-First Task Routing** as the product model. The learning release
should test the unscoped Agent task-choice path plus at least one explicit route that bypasses it,
using two capabilities with materially different activation and approval shapes. It should not
attempt full catalog coverage or request any permission merely to demonstrate onboarding.
