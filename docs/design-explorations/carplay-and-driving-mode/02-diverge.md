# Diverge: CarPlay And Driving Mode

## Axis of variation

The alternatives vary by primary interface and system role: visual map, voice agent, passive glance, or coordinated multi-surface experience.

## Alternative A: Explore Dashboard

Put the Silver Mist map, current trail, nearby pins, and recording controls directly on the CarPlay display.

- Persona fit: emotionally direct for a person who wants to “see Explore” while driving.
- Design-challenge answer: makes the journey visible with fewer controls than the phone app.
- System fit: weak. It reuses Explore data, but Apple's custom CarPlay map is reserved for navigation apps that provide turn-by-turn directions and upcoming maneuvers.
- Objects touched: Explore sessions and Places; no Arc, Goal, Activity, or Chapter changes.
- Capture-first stance: does not block capture.
- Best when: Kwilt has become a real navigation product.
- Fails when: the map is exploration history rather than route guidance; entitlement approval and App Review would be structurally weak.
- Anti-pattern check: the map itself passes Kwilt's voice, but bending a safety category to gain screen access fails trust.

## Alternative B: Drive With Kwilt

Launch into a voice-first CarPlay conversation. The user can ask about the day, capture a To-do, check whether Explore is recording, ask what is nearby, choose a destination handoff, and hear a concise receipt. The session persists in ordinary Unified Chat.

- Persona fit: strongest for Nina because it brings an existing trusted agent channel into the place where she is thinking.
- Design-challenge answer: replaces visual navigation through Kwilt with speak/listen/action loops.
- System fit: strong extension. It reuses Unified Chat and capability ownership, but needs a CarPlay scene, voice-conversation entitlement, locked-device auth proof, spoken confirmation policy, and an Explore Chat adapter.
- Objects touched: Activities for low-risk capture; existing Chat threads/runs/receipts; Explore state and ephemeral Nearby results.
- Capture-first stance: preserves immediate capture without requiring Arc or Goal selection.
- Best when: the request can be understood and completed in one or two spoken turns.
- Fails when: the user needs detailed visual comparison, complex editing, or a long answer.
- Anti-pattern check: passes if the assistant remains concise, non-anthropomorphic, and truthful about actions and limits.

## Alternative C: CarPlay Glance

Use a CarPlay-compatible small widget and Live Activity to show only a current state: Explore recording, current focus timer, or the next relevant item. Taps perform one safe action or open a CarPlay app when available.

- Persona fit: useful but narrower than the offered need.
- Design-challenge answer: provides passive reassurance with almost no interaction.
- System fit: strongest technically. Kwilt already has WidgetKit, ActivityKit, App Group state, and small widgets, though no Explore-specific CarPlay widget exists.
- Objects touched: none; it projects existing state.
- Capture-first stance: neutral; it does not provide rich capture.
- Best when: the user wants to confirm state at a glance.
- Fails when: the user wants to ask, capture, or discover.
- Anti-pattern check: passes if the widget has a practical car purpose and does not become a scorecard.

## Alternative D: Driving-Aware iPhone

When the user explicitly enables a Kwilt Focus filter, manually enters driving mode, or connects CarPlay, the iPhone app presents a reduced voice surface with large controls and short audio replies. High-confidence vehicle motion can suggest this presentation, but never silently prove that the user is the driver.

- Persona fit: broadest device coverage and valuable in cars without CarPlay.
- Design-challenge answer: adapts the existing app to a low-attention moment.
- System fit: medium. It can reuse Chat voice and Explore's vehicle classification, but it needs a product-level attention state and careful passenger escape.
- Objects touched: none beyond whatever action the user requests through Chat.
- Capture-first stance: strong; capture stays available through voice.
- Best when: CarPlay is unavailable or disconnected.
- Fails when: automatic detection is treated as certainty, or the app locks a passenger out of the normal UI.
- Anti-pattern check: passes if it is calm, optional, and does not shame or police use.

## Alternative E: Paired Road Mode

Combine B, C, and D as one coherent system: voice-first CarPlay when connected, a small glanceable projection where appropriate, and an opt-in reduced iPhone presentation otherwise. All paths return to ordinary Chat and Explore after the drive.

- Persona fit: strongest across the full journey because it changes presentation without fragmenting capability ownership.
- Design-challenge answer: gives each display the job it can safely do.
- System fit: medium-to-strong if delivered in stages; high blast radius if attempted all at once.
- Objects touched: existing Chat, Activities, Explore, and projection state only.
- Capture-first stance: strong.
- Best when: staged as a narrow voice beachhead followed by contextual extensions.
- Fails when: it becomes a blanket “car version of Kwilt” with every capability represented.
- Anti-pattern check: passes if the surface remains one sharp low-attention channel and refuses Games, dashboards, long setup, and unrelated controls.

## Divergence conclusion

Alternative E is the strategic direction, with Alternative B as the first product slice. Alternative A should remain a future navigation thesis rather than part of the initial CarPlay pitch.
