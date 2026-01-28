## Apple ecosystem opportunities (Widgets, Live Activities, Shortcuts, Spotlight, Focus Filters)

This document describes a comprehensive set of **iOS ecosystem integrations** that can materially improve Kwilt’s activation, engagement, and perceived “aliveness” without expanding the app’s core navigation surface area.

It is intentionally framed to preserve the app’s fundamental UX layers:
- **App shell**: persistent navigation + contextual framing
- **App canvas**: the place where real work happens (inventories, detail screens, workflows)

Ecosystem surfaces should act as **entrypoints + glanceable mirrors** of state, not as a parallel UI system.

---

## Reality check (as implemented today)

This doc includes aspirational recommendations. Here’s what the repo actually implements right now (so we don’t accidentally promise features we don’t ship yet):

- **Widgets**
  - ✅ **Home Screen widget exists**: “Activities” widget, configurable to show a saved view.
  - ✅ **Supported sizes**: medium + large only.
  - ⚠️ **iOS requirement**: the widget is currently implemented as an iOS 17+ widget (`AppIntentConfiguration`).
  - ❌ **Lock Screen widgets**: not implemented / not supported today.
- **Shortcuts / Siri (App Intents)**
  - ✅ Implemented intents: Open Today, Open Next Up, Start Focus, End Focus (best-effort; opens the app).
  - ❌ Not implemented from this doc: “toggle soundscape”, richer “start a specific Activity” UX beyond raw ID param, etc.
- **Spotlight (Core Spotlight)**
  - ✅ Activity indexing exists (IDs + titles only; deep-links into `kwilt://activity/:id`).
  - ✅ Best-effort sync is wired from app startup.
  - ❌ User-facing privacy controls/toggles (indexing on/off) are not described in-app here.
- **Live Activities + Dynamic Island (ActivityKit)**
  - 🟡 A native bridge exists to start/update/end a Focus Live Activity (best-effort).
  - ❌ The widget extension does not yet include a visible `ActivityConfiguration` / Dynamic Island UI, so this is not “done” end-to-end.
- **Focus Filters**
  - ❌ Not implemented.

---

## Why this matters (strategic importance)

### 1) Distribution of attention
iOS widgets, Live Activities, Shortcuts, Spotlight, and Focus mode integrations place Kwilt into the user’s “attention surfaces” (Lock Screen, Dynamic Island, search, automations). This reduces reliance on “open the app, then decide” and moves the product toward “Kwilt is already there when I need it.”

### 2) Lower activation energy (time-to-value)
These surfaces make it easier to:
- start a Focus session
- resume an in-progress session
- open “Today” with one tap
- find an Activity/Goal by searching, not browsing

This is a direct reduction in friction at the moments that matter most for habit formation.

### 3) Reliability under background constraints
iOS suspends JS timers and limits background execution. **Live Activities** (ActivityKit) are Apple’s supported path for a continuously updating timer UI. This provides a robust solution for “countdown while locked” and removes reliance on best-effort background timer behavior.

### 4) Reinforces local-first posture
Most ecosystem integrations can be powered by **local, on-device state** (no accounts required). This aligns with the Phase 0 MVP posture: minimal server scope, local-first everywhere else.

### 5) Compounding ecosystem effects
Once App Intents exist, they power:
- widget buttons
- Siri/Shortcuts
- Spotlight suggestions
- Focus-mode-driven automations

This creates a compounding payoff for each action we formalize.

---

## The surfaces (what we can ship)

### Widgets (WidgetKit)
- **Home Screen widgets**: glanceable planning surfaces.

Recommended widget set (v1):
- **Medium/Large**: “Activities view” (show Activities from a selected saved view; tap to open)

Design principle: widgets show *state + one primary action*, then deep-link into the app canvas.

### Live Activities + Dynamic Island (ActivityKit)
Best match for the “Focus session countdown” because it is:
- visible while locked
- continuously updating
- supported by iOS (not dependent on JS timers)

Recommended v1:
- Focus session timer with title + time remaining
- actions: pause/resume/end
- fallback: if session ends while app is suspended, at minimum show the end state and prompt open app

### Shortcuts + Siri (App Intents)
Canonical “action API” for iOS:
- Start focus (duration preset, optional activity)
- End focus
- Open Today

Intents should primarily deep-link into the app and let the app remain the source of truth.

### Spotlight (Core Spotlight)
Search is a powerful “return path”:
- index Activities (and later Goals/Arcs)
- deep-link to detail screens
- allow iOS to suggest frequently used items

### Focus Filters (Focus Mode integration)
Optional but strategically aligned:
- allow users to bind a specific “Kwilt context” to a Focus mode (e.g., “Work Focus” suggests Work-related Activities)
- keep it minimal: it should influence *initial state / routing*, not add a second UI system

---

## Product principles (how we keep it cohesive)

### Keep shell/canvas intact
- Ecosystem surfaces should route to existing canvases (Today, Activity detail, Focus overlay).
- Avoid introducing a new “mini-app” UX in widgets/Live Activities.

### Shared, “glanceable state” layer
Use a small, versioned state blob that iOS extensions can read quickly:
- **Storage**: iOS App Group `UserDefaults` (or a single JSON file in the App Group container)
- **Writes**: React Native app updates on key changes
- **Reads**: Widget + Live Activity render from this blob

Suggested state payloads (v1):
- `focusSession`: `{ id, startedAtMs, endAtMs, mode, activityId, title }`
- `nextUp`: `{ activityId, title, scheduledAtMs, estimateMinutes }`
- `todaySummary`: `{ top3: [...], completedCount }`

### “One action per surface”
Widgets should avoid multiple competing CTAs. Prefer one main action that opens the correct canvas location.

### Privacy + trust
Widgets and Spotlight can expose sensitive content on Lock Screen/search. Make it user-controlled:
- “Hide sensitive text on Lock Screen” toggle
- “Index items in Spotlight” toggle
- default to safe behavior

---

## Roadmap integration (recommended sequencing)

### Phase 0 (MVP launch readiness)
Do not make ecosystem features launch-blocking. The only Phase 0 items that are worth pulling forward are those that reduce risk or remove glaring friction:
- **Background audio continuity** for Focus soundscapes (already addressed)
- **Deep link correctness** (already required for notifications; reuse for widgets/intents later)

### Phase 1 (post-launch: Agent-first workflows + retention)
Ship the ecosystem foundation and Focus Live Activity early in Phase 1 because it directly improves:
- repeat use
- “Focus mode feels real”
- return paths (Shortcuts/Lock Screen)

Recommended Phase 1 milestones:
1) App Intents foundation (actions + deep links)
2) Live Activity for Focus
3) Lock Screen widget + one Home widget
4) Spotlight indexing for Activities
5) Focus Filters (optional)

---

## Dependencies and implementation notes (high level)

### Native iOS code is required
Widgets, Live Activities, Spotlight indexing, and Focus Filters require native iOS targets (Swift) and build tooling.

### Actions should remain app-owned
Even if an intent can “do something” without opening the app, keep the app as the canonical executor whenever possible (consistent analytics, consistent state transitions).

### Analytics impact
Add event instrumentation for:
- widget impressions (best-effort)
- widget taps / Live Activity actions
- intent invocations (Shortcut use)
- Spotlight opens

This turns “ecosystem work” into measurable retention/activation improvements.

---

## Risks / pitfalls
- **Scope creep**: too many widgets or too many CTA buttons dilutes value.
- **Privacy surprises**: content on the Lock Screen must be user-controlled.
- **State desync**: extensions read a cached blob; keep it versioned and resilient.
- **Maintenance**: iOS OS-level changes; keep extensions small and stable.

---

## Definition of done (v1)
- Users can open Activities from a Home Screen widget reliably (deep links preserve shell/canvas).
- Users can open Today / Next Up / Start Focus / End Focus from Shortcuts reliably (deep links).
- Users can find Activities via Spotlight (IDs + titles only).
- All surfaces preserve the shell/canvas model by routing into existing screens.


