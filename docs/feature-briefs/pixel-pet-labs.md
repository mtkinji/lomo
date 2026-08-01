---
id: brief-pixel-pet-labs
title: Pixel Pet Labs
status: draft
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves: [jtbd-carry-intentions-into-action, jtbd-put-intention-before-impulse, jtbd-see-who-im-becoming, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-chores-as-recurring-activities]
owner: andrew
last_updated: 2026-07-31
---

# Pixel Pet Labs

## Context

Kwilt already records meaningful follow-through through To-do, step, and Focus-session completion, and it already recognizes a daily show-up streak. The missing piece is an immediate, warm consequence that can help a teen or family member feel that ordinary care changed something without adding another tracker. A deliberately small pixel Pet can test that motivational role without requiring a large illustration or character-animation team.

## Target audience

`audience-aspirational-family-organizers` wants family members to participate in healthy patterns without turning home life into a productivity system. The first Labs cohort is especially interested in teens and younger family members who have their own phones, while remaining appropriate for adults who simply enjoy the Pet.

## Representative persona

Maya is the canonical representative because she wants Kwilt to be something her family willingly returns to rather than another system she administers. Charlie is the provisional teen participant used to pressure-test autonomy, age fit, privacy, and recovery after drift; Charlie should become a canonical persona only after research supports it.

## Aspirational design challenge

How might we help Charlie experience a healthy action as something warm, immediate, and personally meaningful, while helping Maya's family participate without pet suffering, surveillance, a chores economy, or another system to manage?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` is the demand spine because Pet is valuable only if it helps a real intention become follow-through. Pet engagement is not an end in itself.

## Job flow step

`job-flow-maya-move-family-life-forward` scores **Family participation** 2/5 and **Keep using system** 3/5. Kwilt can already capture and complete work, but it has limited emotionally engaging feedback that could make younger family members want to return. Pet aims to improve willingness to participate while preserving a calm, low-administration system.

## JTBD framing

When I complete one thing that helps life feel better, I want a small creature I chose to respond in a way that feels like mine, so I can carry intention into action and notice who I am becoming without being watched, scored, or punished for missing a day. This serves `jtbd-carry-intentions-into-action`, `jtbd-put-intention-before-impulse`, `jtbd-see-who-im-becoming`, and `jtbd-trust-this-app-with-my-life`.

## Design

### Prototype-first validation

Before Pet changes the Kwilt app, test the concept as a separately deployed, mobile-first site prototype. The site includes a deeply proven Leafling before multiplying species, naming, palette choice, local persistence, simulated To-do and Focus receipts, the one-care-moment-per-day rule, nonverbal sound and motion, accelerated time, and two visible evolutions.

The site does not connect to Kwilt accounts or production data. Prototype controls make it possible to replay reactions, advance days, reset, and switch Pets rapidly. These controls are visibly separated from the intended consumer experience.

Pet graduates toward Labs only after the prototype demonstrates voluntary return, a meaningful sense of ownership, understandable nonverbal expression, a non-transactional care loop, safe recovery after missed days, and demand to connect real Kwilt actions.

### Product role

Pet is an engagement device for Kwilt's existing capabilities, not a parallel habit system. It owns a creature, presentation state, care days, and evolution. To-dos and Focus own real action completion. Chat may explain typed Pet events and hand off into Pet, but it does not own Pet state and the Pet does not recur as a speaking character through the chat timeline.

### Labs and placement

- Pet is off by default under **Settings > Labs > Pet**.
- Enabling Pet starts a choose-and-name flow and adds **Pet** to the capability menu.
- Pet lives persistently in its own capability on a small pixel display.
- Turning the Lab off hides Pet while preserving state. Reset and delete are separate explicit actions.

### Five pet types

- **Leafling:** leaf-eared woodland creature; grounded and curious.
- **Ripplefin:** rounded pond creature; playful and easygoing.
- **Glowmoth:** lantern-winged moth; gentle and observant.
- **Pebbleback:** shell-backed creature; patient and dependable.
- **Cloudwing:** cloud-feathered bird; brave and buoyant.

Type changes appearance and sound character only. Every type has the same care rules and capability access. The user names the individual Pet and chooses one of three accent palettes.

### Healthy-pattern loop

The first meaningful To-do/step or completed Focus session that advances the existing daily show-up streak makes one care moment available. The user can visit Pet and give the meal; the Pet responds with a short visual, sound, and haptic moment, then may rest, explore, or reveal a tiny discovery.

Only one care day is available per calendar day. Additional completions do not create food, points, currency, or grind. App opens, notification taps, session duration, spending, Screen Time compliance, mood disclosure, and private content never qualify.

Care days accumulate and never subtract. A missed day cannot make the Pet hungry, sick, sad, damaged, or less evolved. On return, the Pet is simply resting or ready for the next moment.

### Interaction vocabulary

- Visit the persistent Pet.
- Tap near the Pet for a nonverbal greeting.
- Tap elsewhere on the ground and the Pet walks or runs there while the camera follows.
- Tap high and the Pet jumps toward the touch; swipe across the Pet and it curls up and rolls over.
- Pinch between a full-world view and a temporary close-up. Zoom is camera state, not a saved preference or a consumer-facing control.
- Notice occasional stage-specific wildlife moving through the habitat. Baby notices a crawler at paw height, young follows a meadow firefly, and guardian attempts one high aerial interception of a sky moth. Each encounter predicts one intercept, faces before launch, and ends without capture, collection, or repeated pursuit.
- Tap or drag an available meal to its bowl.
- See one recent source-class receipt without private Activity text.
- Occasionally choose between two cosmetic directions such as rest, explore, or play.
- Grow from baby to young after three distinct care days, then to guardian after eight.

Pet interactions use world coordinates rather than screen coordinates. The habitat is wider than the camera, so the same behavior and state model can travel between iPhone, web, and desktop renderers. The consumer surface has no joystick, zoom buttons, camera settings, meters, inventory, or permanent tutorial furniture; direct manipulation is the interface. Prototype-only controls remain in the separate engine inspector.

### Voice and sound

Pet does not use text, speech, or an AI persona in the first release. It communicates like an expressive animal through posture, small symbols, and short sounds. Each species has greeting, eating/contentment, discovery, sleep, and evolution sounds with its own timbre.

Pet sounds have their own setting. Equivalent visual and semantic-haptic feedback remains when muted, and decorative motion respects Reduce Motion. Kwilt Chat remains the only speaker and must not claim that Pet is lonely, hungry, disappointed, or dependent on the user.

### Evolution and asset boundary

The first Labs version targets baby, young, and guardian forms for each type: fifteen core designs total if the Leafling proof earns a five-species release. Each form preserves species identity while changing its silhouette and body plan. Behaviors use compact authored vocabularies for idle, greet, care, sleep, discover, evolve, walk, run, jump, pounce, and rollover; the Leafling proof gives every form a dedicated eight-drawing clip for each direct-play action. Guardian additionally owns a stage-specific eight-drawing aerial-acrobatics performance—sightline, coil, launch, bank, directional reaching apex, landing, and recovery—so maturity unlocks a new physical idea rather than merely scaling the ordinary jump. Branching evolution, generated milestone portraits, accessories, an inventory, shop, currency, trading, breeding, and cutscenes are deferred.

The engine owns world position, destinations, facing, camera follow, palette, particles, and action selection. Authored drawings own the vertical silhouette, body turn, anticipation, contact, impact, and recovery; the renderer does not lift or rigidly spin an idle sprite to impersonate a jump, pounce, or rollover. This split keeps renderer and behavior work portable without pretending animation craft can be generated entirely by the engine.

Animation follows an anime-inspired limited-motion language rather than uniform interpolation. Each drawing is authored as a hold, key, in-between, accent, or recovery. Small involuntary actions use the smallest participating anatomy channel: a blink moves only the eyelids over a locked body pose. Expressive actions spend additional drawings around changes in direction, contact, and expression, then hold the strongest readable pose. The goal is deliberate 8–12-drawing character acting, not high-frame-rate feature-film smoothness.

The screen should match the character through layered pixel depth, a coherent palette, fine environmental detail, grounded contact, and autonomous life—not by surrounding the Pet with more controls. The Leafling proof uses a versioned, renderer-neutral habitat pack: an authored far panorama, a root-anchored shelter-tree sprite, and a transparent near-meadow layer. Canvas, native, web, and desktop adapters can preserve the same layer order and world coordinates while expressing weather appropriately. Environmental visitors are transient behavior targets, not collectible currency or another progress system.

Weather is behavior, not a wallpaper swap. Wind moves foliage, loose leaves, and the Pet's grounded silhouette. Rain changes light and terrain, then gives the Pet a reason to seek shelter and curl beneath a tree. Sun creates a warm destination in the meadow; after a readable basking hold, the Pet chooses the old tree's shade and curls without exposing heat as a meter or need. The portable world snapshot owns weather, intensity, elapsed time, destinations, and the Pet's response so iPhone, web, and desktop renderers can express the same event with platform-appropriate drawing.

Wildlife makes growth physical rather than merely visual. The portable behavior engine selects a transient visitor by evolution stage: ground crawler for baby, firefly for young, and high sky moth for guardian. Acquisition predicts one directionally stable intercept before starting an authored clip, but the prediction can never pass through the Pet and make it turn away from a visitor that remains visibly on the other side. At commitment, the visitor evades outward on that chosen side instead of crossing behind the Pet during the performance. The encounter ends once, so the Pet never oscillates or attempts an opposite-facing retry. These are living-world moments, not collectibles, prey, combat, or rewards.

Focus together is the first shared ritual. Starting it brings the Pet to the shelter tree and quiets the scene for a short prototype session. Completion creates the same bounded source-class receipt as an ordinary Focus session; it does not add a second streak or parallel task system. A completed family/friend game can likewise create the day's one care moment while causing a playful world response such as breeze and a visitor.

### Chat and notifications

The first family test sends no routine Pet notification. A later optional discovery notification may open contextual Chat with **Visit**, **Later**, and **Quiet Pet updates**. It may celebrate something already earned; it may not announce hunger, sadness, streak loss, or that the Pet misses the user.

### Privacy and ownership

Pet consumes an idempotent event receipt containing only the source class and occurrence time needed to recognize a qualifying action. It does not ingest Activity titles, notes, Focus content, reflections, moods, health data, financial data, or caregiver-visible performance history. Money and Screen Time do not feed Pet in the first release.

### Emotional sequencing

Pet reactions coordinate with existing streak and completion celebrations. Pet should usually wait in its capability rather than adding another interruption at the moment of completion.

## Success signal

The experiment works when participants voluntarily revisit Pet, can explain why their chosen creature feels like theirs, experience the daily care moment as a pleasant receipt rather than an obligation, return without guilt after a missed day, and find the first evolution meaningful. It should improve willingness to complete genuine To-dos or Focus sessions without increasing trivial task creation or requiring reminders.

## Open questions

- Are five choices enough, and do all five attract real preference?
- Do three and eight care moments make both evolutions reachable without making growth feel disposable?
- Does a meal metaphor feel natural, or should the care object vary by pet?
- How much habitat change is needed before the persistent display feels alive?
- Do weather-caused behaviors make the habitat feel like a world rather than a decorated screen?
- Does focusing beside the resting Pet improve attention, or does the animation become distracting?
- Does pinch-to-close-up create affection, or does it mostly interfere with taps?
- How often can stage-specific wildlife visit before its movement becomes distracting or predictable?
- Does the Guardian's bank-and-reach performance make evolution feel like a new capability, and is the held apex still readable with every habitat and palette?
- Does rollover feel like a delightful learned trick, and does it justify a dedicated animation row?
- Do teens prefer sounds by default, or should Pet begin muted?
- Does contextual Chat clarify Pet events without making Pet feel distributed through the timeline?
- Are three linear forms sufficient for lasting attachment, or does evidence justify a later user-chosen branch?
- After playing with the standalone site, do participants ask to connect real Kwilt actions without being prompted?
