## LOMO UX Flow – AI-Guided, End-to-End

This document describes an ideal, simple, AI-assisted UX flow through LOMO, from first run to reflection. It’s written to guide implementation decisions for navigation, flows, and state.

---

### 0. Structure: App Shell vs Canvas

- **App shell**
  - Always visible.
  - Top: app name and subtle period context (e.g., “This Chapter: Apr 1–May 15”).
  - Bottom: primary navigation tabs:
    - **Today** – doing and logging Activities.
    - **Arcs** – identity directions and Goals.
    - **Chapters** – AI-generated lookbacks.

- **Canvas**
  - The main content area within each tab.
  - All deep flows (create Arc, Goal, Activities, Chapter) happen inside this canvas with focused, low-friction interactions.

AI should appear as inline helpers (“Ask LOMO”, suggestions, rewrites), not as a separate mode.

---

### 1. First-Run Experience

> **Note:** The detailed, identity-first FTUE that creates a single onboarding Arc from five tap-only identity questions is specified in `docs/arc-aspiration-ftue.md`. Treat that document as the source of truth for the current FTUE question set and Arc synthesis model; this section remains a higher-level, earlier sketch of the overall flow.

#### 1.1 Welcome & Lightweight Profile

- **Canvas content**
  - Short framing:
    - LOMO helps you design how you grow (Arcs, Goals, Activities) and reflect on what actually happened (Chapters).
  - Inputs:
    - **Current hunger for change**: free-text prompt like “Where are you most hungry for change right now?”
    - **Time horizon**: picker such as “Next 4 weeks / Next 3 months / This year”.

- **AI role**
  - Use the answers to propose 2–3 starter **Arcs**.
  - Propose a suggested focus period name (e.g., “Spring Craft & Stewardship”).

- **User action**
  - Review proposed Arcs:
    - Accept all, remove some, or rename/edit before saving.
  - Primary CTA: **“Looks like me”** to save chosen Arcs and proceed.

---

### 2. From Arc to Goals

#### 2.1 Arcs Overview (Arcs Tab)

- **Canvas**
  - Cards for each Arc displaying:
    - Name and one-line narrative.
    - Simple indicators: number of Goals, Activities completed this period.
  - Primary CTA on each Arc: **“Clarify this Arc”**.

#### 2.2 AI-Guided Goal Creation

- **Flow inside an Arc**
  - Prompt:
    - “In ‘{Arc name}’, what would feel like meaningful progress in the next 6–12 weeks?” (optional text).
  - CTA: **“Ask LOMO for concrete goals”**.

- **AI role**
  - Given Arc narrative + optional user text, propose 2–4 **Goal drafts** with:
    - Title.
    - 1–2 sentence description.
    - **Force intent** vector (Spirituality, Mastery, Activity, Connection; 0–3 per Force).
    - Optional metrics.
  - Label each as “identity-style” or “outcome-style” where appropriate.

- **Canvas behavior**
  - Show each proposed Goal as an editable card:
    - Title and description are inline-editable.
    - Force intent sliders or chips for each Force.
    - Style label (“Identity” / “Outcome”).

- **User action**
  - Toggle which Goals to keep.
  - Adjust titles, descriptions, and forceIntent values as needed.
  - Primary CTA: **“Create these Goals”** (commits them to storage).

Result: Arcs tab now shows each Arc with its concrete Goals.

---

### 3. From Goal to Activities (Plan)

#### 3.1 Goal Detail Screen

- **Canvas sections**
  - Top:
    - Goal title, Arc name, timeframe.
    - Visualization of forceIntent (four bars or similar).
  - Middle:
    - Activities list (empty on first view) with copy like “No Activities yet. These are the atomic units of doing.”
  - CTAs:
    - Primary: **“Generate Activities with AI”**.
    - Secondary: “Add Activity manually”.

#### 3.2 AI-Generated Activity Plan

- **Before generation**
  - Ask:
    - “How much time per week do you realistically have for this?” (slider or presets).
    - “Any constraints? (e.g., only weekends, limited tools)” (optional text).

- **AI role**
  - Propose a structured plan of Activities:
    - 5–20 Activities with:
      - Title and short note.
      - Phase (e.g., Design, Setup, Build, Finish).
      - Order index within Goal.
      - Time estimate.
      - Initial forceActual defaults (likely emphasis).

- **Canvas behavior**
  - Show Activities grouped by phase (outline-style).
  - Display phase totals and overall estimated time.
  - Each Activity row includes:
    - Include/exclude checkbox.
    - Editable title and estimate.
    - Small Force emphasis preview (icons or mini-bars).

- **User action**
  - Prune and adjust Activities.
  - Primary CTA: **“Adopt plan”** (saves Activities for that Goal).

Result: The Goal becomes a concrete plan ready to surface in Today.

---

### 4. Daily Use: Today Tab

#### 4.1 Today’s Activities Canvas

- **Default state**
  - Today’s canvas shows two related sections that share the same basic interactions:
    - **Aligned for Today** – Activities that are tied to a Goal (and thus an Arc), typically drawn from each Goal’s plan.
    - **Loose Tasks** – quick-captured Activities with no Goal/Arc yet (e.g., life admin, maintenance).
  - Within **Aligned for Today**:
    - Activities scheduled for today (and optionally overdue), grouped by Arc and Goal.
  - Each Activity shows:
    - Title.
    - Parent Goal.
    - Estimate badge.
  - Within **Loose Tasks**:
    - Activities are shown as a simple list of “inbox” items for the day.
    - They can still be started, completed, skipped, or logged like any other Activity.

- **Primary interactions**
  - Tap an Activity to change status:
    - “Start” → “Done” or “Skip”.
  - When marking “Done”, show a compact logging sheet.
  - Periodically, surface a gentle nudge such as:
    - “You have several loose tasks. Want to group any of these under a Goal or Arc?”
  - Alignment flows (often AI-assisted) let the user:
    - Attach loose tasks to an existing Goal / Arc.
    - Group related loose tasks into a new Goal / Arc.
    - Mark certain patterns as ongoing **Maintenance / overhead**, so Chapters treat them differently.

#### 4.2 Logging Sheet (Force Actual + Time)

- **Inputs**
  - Actual time:
    - Presets (e.g., 15, 30, 60 minutes) plus manual entry.
  - `forceActual`:
    - For each Force (Spirituality / Mastery / Activity / Connection), 0–3 options as small buttons or dots.
    - Optional AI shortcut: **“Let LOMO infer”**, which proposes values based on Activity/Goal context.

- **AI role**
  - When “Let LOMO infer” is used:
    - Suggest `forceActual` vector using Activity title, notes, and parent Goal’s forceIntent.

- **User action**
  - Accept or slightly adjust AI suggestions.
  - Confirm logging, or skip logging and just mark as done (for low-friction days).

Result: The system accumulates timestamped Activities with actual time and forceActual values.

---

### 5. Reflection: Chapters Tab

#### 5.1 Chapters Overview

- **Canvas**
  - List of existing Chapters (cards with title, date range, key insight snippet).
  - Empty state: explanation that Chapters are AI-written lookbacks over a chosen period.

- **Primary CTA**
  - **“Generate a Chapter”**.

#### 5.2 Generate Chapter Flow

- **Step 1: Select time window**
  - Options:
    - “Last 7 days”.
    - “Last 30 days”.
    - “Custom range”.
  - Preview:
    - Counts: Activities, Arcs, Goals included.

- **Step 2: Optional focus question**
  - Text prompt:
    - “Anything you’re especially curious about in this period?”  
      Examples: “Did I actually prioritize family?”, “How did Mastery vs Connection look?”.

- **AI role**
  - Given:
    - All Activities in range (with forceActual).
    - Related Goals and Arcs (with forceIntent).
    - Optional focus question.
  - Generate a **Chapter** with:
    - Title (e.g., “A Chapter of Quiet Discipline”).
    - Narrative summary text.
    - Arc stats (time and activity counts).
    - Force stats (intent vs actual contrasts).
    - Goal highlights (what moved or finished).
    - Concise insights (patterns, blockers, strengths).
    - Suggested next Goals (optionally tied to existing Arcs).

- **Chapter detail screen**
  - Sections:
    - Story: title and narrative paragraphs.
    - “Where your time went”: per-Arc stats.
    - “How your Forces showed up”: forceIntent vs forceActual visuals.
    - “Goals that moved”: key goal highlights.
    - “Emerging patterns”: insights.
    - “Next experiments”: suggested next Goals with CTAs.

- **User actions**
  - Pin Chapter’s date range as the visible context in the app shell.
  - One-tap **“Create this Goal”** for suggested next Goals.

---

### 6. Ongoing Evolution & AI Support

#### 6.1 Editing Arcs and Goals with AI

- From Arc detail:
  - Edit Arc narrative with an **AI rewrite** option:
    - “Help refine this narrative” to get a clearer or shorter version.
- From Goal detail:
  - AI options:
    - Suggest clearer goal phrasing.
    - Propose or adjust metrics.
    - Rebalance forceIntent if user indicates desired emphasis (e.g., “more Connection-heavy”).

#### 6.2 Drift Detection Nudges

- Periodically, based on logged data, show lightweight nudges:
  - Example:
    - “You intended this season to focus on Connection 3, but most Activities are skewed toward Activity and Mastery. Want help designing one Connection-heavy Activity this week?”
  - CTA:
    - “Yes, propose one Activity”:
      - AI suggests a concrete Activity attached to an appropriate Goal or Arc.

---

### 7. Design Principles

- **AI as guide, not gate**
  - Users can create and edit everything manually.
  - AI primarily provides drafts, suggestions, and refinements.

- **Low friction, high meaning**
  - Minimal required fields; AI enriches sparse input into structured objects.

- **Forward vs reflective clarity**
  - Arcs, Goals, and Activities flows are clearly forward-looking.
  - Chapters are clearly reflective and lookback-oriented.

- **Local-first, sync-ready**
  - All flows should function with purely local data.
  - Sync and AI are additive: the experience remains coherent even offline.


