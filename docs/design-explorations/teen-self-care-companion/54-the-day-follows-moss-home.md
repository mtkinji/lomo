# Pet Engine Study 54 — The Day Follows Moss Home

## Frame and system alignment

> The Pet should make healthy progress in Kwilt feel like part of one beautiful,
> playable anime world—not like a reward animation attached to a productivity
> button.

Charlie, a provisional teen participant within
`audience-aspirational-family-organizers`, has already spent a small piece of
the day doing something that mattered: moving a To-do, sharing quiet Focus, or
playing with family or a friend. At care time, the meadow should carry that
specific part of the day home with Moss so that progress feels remembered
without becoming measured.

This serves the underserved non-metric progress step in
`job-flow-sarah-see-who-im-becoming`, currently scored 3, while protecting the
calm return behavior a teen needs to trust the Pet over time.

```yaml
serves: [jtbd-feel-arc-progress-without-tracking-tools, jtbd-trust-this-app-with-my-life]
```

Constraint posture: **Fit and extend the portable world engine.** Reuse the
existing life echoes, care touch, golden-hour-to-night sequence, old-tree rest,
camera, soundscape, and one Canvas adapter. Add no new screen, reward, meter,
streak, inventory, dialogue, notification, or data collection.

**Design challenge:** How might the exact kind of meaningful action Charlie
completed become the emotional texture of one authored journey home, while
preserving a quiet daily ending with nothing to earn or lose?

## Yes-and check

The larger possibility is a world in which every remembered place develops a
relationship with weather, wildlife, and time. That expansion is intentionally
deferred. The useful proof is one complete compositional sentence joining an
existing receipt to an existing evening—not a seasonal simulation or a new
progress system.

## Divergence

### Make sunset prettier

Add more color, stars, and camera movement to the generic evening. This raises
visual polish but the day still forgets whether the user focused, did, or
played.

### Give every capability a reward cutscene

Build a separate cinematic for To-do, Focus, and Play. The meaning would be
obvious, but the Pet would begin to feel like a prize machine and the engine
would accumulate three disconnected scripts.

### Let the day follow Moss home

Use one twilight-echo grammar whose material comes from the newest care echo.
The To-do bloom releases one warm seed-light, the Focus still-light travels in
one steady quiet line, and Play's paired seedheads release two motes that weave
together. Each begins at its real world coordinate, accompanies Moss toward the
old tree, and settles beside the grounded sleeping curl.

## Convergence

Choose **let the day follow Moss home**.

The playable episode is:

1. a real or simulated Kwilt action leaves its existing bounded life echo;
2. the user closes the daily care moment by touching that exact echo;
3. golden hour begins and Moss turns toward the old tree;
4. the echo gathers at its existing coordinate rather than appearing beside
   Moss;
5. during the walk, its source-specific light travels along the same committed
   destination without becoming attached to the sprite;
6. dusk deepens while one To-do seed, one Focus light, or two Play motes retain
   distinct timing and silhouette;
7. Moss curls on the terrain beneath the old tree;
8. the light settles into the habitat near the curl and remains quiet through
   night;
9. morning clears only the transient twilight performance. The durable life
   echo remains exactly as it did before.

We're betting that **one source-aware journey home** will make meaningful action
feel woven into Moss's life more strongly than another isolated reaction. If it
reads as currency flying into the Pet, a completion celebration, or decorative
particles unrelated to the walk, revisit the material and timing before adding
more episode types.

## Capability delta and reductive decisions

Today, all care sources enter the same generic evening immediately after the
care touch. After this study, the user can recognize what kind of day they had
from the world behavior alone. The daily rhythm remains action, one bounded
care moment, evening, sleep, and a lossless morning.

The world still cannot assign points, infer importance, compare action types,
recommend more work, create a need, speak as Moss, or preserve the transient
light as a collectible. Source is the only receipt field used.

## Portable engine contract

- `beginPetEvening` receives an optional `MeaningfulAction` and captures the
  newest matching life echo as the immutable origin.
- Pure state owns source, origin, destination, elapsed time, and whether the
  echo is gathering, following, or settled.
- A renderer-neutral presentation resolver returns bounded world-space motes,
  opacity, scale, and phase; Canvas owns only drawing.
- To-do resolves one warm seed, Focus one steady light, and Play two related
  motes with the same overall duration.
- The destination is the existing old-tree rest anchor. Camera movement and
  Moss's live position cannot reverse the echo's journey.
- Night holds a finite stable tableau. Morning, reset, and a new evening clear
  the transient state.
- Reduce Motion skips travel and presents one source-specific settled mark near
  the sleeping place.
- Existing weather, life-echo persistence, care accounting, evolution, and
  morning recovery remain authoritative.

## Learning release and evaluation

The private mobile-first site remains the learning channel. At 390 × 844,
complete To-do, Focus, and Play on separate prototype days, touch each resulting
echo, and watch the complete golden-hour-to-night passage.

Supporting evidence is that the light visibly originates at the chosen echo,
the three sources are distinguishable without inspector text, every path moves
toward the old tree, Moss stays grounded through the walk and curl, the night
tableau feels calm rather than celebratory, and morning preserves the durable
echo while clearing the transient performance.

Disconfirming evidence is a reward-orb reading, lights snapping onto Moss,
backward travel, a source appearing from the wrong echo, the dock hiding the
walk, detached light continuing after morning, reduced motion showing a moving
trail, or the sequence feeling busier than the generic evening it replaces.

## Spec refinement

The three materials can be drawn from the existing habitat palette; no new
generated character row is needed. Logical behavior is test-first. Phone visual
QA must inspect the gather, following, and settled beats for all three sources,
plus one Reduce Motion tableau. No user-owned product decision remains for this
prototype study.
