# Sensory Experience: Sound And Haptics

## Experience intent

The sensory system should make the phone feel like a living story object while keeping attention on the family. Its character is **warm, handmade, adventurous, and responsive**—not cinematic-trailer bombast, children's television, casino reward audio, or a constant wall of music.

Sound and haptics have four jobs:

1. Confirm a personal action without requiring the player to look down.
2. Stage anticipation before a shared reveal.
3. make Trouble, sacrifice, rescue, and victory feel physically different.
4. Carry the adventure's emotional arc while leaving room for conversation.

Neither channel is authoritative alone. Every meaningful state also has a visual expression. Audio failure or unavailable haptics never blocks play.

## Current system fit

Kwilt already has:

- A persistent Games sound preference and per-table sound override.
- A semantic `HapticsService` with selection, confirmation, success, big-success, warning, and error events.
- `expo-audio` playback, looping music, remote immutable delivery, cache reuse, and fade transitions.
- Mastering categories for game mechanics, signatures, patterns, and music.
- Existing generated dice, success, setback, pattern, coin, and music assets with provenance tracked in `assets/audio/AUDIO_MANIFEST.md`.

The current Story Relay soundtrack is valid learning evidence but not the final identity. Prior family review found it useful yet too close to a childish or news-report sound. The new score needs a more mature, intimate storybook identity.

System extension required:

- A typed semantic story-audio catalog rather than file-specific calls from screens.
- Phase-based adaptive music states and cue ducking.
- A small native Core Haptics bridge for custom synchronized patterns if physical-device testing proves standard haptics insufficient.
- Authored fallback mappings to the existing semantic haptic events on devices without custom haptics.

## Music system

### Musical identity

Use one coherent composition built from compatible layers:

- Felt piano or muted plucked strings for wonder.
- Wood, paper, brushed hand percussion, and soft mallets for handmade motion.
- Warm bass pulse for danger.
- Breath-like pads or bowed texture for the uncanny.
- A short five-note Kwilt story motif that can resolve brightly, ambiguously, or tenderly.

Avoid heroic brass, huge drums, generic fantasy choir, comedy pizzicato, busy melody, intelligible vocals, and low bass that disappears on an iPhone speaker.

### Adaptive layers

| State | Musical behavior | Purpose |
| --- | --- | --- |
| Setup | No loop; one 1–2 second invitation motif | Make starting feel special without delaying it. |
| Promise chosen | Motif resolves into the base key; soft two-part pulse | Mark the group's shared commitment. |
| Set piece 1 | Sparse wonder bed | Leave maximum room for teaching and conversation. |
| Commitment | Rhythm thins; one quiet pulse remains | Create a held-breath moment without a timer cliché. |
| Reveal | Brief intake or upward gesture; then immediate result cue | Synchronize the room's attention. |
| Trouble rises | Add a low pulse or roughened texture, never just volume | Make danger persistent and legible. |
| Set piece 2 | Base plus motion layer | Communicate escalation. |
| Twist | Music drops out for 250–500 ms, then returns reharmonized | Make the callback perceptible without a loud sting. |
| Finale planning | Base, motion, and danger layers align | Feel larger because parts combine, not because the mix becomes loud. |
| Final commitment | Strip to heartbeat-like musical pulse; no literal heartbeat | Give people space to speak. |
| Ending | One of four authored resolutions | Close the emotional arc honestly. |
| Recap | Quiet motif reprise, then silence | Let the family own the memory and conversation. |

For the learning release, crossfade between a small set of pre-rendered phase mixes. Phase-locked vertical stems are the preferred mature system only after the core loop proves fun.

### Outcome resolutions

- **Bright victory:** complete five-note motif, warm harmonic lift, small human-scale percussion release; 2.5–4 seconds.
- **Costly victory:** same motif resolves, then leaves one suspended or altered note; 2.5–4 seconds.
- **Heroic failure:** motif descends gently, pauses, then one warm note answers; never a sad trombone.
- **True defeat:** brief low landing followed by a quiet unresolved glimmer that supports continuing; no scolding sound.

Group endings use story outcome cues, not a selected individual player's win or setback signature.

## Semantic sound-effect library

The library is organized by what happened, not by screen or filename. A first complete tranche is approximately 32–40 mastered assets, including restrained variants where repetition is likely.

### Personal interaction cues

| Semantic id | Sound direction | Duration |
| --- | --- | ---: |
| `story.choice.move` | Dry paper/wood tick | 80–160 ms |
| `story.choice.lock` | Soft wooden fit with a tiny tonal center | 180–300 ms |
| `story.choice.change` | Light reverse tick returning to neutral | 120–220 ms |
| `story.ready.waiting` | Nearly silent soft breath of texture | 250–400 ms |

Only the player making the choice hears these on a personal device. The shared screen does not repeat every private selection.

### Shared reveal and scene cues

| Semantic id | Sound direction | Duration |
| --- | --- | ---: |
| `story.reveal.ready` | Three restrained pulses, accelerating slightly | 500–750 ms |
| `story.reveal.open` | Paper unfurl plus compact tonal lift | 350–650 ms |
| `story.scene.complete` | Warm two-note answer | 500–900 ms |
| `story.scene.complication` | Organic scrape or low plucked bend | 450–800 ms |
| `story.twist.return` | Familiar motif fragment reversed, then recognized forward | 800–1,300 ms |

### Cooperation cues

| Semantic id | Sound direction | Duration |
| --- | --- | ---: |
| `story.help.offer` | One soft tone awaiting an answer | 180–350 ms |
| `story.help.join` | Second tone completes the interval | 300–550 ms |
| `story.team.covered` | Two or three small materials locking together | 450–750 ms |
| `story.team.overlap` | Playful clustered wooden taps, not an error | 300–550 ms |

The paired Help sounds should be meaningful separately and satisfying together.

### Character-resource cues

| Semantic id | Sound direction | Duration |
| --- | --- | ---: |
| `story.power.protect` | Soft body/cloth impact into a stable low tone | 500–900 ms |
| `story.power.discover` | Narrow shimmer resolving into one clear point | 500–900 ms |
| `story.power.connect` | Two separated tones magnetically joining | 550–950 ms |
| `story.power.transform` | Tactile morph from wood/paper into a tonal bloom | 700–1,100 ms |
| `story.keepsake.offer` | Intimate object touch or small resonant chime | 350–650 ms |
| `story.keepsake.sacrifice` | Recognizable cue breaks apart, followed by silence | 800–1,300 ms |
| `story.pet.arrive` | Small physical rustle/paws plus species-safe expression | 400–800 ms |
| `story.pet.rescue` | Quick scramble into a warm, confident landing | 900–1,400 ms |

Pet cues remain affectionate and capable, never distressed, injured, hungry, or infantile.

### Trouble cues

| Semantic id | Sound direction | Duration |
| --- | --- | ---: |
| `story.trouble.one` | One low dry knock | 200–350 ms |
| `story.trouble.two` | Two uneven knocks with a muted tail | 350–550 ms |
| `story.trouble.edge` | Low pulse plus brittle high detail | 550–900 ms |
| `story.promise.atRisk` | Promise motif briefly destabilizes | 650–1,000 ms |
| `story.promise.kept` | Promise motif returns complete | 700–1,100 ms |
| `story.promise.broken` | Promise motif loses its final tone and falls quiet | 700–1,100 ms |

Trouble is tension, not player failure. Do not use the existing comic setback signatures here.

### World incidentals

AI may select only from a bounded semantic tag set returned with structured scene data:

- `world.wind.soft`, `world.wind.storm`
- `world.water.stream`, `world.water.wave`
- `world.fire.small`, `world.thunder.distant`
- `world.steps.soft`, `world.door.old`
- `world.creature.distant`, `world.magic.near`
- `world.cave.air`, `world.town.night`

These are sparse 1–4 second accents or very low beds, not literal Foley for every generated noun. At most one ambience and one incident cue may own a scene transition. Silence is a valid selection.

## Haptic language

### Standard fallback vocabulary

| Game event | Standard semantic fallback | Feel |
| --- | --- | --- |
| Move between choices | `canvas.selection` | Tiny orientation tick. |
| Lock personal choice | `canvas.primary.confirm` | One clear medium commitment. |
| Another player joins to Help | `canvas.step.complete` | Light acknowledgment on both involved phones. |
| Reveal opens | `canvas.primary.confirm` | Shared medium onset synchronized with sound. |
| Trouble advances | `outcome.warning` | One unmistakable warning; never repeated per animation frame. |
| Power used | `canvas.destructive.confirm` | Heavy, deliberate expenditure. |
| Keepsake sacrificed | `canvas.destructive.confirm` followed by a quiet gap | Weight through restraint, not buzz length. |
| Pet rescue | `outcome.success` | Warm success confirmation. |
| Scene completed | `outcome.success` | Clear local resolution. |
| Bright victory | `outcome.bigSuccess` | Strongest standard celebration. |
| Costly victory | `outcome.success` then one delayed light impact | Success with a tactile afterthought. |
| Heroic failure | `outcome.warning` then one delayed light impact | Cost first, retained hope second. |
| True defeat | `outcome.error` once | Honest closure without repeated punishment. |

### Custom Core Haptics candidates

Custom patterns are justified only for the small number of story moments standard feedback cannot distinguish:

- **All committed:** three soft transients converge into one medium pulse.
- **Twist returns:** a faint continuous rise ending in one crisp transient.
- **Keepsake sacrifice:** one firm transient followed by a rapidly fading textured tail.
- **Pet rescue:** quick light-light rhythm ending in a warm medium pulse.
- **Bright victory:** short rising three-pulse cadence synchronized with the musical motif.
- **Costly victory:** rising pair, pause, one soft lower after-pulse.

Do not create haptic ambience, heartbeat loops, footsteps, weather, dialogue texture, or continuous danger vibration. Haptics lose meaning and become fatiguing when they narrate everything.

### Device and shared-play policy

- The casting or host device owns the soundtrack, narration, and shared effects so the room hears each event once.
- Joined phones play only personal choice cues; they do not duplicate the room mix.
- Haptics occur on the controller that submitted the action, while the shared screen still confirms which player's seat acted.
- A major group reveal or final outcome may trigger once on every joined phone.
- Shared events never produce a cascade of repeated haptics as remote updates arrive.
- A cast TV or ordinary iPad cannot be assumed to provide tactile feedback; visual and audio state remain complete for players without phones.
- Sound-off does not silently disable haptics. Haptics follow the app/system haptic preference and accessibility behavior.
- Reduce Motion suppresses decorative selection and transition patterns but preserves confirmations and meaningful outcomes.
- Custom haptics always have standard fallbacks and require physical-iPhone testing; Simulator cannot prove them.

## Mixing rules

- Preserve the existing `game.music` target around -24 LUFS-I and low runtime gain so conversation remains effortless.
- Mechanical cues duck music by roughly 6 dB; story outcomes and sacrifices duck it by roughly 12 dB.
- Spoken or read-aloud story text receives priority; music should thin or stop rather than compete.
- Continuous ambience sits below the music bed and disappears during commitments, reveals, and recaps.
- Repeated micro cues require two or three coherent variants to prevent auditory fatigue.
- Haptic onset aligns with the audible attack, not file start or animation completion.
- Remote playback must use a canonical event id and local timestamp guard so reconnects do not replay old cues.

## Controls

Keep the existing simple model:

- One visible per-table sound button controls soundtrack, incidentals, and story cues together.
- The persistent Games sound preference supplies its initial state.
- Haptics remain separate and follow existing app/system behavior.
- Do not add a mixer, per-category sliders, soundtrack picker, or pet-volume setting in the first release.

If family use shows that players regularly want effects but not music, split **Music** and **Effects** later in Games settings while retaining one-tap mute at the table.

## Asset and proof contract

- Every generated or sourced asset must enter `assets/audio/AUDIO_MANIFEST.md` with provenance, rights context, transforms, measurements, and owner.
- Use immutable remote delivery for continuous music and ambience; bundle the small core cue set required for offline play.
- The deterministic fallback adventure must have a complete bundled sensory path.
- Review candidates in the actual scene, not only on a soundboard.
- Required proof: fixed-volume iPhone speaker, headphones, noisy family room, sound off, Reduce Motion, interruption, route exit, local/cast play, and joined remote phones.
- Physical iPhone acceptance is mandatory for loudness, silent-switch behavior, Bluetooth, and every custom haptic pattern.

## First production tranche

Build and review in this order:

1. One base story composition plus commitment, danger, twist, and finale phase mixes.
2. Choice lock, simultaneous reveal, Help join, Trouble, Power, sacrifice, and pet rescue cues.
3. Four ending resolutions.
4. Six custom haptic candidates with standard fallbacks.
5. Only then add bounded world incidentals whose absence is noticeable in play.

The library should grow from observed game moments. Do not generate dozens of fantasy objects, animals, spells, and environments before the core game proves which sounds recur and matter.
