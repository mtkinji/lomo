# Explore Use Cases And Adaptive GPS Policy

## Approved direction

Explore uses three internal location policies: Ambient, Adventure, and Presence. People do not choose a battery or fidelity preset. Their explicit action selects the broad intent, and motion, speed, accuracy, and stillness adapt the location profile inside that intent.

Fog clearing remains a fixed roughly 100-foot radius around the trusted path. Altitude colors the route and may appear in recaps, but never changes reveal distance. This keeps coverage predictable at home, at sea level, in the mountains, and while traveling.

## Fun use cases

| Person and moment | What should feel magical | What must not break |
| --- | --- | --- |
| A child deliberately clears unexplored neighborhood streets | Every new block visibly fills in | A short stop must not hide the next block |
| A family goes on a fog-clearing expedition | Everyone can contribute to new territory after consent | Playground and snack stops must not create visible gaps |
| A dog walker changes the evening route | Familiar territory grows without opening Kwilt | Routine walks must not cause noticeable all-day battery drain |
| A tourist wanders a city on foot | The trip becomes a coherent map with collected Places | Alleys and turns must not disappear after cafe stops |
| A family visits a zoo, theme park, or fair | Paths and attractions accumulate naturally | Queues must not repeatedly stop and restart recording |
| A hiker follows switchbacks | The trail shape and elevation-colored path remain recognizable | Sparse points must not cut across switchbacks |
| A runner explores a new route | Corners and loops remain continuous | Traffic lights must not end the outing |
| A cyclist explores greenways | Long-distance territory appears without excessive drain | Sampling must remain responsive enough around turns |
| A skier or snowboarder explores a resort | Runs become distinct paths | Chairlift movement must not be mistaken for a new run |
| A road-tripper collects highways, towns, and overlooks | A large journey becomes a visible story | Straight highways must not use walking-level GPS frequency |
| A geocacher searches near a destination | Fine local movement remains useful | Searching in a small area must not look stationary too soon |
| A family picnics and resumes walking | The pause becomes part of one calm outing | A long stop must not waste precise GPS or lose the departure |
| A boater explores a lake or shoreline | Water travel can become part of the known map | Boat speed must not be reduced to an automotive assumption |
| A museum or indoor-attraction visitor | The venue can become a collected Place | Weak indoor GPS must not clear nearby streets falsely |

## Practical use cases

| Person and moment | Primary need | GPS implication |
| --- | --- | --- |
| A parent runs errands | Remember stops without post-trip administration | Capture arrival, then sleep while inside stores |
| Someone wants to remember where they parked | Preserve the approach and parking Place | Establish arrival before sleeping |
| A commuter mixes driving, transit, and walking | Retain a useful account of where they went | Adapt when the movement class changes |
| A parent waits at school pickup | Avoid spending precise GPS for a long dwell | Sleep quickly without treating the next drive as lost |
| Family members meet at a crowded event | See a reasonably fresh position | Use Presence freshness, not Adventure path fidelity |
| A traveler wants a trip journal | Preserve cities, walks, and named Places | Use calm ambient collection and batched recaps |
| A teen or older family member shares location | Offer everyday reassurance | Show update freshness; never imply emergency-grade tracking |
| A field worker moves among sites | Recall sites visited | Long site visits should sleep aggressively |
| Someone remains home or at work for hours | Record nothing new | Enter deep sleep as soon as stillness is credible |
| Someone attends dinner, church, a movie, or an appointment | Collect the Place, then preserve battery | Five-minute deep sleep is appropriate |
| Someone walks inside a large shopping center | Recognize the destination without inventing a route | Freeze fog when accuracy becomes weak |
| Someone needs emergency or lost-person tracking | Guaranteed current location | Explicitly unsupported; Explore is not safety infrastructure |

## Alternatives considered

### One universal timer

A single five-minute timeout is simple, but queues, traffic lights, hikes, long home stays, and live family presence have different costs when a wake is late.

### User-selectable fidelity profiles

Efficient, Detailed, Driving, Hiking, and similar settings offer control but turn a playful feature into GPS configuration. This fails Kwilt's calm, non-power-user posture.

### Intent plus movement adaptation

This is the chosen approach. Existing user actions select the broad policy, while the runtime adapts within it. It gives the system useful context without adding another settings matrix.

## Internal policies

### Ambient

Selected by `Always Exploring`. It serves dog walks, errands, travel, commuting, and ordinary life.

- Enter soft sleep after two minutes of credible stillness.
- Enter deep sleep after five minutes.
- Treat a movement gap beyond ten minutes as an outing boundary.
- Wake through low-power movement or an exit condition.
- Accept a modest reconstructed departure gap in exchange for all-day battery viability.

### Adventure

Selected by `Start Exploring`. It serves hikes, runs, cycling, skiing, geocaching, theme parks, and deliberate fog clearing.

- Enter soft sleep after three minutes of credible stillness.
- Retain a low-power movement sentinel.
- Enter deep sleep only after approximately fifteen minutes.
- Keep one outing across pauses up to approximately thirty minutes.
- Favor recognizable route geometry over maximum battery savings.

### Presence

Selected only when a person explicitly enables live family location sharing. Presence is a freshness policy, not a fog-path policy.

- Drop to coarse updates after two minutes of stillness.
- Use an occasional stationary heartbeat rather than continuous precise GPS.
- Wake on meaningful movement.
- Always show how recently the position was updated.
- Never describe Presence as emergency or safety monitoring.

Presence remains a future authenticated sharing capability. The local Explore recorder must not imply that it already provides remote family delivery.

## Movement and quality modifiers

- Walking or running: use approximately 25-35-meter route spacing.
- Cycling or skiing: use approximately 50-80-meter route spacing.
- Vehicle, boat, or train: use approximately 150-250-meter spacing and longer delivery batches.
- Repeated stop-and-go movement: delay deep sleep so traffic lights and queues do not cause flapping.
- Poor horizontal accuracy: stop clearing fog rather than reveal false territory.
- Long home- or work-like dwell: favor deep sleep.
- Approaching a named Place: preserve enough detail to establish arrival before sleeping.
- Airplane-like speed: suspend fog clearing.

## Sleep and outing semantics

Battery state and outing state are separate. Soft sleep can reduce precise work without ending an outing. Deep sleep can stop precise GPS while a low-power wake condition remains. A later sample decides retrospectively whether the person resumed the same outing or began another.

Cheap wake signals are coarser than active GPS. Region exits may be delayed by system time and distance cushions, so Adventure waits longer than Ambient before deep sleep. See [Apple's region-monitoring behavior](https://developer.apple.com/library/archive/documentation/UserExperience/Conceptual/LocationAwarenessPG/RegionMonitoring/RegionMonitoring.html) and [location-efficiency guidance](https://developer.apple.com/documentation/xcode/accessing-the-device-s-location-efficiently).

## Product and privacy guardrails

- Do not add user-facing battery or activity presets.
- Do not infer sharing from a recording mode or movement class.
- Do not clear fog from weak or implausible samples.
- Do not scale reveal distance by altitude.
- Do not claim emergency-grade or guaranteed location delivery.
- Keep raw route, Place identity, and visit timestamps out of analytics.

## Implementation status

The current branch implements Ambient and Adventure as `Always Exploring` and `Only when I start`, with fixed efficient profiles, automatic stillness handling, and combined recaps. The three-policy adaptive state machine, deep-sleep wake condition, motion classification, and Presence freshness behavior are approved design work but are not yet implemented or signed-device proven.
