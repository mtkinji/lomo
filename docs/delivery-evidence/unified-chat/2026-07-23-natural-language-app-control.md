# Natural-language app-control simulator proof — 2026-07-23

- App version: `1.0.93 (93)`.
- Source: `codex/natural-language-app-control-mvp`, based on `2332654` plus the Screen Time boundary correction recorded by this change.
- Device: authenticated iPhone 17 Pro simulator, iOS 26.4.
- Runtime: native development build using the production workbench at `https://www.kwilt.app/embed/chat` and the feature branch bundle from Metro.

## Proven in the signed simulator

- “What’s on my plan for tomorrow?” read the user’s Plan context and grounded the response in three Kwilt records.
- An explicit Goal request created a durable native Goal. A subsequent regression fixes the missing target date for requests bounded to “next week”; that target-date correction still requires a fresh runtime creation proof.
- An explicit weekly reminder request created a durable native To-do with a Tuesday 8:00 PM weekly reminder. A subsequent regression pins the To-do date to the first reminder occurrence; the corrected date still requires a fresh runtime creation proof.
- “Turn on Brawl Stars for Charlie” now returns an honest capability boundary: Kwilt can manage selected apps on this device, but cannot change an app on Charlie’s device. It does not open generic same-device settings or claim a cross-device action. See [simulator-cross-device-screen-time-boundary.png](simulator-cross-device-screen-time-boundary.png).

## Capability boundary

Kwilt has same-device Screen Time Protection for apps and categories selected on the current device. It does not yet have child resolution, household authorization, a linked child-device channel, cross-device rule delivery, or enforcement acknowledgement. Therefore child-device Screen Time commands are intentionally reported as unavailable.

This evidence is simulator-only. It is not physical-device, TestFlight, production deployment, Phone Agent, notification-delivery, calendar-provider, or cross-device Screen Time enforcement proof.
