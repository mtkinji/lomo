# Converge: CarPlay And Driving Mode

## Qualitative comparison

| Alternative | Persona and JTBD fit | Apple category fit | Current-system fit | Attention safety | Strategic value |
| --- | --- | --- | --- | --- | --- |
| Explore Dashboard | Medium | Low today | Medium | Medium | High only if Kwilt becomes navigation |
| Drive With Kwilt | High | High under voice-based conversation | High | High | High |
| CarPlay Glance | Medium | High | High | High | Medium |
| Driving-Aware iPhone | High | Not entitlement-dependent | Medium | Medium-high with opt-in | High |
| Paired Road Mode | High | High when staged | Medium-high | High | Highest |

## Chosen direction

Choose **Paired Road Mode**, introduced through a narrow **Drive With Kwilt** learning release.

The CarPlay app is voice-first Chat. Explore is a capability inside that conversation, not a copied map tab. The phone remains the canonical place to inspect Silver Mist, trails, Places, recaps, proposals, and detailed receipts. When CarPlay is absent, an opt-in driving-aware phone presentation can reuse the same conversational contract.

## Capability delta

Today, the user cannot safely:

- open Kwilt in CarPlay;
- ask Kwilt a contextual question or capture a To-do without reaching for the phone;
- hear whether Explore is recording or ask for nearby Explore candidates through Unified Chat;
- carry a driving conversation into ordinary Chat after arrival.

After the first release, the user can:

- open Kwilt from CarPlay into a push-to-talk voice conversation;
- ask one bounded question, create a low-risk To-do, or check current Explore recording state;
- ask for up to three nearby outdoor or landmark candidates and hand one to Apple Maps;
- hear a concise result and find the same thread, action receipt, or deferred review in iPhone Chat later.

Still intentionally impossible:

- browsing the Silver Mist map or a full transcript while driving;
- treating a recommendation as a visit, Place, Mission, or cleared territory;
- complex editing, consequential Money actions, Screen Time controls, Games, or family tracking;
- claiming navigation without real turn-by-turn routing;
- automatically forcing a non-CarPlay phone into driving mode based only on speed.

## Before and after user stories

Before: “I just thought of something I need to do after this drive” means remembering it or handling the phone.

After: “Add a To-do to call the campground tomorrow” creates through the existing low-risk Activity path, speaks a short receipt, and leaves the result in Chat.

Before: “Is Explore recording?” requires opening the map or trusting memory.

After: Kwilt answers from current Explore state and can start or stop a manual outing only after an explicit voice command.

Before: “Is there an interesting park nearby?” requires another app and loses Explore's product context.

After: Kwilt speaks up to three ephemeral candidates and can open the chosen destination in Apple Maps. It does not save or count the candidate as explored.

## Reductive design decisions

- One CarPlay root: **Talk to Kwilt**.
- No mirrored tabs for Chat, Explore, Plan, Money, and other capabilities.
- No new Drive object, car inbox, or separate agent memory.
- No full message transcript on the car display.
- No custom map in the initial CarPlay experience.
- No automatic spoken commentary, discovery feed, badge, streak, or territory score.
- No in-car account setup or settings; blocked flows explain that they can be continued when safe, without instructing the user to manipulate the phone.
- The arrival experience reuses the durable Chat thread and standard capability receipts.

## Activation path

1. The CarPlay icon is the primary activation on supported iOS versions after entitlement approval.
2. The root presentation immediately offers voice; it does not open a menu first.
3. A short set of optional examples can be spoken or listed: “What is on my day?”, “Add a To-do”, “Is Explore recording?”, and “What is nearby?”
4. A user-configured Kwilt Focus filter can enable the reduced iPhone presentation in cars without CarPlay.
5. High-confidence automotive motion may offer the mode once, but cannot silently force it because the phone may belong to a passenger.
6. Disconnecting or parking returns the user to the same Chat thread with any unresolved review visible.

## System implications

- Add a native CarPlay scene and config-plugin generation path rather than editing ignored native output as the source of truth.
- Request `com.apple.developer.carplay-voice-based-conversation`; availability begins at iOS 26.4.
- Build a CarPlay channel adapter over Unified Chat's existing run, capability, proposal, receipt, and recovery contracts.
- Add Explore to the Chat capability registry with a small, explicit read/control surface. Do not make the model read raw route history.
- Design a spoken confirmation policy: direct low-risk creates may apply; reversible updates or higher-risk operations require one concise spoken confirmation; anything that cannot be safely reviewed is deferred to iPhone.
- Prove auth, protected-data access, network behavior, and thread persistence while iPhone is locked.
- Keep audio sessions open only while voice is actively being used.

## Accepted trade-offs

- The first release does not literally show the Explore map on CarPlay.
- Supporting iOS 26.4+ limits early reach.
- Apple entitlement approval is an external gate.
- The first voice surface supports fewer operations than mobile Chat.

## Rejected trade-offs

- Do not weaken action authorization to make voice feel seamless.
- Do not turn Explore into plausible road-matched history or count navigation routes as observed territory.
- Do not classify speed as proof that the phone owner is driving.
- Do not broaden the first release to every Kwilt capability.

## Bet

We're betting that the distinct value is not seeing the whole Kwilt interface in the car; it is being able to speak one real-life need, get a trustworthy result, and continue naturally after arrival. If users primarily miss the visual Explore map, revisit a true discovery-navigation concept rather than forcing the map through an ineligible CarPlay category.

## Success signal

On repeated real drives, Andrew can open Kwilt in CarPlay, complete the standing voice matrix without touching iPhone, trust each spoken result, and continue the same thread after parking. The experience should reduce phone handling rather than merely move it to another screen.
