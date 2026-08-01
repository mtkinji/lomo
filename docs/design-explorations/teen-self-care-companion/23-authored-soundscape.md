# Pet Engine Study 19 — An Authored Soundscape

## Frame

When a teen or family member enters the Pet capability, they want the tiny
world to feel like a place worth returning to, so that real-life follow-through
has an emotionally warm consequence rather than another productivity receipt.

- **Audience:** `audience-aspirational-family-organizers`
- **Representative persona:** Maya, pressure-tested through a teen participant
- **Hero JTBD:** `jtbd-move-the-few-things-that-matter`
- **Active jobs:** `jtbd-carry-intentions-into-action`,
  `jtbd-see-who-im-becoming`, and `jtbd-trust-this-app-with-my-life`
- **Job-flow gap:** Family participation is 2/5 and continued use is 3/5.
- **Constraint posture:** Fit the existing Pet system.

The sound layer must reinforce the habitat and the Pet's animal expression. It
must not become a reward economy, a streak alarm, a speaking persona, or a
reason to keep the app open. Muting remains one tap and preserves the complete
visual experience.

**Design challenge:** How might we make Moss's meadow feel gently audible and
emotionally coherent, while preserving calm attention, shame-free progress,
and a renderer-neutral engine?

## Yes-and

This is a bounded sensory refinement, so broader expansion is intentionally
skipped. The job elevation is not “more sounds”; it is making weather, Focus,
wildlife, growth, and touch feel like parts of one living place.

## Diverge

### 1. Fully authored samples

Commission or license loops and one-shots for every state. This offers the best
timbral fidelity and production control, but introduces asset cost, loop seams,
licensing, download weight, and platform packaging before the interaction idea
has earned them.

### 2. Procedural meadow

Define a semantic mix in the portable engine, then synthesize a restrained
browser soundscape with filtered noise, soft oscillators, and stage-shaped
animal calls. Weather crossfades rather than switching. This proves the system
and causal mix without new media assets, but must avoid sounding like a retro
game or a science demo.

### 3. Silence plus haptics

Keep the habitat silent and use haptics only for direct touch, care, and
evolution. This is calm and cheap, but leaves wind, rain, Focus, and wildlife
visually disconnected and cannot test whether sound materially creates the
desired anime-world immersion.

## Converge

Choose **Procedural meadow** as a learning release, with a strict portability
boundary:

- the pure engine emits semantic levels for meadow, wind, rain, warmth, Focus,
  and wildlife;
- the browser adapter owns synthesis and smooth gain ramps;
- later native, web, and desktop adapters may replace synthesis with authored
  samples without changing behavior logic;
- pet calls use short, stage-shaped phrases with a wind-up, peak, and decay;
- no success fanfare, coin sound, button click, voice, speech, or score cue;
- sound begins only after a user gesture and stops immediately when muted.

We're betting that one low-volume causal sound bed plus restrained animal calls
will make the world feel more complete without making Kwilt noisier. If it
reads as electronic wallpaper or reward feedback, retain the semantic engine
and replace the browser synthesis with a small authored sample pack.

## Learning release

The standalone private site gains a real procedural soundscape. Sun has a light
meadow bed, breeze adds filtered moving air, rain adds a denser high-frequency
texture, Focus hushes the world, and stage-specific wildlife adds a brief spatial
cue. Baby, young, and Guardian calls share an identity but mature in pitch,
weight, and phrase length.

The release excludes production audio assets, background playback, notifications,
speech, music tracks, persistence beyond the existing sound toggle, and native
audio-session behavior.

## Evaluation

Audition the prototype in context rather than from an isolated sound list:

1. enter and tap Moss;
2. cycle sun, wind, and rain;
3. start Focus together;
4. invite each stage's wildlife;
5. complete a To-do, give care, and preview evolution;
6. mute and unmute during an active weather scene.

Supporting evidence: weather changes are audible before Moss moves; Focus feels
quieter without becoming silent; pet calls sound related but more grounded as
Moss matures; no cue produces a volume jump; mute is immediate; and the world
remains fully understandable without sound.

Disconfirming evidence: obvious loop seams, hiss fatigue, arcade bleeps,
reward-like fanfares, audio continuing after mute or navigation, or sound that
makes Focus less restful.

## Spec refinement

The semantic mix is pure TypeScript and requires tests first. Web Audio is a
replaceable adapter and may be implementation-led, but it must expose one
controller with explicit start, update, cue, mute, and dispose lifecycle. The
browser's user-gesture restriction is part of the prototype contract: enabled
means ready, not permission to autoplay before interaction.
