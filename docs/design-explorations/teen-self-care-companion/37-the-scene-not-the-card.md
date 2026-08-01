# Pet Engine Study 33 — The Scene, Not the Card

## Frame and system alignment

> I should feel like I am immersed in this beautiful, tiny world. I am not just watching it. I am playing with my little character from that world.

The prototype now contains the requested world behaviors: Moss notices weather, seeks shade and shelter, curls beneath the old tree, follows a hand, plays with wind and wildlife, grows through three distinct forms, focuses beside the person, and lets meaningful Kwilt actions leave bounded scenery. But the capability still places a large persistent explanation card over the upper third of the scene. The world acts, then a card explains the acting. That weakens immersion and occupies the same sky the person is invited to touch.

- **Audience:** `audience-aspirational-family-organizers`
- **Representative persona:** Maya, pressure-tested through Charlie as the teen participant
- **Hero JTBD:** `jtbd-move-the-few-things-that-matter`
- **Active JTBDs:** `jtbd-help-us-enjoy-being-together`, `jtbd-feel-arc-progress-without-tracking-tools`, and `jtbd-trust-this-app-with-my-life`
- **Job-flow gap:** **Keep using the system because it feels helpful, not fussy** remains 3/5.
- **Constraint posture:** Fit the existing capability, world engine, action vocabulary, accessible status language, and one quiet Kwilt dock. Remove explanatory furniture before adding new behavior.

Restated in user voice: when I open this little world to spend a few playful minutes with Moss, I want the character and environment to show me what is happening so I can remain inside the scene instead of reading an app card.

```yaml
serves: [jtbd-help-us-enjoy-being-together, jtbd-feel-arc-progress-without-tracking-tools, jtbd-trust-this-app-with-my-life]
```

How might we let Charlie understand the causal world through acting, composition, and selective narration, while preserving accessibility and the calm evidence that real Kwilt actions matter?

## Yes-and decision

Broader expansion is skipped. This is a reductive direction pass over the existing capability, not a new story system, tutorial, or cinematic mode. The elevated job is to make direct play feel coherent enough that the world itself becomes the invitation to return.

## Divergence

### Keep the card but make it translucent

This preserves every explanation and is cheap, but it still claims the sky, repeats information already expressed by the dock, and teaches the person to read before playing.

### Remove all words from the world

Pure visual storytelling is the aspirational extreme. It would make ordinary locomotion feel clean, but ambiguous causal moments—weather first arriving, a wind toy becoming available, or a Guardian landing changing grass—could become harder to understand and less accessible.

### Let acting lead and narration visit briefly

Remove the persistent visual message card. Self-explanatory movement receives no caption. Only a small set of otherwise ambiguous causal moments receives a short, subtitle-like line that enters after the acting begins and then leaves. The existing dock continues to explain Focus, care, day-ending, and meaningful Kwilt receipts. A visually hidden live region preserves the full status language for assistive technology.

## Convergence

Choose **let acting lead and narration visit briefly**.

The policy is:

1. quiet companionship, walking, running, jumping, pouncing, following, greeting, rolling over, and ordinary wildlife attention explain themselves and receive no visual narration;
2. weather notice/response, a newly playable wind leaf, after-rain discovery/contact, and a Guardian meadow wake may receive one brief caption because their causality extends beyond Moss's body;
3. the caption never appears before the action, never becomes a speech bubble, and never implies that Moss talks;
4. the caption uses one title and at most one short detail, occupies a narrow lower-safe strip, ignores pointer input, and leaves automatically;
5. care, Focus, evolution, evening, and morning remain explained by the existing capability dock because they are product state, not ambient scene commentary;
6. the screen-reader announcer retains the fuller current status without being visually persistent;
7. Reduce Motion removes caption travel and uses an immediate opacity change.

### Capability delta

Today, the person must look through a persistent card to see and touch the upper world, even when Moss's movement is already clear. After this study, the full sky remains playable; the scene carries ordinary meaning; and narration appears only when it adds causal comprehension. The release still does not add dialogue, quests, tutorials, conversation, rewards, or a cinematic-skip control.

### Reductive decisions

- Remove one persistent visual surface instead of restyling it.
- Do not add a tutorial carousel, hint badge, speech bubble, dialogue box, event log, or pet voice.
- Do not narrate direct locomotion or gestures the person just caused.
- Do not duplicate the Kwilt dock's Focus, care, or life-progress copy inside the world.
- Keep full detail available to assistive technology.
- Let the existing animation, camera, soundscape, and habitat do more of the explanatory work.

We're betting that **selective silence** will make the same engine feel more like a playable anime world because the person watches cause and effect instead of reading a running commentary. If people miss why weather, loose leaves, puddles, or the Guardian wake matter, revisit the visual acting and the small narration policy—not the persistent card.

## Learning release and evaluation

The private standalone site remains the release channel. At 390 × 844, confirm that the initial scene shows uninterrupted sky; ordinary taps, walking, hand-following, jumping, wildlife tracking, and rollover remain visually understandable without captions; the small set of causal events receives a brief subtitle after action begins; the subtitle never intercepts touch or hides Moss; product-state receipts remain clear in the dock; and the full status is still announced accessibly.

Supporting evidence is that a person starts touching the world sooner, can still explain why the wind leaf, rain residue, or Guardian landing changed the scene, and describes the result as a world rather than a card over an animation. Disconfirming evidence is caption churn, a subtitle that feels like pet dialogue, lost comprehension, hidden upper-sky interaction, duplicated copy, or a visually empty capability with no understandable invitation.

## Spec refinement

A pure narration policy owns the small set of actions that merit visible explanation; tests precede it. React owns one bounded caption timer and cleanup. CSS owns the subtitle presentation and Reduce Motion behavior. The existing `currentStatus` remains the accessible source of truth, the existing dock remains capability-state truth, and the portable world state gains no narration or persistence fields. No user-owned product decision remains for this study.
