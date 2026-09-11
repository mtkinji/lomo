# Evaluation

Observe Andrew opening Home's composer, choosing a real source, reviewing audience/content, editing, and closing/reopening without posting during QA. Can he identify a choice without typing? Is the standard drawer recognizable? Does the footer clear the keyboard? Do three choices provide useful variety? Empty/offline states must remain actionable. Unit tests cover filtering, ranking, draft preservation and stale-account responses; native evidence is separate. No telemetry containing titles, locations, cooking notes, or draft text.

Continuity: Ongoing Kwilt Enhancements is the matching durable Goal. This session exposes only read-only Kwilt Life tools; no Activity write claimed. Work units: standardize composer, implement recent source choices, verify native draft flow.

## Local implementation evidence — 2026-09-10

Native path: Home header Share a moment → recent choices → completed Goal preview → optional caption keyboard. The generic header's legacy write intent now still starts with suggestions. Reopened an empty draft and observed three real Goals; selecting one prepared its title-only attachment without publication. Removed that QA attachment afterward. Source filtering/meal projection and stale-account rejection are automated-test evidence; this account did not expose recent Place/Meal choices in the native preview.

Runtime provenance: /Users/andrewwatanabe/Kwilt, main at 9baf1a4a8e14b83e806c1df9e25ee4d3e66d0678 with unrelated dirty work preserved; Metro PID 64089 at port 8081 from the same checkout. iPhone 17 Pro Simulator, iOS 26.5, installed development shell build 118, current JavaScript via Fast Refresh. This does not prove TestFlight/native rebuild behavior.

Keyboard QA exposed a shared resize integration defect: React Native KeyboardAvoidingView compares its parent-relative layout to screen-relative keyboard coordinates. BottomDrawer now supplies the bottom-anchored sheet's window offset from its measured height; its regression test covers an offset of 180 points. Native follow-up shows Post above the keyboard and the field viewport inside the remaining scroll area.

Visual critic: standard handle, left title and canonical close are the first focal point; concrete choices are next, then writing/photos. One primary Post control; no nested suggestion cards. Chosen-moment preview uses existing disclosure. PASS for standard frame, source recognition, deliberate selection, keyboard-visible Post, and restored draft. The compact list and 44-point controls use local tokens/components. Screenshots: evidence/01-recent-moments.png and evidence/02-keyboard-footer.png. Android, larger accessibility text and VoiceOver traversal remain unverified. No test post was published. No new migration or deployment.
