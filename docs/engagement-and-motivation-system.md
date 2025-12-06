## Kwilt Engagement and Motivation System

**Purpose:** Define how Kwilt gently motivates people to keep showing up for their life architecture (Arcs → Goals → Activities → Chapters), drawing on Duolingo-style engagement patterns while staying true to Kwilt’s calm, identity-first philosophy.

This document sits above channel-specific PRDs (e.g. notifications) and describes **what behaviors we want to encourage**, **how we encourage them**, and **how that shows up across app surfaces** (Today, Activities, Arcs, Chapters, celebration, and notifications).

---

## 1. Experience Principles

1. **Identity-first engagement**  
   - Every nudge points back to **who the person is becoming**, not just what they are doing.  
   - Notifications, banners, and celebrations should reference **Arcs, Goals, and Activities** as part of a story of becoming, not a to‑do list.

2. **Tiny steps, big narrative**  
   - Engagement focuses on **small, immediately completable actions** (e.g. “Review Today”, “Log one Activity”, “Mark this step done”).  
   - The narrative payoff is large: “You’re protecting this Arc”, “You’re keeping a streak of showing up for your life.”

3. **Calm, gentle persistence**  
   - Kwilt is **persistent but soft**. It keeps showing up, but in a way that feels like a companion, not a KPI dashboard.  
   - We avoid frantic urgency; we prefer **warm reminders** and **self‑compassionate restarts**.

4. **Respect for attention and agency**  
   - Users can easily control **how often and what kinds** of nudges they receive.  
   - If they consistently ignore a pattern, Kwilt backs off rather than escalating pressure.

5. **Playful but mature tone**  
   - Inspired by Duolingo’s fun, emotional copy, but tuned for Kwilt’s context: **gentle, reflective, hopeful** more than guilt‑trippy.  
   - Copy should be short, human, sometimes lightly playful, always respectful.

---

## 2. Core Behaviors We Want to Encourage

From the Life Architecture model, these are the daily/weekly behaviors engagement should reinforce:

- **Show up for Today**  
  - Open the app and visit the **Today canvas** at least once per day.
  - Quickly understand “what’s on deck” across Arcs and Goals.

- **Complete or progress at least one meaningful Activity**  
  - Log at least one Activity per day that is **anchored to a Goal (and thus an Arc)**.  
  - Over time, this becomes the main “showing up” signal.

- **Align Activities with Arcs and Goals**  
  - Gradually reduce “unanchored” Activities by gently encouraging alignment to Arcs/Goals.

- **Reflect periodically**  
  - Trigger periodic reflection (Chapters) so users see the story of their effort and identity over time.

---

## 3. Engagement Loops

The engagement system is a set of **loops** that sit on top of Arcs, Goals, Activities, and Chapters. Each loop has:

- A **trigger** (time‑based or behavior‑based),
- A **micro‑ask** (tiny, concrete action),
- A **reward** (completion feedback, streak progress, narrative payoff).

### 3.1 Daily Show-Up Loop

- **Trigger:**  
  - Time‑based: user‑configured daily window (e.g. 7–9am).  
  - Behavior‑based: user did not open Today or complete any Activity yet today.

- **Micro‑ask:**  
  - “Open Kwilt and review Today.”  
  - “Take 60 seconds to choose one Activity for today.”

- **Reward:**  
  - Maintain or advance a **“show up” streak** (see §4.1).  
  - Light in‑app celebration: small toast, positive copy, sometimes a richer celebration when a milestone is reached.

### 3.2 Activity Reminder Loop

- **Trigger:**  
  - User sets or updates `reminderAt` on an Activity (through existing UX).  
  - Optional: due‑soon logic around activity deadlines.

- **Micro‑ask:**  
  - “Spend a few minutes on [Activity name] connected to [Goal / Arc].”

- **Reward:**  
  - Mark Activity as done or log progress.  
  - Reinforce connection to the parent Arc: “You nudged [Arc name] forward today.”

### 3.3 Arc and Goal Milestone Loop

- **Trigger:**  
  - Completing a Goal.  
  - Reaching certain thresholds on an Arc (e.g. N completed Activities or M days of attention in last period).

- **Micro‑ask:**  
  - “Take a moment to celebrate and name what changed.”  
  - “Pick the next small step for this Arc.”

- **Reward:**  
  - In‑app celebration (visual + copy) and optional light recap: “Here’s what you did to get here.”  
  - Optionally schedule a gentle future nudge to continue momentum.

### 3.4 Reactivation Loop

- **Trigger:**  
  - No app open or no Activity completion for N days (configurable).

- **Micro‑ask:**  
  - “It’s been a while. Want to rekindle one Arc with a tiny step today?”  
  - Always framed as self‑compassionate, no shaming.

- **Reward:**  
  - Restart or gently reset the show‑up streak.  
  - Small, encouraging in‑app copy on return (“Welcome back; let’s start small today.”).

---

## 4. Mechanics Inspired by Duolingo (Adapted for Kwilt)

### 4.1 Show-Up Streaks

- **Definition:**  
  - A **streak day** is any day when the user **completes/logs at least one Activity** (anchored or unanchored).

- **Presentation:**  
  - Streak length displayed in Today (e.g. “You’ve showed up 4 days in a row”).  
  - Occasionally celebrated at milestones (e.g. 3, 7, 14, 30 days).

- **Behavior:**  
  - Missing a day **breaks the streak** by default, but we may explore one “grace day” mechanic later.  
  - Reactivation copy acknowledges lapses without guilt: “Streaks reset. Stories continue. Ready for a tiny step today?”

### 4.2 Timing and Routines

- **User‑selected anchor time** for daily nudges (e.g. morning, lunch, evening).  
- System gradually learns **actual engagement windows** (when users usually act) and can bias scheduling to those times within the user’s preferences.  
- Hard caps on **notifications per day** and clear in‑app controls to edit or pause routines.

### 4.3 Personalized Focus

- Engagement surfaces (Today, notifications, banners) can highlight:
  - The **Arc most recently active**,  
  - The **Arc with a current Goal closest to completion**, or  
  - The **Arc the user explicitly marked as “current focus”**.

- Micro‑asks use this context:
  - “Protect your ‘Family Stewardship’ Arc with one small action today.”  
  - “You’re one Activity away from finishing ‘Design my ideal week’.”

### 4.4 Celebrations and Emotional Feedback

- **Moments to celebrate:**
  - First Activity logged ever.  
  - First week of consistent show‑up.  
  - First Goal completed.  
  - Significant Arc attention streaks (e.g. “Your ‘Project Finisher’ Arc has seen work 3 weeks in a row.”).

- **Surfaces:**
  - In‑canvas toasts and micro‑animations (respecting the existing shell/canvas system).  
  - Optional celebration gifs (using the existing celebration media system).  
  - Follow‑up copy nudges (e.g. “Want to choose the next step?”).

### 4.5 Reactivation and “We Miss You” Flows

- After N days of inactivity, engagement shifts from streak preservation to **kind restart**:
  - “Life happens. Ready to pick one Arc to gently restart?”  
  - Suggestions surfaced in Today via cards, not just notifications.

- Reactivation is **time‑bounded and respectful**:
  - A limited sequence of reactivation nudges.  
  - If ignored repeatedly, Kwilt quiets down until the user returns or explicitly opts back in.

---

## 5. Cross-Surface Expression

The engagement system appears consistently across:

- **Notifications** (see `notifications-paradigm-prd.md`)  
  - Time‑based and behavior‑based nudges tied to show‑up, Activity reminders, streaks, and reactivation.

- **Today canvas**  
  - Primary home for streak status, “what’s the next tiny step”, and quick‑start CTAs.

- **Activities and Goals surfaces**  
  - Micro‑copy that positions Activities as concrete expressions of Arcs and Goals.  
  - Inline prompts to add `reminderAt` when appropriate (without over‑nagging).

- **Chapters / reflection**  
  - Narrative that recognizes engagement patterns (not just output):  
    - “You showed up X days this period.”  
    - “These Arcs received the most attention.”  
  - Suggestions framed as next gentle experiments, not prescriptions.

All of this must **respect the app shell vs canvas separation**: the shell provides stable framing and nav; engagement elements live mainly **inside the canvas surfaces** (cards, sections, banners) so they feel like part of the experience, not overlays.

---

## 6. Data and Metrics

To evaluate and refine the engagement system:

- **Core engagement metrics**
  - Daily show‑up rate (days with at least one streak‑qualifying action).  
  - Streak distribution (how many users reach 3, 7, 14+ days).  
  - Activities completed per active week.  
  - Arcs and Goals receiving attention per period.

- **Notification and nudge metrics**
  - Opt‑in rate for notifications.  
  - Open rate and tap‑through rate by notification type.  
  - Change in show‑up and completion behavior after nudges launch.

- **Quality signals**
  - Opt‑out rate (per category and globally).  
  - Qualitative feedback (too noisy vs just right, helpful vs stressful).

These metrics should be reviewed periodically and feed back into copy, timing, and thresholds.

---

## 7. Phasing and Relationship to Other Docs

1. **Phase 1 – Foundations**
   - Define and track the **show‑up streak**.  
   - Implement basic daily show‑up loop and Activity reminder loop.  
   - Add simple celebrations for first milestones.

2. **Phase 2 – Personalization and Streak Protection**
   - Refine timing based on behavior.  
   - Add streak‑preserving nudges and more nuanced Today surface copy.  
   - Expand milestone celebrations around Goals and Arcs.

3. **Phase 3 – Rich Reactivation and Narrative Integration**
   - Add reactivation flows tuned to inactivity patterns.  
   - Deepen Chapters’ awareness of engagement (streaks, attention patterns).  
   - Integrate with external spokes if/when they exist (e.g., weekly summaries).

**Downstream docs:**

- `docs/notifications-paradigm-prd.md` – channel‑specific PRD for local notifications, including OS permissions, scheduling, and settings.  
- `docs/ux-flow.md`, `docs/tasks-roadmap.md`, `docs/agent-onboarding-flow.md` – should reference this engagement model when adding new flows or surfaces that motivate behavior.

---

## 8. Implementation Checklist (Working)

Use this checklist as you build out the engagement system. It mirrors the phases above and the notifications PRD.

### Phase 1 – Foundations (mostly implemented)

- [x] Define show‑up streak as “day with ≥1 Activity completion”.  
- [x] Add streak tracking to the store (`lastShowUpDate`, `currentShowUpStreak`, `recordShowUp`, `resetShowUpStreak`).  
- [x] Wire `recordShowUp()` to Activity completion (marking an Activity as `done`).  
- [x] Add basic streak display in the primary daily canvas (Today / Activities).  
- [ ] Add simple, on-canvas celebrations for first milestones (e.g., first completion, first 3-day streak).

### Phase 2 – Personalization and Streak Protection

- [ ] Refine daily show‑up reminder timing based on observed behavior (time windows when users usually complete Activities).  
- [ ] Introduce personalized copy that references the most recently active or focus Arc in daily show‑up messages.  
- [ ] Add streak‑preserving nudges that highlight current streak length in copy.  
- [ ] Expand milestone celebrations around Goals and Arcs (e.g., first Goal completed, key Arc attention streaks).

### Phase 3 – Streak Save, Reactivation, and Narrative Integration

- [ ] Add helpers/selectors in the store for:
  - [ ] Detecting whether the user has “shown up” today.  
  - [ ] Detecting whether they have an active streak that is at risk (has a streak and not yet shown up today).  
  - [ ] Computing days since `lastActiveDate`.  
- [ ] Implement streak-save notifications:
  - [ ] Define thresholds for when a streak is worth protecting.  
  - [ ] Schedule at most one streak-save notification per applicable day under caps.  
- [ ] Implement reactivation flows:
  - [ ] Schedule reactivation nudges after N days without Activity completion.  
  - [ ] On tap, navigate to the primary daily canvas and show a gentle “welcome back” banner.  
- [ ] Reflect engagement patterns in Chapters:
  - [ ] Include streak summaries and attention patterns in Chapter narratives.  
  - [ ] Surface gentle suggestions for restarting or rebalancing Arcs.



