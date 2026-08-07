# Converge: A Cooperative Story Adventure

## Chosen direction

Evolve Story Relay into a cooperative AI-guided adventure built around **Race The Trouble**: the family shares one fictional Goal and one Promise, every person makes independent commitments, and the group must complete three changing set pieces while Trouble rises.

The game is not trying to reveal facts about family members or label their personalities. It helps them know one another through action: who takes a risk, who protects someone else, who finds an unexpected solution, and what the group decides is worth saving.

## Alternative assessment

| Alternative | Togetherness | Clear stakes | Every player matters | Easy family start | System fit | Primary risk |
| --- | --- | --- | --- | --- | --- | --- |
| Race The Trouble | Strong | Strong | Strong | Strong | Medium | Repetitive luck loop |
| Secret Hearts | Medium | Medium | Strong | Weak | Weak | Conflict feels personal |
| The Last Few Things | Strong | Strong | Medium | Medium | Medium | One player quarterbacks |
| Steal The Scene | Medium | Medium | Medium | Strong | Strong | Players feel judged |

Race The Trouble best serves `jtbd-help-us-enjoy-being-together` because success is collective, danger creates shared emotional energy, and assistance is mechanically valuable. It also gives AI a bounded role: respond to the group and animate the world without becoming an invisible judge.

## The game contract

### Objective

Every adventure begins with one sentence the whole group can repeat:

> Bring the lost star home before the shadow reaches the village.

The objective changes with the generated adventure, but its structure does not.

### The actual game in one paragraph

Story Relay becomes a 15–25 minute cooperative adventure. The group chooses one thing it vows to protect, receives simple characters, and confronts three mechanically distinct set pieces. In each scene, one player describes the approach while everyone makes a small independent commitment, then reveals together. The action always changes the world; a bounded complication raises Trouble or creates a cost. Scarce character Powers, Keepsakes, and one pet rescue let the family change consequential moments. The AI returns something the group created as the twist, and the final plan determines whether they achieve the Goal, keep the Promise, both, or neither.

### Dramatic arc

The game has three acts, not an endless sequence of generated prompts:

1. **The promise** — establish the objective, reveal the danger, and give every player one forgiving spotlight turn.
2. **The turn** — the AI brings back a player choice, reveals the real complication, and gives every player one higher-stakes turn.
3. **The finale** — the group combines what remains into one plan and discovers what their choices have earned.

The first act teaches. The second act creates the “oh no” moment. The finale creates the story the group will retell.

### Shared state

- **Goal** states what the group is trying to accomplish.
- **Promise** states what the group refuses to sacrifice.
- **Trouble** shows how close the danger is to changing or defeating the Goal or Promise.
- Completing the three set pieces is progress; there is no second progress meter.
- Goal, Promise, set pieces, and Trouble remain visible on the shared screen throughout play.
- The group wins or loses together. There is no individual score, MVP, leaderboard, or secret traitor.

### Turn loop

1. The AI frames a short situation inside an authored set-piece template in no more than two or three spoken sentences.
2. The spotlight player says what their character attempts.
3. Every player makes a small independent commitment, using a physical reveal in the room or an optional claimed phone.
4. The commitments reveal together and the world exposes one bounded complication.
5. The group accepts the cost or uses one Power, Keepsake, or pet rescue.
6. The scene changes immediately; the AI narrates the consequence briefly and passes the spotlight.

Each set-piece template defines its own two or three legible commitments. The AI supplies fiction and callbacks but never invents the rules or grades the creativity of a player's answer. The exact Trouble pacing and complication distribution must be simulation-tested before implementation.

AI is a bounded story director, not the game engine. The local deterministic engine resolves every rule and can complete an authored adventure without a connection. When connected, AI generates the initial story skeleton, one choice-grounded midpoint twist, and the ending telling; short local templates keep individual turns moving. No AI request may block a turn. See [03-ai-runtime.md](03-ai-runtime.md) for the generation, timeout, privacy, and fallback contract.

### The twist

After everyone has taken one turn, the AI must reuse something the players created rather than inventing unrelated spectacle. A rescued stranger knows the villain. A discarded object returns in the wrong hands. A path the group ignored is now blocked. The twist changes the situation or cost, but never invalidates earlier success.

This is a primary engagement mechanism: players experience that the world listened to them, and the second half cannot be predicted from the opening prompt alone.

### The finale

Filling a track does not abruptly end the game. It determines the conditions of a short shared finale:

- **All prior set pieces completed with room on Trouble:** the group enters with an advantage and can still choose what kind of victory it wants.
- **Trouble fills first:** the group enters a desperate last chance with a forced cost or reduced options.
- **The group reaches the third set piece under pressure:** the available finale options depend on what it preserved and which earlier consequence returned.

Every player contributes one part of the final plan. The group then commits any remaining Powers, Keepsakes, or pet rescue before the last shared reveal. This makes saving a resource feel valuable without allowing one player to solve the ending alone.

The finale has three honest outcomes:

1. **Bright victory** — achieve the objective and protect what the group cared about.
2. **Costly victory** — achieve the objective, but lose or permanently change something inside this story world.
3. **Heroic failure** — fail the stated objective, while choosing one person, place, relationship, or hope to save. The failure becomes canon if the group continues.

The pet can be frightened, separated briefly, or instrumental in the rescue inside the fiction, but is always safe at the close. Failure never damages the durable Pet.

### Character resources

Each character begins with only four story-shaped details:

- **Name** — who they are in this adventure.
- **Trait** — creates identity and shapes the fiction without modifying probability.
- **Power** — one guaranteed dramatic action such as Protect, Discover, Transform, or Connect.
- **Keepsake** — voluntarily sacrifice it to absorb a serious story cost.

These resources create timing decisions without levels, statistics, inventories, or character-sheet administration.

### Working together

Every set piece requires independent commitments from the whole group. Players may discuss the situation, but each person locks their own response before the shared reveal. The combination determines the options and cost. This makes cooperation a real decision while preventing the loudest player from operating every seat.

A player is a story seat, not a device. One casting phone must support the complete local game: in-room players reveal simple numbered or icon choices physically, and the host records them before resolution. Players may optionally claim their existing seat on another phone for private or remote input, without receiving extra abilities or information. See [03-participation-model.md](03-participation-model.md) for the mixed-device flow and system contract.

The spotlight rotates, every Power belongs to its character, and the game directs invitations toward people who have had less influence so far. Relationships can emerge in narration and the recap, but are not a separate first-release rules system.

### The pet companion

The group may bring one pet companion into the first version of an adventure. The pet has:

- A visible name and personality.
- One story reaction that makes scenes feel personal.
- One **Pet to the rescue** intervention that the group decides when to use.

The intervention is equally useful for every pet. Pet age, care history, species, or cosmetic evolution never creates a mechanical advantage. No permanent harm, sadness, hunger, or regression can result from the story.

Multiple simultaneous pets, pet inventories, combat statistics, and story-earned Pet progression remain out of scope until the companion role proves fun.

## How the group gets to know one another

The adventure presents value-shaped dilemmas inside the fiction rather than asking intimate questions:

- Take the shortcut or stop to help someone?
- Trust the strange guide or rely on the group's plan?
- Protect the treasured object or sacrifice it to save another character?
- Spend the last rescue now or risk waiting?

Choices are not interpreted as psychological truths. The ending recalls concrete acts of cooperation: who helped whom, what the group risked, what they protected, and what it cost. This gives the family material to laugh about and remember without the AI profiling anyone.

## Why players should want “again”

Fresh AI prose is not the replay engine. The replay engine is the combination of:

- **Counterfactuals:** “If we had protected the bridge,” “If I had committed differently,” or “We used the pet too early.”
- **Mastery:** the group gets better at anticipating one another, timing Powers, and preserving resources for the finale.
- **Ownership:** character details matter mechanically and the AI returns the group's own ideas as later consequences.
- **Near misses:** the visible tracks make the difference between victory and failure legible before the finale.
- **Different cooperation:** new character abilities and dilemmas create different pairings and plans, even within the same adventure frame.
- **Continuity by choice:** the ending offers one unresolved consequence that can seed the next adventure without requiring a campaign commitment.

The closing screen should answer three questions in under a minute:

1. **What happened?** A concise, spoken ending based on the final outcome.
2. **How did we do it?** Two or three concrete callbacks to player actions and assistance.
3. **What could happen next?** One enticing consequence, with equally prominent choices to **Continue** or **New adventure**.

If players want another round, they may keep their character and choose one sideways change: replace an ability, rename a treasured item, or carry forward a story-world consequence. Characters become more specific, not numerically stronger.

## Capability delta

### Today

Players can take turns adding short text to a deterministic Story Relay, but they cannot pursue a shared objective, make tactical trade-offs, use persistent character identity, respond to an evolving world, or win and lose together.

### After this concept

Players can enter a bounded adventure, understand the danger immediately, make character-shaped decisions, help one another mechanically, and reach a group-authored ending that reflects their choices.

### Still intentionally impossible

- One person defeating, ranking above, or secretly sabotaging the others.
- AI awarding success based on how clever, eloquent, or emotionally revealing an answer sounds.
- Durable numeric power, grinding, streaks, currencies, or stronger pets.
- Open-ended campaigns that demand scheduling or ongoing maintenance.
- Public story history or automatic access based on family relationships.

## Existing product relationship

This should replace the current Story Relay play loop rather than create another adjacent game mode. Story Relay already owns the promise of taking turns to create a story together; the cooperative adventure makes that promise legibly playful and gives AI a specific job.

The first implementation should retain the existing Games shelf, player setup, shared/cast presentation, named turns, and one-phone local path. Optional seat claiming may follow once the physical-reveal loop proves fun. Fully remote rooms and durable campaigns are later extensions, not prerequisites for learning whether the core table loop is fun.

## Reductive design decisions

- One objective, two tracks, and one action decision per turn.
- Four character details, each with an obvious game use.
- One shared pet companion with one intervention.
- Brief generated narration; play should spend more time on people speaking than on people reading.
- No map, character statistics, inventory screen, lore journal, campaign dashboard, classes, leveling, currency, or combat subsystem.
- No separate tutorial. The first forgiving set piece teaches private commitment and shared reveal; later scenes introduce Trouble and character resources contextually.
- No pre-game commitment to save a character. Offer continuity only after the group finishes an adventure worth remembering.

## Activation path

The user encounters the concept in the existing Story Relay shelf position. Setup asks for players and a story flavor, then generates a one-sentence objective and suggested characters. Each player can accept a suggestion immediately or change one detail.

The opening scene is intentionally forgiving and demonstrates the full rhythm within the first minute. The pet invitation appears only when a Pet exists and can be skipped without explanation or disadvantage.

Natural adoption looks like:

- The group begins a second adventure without needing the rules explained again.
- Players refer to their traits, items, relationships, or prior choices aloud.
- Someone changes their commitment after hearing another player's plan or argues playfully about when to use the pet rescue.
- The group retells a consequence after the game.
- Players choose to save a character only after completing an adventure.

## Accepted trade-offs

- Transparent rules constrain some narrative freedom, but make outcomes feel fair.
- A shared victory gives up some dramatic interpersonal conflict, but better protects family togetherness.
- One pet companion is less expressive than everyone bringing a pet, but keeps the shared screen and mechanics comprehensible.
- A self-contained adventure provides less continuity than a campaign, but lets persistence earn demand.

## Rejected trade-offs

- Do not create stronger outcomes for more articulate players in exchange for “AI magic.”
- Do not add hidden individual objectives merely to manufacture tension.
- Do not use real family knowledge to personalize dilemmas without explicit, bounded consent.
- Do not preserve D&D terminology or complexity merely to signal that this is an RPG.

## System implications

Smallest necessary extension:

- A local story-adventure state machine with explicit, replayable rules.
- A capability-owned AI contract that returns bounded scene framing and consequence narration in structured data.
- Character and companion session models separate from the durable Games player profile and Pet source data.
- A deterministic offline fallback adventure so generation failure does not end family play.
- Generation ahead of play with short deadlines and local consequences that win whenever AI is late or invalid.
- Event-level evidence for starts, completed adventures, rematches, commitment patterns, resource usage, and voluntary character saves—without storing generated family dialogue for analytics.

Durable character saving, remote synchronization, and cross-session story memory should not be required by the first learning release.

## Stated bet

We're betting that **a visible cooperative danger track plus scarce character-shaped ways to help will turn shared AI storytelling into a game families can understand, influence, and celebrate together**.

If groups mostly wait for AI narration, forget their character resources, or experience outcomes as random rather than earned, we should simplify toward the human-authored Story Relay core instead of adding campaign depth.

## Success signal

The concept is succeeding when a real group can start without a rules explanation, every player makes at least one consequential independent commitment, the group spends or sacrifices a resource without prompting, and they immediately want either a rematch or to remember something their characters did together.
