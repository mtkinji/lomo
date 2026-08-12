# Yes-and: Focus video environments

Original idea: let a person enter Focus with a CDN-streamed creek video and its natural audio as the full-screen backdrop in portrait or landscape.

**Yes, and what if it could...** use a calmer editorial tempo rather than merely replaying the camera original?

- Serves: `jtbd-move-the-few-things-that-matter`
- Job elevation: the environment supports sustained attention instead of behaving like ordinary video content.
- New value: a subtle 10-15% picture-only slowdown lets the water breathe without becoming visibly artificial.
- Cost delta vs. original: low
- Anti-pattern check: pass only if the audio retains its native speed and pitch; boundary-only mastering may hide its restart. Otherwise keep the video at native speed too.

**Yes, and what if it could...** use an intentionally chosen direct cut so the repeated scene feels like continuing water rather than a video transition?

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: the environment recedes because neither the picture nor sound announces a restart.
- New value: a direct picture cut avoids the ghosted double-water effect introduced by a visual dissolve, while an independent original-speed audio loop may use an audio-only equal-power crossfade to avoid an audible reset.
- Cost delta vs. original: medium
- Anti-pattern check: pass; acceptance requires repeated playback, not a `loop` flag or one measurement.

**Yes, and what if it could...** feel deliberately composed in either hand-held portrait or propped-up landscape?

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: the environment meets the user in the posture they naturally adopt rather than asking for setup.
- New value: orientation-specific CDN renditions protect the centered rocks and give the timer and controls intentional negative space.
- Cost delta vs. original: medium
- Anti-pattern check: pass; orientation is responsive behavior, not another preference.

**Yes, and what if it could...** make “Soundscape” evolve into one coherent Focus environment?

- Serves: `jtbd-move-the-few-things-that-matter`
- Job elevation: choosing one supportive place stays simpler than configuring separate picture and audio layers.
- New value: existing audio-only choices and the Creek video choice share one selection model and one mute control.
- Cost delta vs. original: low
- Anti-pattern check: pass; avoids a media library, mixer, and settings hierarchy.

**Yes, and what if it could...** begin Focus truthfully even when the network cannot provide the scene?

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: commitment to the work remains more important than media delivery.
- New value: a poster frame, existing color treatment, and bundled audio fallback let the session start immediately while the scene loads or fails.
- Cost delta vs. original: low
- Anti-pattern check: pass; no blocking spinner, failure alarm, or forced retry.

**Yes, and what if it could...** respect the device as well as the person's attention?

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: calm does not come at the cost of surprise heat, battery drain, or unwanted background behavior.
- New value: explicit foreground, background-audio, Reduce Motion, and Low Power Mode policies make the environment predictable.
- Cost delta vs. original: medium
- Anti-pattern check: pass; avoid persistent battery/status UI unless the system actually requires a choice.

## Frame recommendation

**Run design-thinking-loop with the original frame**, refined by a motion contract: start with one Creek environment, use an approximately 85% picture-only playback-speed master, preserve the audio's native speed and pitch while mastering only its loop boundary, use a direct video cut, and ship orientation-specific renditions behind the existing Focus selection. If picture and audio cannot remain independently owned and reliable in the runtime, keep both at native speed.

Do not expand this learning release into a backdrop library. The important thing to learn is whether one living environment makes Focus feel calmer and more inhabitable than the existing flat-color treatment.

## Current audition direction

- Picture source: tripod-style stabilization removes the tiny global handheld movement from the rocks before loop-point selection. The current candidate uses approximately 0.3-16.1 seconds of the stabilized source.
- Picture treatment: approximately 85% speed, repeated as an 18.6-second direct-cut loop. The 15.8-second source boundary scores only about 1.7% worse than the best 13.5-second stabilized boundary while reducing repetition substantially.
- Audio treatment: independent original-speed and original-pitch creek audio with boundary-only equal-power mastering.
- Acceptance focus: whether stabilization removes the rock jitter without introducing visible crop/warp behavior, and whether the longer interval makes both the cut and repeated water pattern recede.

## Learning-asset decision

The handheld creek clip does not need to become the permanent production master. It is sufficient for testing whether a living audiovisual environment improves Focus, provided the experience and CDN catalog treat the media as replaceable content rather than embedding its dimensions, duration, or loop boundary in session logic. A later locked-camera capture or generated seamless scene can replace the prototype through a new immutable asset version without changing the Focus interaction model.
