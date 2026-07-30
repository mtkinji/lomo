# Diverge: Where And How The Companion Lives

> **Placement correction after review:** Kwilt has Chat and capabilities, not a routed Home. Alternatives and recommendations below that depend on Home/Today are superseded. The surviving direction is a dedicated Pet capability, with Chat as a contextual entry and explanation surface.

## Question

The ecosystem metaphor is premature until the interaction contract is clear. Where does Charlie encounter the companion, what can Charlie do with it, and why would Charlie return?

## Axis of variation

Primary interaction placement: **daily re-entry**, **action-time response**, **intentional visit**, or **outside-the-app glance**.

## Alternative A: The Home Window

The companion lives in a small, quiet scene on Home/Today. It replaces or becomes the visual expression of the existing generic Today focus area rather than adding another dashboard card. Charlie sees the companion while deciding what matters today. Tapping the scene opens a larger bottom sheet or full-screen view with one observation and one optional action. Completing a care-related Activity causes a small visible change the next time Home appears.

- Audience/persona fit: strong for a teen who opens Kwilt briefly and should not need to learn a separate game loop.
- Design-challenge answer: makes care visible in the place where daily intention already lives.
- System fit: high. Enhances Home/Today and reuses Activities, Goals, and Arcs. It should not create a new tab.
- Four-object stance: the scene is a presentation of Activity evidence in an Arc/Goal context, never a fifth planning object.
- Capture-first stance: capture remains available without interacting with the companion.
- Best when: the companion's purpose is orientation and emotional warmth.
- Fails when: the scene consumes too much Home attention or becomes another status panel.
- Environment implication: a shallow diorama or window is enough; a navigable ecosystem is unnecessary.
- Anti-pattern check: passes if there are no meters, streaks, demands, or dashboard labels.

## Alternative B: The Responsive Companion

There is no place to visit. The companion appears briefly at meaningful moments already present in Kwilt: after completing a self-care Activity, during a gentle return after drift, or alongside a Chapter observation. A small set of poses, objects, backgrounds, and one-line observations creates continuity. Charlie interacts by completing real actions, tapping the companion once, or choosing between two simple responses when a discovery invites reflection.

- Audience/persona fit: strongest for older teens who may like a character but reject a virtual-pet game.
- Design-challenge answer: adds an immediate emotional consequence exactly where the healthy action is recorded.
- System fit: high. Reuses completion feedback, Home, and Chapters without a new persistent surface.
- Four-object stance: the companion interprets existing objects but owns no tasks, goals, or progress state beyond cosmetic continuity.
- Capture-first stance: unchanged.
- Best when: Kwilt wants the motivational effect with the smallest product and art footprint.
- Fails when: brief appearances are too sparse to create attachment or a sense of continuity.
- Environment implication: backgrounds can suggest locations, but there is no coherent world users maintain.
- Anti-pattern check: passes if it does not interrupt completion, over-celebrate, or pretend to feel.

## Alternative C: The Private Habitat

The companion has a dedicated private place reached from a small Home affordance or the capability drawer. Charlie visits intentionally to see what changed, interact with the creature, arrange a few discovered objects, or choose where it explores next. Normal Kwilt actions supply the changes, but the habitat becomes a distinct leisure surface.

- Audience/persona fit: strongest for younger users and teens who actively want a pet game.
- Design-challenge answer: provides the richest ownership, attachment, and visible accumulation.
- System fit: medium to low. Adds a new route, persistent cosmetic state, discovery rules, and a competing reason to open Kwilt.
- Four-object stance: risks becoming a fifth product system unless habitat state remains strictly presentational.
- Capture-first stance: can remain intact, but the habitat may create a parallel engagement loop.
- Best when: users demonstrate that visiting and caring about the creature is itself valuable.
- Fails when: it feels childish, empty, expensive to refresh, or evolves into shops, currencies, collecting, and admin.
- Environment implication: this is the option that truly needs a coherent ecosystem.
- Anti-pattern check: currently at risk; it needs hard exclusions for currency, scarcity, daily demands, pet suffering, and optimization.

## Alternative D: The Pocket Glance

The companion primarily lives in an iOS Home Screen or Lock Screen widget. Its posture, object, or small scene changes based on recent care. Tapping it opens Kwilt to one relevant action or a lightweight companion view. In-app appearances are secondary.

- Audience/persona fit: strong for phone-owning teens because the companion can be present without requiring another app-opening ritual.
- Design-challenge answer: makes healthy patterns ambient in the same environment as distracting apps.
- System fit: medium. Kwilt already has widget education and Today deep links, but native widget timelines and interaction constraints raise implementation cost.
- Four-object stance: the widget presents existing Activity/Arc evidence and deep-links into canonical Kwilt surfaces.
- Capture-first stance: unchanged.
- Best when: glanceability and intention-before-impulse are the leading jobs.
- Fails when: widget adoption is low or platform constraints make the creature feel inert.
- Environment implication: only a tiny scene is possible; the ecosystem would be mostly implied.
- Anti-pattern check: passes if it remains calm and never uses guilt notifications or streak-loss warnings.

## Superseded provisional recommendation

Start with **The Home Window plus Responsive Companion moments**. This is not yet full convergence; it is the smallest coherent interaction hypothesis:

1. **Notice:** Charlie encounters the companion in the existing Home/Today re-entry surface.
2. **Act:** Charlie does or records an ordinary self-care Activity through normal Kwilt flows.
3. **Response:** the companion or its small scene changes immediately and briefly.
4. **Visit:** Charlie may tap the Home window to see one larger still scene or tiny discovery, but there is nothing to manage.

The first learning release does not need a navigable ecosystem, dedicated tab, decoration mode, store, inventory, or parent-facing state. It needs only enough environment to make the companion feel situated and changing. A real habitat should be earned by evidence that users want to visit, not assumed because the metaphor sounds rich.

## Cross-cutting synthesis: capability owner, distributed presence

"The companion is its own capability" and "the companion appears in Chat" answer different questions and can be combined.

The **Companion capability** should own:

- companion identity and chosen name;
- visual/cosmetic state and the small amount of habitat state;
- deterministic rules that translate authorized Kwilt evidence into reactions or discoveries;
- teen opt-in, privacy, family-sharing boundaries, lifecycle, export, and deletion;
- its native visit/open surface and structured presentation model.

It should not own Activities, Goals, Arcs, Chapters, Screen Time rules, or family authority. Those capabilities remain authoritative and may provide bounded evidence after a real action or receipt.

**Chat** can then become one presentation and interaction channel:

- “How is my companion?” reads the capability-owned state and renders a compact visual card.
- After a real Activity completion, Chat may render the capability-owned response: “Your walk opened a path beside the water.”
- “Show me its world” performs a native handoff to the exact companion surface.
- A reflection may offer one bounded choice that the capability records, such as which place the companion explores next.

The companion should **appear in Chat but not become the chatbot**. It may be expressive and visually present, but it should not pretend to be sentient, claim emotional dependence, privately author advice, or send guilt messages. Kwilt remains the speaker; the companion is a capability-owned visual response.

The capability also does not need a permanent global-menu entry in the learning release. It can register as a real capability while remaining a Home- and Chat-reached preview surface. A top-level menu destination should be earned only if users intentionally return to visit it.

## Review resolution

The learning release treats Pet as a real, user-visible capability that appears in the capability menu only after **Settings > Labs > Pet** is enabled. Pet owns the persistent creature and its visit surface. Chat may surface a typed Pet event and hand the user into the capability, but Pet does not appear repeatedly as a timeline character. Home-based alternatives are rejected because they do not match Kwilt's actual navigation model.
