# Learning Release: Pixel Pet Site Prototype

## Concept To Build

A mobile-first interactive site where a person cares for and evolves a Pet using simulated healthy-action receipts, including one contextual Pet → Chat → action → changed-world loop.

The site is a real interaction prototype, not a slide deck. Andrew, Olive, and Charlie should be able to open it on their phones, live with a Pet, accelerate time when needed, and make concrete judgments about attachment, expression, sound, care, and evolution before Pet enters Kwilt.

## Capability Delta

Today, the family cannot:

- interact with a persistent version of the five Pet concepts;
- compare whether the pets feel meaningfully different in motion and sound;
- test whether feeding after a meaningful action feels warm or transactional;
- experience several care days and an evolution without waiting for app integration.
- test whether touching something that could grow can open contextual Chat without a blank prompt or a fragmented Pet experience.

After this release, the family can:

- choose one of five Pets, name it, and select a display accent;
- return to the same Pet on the same browser;
- simulate completing a To-do or Focus session;
- give the resulting daily care moment and see the Pet respond;
- pet the creature and observe idle, greet, eat, sleep, and discovery behavior;
- hear and mute a species-specific nonverbal sound set;
- advance through five care days and see a first evolution;
- reset, switch pets, and replay the loop quickly during critique.
- touch a becoming-tree, choose one bounded path in prototype Chat, complete it, return to Moss, and witness the tree and meadow answer.

Still intentionally not supported:

- production Kwilt accounts, authentication, Activities, streaks, Chat backend, notifications, or capability routing;
- real family data or cross-device synchronization;
- parent visibility, health tracking, Money, or Screen Time connections;
- accessories, stores, currencies, inventory, generated pets, or a navigable ecosystem.

## User Experience

The prototype opens directly into a compact welcome and pet-choice flow. Each option should be visible in motion before selection rather than presented as a static name in a form.

After choosing and naming a Pet, the user enters a phone-shaped pixel display containing the persistent creature and a very small habitat. The main experience contains no dashboard or meters. It shows the Pet, today's care state, and only the interaction that is currently relevant.

The ordinary loop is:

1. The Pet idles, sleeps, explores, or greets the user.
2. A prototype tray lets the tester simulate **Complete a To-do** or **Finish a Focus session**.
3. The first qualifying event for that simulated day makes one care object available.
4. The tester gives it to the Pet and receives a short animation, sound, haptic where available, and tiny environmental response.
5. Additional simulated completions that day acknowledge the action but do not create more food or currency.
6. After five distinct simulated care days, the Pet evolves.

One additional learning path starts in the world itself: touching the becoming-tree opens a full-height prototype of contextual Chat with visible Pet/tree context. The user can choose an existing To-do, a short Focus, or one small next action. Completing the simulated action creates the same bounded source-class receipt, and **Back to Moss** returns to the meadow as the tree gains one persistent stage and Moss notices the change.

A clearly separated **Prototype controls** drawer supports **Advance day**, **Replay state**, **Reset Pet**, **Switch Pet**, **Toggle sound**, and **Toggle reduced motion**. These controls are for learning speed and must not resemble future consumer UI.

## Existing Product Relationship

The site tests the interaction contract intended eventually for **Settings > Labs > Pet** and the Pet capability. It leaves the Kwilt app unchanged.

To-do and Focus actions are simulations of privacy-minimized receipts, not replicas of the full capabilities. Contextual Chat is one interactive, local-only destination used to prove context, choice, completion, and exact return. It creates no production thread and does not redesign the Chat backend.

## Buildable Slice

Must be real:

- responsive, touch-friendly site usable on family phones and desktop;
- all five distinct young Pet silhouettes;
- all five first-evolution forms;
- persistent choice, name, palette, care-day count, and current state in local browser storage;
- shared idle, greet, eat, sleep, discovery, and evolution animation vocabulary;
- distinct sound character for each type using the same semantic sound events;
- one-care-moment-per-simulated-day rule;
- missed-day behavior that never harms, degrades, or scolds the Pet;
- accelerated-time, replay, reset, and pet-switching controls;
- reduced-motion and mute behavior;
- a simple local event log or exportable test summary that contains no name text.
- one tappable becoming-tree with persistent bounded growth stages;
- one ephemeral contextual Chat draft with visible Pet/tree context, three bounded paths, simulated completion, and exact return.

Can be thin or temporary:

- local-only persistence rather than accounts or a backend;
- hand-authored discoveries from a very small shared set;
- simulated To-do and Focus receipts;
- prototype-only debug controls;
- a single habitat composition with palette and object changes;
- manual family observation instead of production analytics.

Intentionally excluded:

- Kwilt repository integration or shared production components;
- production navigation, Chat backend, notifications, identity, sync, or database work;
- PWA installation requirements;
- public onboarding or marketing copy;
- three-stage or branching evolution;
- a decoration editor, inventory, shop, currency, rarity, or reward schedule.

## Release Channel

Use a separately deployed, link-accessible prototype site. It should be easy to open on iPhone and desktop without installing a build, and isolated from the Kwilt app so iteration can happen without app releases or migrations.

Start with Andrew, Olive, and Charlie. Share more broadly only after the prototype feels intentional and the family agrees the Pet is understandable, appealing, and non-manipulative.

## Brand-Goodwill Guardrails

- Label prototype controls as testing tools, not product features.
- Use finished-enough pixel art, motion, and sound for emotional judgments to be meaningful.
- Never show hunger loss, illness, sadness, decay, streak failure, or “I miss you” language.
- Do not imply that simulated actions came from Kwilt.
- Do not collect names, task content, age, mood, health, financial, or family data.
- Make mute, reduced motion, reset, and erase-local-data controls obvious.
- Keep the experience private by possession of the prototype link; do not index or promote it as a shipped Kwilt feature.

## Reversibility

The prototype has no production data model, migration, account dependency, notification entitlement, or app route. It can be revised or removed by replacing or taking down the site. Browser state can be erased locally. Production-shaped concepts should be documented, but prototype-only state and controls should not be copied into the app by default.

## Permanent Product Threshold

Move Pet toward a Kwilt Labs capability only if the site demonstrates that:

- people form a preference among the five Pets and describe one as “mine”;
- the care response feels connected to showing up rather than payment for tasks;
- the nonverbal expression is understandable and charming;
- sound strengthens attachment without becoming irritating;
- return after a missed day feels safe;
- first evolution creates genuine anticipation or delight;
- the contextual Chat handoff makes the next action easier to choose and the return to Pet feels causally rewarding rather than transactional;
- the concept remains interesting after the first guided play session.
