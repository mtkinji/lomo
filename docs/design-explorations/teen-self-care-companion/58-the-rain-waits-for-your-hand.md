# Pet Engine Study 58 — The Rain Waits for Your Hand

## Frame and system alignment

> Weather should feel like a scene Moss and the person inhabit together, not an
> automatic state change followed by a pet animation.

Charlie remains a provisional teen participant for the Pet learning release.
The meadow already lets weather arrive by degrees, move the habitat, and change
Moss's behavior. Rain currently creates a good notice, flinch, and shelter
journey, but Baby and Young make the important transition automatically. The
person can watch the scene without entering it.

Restated in user voice: **When the first rain reaches our meadow, I want Moss
to look toward safety and leave one quiet opening for my touch, so it feels like
we noticed the weather and went home together.**

This continues the underserved `Notice non-metric progress` step in
`job-flow-sarah-see-who-im-becoming`, currently scored 3. Maturity becomes a
physical difference in how Moss crosses the same familiar place, without a
level label, score, or achievement.

```yaml
serves: [jtbd-feel-arc-progress-without-tracking-tools, jtbd-trust-this-app-with-my-life]
```

Constraint posture: **Fit and extend the directed rain episode.** Reuse rain
arrival, habitat acting, the authored flinch, old-tree geography, direct
world-space touch, stage locomotion, camera, shelter curl, soundscape, and
Guardian's existing wet-firefly story. Add no storm meter, countdown, quest,
failure state, reward, new sprite row, or persistent need.

**Design challenge:** How might the first rain let Charlie make one gentle,
meaningful contribution to Moss's shelter journey, while preserving Moss's
autonomy and Guardian's more mature choice to help another creature first?

## Divergence

### Drag Moss to shelter

Continuous steering would maximize control, but it would turn a beautiful
weather beat into joystick work and make Moss feel like a cursor. It also
duplicates the existing hand-guide interaction instead of deepening weather.

### Put a shelter button in the dock

A button would be obvious, but it would detach the choice from the actual old
tree and move attention away from the world at the scene's emotional hinge.

### Let the rain wait for one touch

After the first flinch, Baby or Young plants and looks toward the old tree. The
camera holds Moss and the shelter together while the tree itself becomes the
touch target. Touch releases the journey immediately; inaction lets Moss choose
the same safe destination after one generous beat. Baby toddles through the
wet grass, Young breaks into a run, and Guardian retains the existing higher
story: notice the struggling firefly, carry it, then share the shelter.

## Convergence

Choose **let the rain wait for one touch**.

The authored sentence is:

1. the sky changes by degrees and the meadow visibly takes the rain;
2. Moss notices and performs the existing first-drop flinch;
3. Baby or Young plants, faces the old tree, and holds one readable action line;
4. the camera opens enough to keep Moss and shelter in the same composition;
5. the dock says `Touch the old tree` and explains that Moss can also choose;
6. touching the tree commits one destination and releases the shelter journey;
7. Baby keeps a careful toddle while Young uses a faster run;
8. Moss arrives on the terrain and curls beneath the canopy;
9. if untouched, the same journey begins after a calm timeout with no failure;
10. Guardian continues to notice, carry, and shelter the wet firefly instead.

We're betting that **one world-space choice at the hinge of a weather scene**
will make the rain feel co-authored more strongly than another animation or
more dramatic storm effects. If testers read it as a quick-time event, lengthen
the hold and soften the dock before adding any stronger control.

## Capability delta and reductive decisions

Today, Baby and Young flinch and automatically walk to shelter. After this
study, the person can enter that exact moment by touching the shelter already
visible in the world. The fallback remains autonomous, so the scene never asks
for attendance or creates a need.

The Pet still cannot become wet, sick, depleted, afraid, or neglected. Rain
cannot remove progress, require care, start a streak, send a notification, or
award anything. Guardian does not repeat the simpler shelter choice because its
existing firefly scene already expresses the mature form's greater agency.

## Portable engine contract

- `rain-invite` begins only after the authored flinch for Baby and Young.
- The invitation owns one finite duration and one old-tree world-space hit
  target; it is not a general button or renderer-owned click handler.
- `beginRainShelterRun` samples the existing shelter coordinate once and locks
  facing plus destination for the complete journey.
- Baby requests `walk`; Young requests `run`. Guardian's carried-guest journey
  remains careful and grounded.
- The invitation uses an action-wide composition so Moss and the old tree stay
  legible together on a phone.
- Timeout calls the same commitment function as touch and cannot fail.
- Enter activates the same choice for keyboard users.
- Focus, new weather, evening, and Reduce Motion retain authority. Reduce Motion
  resolves directly to the sheltered tableau without animated travel.

## Learning release and evaluation

The private mobile-first site remains the learning channel. At 390 × 844,
trigger Rain with Baby and Young from both sides of the meadow, wait through the
first-drop flinch, touch the old tree, and watch the complete arrival and curl.
Repeat without touching, then verify Guardian's wet-firefly scene is unchanged.

Supporting evidence is that Moss and the tree are visible in one composition;
the tree itself reads as touchable; left and right journeys never moonwalk;
Baby and Young clearly use different urgency; touch and timeout converge on the
same safe ending; and the shelter curl is planted beneath the canopy.

Disconfirming evidence is countdown pressure, a dock button reading, tree touch
opening ordinary branch play, a cropped destination, backward travel, Young
still toddling, Baby sprinting, Guardian losing the firefly story, or any path
that leaves Moss waiting for the person.

## Spec refinement

The existing habitat, rain acting, locomotion rows, shelter state, and pointer
adapter are sufficient; no generated art is required. Invitation timing,
hit-testing, timeout, commitment, stage clip choice, and interruption are pure
engine logic and are test-first. Dock copy and phone composition are verified
in the deployed browser prototype. No user-owned product decision remains for
this bounded learning study.
