# Pet Engine Study 37 — It Leans Into Your Hand

## Frame and system alignment

> I should feel like I am not just watching a beautiful anime creature. I am
> playing with my little character from that world.

Moss can follow a hand through space, jump toward it, chase visitors, catch a
wind leaf, roll over, and respond to weather. But touching Moss's body still
means either a generic hello or the beginning of another spatial command. The
most emotionally direct relationship—one gentle stroke that Moss chooses to
lean into—was explicitly deferred until the character art could support it.
The current atlases now contain stage-specific notice, lean, nuzzle, content,
and recovery drawings that can form a believable contact performance.

- **Audience:** `audience-aspirational-family-organizers`
- **Representative persona:** Maya, pressure-tested through Charlie as the teen participant
- **Hero JTBD:** `jtbd-move-the-few-things-that-matter`
- **Active JTBDs:** `jtbd-help-us-enjoy-being-together`, `jtbd-trust-this-app-with-my-life`, and `jtbd-feel-arc-progress-without-tracking-tools`
- **Job-flow gap:** **Notice an opportunity to play together** remains 2/5.
- **Constraint posture:** Extend the current direct-touch grammar without adding affection meters, care debt, rewards, or a new renderer.

## Anchor assessment

When Charlie has a small opening, he wants to reach into Moss's world and feel
Moss willingly meet that touch, so the relationship feels warm and alive rather
than like issuing commands to a character.

```yaml
serves: [jtbd-help-us-enjoy-being-together, jtbd-trust-this-app-with-my-life, jtbd-feel-arc-progress-without-tracking-tools]
```

How might we let Charlie affectionately touch Moss and receive a stage-specific
answer, while preserving Moss's agency, physical safety, calm pacing, and the
distinction between casual play and meaningful Kwilt progress?

## Yes-and decision

Broader expansion is skipped. This is not a friendship system, emotion meter,
needs simulation, grooming game, or social feature. The job elevation is that
direct control becomes a reciprocal relationship: Moss can accept affection
without depending on it.

## Divergence

### Turn a tap into petting

Any tap directly on Moss could play a content pose. This is discoverable, but it
erases the existing little hello and makes contact feel like a button press.

### Add a visible Pet button

A persistent button would be accessible and deterministic. It would also put
the emotional relationship in product chrome instead of the world. Keep one in
the lab inspector for QA, not in the capability.

### Recognize a gentle body stroke

A touch beginning on Moss stays in a short contact threshold. A small, slow
stroke resolves to affection; a quick broad horizontal swipe remains rollover;
a gesture that leaves Moss becomes the existing hand-guide relationship; a tap
remains hello. Moss looks, leans toward the contact side, closes the distance
with a nuzzle, holds contentment, and settles.

### Simulate continuous skeletal deformation

Move head, ears, body, tail, and face independently under the finger. This is
the eventual expressive ceiling, but inventing deformation from a raster atlas
would soften the approved pixel art and create a second animation system before
the relationship itself is proven.

## Convergence

Choose **a gentle body stroke**.

1. contact must begin inside a stage-aware silhouette target;
2. a stationary tap remains the existing hello;
3. a small stroke held long enough becomes affection;
4. a quick, broad horizontal swipe remains Olive's rollover;
5. a gesture that travels away from the body becomes the existing hand guide;
6. Baby answers with a small curious lean, Young with a soft nuzzle, and Guardian
   with a slower, more confident lowering of its powerful head;
7. the performance uses authored holds, contact, contentment, and recovery—not
   equal-duration frame cycling;
8. one restrained warmth mark appears only at contact and fades with the pose;
9. Focus and rain shelter retain priority; Moss does not abandon stillness or
   safety to satisfy touch;
10. affection creates no care receipt, life echo, growth credit, persistence,
    score, streak, sound fanfare, or unfinished need.

### Capability delta

Today, a hand can invite Moss somewhere but cannot affectionately meet Moss
where it already is. After this study, a person can discover a distinct body
stroke and see each life stage willingly lean into it. A tap, rollover, hand
guide, pinch, wind leaf, weather response, Focus session, and meaningful-action
loop remain separate and intact.

### Reductive and activation decisions

- No visible capability control, tutorial card, heart meter, floating emoji,
  daily pet requirement, or relationship level.
- Recompose approved high-fidelity drawings before generating another atlas.
- Teach through response: the existing accessibility label may name the stroke,
  while sighted users can discover it organically.
- Keep one inspector action and a keyboard shortcut for deterministic QA and
  non-pointer access.

We're betting that one reciprocal nuzzle will make Moss feel more like a
creature someone knows than another environmental spectacle. If the gesture is
confused with rollover or hand guidance, revise distance and duration
thresholds before adding more contact types.

## Learning release and evaluation

The private standalone site remains the release channel. At 390 × 844, stroke
Moss gently in Baby, Young, and Guardian form. Confirm that contact begins on
the visible body; attention precedes the lean; the body remains grounded; the
contact side agrees with facing; the hold feels affectionate rather than
rewarded; and ordinary touch returns after recovery. Then verify a stationary
tap still greets, a quick horizontal swipe still rolls over, dragging away still
guides Moss, and pinch and wind-leaf gestures retain precedence.

Repeat during active Focus, settled rain shelter, and Reduce Motion. Focus and
shelter must refuse the interruption without punishment. Reduce Motion must
keep a stable contact-and-content meaning without travel or pulsing effects.

Supporting evidence is an unprompted second stroke or the description that Moss
"liked that." Disconfirming evidence is a heart-button interaction, accidental
rollover, cursor-like sliding, a nuzzle facing away from touch, reward fanfare,
an affection counter, petting that interrupts safety, or an animation that
looks assembled from unrelated poses.

## Spec refinement

Gesture classification and world priority are pure logic and require tests
first. Animation composition, contact pixels, copy, and sound timing may be
tuned visually. The approved atlas cells are sufficient for this learning
release; new imagery is warranted only if phone QA shows a discontinuity that
timing and composition cannot solve. No user-owned product decision remains.

