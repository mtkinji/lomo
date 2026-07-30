# Converge: Five Pixel Pets, One Care Loop

## Chosen direction

Build the first Pet experiment around five hand-authored pixel pet types that share one compact animation and behavior system. A user chooses a type, names their individual Pet, and visits it in a dedicated Labs-enabled capability. Meaningful actions in Kwilt create care moments for the Pet; they do not keep it alive.

The defining sentence is:

> **The streak does not keep the Pet alive. It makes one daily care moment available.**

This keeps the emotional reward while removing starvation, sickness, decay, and streak-loss guilt.

## The five first-generation pets

| Working name | Silhouette | Character | Pixel and sound identity |
| --- | --- | --- | --- |
| **Leafling** | Leaf-eared woodland quadruped | Curious and grounded | Moss accent; soft rustle, wooden tick, tiny trill |
| **Ripplefin** | Round pond creature with side frills and paddle tail | Playful and easygoing | Violet-blue accent; bubble pop, water plink, soft burble |
| **Glowmoth** | Small moth with lantern-like wings and antennae | Gentle and observant | Amber accent; wing flutter, glassy chime, warm hum |
| **Pebbleback** | Sturdy shell-backed creature | Patient and dependable | Clay accent; stone tap, low purr, shell shuffle |
| **Cloudwing** | Bird-like creature with cloud feathers and a wind tail | Brave and buoyant | Sky accent; airy chirp, feather flick, rising whistle |

These are different identities, not different game classes. No pet earns faster, unlocks more, or favors a particular capability. Choice is about affection and self-expression.

## First-release uniqueness

The initial system should create ownership without requiring a large content catalog:

1. Choose one of five pet types.
2. Name the individual Pet.
3. Choose one of three display accent palettes.
4. Accumulate a small, personal history of discoveries generated from real Kwilt events.
5. Reach one visible evolution after five distinct care days.

The first release deliberately excludes accessories, a shop, currency, rarity, breeding, trading, and an inventory-management screen. Those systems would test collection mechanics rather than whether a Pet makes healthy follow-through feel warmer.

## The care loop

```text
Choose something meaningful in Kwilt
        ↓
Complete a real To-do/step or Focus session
        ↓
Existing daily show-up logic records the day once
        ↓
One care moment becomes available in Pet
        ↓
Visit, give the meal, see and hear the response
        ↓
Pet rests, explores, or reveals a tiny discovery
        ↓
Five care days produce the first evolution
```

The Pet consumes a privacy-minimized receipt that a qualifying action occurred. It does not need the To-do title, Focus subject, private reflection, money details, mood, or Screen Time history.

### What qualifies

- The first completed To-do or step that advances the existing daily show-up streak.
- A completed Focus session that advances the same daily show-up streak.
- Only one care day is earned per calendar day, even if the user completes many actions.

Later completions may trigger a tiny acknowledgment when the user next visits, but they do not produce repeat food, currency, or grindable rewards.

### What does not qualify

- Opening the app or Pet capability.
- Tapping a notification.
- Time spent in the app.
- Creating trivial or duplicate tasks without completing meaningful work.
- Spending money, accepting Screen Time limits, disclosing a mood, or sharing private information.

Money and Screen Time are intentionally excluded from the first Pet release. Gamifying either would create pressure in sensitive domains and muddy the learning question.

## Pet capability interaction

The capability is a small pixel display, not a management dashboard. It can support:

- **Visit:** see the persistent Pet in its current pose and tiny habitat.
- **Pet:** tap or swipe once for a short nonverbal reaction.
- **Care:** when today's meal is ready, tap or drag it to the bowl; the Pet eats and responds.
- **Discover:** after some Focus completions, the Pet returns with one small found object or scene change.
- **Choose:** occasionally choose between two harmless directions such as rest, explore, or play. This changes presentation, not productivity outcomes.
- **Remember:** see one recent plain-language receipt, such as “Found after a Focus session,” without a history dashboard or score.

The Pet does not have a constantly draining hunger meter. “Ready for a care moment” is an opportunity state, not an unmet need.

## Voice decision

The Pet does **not** speak, write messages, or impersonate an AI companion in the first release. It behaves more like a real animal:

- posture, movement, sleep, curiosity, and play;
- small expressive symbols such as a sparkle, note, question mark, or heart;
- short species-specific chirps, rustles, purrs, and environmental sounds.

Kwilt Chat remains the speaker. Chat can say, “Glowmoth brought something back from your Focus session,” explain what state means, offer **Visit Pet**, or quiet future Pet updates. Chat must never claim that the Pet is lonely, hungry, disappointed, or emotionally dependent on the user.

This split creates warmth without confusing a designed feedback system with a sentient relationship.

## Sound and motion

Each type gets the same small semantic sound set with a distinct timbre:

- greeting;
- eating/contentment;
- curiosity/discovery;
- sleep;
- evolution.

Sounds are short, nonverbal, optional, and controlled by a Pet sound setting. Visual symbols and semantic haptics carry the same meaning when muted. Decorative motion respects Reduce Motion. The pixel production budget is intentionally bounded to reusable loops: idle, greet, eat, sleep, discover, and evolve. Most loops can be two to four frames with position, scale, blink, and particle effects supplied by code rather than bespoke character animation.

## Evolution decision

The concept can eventually support three Pokémon-like life stages, but the learning release should ship only two per pet:

- **Young form:** chosen at setup.
- **First evolution:** unlocked after five distinct care days, never reset by missing a day.

That requires ten core pet designs rather than an unbounded animation catalog and answers the key question quickly: does visible growth strengthen attachment? Mature forms, branching paths, and generative milestone portraits remain later hypotheses. If branches are introduced, the user chooses them explicitly; Kwilt should not infer a personality from private behavior.

## Placement and notification contract

- The first proof is a standalone, mobile-first site prototype with simulated To-do and Focus receipts. It does not connect to production Kwilt data.
- The site exposes accelerated-time and reset controls so the family can test several care days and evolution in one sitting.
- Only after the prototype demonstrates attachment and a legible care loop does the concept move toward app integration.
- **Settings > Labs > Pet** is off by default.
- Enabling it opens pet choice and naming, then adds **Pet** to the capability menu.
- Turning Labs off hides the capability but preserves the Pet. Reset and delete are separate explicit actions.
- Pet itself owns identity, state, care days, evolution, sounds, and display presentation.
- To-dos and Focus remain authoritative for action completion.
- Chat may read a typed Pet event and hand off to Pet; it does not own or duplicate Pet state.

The first release should not send hunger, streak, sadness, or “your pet misses you” notifications. If testing includes one optional Pet notification, it should announce a completed discovery and open contextual Chat, where the user may choose **Visit**, **Later**, or **Quiet Pet updates**.

## Why this option wins

- It matches Kwilt's actual Chat-plus-capabilities navigation.
- A standalone site lets the family iterate on the Pet itself before app navigation, event wiring, or persistence makes changes expensive.
- Pixel art makes a five-pet roster and ten-form evolution set feasible without a character-animation team.
- Shared silhouettes, palettes, sound semantics, and short loops create variety without multiplying system behavior.
- It turns existing meaningful completion into an emotional receipt rather than adding another habit tracker.
- It preserves recovery: the Pet is safe on an off day and happy to see the user return.

## Trade-offs and stated bet

The first release gives up elaborate decoration, freeform generative pets, voiced dialogue, and deep game systems. In exchange, it can test the thing that matters: whether a small creature the user chose makes existing healthy action feel more immediate, personal, and worth repeating.

The bet is that **choice + naming + one daily care response + a reachable evolution** is enough to create attachment. If that is false, more art will not rescue the concept.
