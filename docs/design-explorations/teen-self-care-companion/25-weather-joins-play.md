# Pet Engine Study 21 — Weather Joins the Game

## Frame and system alignment

> I should feel immersed in a beautiful tiny world whose weather changes how
> the creature lives, while still feeling that I can play inside it.

When Charlie tosses the wind leaf for Moss, they want the sun, wind, and rain
to change what the leaf actually does, so the habitat feels like one world with
rules rather than several attractive effects running beside one another.

- **Audience:** `audience-aspirational-family-organizers`
- **Representative persona:** Maya, pressure-tested through Charlie as a
  provisional teen participant
- **Hero JTBD:** `jtbd-move-the-few-things-that-matter`
- **Active JTBDs:** `jtbd-carry-intentions-into-action`,
  `jtbd-see-who-im-becoming`, and `jtbd-trust-this-app-with-my-life`
- **Job-flow gap:** Family participation is 2/5 and continued use is 3/5.
- **Constraint posture:** Extend the existing Pet world without adding a new
  surface, control, resource, or progression model.

The current prototype already directs weather as arrive, notice, respond, and
settle; gives Moss grounded sun, wind, and rain behavior; and lets the person
drag and toss one golden leaf. The systems do not yet meet: a throw has the same
material character in every weather state.

**Design challenge:** How might we let Charlie feel the weather through one
familiar play gesture, while preserving reliable control, one stable catch
commitment, calm recovery, and a renderer-neutral engine?

## Yes-and decision

This is a bounded causal refinement, so broader expansion is intentionally
skipped. The job elevation is from “the scene has weather” to “the world has
weather-shaped rules I can discover through play.” Keep the Pet-capability and
single-plaything frame.

## Divergence

### 1. Weather-flavored drawing only

Keep identical physics but add golden heat shimmer, wind streaks, and raindrop
pixels around the leaf. This is visually cheap and safe, but it fails the core
test: the world would still be decorating a canned throw rather than affecting
it.

### 2. Weather-shaped material physics

At release, the engine captures one weather profile for the throw. Sun gives
the dry leaf a buoyant, lingering arc; breeze gives it a readable lateral gust;
rain makes it darker, heavier, and quicker to fall. The same profile drives
both prediction and simulation, so Moss still commits once and faces correctly.
This makes weather tangible without adding an interface.

### 3. Separate seasonal toys

Replace the leaf with a dandelion seed in sun, a loose leaf in wind, and a rain
drop or puddle toy in rain. This could eventually produce richer play, but it
creates three hit targets, three tutorials, more art, and a toy-selection model
before the single-object engine has proven its depth.

All three remain optional Pet-capability play and touch none of Kwilt's Arc,
Goal, Activity, or Chapter ownership. None blocks capture or adds productivity
voice, streak pressure, anthropomorphic AI, default sharing, or a score.

## Convergence

Choose **weather-shaped material physics**.

The smallest elegant version keeps one golden leaf and one gesture. The pure
engine resolves a deterministic flight profile when the finger releases:
`sun-updraft`, `wind-drift`, or `rain-heavy`. Prediction and frame stepping use
the same gravity, horizontal force, drag, and maximum flight time. The catch
point never moves after release. Canvas renders only legible material cues—a
warm glint, a short wind wake, or a wet dark edge and landing splash.

No weather meter, arrow, trajectory guide, tutorial card, collectible, accuracy
grade, or new button is added. The existing inspector may name the active
flight profile for QA. Reduce Motion keeps the source meaning but lands the leaf
immediately, as before.

We are betting that the same throw feeling materially different in sun, wind,
and rain will make the habitat feel more alive and anime-like without reducing
Moss to a physics toy. If users cannot perceive the difference, the next
revision should strengthen timing and visual anticipation rather than add more
objects.

## Learning release

The private mobile-first site gains one renderer-neutral weather-to-play
contract. Weather state is sampled at release and becomes immutable throw
physics; the Pet world consumes the predicted catch exactly as it does now.
Canvas adds small weather-specific flight and landing cues. All existing stage
responses, Focus priority, direct touch, camera direction, sound, mute, Reduce
Motion, evolution, and healthy-action simulations remain intact.

## Evaluation

At phone scale:

1. make the same medium upward throw in sun, wind, and rain;
2. confirm sun lingers, wind drifts, and rain falls quickly enough to read;
3. throw both with and against the wind;
4. repeat for baby, young, and Guardian;
5. confirm Moss turns before commitment and never chases a moving intercept;
6. begin Focus during flight and verify the leaf returns quietly;
7. repeat with Reduce Motion.

Supporting evidence is a visible difference in arc and duration, agreement
between environmental drawing and physics, stable catch targets, correct facing,
one landing, and calm recovery. Disconfirming evidence is decorative weather,
unpredictable controls, a catch point that slides, backward pursuit, excessive
airtime, or effects that obscure Moss.

## Observed prototype evidence

Local browser QA repeated one upward/rightward pointer gesture in the rendered
phone frame. Sun produced a warm glint and a `sun-updraft` flight that landed in
about 1.33 seconds. A sampled breeze produced a short wake and `wind-drift`
flight that landed in about 1.24 seconds at the down-gust intercept. Rain
darkened the wet leaf, added falling droplets, and produced a `rain-heavy`
flight that landed in about 0.91 seconds. In all three observations, the
reported catch point exactly matched the rendered landing, Moss faced right
before pursuit, and the world entered one grounded `seek-leaf` response. This
same pass began Focus during a wind-shaped flight; the leaf returned to its
perch, its transient profile cleared, and shared shelter immediately owned the
scene. This is desktop-browser evidence for the portable engine and phone
composition, not yet an iPhone touch evaluation.

## Spec refinement

Weather-profile resolution, catch prediction, and physics stepping are pure
logic and require tests first. Canvas cues are implementation-led. The profile
is sampled once rather than changing mid-flight; turbulent gust fields,
collisions, puddle play, seasonal toys, trajectory UI, and native haptics are
deliberately deferred. No user-owned decision remains before implementation.
