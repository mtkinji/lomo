# Converge: Canyon Spring

## Chosen direction

Generate one original **Canyon Spring** Focus environment: a locked-camera Utah-inspired slot-canyon chamber with stable sandstone, a small natural arch, a shallow stream, a thin continuous waterfall, sparse hanging-garden plants, a perfectly unobtrusive direct-cut loop, and independently mastered natural audio.

This chooses a distinctive Kwilt setting while carrying forward the enclosed, inhabitable quality Andrew valued in Portal's Bluebell Woods. It does not reproduce Portal's footage, sound, composition, copy, scene naming, or interaction design.

## Comparison

| Direction | Personal evidence | Research fit | Loop feasibility | Originality for Kwilt | Decision |
| --- | --- | --- | --- | --- | --- |
| Bluebell Clearing | Highest: repeated prior use | Forest audio has promising but mixed evidence | Medium-high with restrained motion | High if independently art-directed | Defer |
| Quiet Shore | Positive stated preference | Promising congruent water evidence | Lowest because wave sets reveal seams | Medium | Defer |
| Canyon Spring | Strong stated affinity plus sheltered-place fit | Promising congruent water evidence | Medium: stable rock, demanding water | Highest | Choose |

## Capability delta

Today, the user cannot enter a Focus session that changes the phone into a coordinated audiovisual place.

After this release, the user can choose Canyon Spring as one Focus environment and begin a session in portrait or landscape with a living desert backdrop and matching natural audio.

Still intentionally unsupported:

- A landscape library, favorites, playlists, downloads UI, smart-light integration, spatial head tracking, or automatic scene rotation.
- Claims that the scene improves ADHD, executive function, stress, sleep, or productivity.
- Copying Portal content or presenting Portal's product claims as Kwilt evidence.

## Reductive design decisions

- One environment, not a catalog launch.
- One existing Focus choice becomes `Environment`; existing audio-only choices remain valid environments.
- `Quiet` represents no video and no audio.
- The active scene carries only the timer, Activity title or `Focus`, and end/pause/audio controls.
- No scene description, educational card, quality control, download button, or “immersive mode” toggle.
- The muted video and the audio master have separate playback owners. Video can pause in the background while audio continues through the existing Focus audio lifecycle.

## Generation and mastering decision

Use the OpenAI Videos API as an offline authoring tool, not a runtime dependency. Generate three 12-second 1280x720 `sora-2` candidates from one approved original reference image. The first batch costs approximately $3.60 at the currently documented $0.10 per generated second and requires explicit spend approval. Do not use `sora-2-pro` until standard candidates prove the art direction but miss fidelity.

Prompt constraints:

- Photoreal Utah-inspired red-sandstone slot-canyon chamber, without reproducing a named real-world site.
- One small natural arch or bridge as static framing, a shallow stream, a thin continuous waterfall, and sparse maidenhair fern, moss, or comparable spring-fed desert plants.
- Camera fixed to a heavy tripod; zero pan, tilt, translation, zoom, roll, focus breathing, or exposure breathing.
- Stable indirect canyon light; no moving sun patches, sky changes, fog, precipitation, people, paths, signs, animals, falling debris, or foreground crossings.
- Only continuous water texture and low-amplitude cyclic movement in a few plant fronds.
- Constant water volume and direction; no distinct splash, drop, surge, reflection flash, or ripple event that can reveal repetition.
- No singular event that reveals repetition.
- Opening and closing geometry and motion phase should meet as one continuous cycle.

Score every candidate before subjective selection. Static geometry at the boundary must be effectively unchanged; seam motion must resemble an ordinary adjacent frame. If no candidate passes, revise the prompt once. After six standard candidates, stop and simplify Canyon Spring to a still pool with plant movement, or use a real locked-camera shoot, rather than accumulating generation spend.

The final accepted visual receives separately mastered landscape and portrait renditions. The audio is not time-stretched to follow the video. Use a multi-minute canyon bed at the existing Focus loudness policy: soft air through stone, a continuous close water layer, and restrained canyon reflections. Distinct drops, birds, gusts, and echoes are excluded from the first master because memorable events expose repetition.

## Activation

Canyon Spring appears in the existing Focus Environment choice. No coachmark is needed. Selecting it shows a quiet poster-frame preview in the setup surface; motion and audio begin only after Start.

## Bet

We are betting that one original slot-canyon spring will make Focus feel easier to enter and more inhabitable because it combines sheltered immersion with a landscape Andrew already values and that feels distinctive to Kwilt. If the water pulls attention, the loop is noticed, or the phone is placed face-down, we will simplify motion within the same canyon before adding more scenes.

## Success signal

Andrew completes at least three ordinary 25-minute Focus sessions without identifying a video or audio boundary, voluntarily chooses Canyon Spring again, and describes the scene as a place he settles into rather than something he watches.
