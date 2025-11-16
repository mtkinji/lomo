## LOMO Tasks Roadmap – Path to a Shippable v1

This is a working checklist of tasks to get from the current prototype to a shippable v1 of LOMO. It’s organized roughly in execution order and aligned with the UX flow in `ux-flow.md`.

---

## Phase 1 – Foundation & Architecture

- **1.1 Clarify app scope for v1**
  - Define which flows must exist for v1 (e.g., basic Arcs/Goals/Activities CRUD + one simple Chapter generation flow).

- **1.2 Set up navigation**
  - Add a bottom tab navigator with three tabs: Today, Arcs, Chapters.
  - Ensure each tab uses the existing `AppShell` to preserve shell/canvas separation.

- **1.3 Domain module hardening**
  - Review `src/domain/types.ts` against `ux-flow.md` and update types where needed.
  - Add simple domain utilities (e.g., ID/time helpers, intent vs actual aggregations).

---

## Phase 2 – Local State & Persistence (Local-First)

- **2.1 State layer**
  - Introduce a lightweight global store (e.g., Zustand or context) for Forces, Arcs, Goals, Activities, Chapters.
  - Wire the `Today` tab to read Activities from the store (even if mocked at first).

- **2.2 Seed canonical Forces**
  - Implement a seeding mechanism for the four canonical Forces (Spirituality, Mastery, Activity, Connection).
  - Enforce non-deletable canonical Forces in the store.

- **2.3 Local persistence**
  - Add SQLite or another local DB layer (e.g., `expo-sqlite`) with simple adapters for each entity.
  - Implement load-on-start and save-on-change logic between the store and the DB.

---

## Phase 3 – Arcs & Goals UX

- **3.1 Arcs list and detail**
  - Build Arcs tab canvas:
    - List Arcs with name and one-line narrative.
    - “New Arc” flow (manual create/edit first).
  - Implement Arc detail view with narrative and list of Goals.

- **3.2 Goals under an Arc**
  - Build “New Goal” flow under an Arc:
    - Manual creation with title, description, timeframe, and forceIntent sliders.
  - Show Goals grouped by status (planned, in progress, completed).

- **3.3 AI-assisted Goal creation (stub)**
  - Add “Ask LOMO for concrete goals” button on Arc detail.
  - For now, mock the AI response locally:
    - Generate example Goals and show the review/adjust UI.
  - Later, wire this to the real AI backend (Phase 6).

---

## Phase 4 – Activities & Today Tab

- **4.1 Activities under a Goal**
  - Implement Activities list in Goal detail view.
  - Add manual “New Activity” creation with title, notes, estimate, phase, order.

- **4.2 AI-generated Activity plan (stub)**
  - Add “Generate Activities with AI” button.
  - Mock an AI-generated plan:
    - Multiple Activities with phases and estimates, editable before saving.

- **4.3 Today tab behavior**
  - Implement rule for which Activities appear in Today (e.g., scheduledDate = today + overdue).
  - Build status toggles (planned → in_progress → done / skipped).
  - Implement logging sheet for actualMinutes and forceActual, with a simple UI.

- **4.4 Basic analytics**
  - Add simple intent vs actual visual on Goal detail using aggregated Activity data.

---

## Phase 5 – Chapters (Reflection)

- **5.1 Chapter generation flow (stubbed)**
  - Implement Chapters tab:
    - List of Chapters with title and date range.
    - “Generate Chapter” button with date-range picker and preview counts.
  - Mock Chapter generation locally using domain functions and placeholder text.

- **5.2 Chapter detail screen**
  - Build sections for:
    - Narrative summary.
    - Arc stats.
    - Force stats.
    - Goal highlights.
    - Insights and suggested next Goals (mocked).

- **5.3 Link Chapters to rest of app**
  - Add deep links from Chapter highlights into Arc/Goal/Activity screens.
  - Add “Create this Goal” from suggestedNextGoals (mocked object creation).

---

## Phase 6 – AI Backend Integration

- **6.1 Backend skeleton**
  - Create a small backend service (serverless or Node) with endpoints for:
    - Generating Goals from an Arc + user text.
    - Generating Activities from a Goal + constraints.
    - Generating Chapters from a date range.

- **6.2 Prompt design**
  - Design prompts for each AI flow based on domain types and `ux-flow.md`.
  - Implement request/response validation (zod or similar).

- **6.3 Wire mobile app to backend**
  - Replace mocked AI calls in the app with real network calls.
  - Add error states and loading indicators for AI operations.

---

## Phase 7 – Polish, Settings, and Prep for Release

- **7.1 Design & visual polish**
  - Refine typography, spacing, and color system for shell vs canvas.
  - Add icons, empty states, and microcopy that match the life-architecture tone.

- **7.2 Settings & safety**
  - Add basic settings screen (e.g., data export, theme toggle, feedback link).
  - Implement local backup/export (JSON) for Arcs/Goals/Activities/Chapters.

- **7.3 Performance & stability**
  - Test on physical devices (iOS and Android).
  - Fix any performance issues with large numbers of Activities/Chapters.

- **7.4 Release prep**
  - Configure app icons, splash screens, and app metadata.
  - Set up EAS builds and run a test flight / internal testing round.

---

## Phase 8 – Post-v1 Enhancements (Nice-to-Haves)

- **8.1 Drift detection nudges**
  - Implement periodic suggestions when forceIntent and forceActual diverge.

- **8.2 Web dashboard**
  - Add a web client sharing the same backend model for richer reflection.

- **8.3 Sync & accounts**
  - Add user accounts and cloud sync for multi-device support.


