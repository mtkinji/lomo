# Mechanics Cohesion Audit

## Verdict

The borrowed mechanics can form one coherent game because they solve different layers of the experience. They become incoherent only if Kwilt copies their visible components instead of assigning each inspiration one job.

| Inspiration | Its one job in Kwilt | What is not imported |
| --- | --- | --- |
| Pandemic | The world applies escalating shared pressure. | Board movement, open optimization puzzle, outbreaks, multiple decks. |
| The Crew | Every player must make an independent commitment for the group to succeed. | Trick-taking, fifty-step campaign, strict no-talking rule. |
| Gloomhaven | Each character owns one scarce, guaranteed power whose timing matters. | Combat, hands of cards, equipment, levels, tactical map. |
| EXIT | Each act poses a distinct authored cooperative problem. | Destructive components, opaque puzzle logic, one-use product. |
| Wildermyth | Earlier character choices return as specific later consequences. | Tactical combat, aging simulation, sprawling campaign. |
| Jackbox | The shared screen stages anticipation and payoff; phones enable private or simultaneous input. | Audience scoring, jokes judged by popularity, constant phone attention. |
| Dungeons & Dragons | Players may describe their action in their own words and own a durable character. | Rulebooks, statistics, classes, GM preparation, AI judgment of eloquence. |

This is a layered design, not a hybrid of seven complete games:

```text
Story authored by people + AI callbacks        Wildermyth / D&D layer
Three changing cooperative set pieces          EXIT layer
Independent simultaneous commitments           The Crew layer
One scarce guaranteed power per character       Gloomhaven layer
One escalating external danger system           Pandemic layer
Shared screen + personal input                  Jackbox layer
```

## Where the earlier proposal was overbuilt

The prior concept accumulated too many parallel sources of meaning:

- Goal and Promise.
- Progress and Trouble tracks.
- Careful and Bold on every turn.
- Dice on every turn.
- Trait, special ability, treasured item, relationship, and pet power.
- Set-piece-specific rules.
- AI twist and persistent consequences.

That would make each choice harder to explain while making none of them deep enough to master. It would feel like several introductory game systems interrupting one another.

## Reduced core

### Shared state

- One **Goal**: what the family is trying to accomplish.
- One **Promise**: what the family refuses to sacrifice.
- One **Trouble** track: the world's escalating pressure.
- Three completed set pieces are the progress indicator; there is no separate Progress meter.

### Character state

- **Name** and **trait** create identity but do not modify probabilities.
- One **Power** creates a guaranteed exceptional action and is exhausted after use.
- One **Keepsake** can be voluntarily sacrificed to absorb a story cost.
- Relationships are described by the story and recap, not a first-release mechanic.
- One optional shared pet has one rescue. It does not belong to a player advantage economy.

### Scene state

Each set piece uses an authored mechanic template. AI supplies names, imagery, callbacks, and consequences inside the template; it does not invent the rules.

1. A short situation appears on the shared screen.
2. The spotlight player describes the intended approach.
3. Every player makes a small independent commitment on their device.
4. The commitments reveal together.
5. The world reveals a bounded complication.
6. The group accepts the cost or spends a Power, Keepsake, or pet rescue.
7. The scene changes and play moves immediately.

The player's action always changes the world. Uncertainty determines the cost and complication, not whether the AI liked the answer.

## Three set-piece families

The first adventure needs three mechanically distinct but structurally compatible set pieces:

### Find a way

Players commit to different approaches such as scout, build, distract, or protect. Coverage creates options; duplicating one approach leaves a vulnerability. This teaches independent contribution without punishing a playful overlap.

### Hold together

Trouble threatens multiple things at once. Players privately decide where to help, then reveal. The group cannot perfectly protect everything, so the Promise becomes meaningful.

### Make the final plan

Each person supplies one part of the plan and decides whether to commit their remaining Power, Keepsake, or pet rescue. The final options are determined by what the group preserved and what earlier choices returned.

Future adventures can use other authored templates, but the learning release does not ask AI to generate new mechanics.

## Engagement engine

The design creates replay desire from five sources:

1. **Coordination surprise** — simultaneous reveals show whether the family anticipated one another.
2. **Resource regret** — the group can identify exactly when it spent or saved the wrong thing.
3. **Narrative ownership** — the twist returns the group's own person, object, phrase, or decision.
4. **Set-piece novelty** — the next adventure recombines a small library of mechanically different challenges.
5. **Sideways continuity** — characters gain a story-specific change or relationship, not higher numbers.

Fresh generated prose is atmosphere and specificity. It is not the replay engine.

## Failure modes and protections

| Failure mode | Protection |
| --- | --- |
| One adult quarterbacks the family | Independent phone commitment before reveal; each player owns their Power. |
| AI monologues while people wait | Two or three sentences maximum; music and visual state carry transitions. |
| Set pieces feel arbitrary | Authored, tested mechanic templates with AI filling only bounded fiction fields. |
| Everyone hoards resources for the finale | Midgame costs that make a timely Power meaningfully better than a saved one. |
| Randomness erases player agency | Player action always changes state; world complications create uncertainty. |
| Persistent players dominate newcomers | Powers are sideways and session-balanced; Pet maturity is cosmetic only. |
| Too much setup | Suggested characters in one tap; Promise chosen from two concrete options. |

## Cohesion test

The mechanic set is coherent if a new player can explain it after one scene:

> We are trying to finish the adventure without breaking our promise. We each choose how to help, reveal together, and decide whether this is the moment to use our special thing.

If the explanation requires mentioning its source games, probability modifiers, relationship rules, inventory, or campaign progression, the design has become a collage again.
