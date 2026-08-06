# Diverge: Turning Shared Story Worlds Into A Game

## Design challenge

How might we help Maya's family enter a surprising shared adventure where every person changes what happens, while preserving the effortless start, shared-screen energy, and human authorship of a couch game?

## What makes this a game

Every alternative must provide the group with:

- A concrete objective they can repeat in one sentence.
- A visible source of pressure that can defeat or complicate them.
- A finite number of rounds or scenes.
- Decisions with knowable trade-offs rather than arbitrary AI judgment.
- Scarce abilities, items, or opportunities that make timing matter.
- A consequential role for every player.
- A resolved ending that reflects what the players did, including partial victories and memorable failures.

The AI may frame situations, embody the world, remember choices, and narrate consequences. It must not secretly decide whether an action succeeds because it liked the prose.

## Axis of variation

The alternatives vary primarily by **where the stakes come from**:

1. An external threat the group must overcome together.
2. Tension between shared success and private character desires.
3. Scarce resources and tactical role coordination.
4. Social performance and the group's judgment of what improves the story.

## Alternative 1: Race The Trouble

The group enters a self-contained adventure with one objective and two visible tracks: **Progress** and **Trouble**. For example: “Return the stolen moon before Trouble reaches six.” On each short turn, the AI presents a situation; the active player chooses a safe or daring approach and says what their character does. A transparent die, card, or fixed risk rule determines the result. Traits create an advantage in a fitting situation, abilities can be used once, treasured items may be risked or sacrificed, and another character may help through a relationship. The group wins by filling Progress first, but the final story remembers the cost.

The pet can join as a companion with one clearly limited intervention—for example, finding a clue, absorbing one Trouble, or allowing a reroll. Its presence changes the fiction and creates affection, but does not make a long-cared-for pet mechanically stronger than a new one.

- Audience/persona fit: Strong for Maya's mixed-attention couch group because everyone understands a race and the group wins or loses together.
- Design-challenge answer: AI makes each action feel specific to the characters while the visible tracks and resolution rule make the experience legibly fair.
- Smallest system extension: Add a story session model containing objective, round, Progress, Trouble, per-character resources, and a capability-owned AI prompt/result contract.
- Best when: Players want a fast cooperative adventure with suspense, cheering, and a clear ending in roughly 20–30 minutes.
- Fails when: Success becomes a repetitive sequence of rolls or the AI narration is long enough to drain urgency.
- Primer anti-pattern check: Pass if progression is session-scoped and narration stays brief; failure if it becomes global levels, grinding, streaks, or an AI monologue.

## Alternative 2: Secret Hearts

Every character shares the public mission but also receives a private desire: protect the rival, recover the crown intact, learn who betrayed the village, or prove that magic is real. Players make public choices without necessarily revealing what else they want. At the end, the group learns which desires were fulfilled and how those choices changed the shared victory. Nobody is secretly assigned to ruin the game; the tension comes from competing values rather than a hidden traitor.

A pet companion can have a visible instinct such as “follows music” or “protects lost things.” Players know it may complicate a scene, and someone can spend their turn guiding or trusting it. The pet creates delightful uncertainty without acting as an unknowable AI agent.

- Audience/persona fit: Potentially strong for families who enjoy role-play, surprise reveals, and arguing playfully about what matters.
- Design-challenge answer: Relationships and defining traits become sources of meaningful disagreement, giving players authorship beyond choosing the tactically correct move.
- Smallest system extension: Add private per-player goals, personal-device reveal, and an ending evaluator based on explicit completed conditions.
- Best when: The group is comfortable keeping playful secrets and wants funny or poignant post-game revelations.
- Fails when: Younger players cannot understand private motives, someone interprets conflict personally, or one motive rewards sabotaging everyone else's fun.
- Primer anti-pattern check: Pass only with family-safe, non-punitive motives and private-room boundaries; failure if the design encourages betrayal, manipulation, or profiles real relationships.

## Alternative 3: The Last Few Things

The adventure begins with a shared objective and a small visible kit: perhaps three Courage, two Time, and one Way Home. Each character contributes one distinct ability and one treasured item. Situations do not ask players to roll first; they ask the group what resource they are willing to spend, risk, combine, or leave behind. A reliable path consumes something. A risky path preserves resources but may advance the threat. Victory is possible only through coordination, and the ending explicitly shows what the group saved and what it sacrificed.

The pet occupies one shared companion slot and provides a choice rather than a passive bonus: send it ahead and expose it to temporary story trouble, or keep it close and lose the shortcut. Nothing permanent or distressing happens to the real Pixel Pet; the adventure state resets safely after the story.

- Audience/persona fit: Strong for thoughtful groups who like planning together and remembering dramatic sacrifices more than dice luck.
- Design-challenge answer: The AI can produce varied narrative situations, but players create the stakes by choosing what they are prepared to give up.
- Smallest system extension: Add a shared inventory/resource model, explicit option costs, and deterministic consequence templates.
- Best when: The group enjoys negotiation, clever combinations, and a more strategic experience.
- Fails when: One confident player quarterbacks every decision or the resource vocabulary feels like a board-game dashboard.
- Primer anti-pattern check: Pass if the shared kit stays tiny and story-shaped; failure if it expands into currencies, stats, inventories, or optimization chores.

## Alternative 4: Steal The Scene

The group is trying to create a great episode rather than defeat a fictional enemy. Each scene gives the active player a constraint—make the danger worse, reveal a secret, use another character's treasured item, or bring back an earlier detail—and a short timer. When the contribution lands, the other players award a limited set of tokens such as **Surprise**, **Heart**, or **Callback**. The group must collectively earn a mix of all three before the finale. AI stitches the accepted contributions together, raises the next prompt, and prevents the story from stalling.

The pet joins as an unpredictable prompt generator: once per episode it introduces a visual reaction, found object, or complication the active player must incorporate. It is a source of improvisational play rather than an RPG combat unit.

- Audience/persona fit: Strong for expressive, joke-friendly groups already attracted to Story Relay and weak for groups uncomfortable performing.
- Design-challenge answer: It preserves human authorship most strongly and gives Story Relay an actual score, time pressure, and shared target.
- Smallest system extension: Enhance Story Relay with timed scene prompts, limited peer-awarded tokens, callbacks, and concise AI transitions.
- Best when: The pleasure comes from making one another laugh, surprise one another, and build on shared details.
- Fails when: Voting becomes popularity scoring, quieter players feel judged, or players optimize for tokens instead of listening.
- Primer anti-pattern check: Pass if tokens score the shared episode rather than rank people; failure if it creates leaderboards, performance profiles, or social comparison.

## What the alternatives reveal

- **Race The Trouble** produces the clearest universal game feeling: pressure, risk, cheering, a team result, and a reason to use an ability now instead of later.
- **Secret Hearts** produces the richest character drama, but it asks the most emotional maturity from the group.
- **The Last Few Things** produces the most meaningful tactical decisions, but it is vulnerable to one player taking over.
- **Steal The Scene** is the closest evolution of Story Relay and the cheapest learning path, but its stakes live outside the fiction and may feel like being judged at improv.

A promising eventual design could combine the external objective from **Race The Trouble** with one light, non-sabotaging character desire from **Secret Hearts**. That combination should not be assumed yet: the first question is whether the game needs primarily cooperative danger, interpersonal dramatic tension, tactical scarcity, or social performance to make the room come alive.
