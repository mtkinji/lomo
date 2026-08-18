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
  - ⚠️ The implemented intents are deep-link entrypoints, not the accepted entity-first Siri strategy below. Start Focus still exposes a raw Activity ID rather than resolving a user-facing To-do entity.
  - ❌ App Entity representations, capability-backed capture/query intents, App Schema adoption, and signed-device Siri proof are not implemented.
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

#### Accepted direction: entity-first, capability-backed

App Intents are Kwilt's system-facing adapter, not a second action system and
not a growing list of deep links. Siri, Shortcuts, Spotlight, widgets, and
future Apple Intelligence surfaces should resolve user-facing App Entities,
then invoke the same capability-owned operations, consequence policy,
confirmation, authoritative receipts, and undo used by Unified Chat.

```text
Siri / Shortcuts / Spotlight
            ↓
    App Intents + App Entities
            ↓
   Kwilt capability manifest
            ↓
capability-owned read, policy, apply, receipt, undo
```

The accepted entity priority is based on likely repeated use rather than equal
coverage of every Kwilt object:

| Priority | Entity representation | First useful Siri jobs |
| --- | --- | --- |
| 1 | To-do | Add, find, open, and start Focus on a resolved To-do. |
| 1 | Grocery list and Grocery item | Add one or several items, read what remains, and open the list. |
| 1 | Budget category | Ask dollars left or percent used from a current authoritative Money projection. |
| 2 | Recipe | Find or open a Recipe; later review sending needed ingredients to Groceries. |
| 2 | Goal | Resolve relationships such as “under my Family goal” and support find/open. Do not make Goal-specific shortcuts a launch priority. |
| 2 | Focus session | Start, inspect, and end a session using the owning Focus behavior. |

Grocery capture needs both levels even while Kwilt presents one primary list:
the list is the target of “add milk to my shopping list,” while items are the
addressable results for find, complete, or remove behavior.

Goal representation is useful connective tissue even if direct Goal commands
are uncommon. It lets Siri resolve a To-do's intended context without promoting
Goal maintenance as a headline voice workflow.

#### Two invocation lanes

Use a direct lane for clear, bounded operations such as adding a To-do, adding
Groceries, opening a Recipe, querying a Budget category, or starting Focus.
These intents may finish without opening Kwilt only when the owning capability
can return an authoritative result under its normal consequence policy.

Use an **Ask Kwilt** lane for open-ended or cross-capability requests. That lane
hands the utterance and resolved context to the existing Unified Chat / Live
runtime. The resulting transcript, proposal, confirmation, receipt, correction,
and undo remain part of Kwilt rather than being reimplemented in Swift.

#### Money privacy and truth boundary

`BudgetCategoryEntity` initially contains only stable identity and display
metadata. It does not publish balances, transactions, plan amounts, or dollars
remaining to Spotlight or the semantic entity index. Siri resolves a named
category through a bounded on-demand query, and a read-only intent requests the
answer from Money's authoritative projection at invocation time.

Spoken and displayed Money answers must include freshness and preserve these
distinct meanings:

- “How much is left in Groceries?” means category plan room.
- “How much do we have left to spend this month?” means whole-plan flexible money.
- “How much is safe until payday?” remains unavailable until Kwilt has trustworthy balances, bill timing, and expected-income evidence.

Money privacy lock and device-authentication requirements remain in force. If
Kwilt cannot establish a current trustworthy answer, Siri should offer to open
Money rather than present an unlabeled cached amount. No financial values enter
analytics.

#### Schema and execution posture

Adopt Apple App Schemas only where Kwilt's semantics genuinely match the system
domain. System search/open is a natural fit. Reminder creation may fit a Kwilt
To-do, but Goals, Plans, and identity-bearing Activities must not be mislabeled
as reminders merely to gain Siri reach.

App Intent adapters should derive from or map explicitly to the canonical
capability manifest:

- no-confirmation operations may complete directly when their execution environment is truthful;
- explicit-confirmation operations return a proportionate proposal;
- native-confirmation operations open the owning Kwilt review surface; and
- unavailable operations fail honestly instead of producing adjacent prose.

App Entities describe existing Kwilt records; they do not create a parallel
domain model. Raw database IDs are never user-facing intent parameters.

### Spotlight (Core Spotlight)
Search is a powerful “return path”:
- index only explicitly eligible App Entities, beginning with To-dos and Recipes
- deep-link to detail screens
- allow iOS to suggest frequently used items

Financial values are not indexed. Goal indexing is not required for the first
release; a bounded entity query can still support relationship resolution.

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
1) App Entities + capability-backed App Intents for To-dos, Groceries, and read-only Budget answers
2) Live Activity for Focus
3) Lock Screen widget + one Home widget
4) Explicitly eligible entity indexing for To-dos and Recipes
5) Focus Filters (optional)

---

## Dependencies and implementation notes (high level)

### Native iOS code is required
Widgets, Live Activities, Spotlight indexing, and Focus Filters require native iOS targets (Swift) and build tooling.

### Actions should remain app-owned
Even if an intent can do something without opening the app, the owning Kwilt
capability remains the semantic authority. Native adapters may execute in the
background only through the same validation, policy, idempotency, receipt, and
undo contract; otherwise they open the exact native review destination.

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
- **Financial disclosure**: do not index or speak Money values without satisfying the active Money privacy and authentication policy.
- **State desync**: extensions read a cached blob; keep it versioned and resilient.
- **Parallel semantics**: Swift intent handlers must not recreate capability rules or claim success from deep-link dispatch alone.
- **Maintenance**: iOS OS-level changes; keep extensions small and stable.

---

## Definition of done (v1)
- Users can open Activities from a Home Screen widget reliably (deep links preserve shell/canvas).
- Users can open Today / Next Up / Start Focus / End Focus from Shortcuts reliably (deep links).
- A user can add a To-do and one or several Grocery items in natural language and receive the authoritative saved result.
- A user can ask what remains in a named Budget category and receive the same amount, meaning, and freshness as native Money—or an honest unavailable result.
- Start Focus resolves a user-facing To-do entity rather than requiring a raw Activity ID.
- Users can find explicitly eligible To-dos and Recipes through system search without exposing excluded private fields.
- Goal entities support relationship resolution without requiring Goal-focused shortcut promotion.
- Focused intent/entity tests, Shortcuts inspection, Spotlight discovery, and signed-device Siri utterance checks remain distinct proof gates.
- All surfaces preserve the shell/canvas model and capability-owned policy, results, receipts, and undo.

