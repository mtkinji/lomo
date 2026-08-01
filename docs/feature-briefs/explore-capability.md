---
id: brief-explore-capability
title: Explore capability
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves: [jtbd-capture-and-find-meaning, jtbd-invite-the-right-people-in, jtbd-trust-this-app-with-my-life]
related_briefs: [geolocation-activity-offers]
owner: andrew
last_updated: 2026-08-01
---

# Explore capability

## Context

Kwilt already understands task-linked location and private sharing, but it cannot preserve where a family has explored. Explore introduces an explicit, private-first adventure session that turns movement into a retained map without claiming production background tracking or family sync before those systems exist.

## Target audience

Aspirational family organizers who want technology to make shared life more meaningful without another system to manage.

## Representative persona

Maya wants her family’s walks, outings, and discoveries to accumulate into something they can recognize and revisit. She needs absolute clarity about location collection and visibility.

## Aspirational design challenge

How might we help Maya and her family explore their world together and remember where life took them, while preserving calm, legible control over sensitive location history?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` - family exploration is an embodied expression of the life the household wants to live together.

## Job flow step

`job-flow-maya-move-family-life-forward`, family participation, currently 2/5. Explore tests whether a playful shared surface can strengthen participation without creating household admin.

## JTBD framing

When my family moves through the world, I want Kwilt to preserve where we explored and the meaningful places we reached, so we can find meaning in lived experience and invite one another in without losing privacy.

## Design

Explore is a named capability in the Fun section of the global menu. Its first functional release provides adventure recording, an animated Silver Mist fog field with a 65-foot clear core and independently scaled 100-foot feather reference, altitude-colored route segments, versioned local persistence, a restrained settings control, visited-Place search, first-Place naming, and a canonical Place/person-Place visit model.

Recording, sharing, and viewing are independent:

- recording controls what this device remembers;
- sharing controls the maximum projection another person may receive;
- viewing controls which permitted layers appear locally.

The first release implements recording and viewing locally. It models sharing but does not transmit location data. Family layers use honest empty/unavailable states until an authenticated backend with RLS, retention, deletion, and revocation exists.

### UI contract

- Job: When I first open Explore, I need to understand that it creates a private history of the world I have traveled, receive a real first clearing where I am, and choose how future movement is recorded without configuring GPS.
- Primary action: Begin Exploring during first run; Start Exploring / Stop for later deliberate outings.
- Must show: full-bleed satellite map, visibly atmospheric fog, the first-use personal-history proposition and action, one real stationary clearing, recording choice, current recording state, personal trail, floating global-navigation/action controls, a fixed two-part Here control for naming and recentering, and visited-Place search.
- Reveal later: all normal map chrome after the recording-mode choice; the one-time first-Place invitation; privacy controls, prior adventures, and Place visits.
- Must not add: navigation, search, or settings during first use; dashboard, completion percentage, leaderboard, streak, public feed, or unsupported background promise.
- Reuse map: capability shell, `ObjectPageHeader`/`HeaderActionPill` floating material, the resting agent-composer footprint for the bottom utility row, MapKit MapView, Button/Icon primitives, BottomDrawer.
- Behavior sources: the floating map controls, satellite imagery, closer default camera, visited-Place search, 65-foot fully clear corridor, independently scaled 100-foot feather reference, and altitude trail are explicit user decisions; private default, permission timing, and honest path continuity come from Kwilt trust contracts.
- Required states: permission not requested, denied, locating, recording, stopped/empty, persisted route, and family unavailable.
- Proof path: global menu to Explore on an iPhone simulator, complete the stationary first clearing and recording-mode choice, start with simulated location, receive movement, stop, relaunch, and inspect retained map.

### First-run activation and permission ladder

Explore teaches itself on the map instead of presenting a setup wizard.

1. A new user sees only the fog, **See where you’ve been. Explore where you haven’t.**, the shorter explanation **Build a private history of the places and paths you travel.**, and **Begin Exploring** in the same modal-like introduction. Navigation, actions, search, and recentering stay hidden.
2. **Begin Exploring** requests foreground location only. A trusted stationary point creates the first real clearing and the camera settles at a close neighborhood scale.
3. One compact drawer asks **How should Explore remember your travels?** without a second heading or explanatory paragraph.
4. The user chooses **Explore automatically** (recommended; works while the app is closed) or **Only when I start**. Automatic mode requests background location at this contextual moment; manual mode remains usable without granting the automatic mode.
5. The drawer states **Private until you choose to share.** After a successful choice, global navigation and the three-dot action float down from the top while visited-Place search and the two-part Here control float up from the bottom.
6. A one-time, non-modal guide invites the user to give the current clearing a durable Place name such as Home, a park, or a trail. **Not now** dismisses the guide without removing the persistent naming action.
7. The vertical Here control keeps **Name current Place** above **Center on current location**. The control remains fixed when later contextual offers or mission cards appear; transient content may occupy or cover the bottom guide region but does not reflow map controls.
8. The three-dot map surface includes an independent **Places** visibility layer. Hiding the layer removes Place markers from the map without deleting Places or removing them from search.
9. Automatic recording remains quiet on the map; pausing or changing it lives in the three-dot settings surface rather than a persistent primary button. Manual mode retains Start and Stop as explicit map actions.

Existing users with retained exploration history are migrated past first-run onboarding. Clearing Explore history does not reset the onboarding choice.

### Domain model

- `ExplorePoint`: accepted coordinate, altitude, accuracy, and timestamp.
- `ExploredCell`: coarse territory projection derived from a point.
- `ExploreSession`: explicit recording boundary and ordered points.
- `Place`: canonical named geographic entity.
- `UserPlaceRelationship`: per-user visit and sharing metadata for that Place.
- `ExplorePreferences`: recording, sharing, viewing, and one-time guide controls.

## Success signal

A real or simulated outing visibly clears fog, draws a meaningful altitude-colored route, persists after relaunch, and leaves the user able to explain exactly what was recorded and shared.

## Open questions

- Which tile/cell resolution best balances organic reveal and storage?
- What real Place provider and confirmation threshold should back automatic collection?
- Which household identity should own Explore sharing outside Money?
- What evidence justifies adding continuous background location capability?

## Spec refinement

The first clearing must work while the user is stationary; onboarding may not depend on a convenient walk or drive. The foreground-only first request is intentionally distinct from returning manual adventures, which retain their existing screen-lock permission path. “Family” controls describe and persist the privacy contract but do not imply remote data exists. Named Place visits are represented in the shared conceptual model; automatic POI lookup is deferred. Runtime completion requires a simulator or signed-device path, not unit tests alone, and battery claims still require signed-device measurement.

Recorded territory must not imply a path Kwilt did not observe. Active vehicle tracking requests dense observations, then retains them using an approximately 0.8-second speed horizon clamped to 6-22 meters. A trustworthy course change of roughly 10 degrees may retain a point before the distance threshold so residential corners and roundabouts preserve their shape. Background delivery remains deferred so observation fidelity does not require waking the JavaScript runtime for every point. Canonical points retain coordinate, timestamp, accuracy, speed, and GPS course; the compass is not operated separately.

Silver Mist receives explicit route-segment pairs rather than guessing continuity from explored-cell order. Straight observations may be topology-preservingly simplified for the bounded native renderer, but every segment remains inside one recorded session and no segment may cross the 60-meter evidence gap. Isolated trusted observations remain circular clearings. Always Exploring requests approximately 22-meter vehicle updates and batches delivery farther in the background; a deliberate Adventure retains the denser 6-meter vehicle profile. This reduces routine freeway acquisition and JavaScript wakeups without weakening intentional outing fidelity.

Route presentation uses the same bounded, topology-preserving traces rather than creating one MapKit overlay for every raw point pair. Each trace has a high-contrast casing beneath the altitude stroke so the exact evidence line remains legible on hybrid and satellite imagery. A deliberate Adventure also earns a wider 120-meter terrain corridor that only thins Silver Mist; it does not become fully clear and does not claim that the person traversed the whole area. Ambient sessions retain the narrow reveal. This is an intent-based learning release, not a claim that Kwilt knows a park boundary; see [`explore-earned-terrain-and-trace.md`](explore-earned-terrain-and-trace.md).

Adjacent points more than 60 meters apart are treated as a discontinuity: the observations remain, but Explore draws no connecting line and clears no interpolated corridor. Schema migration rebuilds retained territory from the original points so previously over-interpolated gaps are repaired without discarding location history. Any later road-matched geometry is a separately cached, confidence-gated presentation only; it may not clear fog, establish a Place visit, or overwrite recorded evidence, and no precise coordinates may leave the device without an explicit provider and privacy decision.
