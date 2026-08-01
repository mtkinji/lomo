# Leafling — Grounded Pet Engine Study

A standalone, mobile-first learning prototype for Kwilt's portable Pixel Pet animation system.

The prototype lets a tester:

- inspect twelve shared Leafling clips plus a Guardian-only aerial-acrobatics performance;
- pause and step through the exact atlas cells used by the renderer;
- observe planted, resting, and airborne ground-contact states;
- compare 38px baby, 46px young, and 62px guardian game-character scales;
- see a one-time sleep transition resolve into a curled breathing loop;
- tap the world to walk, run, and jump while authored footfalls and a wider camera follow;
- draw one finger through the habitat to wake a small world-space light that Moss notices, follows with walk/run inertia, finds, and releases without becoming a joystick puppet;
- raise that same light through a stage-shaped reach ladder: grounded Baby, bounding Young, and an aerial Guardian that lands before greeting and never pogo-loops under a held finger;
- pinch from a full habitat view to a temporary 2.25x close-up;
- discover a stage-specific wildlife ladder: baby follows a ground crawler, young chases a firefly, and guardian banks through a high aerial interception of a sky moth;
- watch each visitor perform through the same renderer-neutral limited-animation grammar: a planted crawler transfers weight through six legs, a firefly beats its wings independently of its slow breathing glow, and a sky moth holds, strikes, banks, and escapes;
- see visitor materials answer the world: warm light, wind effort, and rain weight change acting without changing behavior authority;
- see every wildlife chase begin with a planted eyes-ears-head attention beat, sample the target's latest side, then lock facing, travel, and escape to one committed side;
- keep the directional pounce or aerial playhead continuous from planted anticipation through takeoff instead of restarting or substituting a front-facing discover pose;
- keep the pursued visitor visibly ahead through contact by capping intercept lead to its real escape window;
- read evolution in the jump itself: terrain-bound Baby, a modest Young spring, and the Guardian's highest aerial vault;
- return to a world that begins with recognition: Baby pads over from nearby, Young opens into a delighted run, and Guardian crosses the widest entrance lane before one grounded hello;
- inhabit a Pet capability whose resting state is the meadow itself: direct touch and one native Focus-with-Moss invitation remain, while To-do and family/friend Play arrive as consequences from the capabilities that own them;
- swipe across Leafling to curl, roll over on the ground, and uncurl;
- inspect anime-style holds, keys, in-betweens, accents, and recovery timing;
- see a face-only 184 ms blink composed over a locked full-body key pose;
- move through sun, wind, and rain that affect both the habitat and Leafling;
- watch weather arrive by degrees, catch Leafling's attention, and only then become a reason to move;
- see every form perform weather-specific notice, wind-brace, rain-flinch, and sun-bask acting instead of receiving a rigid whole-sprite tilt;
- watch baby curl in a sunny patch while Guardian holds a longer, more deliberate brace and bask;
- let occasional deterministic weather episodes emerge while the world is otherwise quiet;
- watch Leafling seek the old tree and curl up when rain reaches the meadow;
- watch Leafling follow a sunny patch, bask briefly, then independently return to the old tree's shade;
- travel through an authored panorama, root-anchored shelter tree, fine foreground meadow, and weather overlays at different camera depths;
- touch the old tree as real world geography: Baby explores its roots, Young springs to a low bough, and Guardian vaults to the highest stable canopy perch before one committed return;
- feel evolution as newly reachable space inside the same familiar habitat, with branch contact, action-wide framing, and a grounded Reduce Motion alternative owned by the portable world engine;
- start a fifteen-second Focus-together ritual that resolves through the same bounded Kwilt receipt path;
- watch that ritual clear wildlife, soften weather, settle beneath the old tree, and breathe without becoming a guided exercise;
- leave the controls alone and watch one portable living-day director compose quiet roaming, remembered-bloom visits, voluntary tree rest, weather, and wildlife without overlapping scenes;
- interrupt any ambient scene immediately with touch, Focus, Play, evolution, or a new To-do consequence;
- watch one portable cinematic director move between establishing, follow, reaction, intimate, focus, and action-wide compositions;
- keep a pursued visitor and Moss together in the action frame instead of letting the camera crop the relationship;
- pinch to take temporary ownership of the camera, then watch it return gently to the current scene after six seconds;
- unlock one low-volume procedural soundscape with the first deliberate interaction;
- hear sun, breeze, rain, wildlife, and Focus crossfade as parts of one meadow rather than separate sound effects;
- hear Moss's short nonverbal voice mature from baby through Guardian without becoming a reward fanfare;
- grab one golden wind leaf from the old tree, move it continuously through world space, and toss it without opening a control panel;
- let a settled breeze become one causal scene: Moss braces, the tree releases its leaf, and the moving toy remains catchable before Moss commits;
- watch baby wait for a grounded catch, young commit to a descending leap, and Guardian meet the same toy with an aerial interception;
- release one stable catch target per throw so Moss always turns before committing and never reverses mid-performance;
- feel one throw linger in warm air, drift with a sampled gust, or fall quickly when rain makes the leaf heavy;
- keep weather prediction and frame-by-frame physics on one immutable flight profile so environmental play remains legible and portable;
- let a Play-together receipt stir the breeze and invite a small visitor;
- complete a To-do, Focus session, or Play-together moment and watch each leave a distinct persistent habitat trace;
- let each meaningful action own one complete notice-and-response vignette before care appears, even when ambient weather was already arriving;
- inhabit one continuous phone-scale world with a quiet contextual action dock instead of a header, receipt panel, and visible care meter stacked around the habitat;
- close care through the exact in-world bloom, stilllight, or paired seedheads that a real action created;
- leave and return to the same four bounded, privacy-safe life echoes in an otherwise calm fresh world;
- simulate a completed Focus session;
- give one care moment per prototype day;
- return after quiet days without loss or punishment;
- hear and mute nonverbal sounds;
- accelerate time through a young form after three care moments and a guardian form after eight;
- complete that accelerated action → care → next-morning rhythm entirely inside the capability, with no dead action controls and no inspector dependency;
- watch both thresholds as an in-world, previous-form-to-new-form evolution ceremony;
- inspect recognition, gathering, two-body handoff, and grounded arrival phases;
- preserve the same transformation meaning under Reduce Motion with a stable dissolve.

The pure TypeScript runtime owns clip timing, loop windows, frame events,
ground anchors, contact states, movement offsets, contact-cue metadata, world
coordinates, camera follow, destination-side shot framing, transient zoom,
weather arrival phase and intensity, weather response, shared-focus state,
autonomous behavior targets, the directed sun-to-shade sequence, and one
renderer-neutral living-day director that sequences ambient scenes without
creating a needs simulation.
The world also owns a renderer-neutral cinematic shot contract. Quiet stays
wide, travel receives a restrained follow composition, recognition pushes in,
rest and memory hold close, and jumps or pounces open back out to protect the
full silhouette. A user's pinch owns zoom for six seconds after the last
gesture; automatic direction cannot alter it during that window and eases back
only after ownership expires. Reduce Motion holds one stable wide composition.
The sound layer follows the same boundary. Pure TypeScript resolves semantic
levels for meadow, weather, warmth, Focus, and wildlife; the browser adapter
turns those levels into filtered noise and soft tones with gradual gain ramps.
It starts only after a user gesture, stops immediately when muted, and disposes
its complete audio graph when the capability leaves. Pet and wildlife calls are
short, stage-specific phrases with a wind-up and decay, never coins, button
clicks, or arcade fanfares. Native and desktop adapters can replace synthesis
with authored samples without changing the behavior contract.
Direct play follows that boundary too. A pure wind-leaf state machine owns its
perched, held, flying, landed, caught, and returned phases plus bounded throw
physics and a stage-shaped catch mode. Pointer handling supplies world-space
positions and release velocity; Canvas draws one golden habitat leaf; existing
authored Moss clips own attention, travel, pounce, aerial reach, and contented
recovery. Focus, a new meaningful-action consequence, weather direction, or
ordinary touch can end the toy scene without preserving a score or unfinished
need.
Direct affection now shares the same boundary. A stage-aware silhouette target
and pure gesture classifier distinguish a stationary hello, gentle body stroke,
quick rollover swipe, and hand guide before Canvas chooses an interaction.
Every form owns a grounded notice, lean, nuzzle, content, and recovery clip
composed from approved high-fidelity drawings. Contact leaves no meter, reward,
care credit, persistence, or unfinished need; Focus and rain shelter remain
stronger than the invitation.
Weather and play share that pure boundary. The engine samples sun, breeze, or
rain when the leaf leaves the finger and resolves one immutable material
profile containing gravity, horizontal force, drag, and maximum airtime. The
same profile predicts the catch and steps every frame, so renderers can add a
warm glint, short wind wake, or wet landing cue without owning physics or
changing Moss's commitment.
The same snapshot contract carries both masked anatomy layers and stage-specific
animation manifests. The young Leafling can change its eyes without redrawing
or moving its body; all three forms now own distinct eight-drawing walk, run,
jump, pounce, and rollover clips with non-linear limited-animation timing and
explicit ground contact. Guardian adds a thirteenth atlas row for a sightline,
coil, launch, bank, held directional reach, landing, and calm recovery. World
state owns destinations, facing, and camera
travel; the drawings own lift, body turn, anticipation, impact, and recovery.
Visitor pursuit uses one side-stable intercept and one recovery. At commitment,
the visitor evades outward on that same side, so it cannot cross behind
Leafling, make the launch read backward, or oscillate into a second pounce.
The old tree is also a renderer-neutral world affordance rather than scenery
with a click handler. Pure state owns its bounded hit target, stage-specific
anchors, notice, approach, launch, perch, return, contact height, and camera
composition. Baby remains on the terrain at the roots; Young and Guardian
occupy increasingly high authored boughs before following one committed arc
back to the meadow. Reduce Motion preserves discovery at the roots without
vertical travel, and Focus, evening, care echoes, and rain shelter retain
authority over decorative tree play.
During evolution, a renderer-neutral composition contract drives the old and
new manifests together while the habitat renders once. Deterministic leaf-light
gathers inward and opens around the arrived form; visitors and autonomous travel
yield until the ceremony is complete. Reduce Motion removes the orbit and scale
pulse but retains the two-form handoff.
Shared Focus adds a portable duration and elapsed-time clock plus bounded hush
and breath outputs. The world clears transient visitors, suppresses direct play,
softens decorative weather sway, and holds a quiet pool of light beneath the
old tree while Leafling remains grounded in its curled breathing loop. The same
state resolves to a static calm treatment under Reduce Motion.
The renderer-neutral habitat manifest carries a 480 × 240 far panorama, a
root-anchored shelter tree, and a transparent near-meadow layer. Canvas 2D is
the current adapter. It places Leafling low in the scene, draws contact cues
inside the terrain rather than as a separate platform, and layers weather over
the same authored place. Native, web, and desktop renderers can consume the
same world coordinates, habitat assets, and frame snapshots.
The habitat now also owns one renderer-neutral material-performance snapshot.
The authored shelter tree remains a planted mass while foreground grass leads
a gust, canopy accents follow, trailing vines recover last, rain adds downward
weight and drips, and sun favors restrained dapple. The browser adapter draws
those flexible accents over the stable illustration; Reduce Motion resolves one
time-invariant pose rather than merely slowing the same oscillation. Shared
Focus attenuates the same presentation intensity, so habitat acting cannot
bypass the existing stillness authority.
Weather now uses one portable directed-episode grammar: arrive, notice, respond,
and settle. The Canvas adapter fades the whole event into the authored habitat,
adds moving foreground vegetation, and keeps touch live while the world changes.
Each stage manifest also owns the same four semantic weather clips with
stage-specific pose selection and timing. These are deliberate limited-animation
edits of approved drawings; the Canvas adapter no longer rotates the complete
Pet sprite to impersonate wind acting.
Meaningful progress now uses the same portable directed-episode grammar. A
To-do receipt contains only its capability source; it plants no score, title,
currency, or collectible. The world opens one bounded bloom, Leafling notices,
walks over using its authored gait, and admires it through the existing care
performance. Up to three blooms persist as scenery while weather, direct touch,
Focus, Play, and evolution continue to operate through the same world state.
The browser stores only a versioned list of anonymous bloom identifiers and
clamped coordinates. On return, it restores those fully opened memories but
resets Leafling's position, camera, weather, visitors, Focus, and unfinished
animation. Malformed or unknown data returns to a safe empty meadow, and the
prototype reset clears both the care loop and habitat memory.

Pet state stays in the current browser. The prototype does not connect to a
Kwilt account, production data, Chat, notifications, Money, or Screen Time.

Wildlife pursuit is stage-aware and direction-locked. Baby follows a terrain
crawler with an entirely planted stalk, Young springs after a low firefly, and
Guardian follows a high sky moth with its authored aerial performance. Every
encounter establishes a directional body line before travel. Facing, launch
position, target side, and outward visitor escape then remain committed through
landing, and added lift returns to zero on the exact authored contact frame, so
no correct chase can read as a backward jump or floating landing.

## Local use

```bash
npm install
npm run dev
```

## Verification

```bash
npm run lint
npm test
```
