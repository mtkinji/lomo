# Household Food accessibility evidence
Recorded: 2026-08-05

## Source-level protections

- Primary actions use Kwilt Button semantics and its minimum 44-point hit-area
  policy; Cook Mode targets remain at least 48 points by design.
- Grocery rows expose checkbox state, provenance is a separately named action,
  and the trip-target input and action have explicit accessible names.
- Media-independent text carries uncertainty, provenance, listening state,
  savings evidence, and provider limitations. Color is not the only signal.
- Every Cook voice command has a touch equivalent. Low-confidence or unknown
  speech does not advance the session.
- Component tests cover shared Button, Typography, BottomDrawer, Dialog, Input,
  and new Food controls; the full Jest run passed.

## Physical acceptance still required

VoiceOver focus order and custom actions, Switch Control, Reduce Motion, Bold
Text, contrast measurement, live Dynamic Type changes, landscape Cook Mode, and
microphone/notification permission recovery require a fresh Simulator or signed
device pass. None is marked passed from source inspection. A physical-device
run is required for Cook voice, timer notifications, dirty-hands ergonomics,
and audio interruption behavior.
