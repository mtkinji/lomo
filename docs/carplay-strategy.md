# Kwilt CarPlay And Driving Experience Strategy

Status: product strategy, not an implementation commitment

Date: 2026-08-02

## Executive recommendation

Kwilt should pursue CarPlay as a **voice-first channel into Unified Chat**, with Explore as a distinctive source of context and a small set of driving-safe actions.

It should not begin by putting the Silver Mist map on the dashboard. Apple's current rules reserve custom CarPlay maps for navigation apps that provide turn-by-turn directions and upcoming maneuvers. A driving-task app also cannot be a general location finder. Kwilt does not currently own that navigation job.

The initial proposition is simpler:

> While I drive, I can talk to Kwilt, capture what matters, understand what is happening in Explore, discover a few nearby possibilities, and continue naturally when I arrive.

This is analogous to the useful part of the Audible inspiration: the car gets a presentation shaped around the context, not a reduced replica of the phone UI. For Kwilt, the car-native medium is conversation and concise audio, not a dense visual hierarchy.

## Why this is newly viable

Apple now supports **voice-based conversational apps** in CarPlay starting with iOS 26.4. The category requires voice to be the primary modality at launch, requires the app to respond to requests or perform actions, and instructs developers to optimize for voice rather than presenting text or imagery as the response. CarPlay apps still require Apple approval for a category-specific managed entitlement. See Apple's [CarPlay overview](https://developer.apple.com/carplay/), [entitlement documentation](https://developer.apple.com/documentation/carplay/requesting-carplay-entitlements), and [2026 CarPlay session](https://developer.apple.com/videos/play/wwdc2026/212/).

The category fits Kwilt Chat better than any older CarPlay category:

- Kwilt already accepts natural-language and voice input.
- Unified Chat already routes to capability-owned reads and actions.
- Low-risk To-do creation already produces durable authoritative results.
- Threads, proposals, receipts, retry, recovery, and exact return destinations already exist.
- Explore already understands vehicle movement, records private journeys, resolves nearby places through MapKit, and separates suggestions from observed history.

The strategic work is therefore not building a second assistant. It is adapting the existing trusted agent runtime to a much smaller attention budget.

## The product concept: Paired Road Mode

Paired Road Mode gives each surface a distinct job:

| Surface | Primary job | What belongs there |
| --- | --- | --- |
| CarPlay | Speak, listen, and complete one bounded job | Push-to-talk Chat, concise answers, simple confirmations, Explore state, Nearby choices, navigation handoff |
| iPhone while CarPlay is active | Stay out of the driver's way | No duplicate interaction flow; preserve state and prepare continuity |
| iPhone without CarPlay | Optional reduced driving presentation | Voice-first capture and short audio replies when explicitly enabled |
| iPhone after arrival | Inspect and continue | Full Chat thread, proposals, receipts, Explore map, Places, and recap |

The CarPlay icon should open directly into **Talk to Kwilt**. There should not be separate top-level tabs for Chat, Explore, Plan, Money, Games, and Screen Time. Capability selection is the agent runtime's job, not something the driver should manage.

## What the first CarPlay version should do

The smallest coherent version supports four recurring jobs.

### 1. Capture something that matters

Examples:

- “Add a To-do to call the campground tomorrow.”
- “Remember to pick up the prescription on the way home.”

An explicit, low-risk To-do create can use the existing direct-apply path. Kwilt speaks a short receipt containing the saved title and any explicit date. If the request is ambiguous or needs complex editing, it is preserved in the same Chat thread for review after arrival.

### 2. Ask one bounded question about the day

Examples:

- “What is actually on my Plan tonight?”
- “What is the next thing I committed to?”

Answers should be short and sourced from capability-owned state. CarPlay is not the place for a full coaching essay, calendar browser, or dashboard.

### 3. Interact with Explore safely

Examples:

- “Is Explore recording?”
- “Start exploring.”
- “What interesting outdoor places are nearby?”
- “Take me to the second one.”

The first Explore adapter should expose only:

- current recording state;
- explicit start/stop of a manual outing;
- up to three ephemeral Nearby recommendations;
- a destination handoff to Apple Maps;
- an optional short arrival summary.

It must preserve Explore's current truth contract:

- a recommended location is not a Place, visit, Mission, or cleared territory;
- starting recording does not change sharing;
- navigation geometry does not become observed Explore history;
- raw routes and Place timestamps stay out of analytics.

### 4. Continue after arrival

The CarPlay exchange should be an ordinary durable Unified Chat thread with channel metadata, not a new Drive object. After parking, the user can inspect what was applied, approve anything deferred, correct a transcript, open the Explore map, or continue the conversation from the exact point where it stopped.

This continuity is a core part of the value. A car interaction that disappears at disconnect would make Kwilt feel less trustworthy than the phone app.

## Capability strategy

| Capability | Initial CarPlay posture | Rationale |
| --- | --- | --- |
| Chat | Core channel | Best fit for Apple's voice-based conversational category and Kwilt's current architecture |
| Explore | Bounded context and actions | Differentiated value without misusing a map entitlement |
| Plan / To-dos | Read and low-risk capture | Common in-motion needs with existing capability-owned truth paths |
| Arcs / Goals | Short read or capture only, later | Useful context, but detailed reflection and editing belong after arrival |
| Chapters | Optional short audio recap, later | Listening may fit; authoring and long reflection do not |
| Money | Exclude from the first release | Financial evidence is detailed and sensitive; actions are unrelated to the drive and easy to mishear |
| Screen Time | Exclude | Controls and authorization are not appropriate driving tasks |
| Games | Exclude | Apple explicitly prohibits gaming in CarPlay |
| Household / live location | Exclude | High privacy risk and no need to create a family tracking surface |

The rule is not “put every Kwilt capability in the car.” A capability appears only when it can complete a meaningful job through a short speak-listen-confirm loop.

## Why the Explore map should wait

Apple's current CarPlay guide is explicit:

- navigation apps must provide turn-by-turn directions and upcoming maneuvers;
- custom map UI is a navigation-app capability;
- driving-task apps cannot use custom maps and cannot primarily be location finders;
- all CarPlay flows must be meaningful while driving and must be completable without handling iPhone.

The present Explore map is a private record of observed movement and discovered territory. It is not route guidance. Calling it navigation to obtain map access would create both entitlement risk and a product-truth problem.

There is a credible long-term path, but it is a different strategy:

> Help me choose and follow a safe route that lets me discover somewhere new, rather than merely optimizing for the fastest arrival.

If Kwilt eventually provides route selection, turn-by-turn maneuvers, rerouting, arrival behavior, country coverage, audio prompts, and navigation-grade field proof, an Explore navigation app could honestly render Silver Mist behind CarPlay's map controls. Until then, the visual map belongs on iPhone after arrival.

## Driving-aware iPhone behavior

CarPlay connection is a definitive presentation signal. Outside CarPlay, driving is probabilistic.

Kwilt already classifies vehicle movement from location speed for Explore's adaptive recording. iOS Core Motion can also report automotive motion with confidence. Neither signal proves that the phone owner is the driver; the person may be a passenger, on a bus, or in a rideshare. Apple exposes automotive motion through [`CMMotionActivity`](https://developer.apple.com/documentation/coremotion/cmmotionactivity), including cases where automotive and stationary can both be true at a traffic light.

The activation hierarchy should be:

1. **CarPlay connected:** use the CarPlay scene and keep iPhone interaction out of the primary flow.
2. **User-configured Driving Focus filter:** activate the user's chosen Kwilt driving presentation. Apple supports app-specific behavior through [`SetFocusFilterIntent`](https://developer.apple.com/documentation/appintents/defining-your-app-s-focus-filter).
3. **Manual “Drive with Kwilt” entry:** offer the same reduced phone experience in a non-CarPlay car.
4. **High-confidence automotive motion:** at most suggest the mode contextually; never force it or treat it as driver identity.

The reduced phone presentation should have one large push-to-talk control, short audio responses, a clear exit for passengers, and no dense Chat transcript or Explore controls. It should not become a moralizing “you are moving, so you are blocked” system.

## Interaction and trust contract

The driving channel needs a stricter version of Unified Chat's existing contract.

### Voice and attention

- Voice is primary from launch.
- Listening begins only after explicit activation; no passive hot mic.
- Audio sessions stay open only during active voice use.
- Responses lead with the result and stay short.
- Long answers, comparisons, and setup are deferred to the phone after arrival.
- The user can stop speech immediately.

### Actions

- Read-only questions may answer directly.
- Explicit low-risk creates may apply through the current authoritative path.
- Reversible updates can use one concise spoken confirmation when the complete change can be understood by ear.
- Complex, destructive, sensitive, or multi-item proposals are deferred.
- Spoken success always reflects a capability receipt, never model intent.
- A deferred action is described as saved for review, not completed.

### Privacy

- Do not speak private details unnecessarily when passengers may be present.
- Let the user choose a “private replies” posture that answers generically and leaves details for later.
- Never expose raw route history, household location, or sensitive financial detail on the car screen.
- Preserve the current separation between recording, sharing, and viewing.

## Native and platform strategy

The implementation should be a thin native CarPlay channel over existing product ownership.

### Required platform pieces

- Request Apple's managed `com.apple.developer.carplay-voice-based-conversation` entitlement. The current minimum is iOS 26.4.
- Generate the CarPlay scene manifest, delegate, source files, and entitlements from the tracked Expo config plugin. Generated `ios/` output is proof, not the source of truth.
- Use `CPVoiceControlTemplate` as the primary state surface, with supported list or point-of-interest templates only where they reduce ambiguity.
- Use CarPlay scene lifecycle callbacks to establish connection and disconnect state.
- Use availability guards so the app's existing iOS 15.1 deployment target remains valid.
- Keep the existing native MapKit nearby-search module as the source of ephemeral candidates.

### Required product adapters

- A CarPlay channel adapter that invokes Unified Chat's existing planning, context, execution, outcome, and persistence phases.
- An Explore capability adapter with an intentionally tiny operation catalog.
- A spoken-response formatter that converts authoritative outcomes into one-listen language without hiding uncertainty.
- A spoken confirmation and defer policy tied to operation risk.
- A continuity projection so mobile Chat can render CarPlay messages, proposals, and receipts normally.

### Feasibility risks to prove early

- CarPlay entitlement approval.
- React Native and CarPlay secondary-scene lifecycle under Expo-generated native code.
- microphone input, speech playback, interruption, and coexistence with music, calls, Siri, and navigation prompts;
- Supabase auth and required protected data while iPhone is locked;
- process suspension, network loss, CarPlay reconnect, and duplicate-free retries;
- Explore recorder continuity when the CarPlay scene connects or disconnects;
- template limits across screen sizes, touchscreens, knobs, and touch pads.

## Release strategy

### Stage 0: entitlement and native proof

Prepare an entitlement request that describes Kwilt accurately as a voice-based conversational app that answers questions and performs bounded personal-life actions. Build only enough native surface to prove the app icon, scene lifecycle, push-to-talk audio, and locked-device network/auth path.

Gate: entitlement approved and one end-to-end authenticated voice turn works in CarPlay Simulator and a signed device/head-unit setup.

### Stage 1: Andrew-only learning release

Support the four-request matrix:

1. read today's Plan;
2. create one explicit To-do;
3. read/start/stop Explore recording;
4. request Nearby candidates and hand one to Apple Maps.

Gate: ten real drives across at least two CarPlay environments with no required phone handling and exact receipt truth.

### Stage 2: driving-aware iPhone fallback

Add a user-configured Focus filter and manual entry for cars without CarPlay. Use automotive motion only as a suggestion signal.

Gate: passenger escape and mode activation are understandable without repeated prompts or false classification.

### Stage 3: selective capability expansion

Expand only from observed drive requests. Candidate additions include short Goal context, a requested Chapter excerpt, capture of a Place candidate for later review, and a short arrival recap.

Gate: each addition completes a recurring car job in one or two turns and can preserve the same trust contract.

### Separate future bet: Explore navigation

Do not schedule this as automatic phase 4. Start a new design and technical strategy only if demand repeatedly centers on the visual map and Kwilt is prepared to become a real turn-by-turn navigation app.

## Success measures

The north-star behavior is:

> A person completes a real Kwilt job during a drive without touching iPhone, trusts the result, and naturally continues in Kwilt after arrival.

Early measures:

- supported requests completed without phone handling;
- applied actions with matching authoritative receipts;
- median number of spoken turns per completed job;
- voice turns cancelled, failed, or deferred;
- CarPlay threads reopened on iPhone after arrival;
- repeat use across drives;
- zero Explore recording corruption or recommendation-to-history leakage.

Do not measure raw route coordinates, raw audio, raw transcripts, Nearby names, or visit timestamps. Avoid vanity measures such as time spent in CarPlay or number of assistant words spoken.

## Decision summary

1. Pursue CarPlay through the new voice-based conversational entitlement.
2. Make **Talk to Kwilt** the only initial CarPlay root.
3. Treat Explore as trusted context and bounded actions, not a copied map.
4. Reuse Unified Chat threads, capability ownership, proposals, receipts, and continuation.
5. Make driving-aware iPhone behavior explicit or opt-in; never equate motion with driver identity.
6. Exclude Money actions, Screen Time, Games, and family tracking from the first release.
7. Treat true Explore navigation as a separate future product bet.

## Related design records

- [Frame](design-explorations/carplay-and-driving-mode/00-frame.md)
- [Yes-And](design-explorations/carplay-and-driving-mode/01-yes-and.md)
- [Divergence](design-explorations/carplay-and-driving-mode/02-diverge.md)
- [Convergence](design-explorations/carplay-and-driving-mode/03-converge.md)
- [Learning release](design-explorations/carplay-and-driving-mode/04-learning-release.md)
- [Learning evaluation](design-explorations/carplay-and-driving-mode/05-evaluate-learning.md)
- [Current Explore capability](../src/capabilities/explore/FEATURE.md)
- [Explore use cases and adaptive GPS policy](design-explorations/explore-recap/06-use-cases-and-adaptive-gps.md)
- [Unified Chat feature manifest](../src/features/unifiedChat/FEATURE.md)

## Primary Apple references

- [CarPlay for app developers](https://developer.apple.com/carplay/)
- [CarPlay Developer Guide, June 2026](https://developer.apple.com/download/files/CarPlay-Developer-Guide.pdf)
- [CarPlay Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/carplay/)
- [Requesting CarPlay entitlements](https://developer.apple.com/documentation/carplay/requesting-carplay-entitlements)
- [Rev up your CarPlay app, WWDC26](https://developer.apple.com/videos/play/wwdc2026/212/)
- [CarPlay voice-control template](https://developer.apple.com/documentation/carplay/cpvoicecontroltemplate)
- [CarPlay map template](https://developer.apple.com/documentation/carplay/cpmaptemplate)
- [Core Motion automotive activity](https://developer.apple.com/documentation/coremotion/cmmotionactivity)
- [Defining an app Focus filter](https://developer.apple.com/documentation/appintents/defining-your-app-s-focus-filter)
