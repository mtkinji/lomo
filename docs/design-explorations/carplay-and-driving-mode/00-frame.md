# Frame: CarPlay And Driving Mode

## What the user said

> Sometimes I'm driving and want to see Explore. If I have Apple CarPlay, I want Kwilt for Apple CarPlay. This could include Chat, Explore, and perhaps other parts of Kwilt. Audible is an inspiration because its CarPlay mode creates a different look and feel. If the phone senses that I'm driving, perhaps interactivity with Kwilt should be different too.

## Restated in user voice

When I am in the car, I want Kwilt to meet me in a form that is safe and useful for the drive, so I can keep exploring, capture what comes to mind, and get help without handling the full phone app.

## Target audience

`audience-ai-native-life-operators` - people who expect Kwilt to be available in the context where life is happening, while keeping its actions inspectable and under their control.

## Representative persona

Nina is driving when a thought, question, place, or practical next step becomes relevant. She wants to speak naturally and continue later without reconstructing the moment.

- Current situation: her hands and visual attention belong to the drive.
- What she's trying to do: capture, ask, or act without operating a phone UI.
- Emotional state or tension: she wants continuity without distraction or an overreaching assistant.
- What would make this feel wrong: a mirrored mobile app, long spoken monologues, hidden actions, surprise location sharing, or an app that assumes every passenger is the driver.

## Hero anchor

`jtbd-trust-this-app-with-my-life` - the car is a high-consequence environment, so useful help must also be calm, bounded, reliable, and honest.

## Job flow step

`job-flow-nina-trust-ai-with-my-life-system`, steps 1-2 and 8-10: arrive with visible scope, express a practical job in ordinary language or voice, receive an authoritative result, and resume or correct later. Voice intent is currently delivery score 3 because physical-device behavior and key request cases remain unproven.

Secondary fit: `job-flow-maya-move-family-life-forward`, step 1, capture a family or personal to-do when it comes up, currently score 4. Driving makes that otherwise-good capture path unsafe to reach through the standard interface.

## Active anchors

- `jtbd-trust-this-app-with-my-life` - driving requires a stronger attention, privacy, and action-truth contract.
- `jtbd-get-help-without-retelling-my-life` - the car session should carry the smallest useful Kwilt context and continue into ordinary Chat later.
- `jtbd-stay-in-control-of-ai-actions` - spoken actions still need capability-owned authorization, confirmation, receipts, and correction.
- `jtbd-capture-and-find-meaning` - thoughts, places, and movement should be capturable without post-drive administration.

## serves snippet

```yaml
serves: [jtbd-trust-this-app-with-my-life, jtbd-get-help-without-retelling-my-life, jtbd-stay-in-control-of-ai-actions, jtbd-capture-and-find-meaning]
```

## Friction we're addressing

Kwilt already records Explore movement and supports voice input in Chat, but the useful parts are still behind a phone-oriented interface. The car changes the interaction budget: the user can listen and speak, but should not browse a dense timeline, inspect a fog map, type, or perform multi-step proposal review.

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- Existing surface: Unified Chat provides durable threads, native voice transcription, bounded context, capability tools, proposals, receipts, and exact native return destinations.
- Existing flow: Explore owns a local private map, explicit manual/automatic recording, adaptive vehicle tracking, ephemeral Nearby recommendations, canonical Places, and recaps.
- Existing domain/data model: CarPlay should reuse Chat runs and capability-owned operations; it should not create a parallel car task, car place, or car conversation model.
- Existing technical affordances: the app already generates native Swift through an Expo config plugin, has App Intents, WidgetKit, ActivityKit, an App Group, background audio/location modes, and a native MapKit nearby-search module.
- Existing technical gap: there is no CarPlay scene, entitlement, or adapter; Explore is not yet a Unified Chat capability; Chat voice currently records then transcribes rather than running a full duplex car conversation.
- Existing UX convention: one capability owns each action, Nearby remains ephemeral until the user explicitly chooses what to do, and receipts rather than model prose establish that a write happened.

Constraints to preserve:

- CarPlay is a distinct driving presentation, not the mobile UI resized for a dashboard.
- The user's hands and eyes stay on the drive; voice is primary and audio output is concise.
- Recording is not sharing. Nearby is not a saved Place, visit, Mission, or cleared territory.
- The system must not infer that an automotive phone belongs to the driver rather than a passenger.
- No action can bypass the owning capability's validation, authorization, proposal, receipt, or undo contract.
- Canonical Explore observations remain the source of fog, Places, and history.

Constraints we may challenge:

- Unified Chat currently has no Explore adapter.
- Proposal review currently assumes a visual mobile surface.
- The mobile app does not have an explicit low-attention driving presentation.

Design implication:

The most credible first product is a voice-based CarPlay channel over Unified Chat, with a deliberately small Explore tool surface and a continuity handoff back to the phone. A true Explore map in CarPlay is a separate navigation-product decision because Apple reserves custom CarPlay maps for apps that provide turn-by-turn route guidance.

## Aspirational design challenge

How might we help Nina stay connected to her life and the world around her while driving, while preserving attention, truth, privacy, and exact control over what Kwilt does?

## Out of scope

- Mirroring the Explore map or full Chat transcript onto CarPlay.
- Gaming, social feeds, family-location surveillance, or long-form setup in the car.
- Claiming a navigation entitlement without real turn-by-turn routing and maneuvers.
- Automatically locking the phone UI based only on detected vehicle speed.
- Implementing the feature in this strategy tranche.

## Open question

Will Apple approve Kwilt under the new voice-based conversational CarPlay entitlement when its car experience is intentionally voice-primary and its supported actions are useful during a drive?
