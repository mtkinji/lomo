# Frame: Focus video environments

## What the user said

> I want to try something a little wild here - a focus mode where this plays as a video backdrop with the audio. It would need to allow for landscape mode as well as portrait mode. I would want it streaming from the CDN.

## Restated in user voice

When Marcus has chosen what deserves his attention and begins Focus, he wants to settle into a living environment that helps the rest of the phone fall away, so staying with the work feels natural rather than managed.

## Target audience

`audience-burned-out-productivity-power-users` - people who have enough productivity machinery and want less friction between choosing meaningful work and doing it.

## Representative persona

**Marcus** has already selected the Activity or started a standalone Focus session. He is not looking for another configuration system; he wants the chosen environment to begin reliably and recede into the background.

- Current situation: he has begun a Focus session and may prop the phone in portrait or rotate it into landscape.
- What he's trying to do: create a calm boundary around one meaningful action.
- Emotional state or tension: ready to work, but sensitive to setup, interruption, visual clutter, and obvious media loops.
- What would make this feel wrong: a video library, download controls, autoplay before he starts, competing audio, buffering that blocks Focus, or controls that dominate the scene.

## Hero anchor

`jtbd-move-the-few-things-that-matter` - the environment supports the transition from deciding what matters to staying with it.

## Job flow step

`job-flow-marcus-move-the-few-things-that-matter`, step 5, "Decide what to do next," currently scored 3. Focus is the existing bridge from that decision into action; the gap here is not choosing another task, but making the chosen work easier to remain with.

## Active anchors

- `jtbd-move-the-few-things-that-matter` - the backdrop helps sustain attention on the selected work.
- `jtbd-carry-intentions-into-action` - starting Focus becomes a more tangible transition into doing.
- `jtbd-trust-this-app-with-my-life` - streaming, fallback, audio ownership, orientation, and battery behavior must be predictable.

## Friction we're addressing

The current Focus surface is an intentional timer over a flat color with optional audio. It can reduce distraction, but it does not yet create the feeling of entering a place. A living creek scene may make the session feel more immersive without adding another planning step.

## System alignment

Constraint posture: `Extend the system`.

Current system facts:

- Existing surface: both Activity Focus and standalone Focus already share the same basic full-screen timer, title, pause/end, and soundscape controls.
- Existing user flow: the user chooses duration and one audio environment, starts Focus, and may adjust or mute that environment in-session.
- Existing domain/data model: Focus persists a stable `SoundscapeId`; remote audio uses immutable Supabase Storage CDN paths with opportunistic local caching and a bundled fallback.
- Existing technical affordances: Expo Video is installed and already plays remote media; Expo Screen Orientation is installed; the app manifest supports portrait and landscape; Games and Cook Mode already provide orientation-control patterns.
- Existing UX/copy conventions: media is optional, best-effort, calm, and never blocks the underlying action.
- Source clip: `IMG_4044.mov` is a 30.4-second, 1920x1080 landscape HEVC recording with AAC audio. It is about 45.7 MB at roughly 11.4 Mbps video bitrate, so it is a source master rather than an appropriate delivery object.
- Source composition: the camera is stable and the creek's primary rocks remain centered across sampled frames. This supports a portrait center crop, although portrait necessarily discards most of the landscape frame.

Constraints to preserve:

- One selected Focus environment owns both picture and sound; do not play the current soundscape underneath the video's audio.
- Focus starts even when the video is unavailable. The existing color treatment and a bundled audio fallback remain the graceful path.
- No user-facing download manager, quality selector, video library, or separate orientation preference.
- Rotation must only be unlocked while the active Focus experience is visible, then restore the app's portrait posture on exit.
- Timer and essential controls remain readable in both orientations, with safe-area spacing and sufficient contrast over changing water highlights.
- Reduce Motion, Low Power Mode behavior, app backgrounding, interruptions, and locked-screen audio require explicit policy rather than accidental native defaults.
- Picture and audio speed are independent. A calmer video tempo must not time-stretch the creek audio; preserve its original tempo and pitch, allowing only boundary mastering needed to prevent an audible restart. If the runtime cannot preserve that separation reliably, keep both at their original speed.
- The user prefers a direct cut when the picture repeats rather than a visible dissolve. The cut point must be auditioned over repeated cycles; `loop = true` alone is not acceptance evidence.

Constraints we may challenge:

- "Soundscape" can become a broader Focus environment that may contain audio only or coordinated video plus audio.
- The current tap-anywhere color cycling should not remain the dominant gesture when the backdrop itself becomes meaningful.

Design implication:

Add the creek as one video-backed environment inside the existing Focus choice, then let the active Focus surface choose an orientation-specific immutable CDN rendition. Landscape uses a 16:9 rendition; portrait uses a deliberately framed portrait derivative of the same moment. The video may use a subtly slower master while the original-speed audio plays independently. The timer and three controls float over a restrained scrim, while loading or failure quietly falls back to the existing color-and-audio experience without blocking the session.

## Aspirational design challenge

How might we help Marcus feel that starting Focus means entering a calm place, while preserving one simple choice, immediate action, orientation freedom, and trustworthy fallback?

## Out of scope

A browseable video library, user-uploaded backdrops, picture-in-picture, casting, adaptive scene generation, multiple simultaneous audio layers, automatic environment rotation, or claiming loop/background quality before signed-device observation.

## Open question

Should the creek be presented in the existing choice as **Creek** or **Mountain Creek**? The working recommendation is **Creek** because the experience should be chosen by how it feels, not by media type.
