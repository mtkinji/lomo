## Life Architecture Model

**Arcs · Goals · Activities · Chapters**

**A methodology for identity-driven progress and reflection**

This document defines the purpose, shape, and correct use of the core objects in the Life Architecture system:

- **Arc** – identity direction
- **Goal** – concrete outcome expressing progress in an Arc
- **Activity** – atomic unit of real work
- **Chapter** – AI-generated narrative of what actually happened over time

It also defines the use of the **Four Forces** across the system and provides guidelines for **AI-assisted creation** of each object.

This document exists to ensure that when the app uses AI to help create or update Arcs, Goals, Activities, or Chapters, it does so **accurately**, **consistently**, and in alignment with the **philosophy of the system**.

---

## 1. Core Principles

### Identity first

Everything in the system ultimately reinforces **who the person is becoming**, not just what they accomplish.

### Minimal forward-planning objects

Only three objects shape the future:

- **Arc**
- **Goal**
- **Activity**

Reflection is handled entirely through:

- **Chapter**

### Activities are the plan

There is no separate “plan” object. A Goal’s **Activities, ordered and optionally phased, _are_ the plan**.

### Capture first, align later

The system should **never block capture**. Activities can be recorded even when they are not yet clearly tied to an Arc or Goal. Over time, LOMO gently nudges the user to **align Activities with Goals (and thus Arcs)** so that more of their lived work can participate in meaning and reflection.

### Forces: Intent and Actual

- **Goals** define **Force Intent** — the kind of growth the Goal is meant to drive.
- **Activities** record **Force Actual** — the kind of growth the Activity actually used.

The mismatch between Intent and Actual is meaningful. It is a primary surface for insight.

### Chapters are retrospective

A Chapter is **always a lookback**, never a container for future planning.

---

## 2. The Four Forces

Forces are growth dimensions that appear differently in Goals (intent) and Activities (actual):

- **✨ Spirituality** — alignment with God, inner character, integrity, discipleship
- **🧠 Mastery** — skill, clarity, craft, learning, problem-solving
- **🏃 Activity** — physical doing, execution, embodied or hands-on work
- **🤝 Connection** — relationships, service, support, collaboration

Forces are scored on a simple scale (0–3) to reflect intensity or relevance.

---

## 3. Arc

**(Identity Direction — long horizon)**

An **Arc** represents a slow-changing **identity direction**: a domain of life where the person aims to become deeper, more capable, or more aligned with their values and responsibilities.

An Arc is **not** a project, task category, or bucket of action — it is a **storyline of becoming**.

### Examples

- Discipleship
- Family Stewardship
- Product Craft
- Making & Embodied Creativity
- Venture (entrepreneurship)
- Becoming a Project Finisher

### Purpose of an Arc

- **Provide a home for Goals.**
- **Express who the user is trying to become** in that domain.
- **Anchor reflection and long-range meaning.**

### Guidance for AI when generating or modifying Arcs

- Treat Arcs as **highly stable**; never propose new ones casually.
- When generating Goals, always **anchor them clearly** in the Arc’s identity intention.
- Use the Arc description to **set the tone and gravity** of the Goal.

When creating or reshaping Arcs through onboarding or coach-led flows, follow the **gold-standard Arc creation model** defined in `docs/arc-aspiration-ftue.md` (domain of becoming, motivational style, signature trait, growth edge, and everyday proud moment). That document specifies the tap-only FTUE question set and how `Arc.name` and `Arc.narrative` should be synthesized from those identity ingredients.

---

## 4. Goal

**(Outcome — expresses progress in an Arc)**

A **Goal** is a specific outcome that expresses progress within an Arc over a period of **weeks or months**.

There are two kinds of Goals:

### 1. Identity-anchored Goals

These change **who the user becomes**.

Examples:

- Become a consistent project finisher
- Deepen trust in God through daily discipleship practices

These **do not require metrics**.

### 2. Outcome-based Goals

These have clear, **observable results**.

Examples:

- Create a workshop environment that makes making easy
- Complete three purposeful woodworking projects

These **may include simple, human-readable metrics**.

### The role of Force Intent

Every Goal expresses a growth intent through the Forces:

- One or two Forces are **primary** (2–3)
- Others may be **secondary or minimal** (0–1)

This shapes how Activities are generated, and how AI interprets the Goal.

### Guidance for AI when generating or modifying Goals

When helping create a Goal:

1. **Start with the Arc**: identify the identity direction.
2. **Write a Goal description** that clearly defines:
   - why the Goal matters
   - what success looks like
3. **Assign Force Intent** based on the nature of the Goal.
4. Only include **metrics** when the Goal has a clear, observable outcome.
5. Avoid corporate, over-structured language; use **natural, meaningful phrasing**.

---

## 5. Activity

**(Atomic unit of doing — the plan in motion)**

An **Activity** is the smallest meaningful unit of work. It is **not** a sub-goal or aspiration; it is actual, actionable work that can be performed in a **discrete block of time**.

Activities might describe:

- Discovery — “Measure current workshop layout”
- Creation — “Build French cleat tool wall”
- Finishing — “Apply final coat of finish”
- Reflection — “Evaluate project and note learnings”

### Key conceptual roles

- Activities carry the **practical sequence** for completing a Goal.
- Activities contain **Force Actual**, informing what the work actually engaged.
- Activities form the **raw data** that Chapters use to generate narrative.

### Anchored vs unanchored Activities

- **Anchored Activities**  
  - Have a clear `goalId` (and implicitly an Arc) and participate directly in the story of becoming.  
  - Are the primary surface for planning and for interpreting Force Intent vs Force Actual.
- **Unanchored Activities**  
  - May be captured quickly (e.g., “Call plumber”, “Pay DMV fee”) without choosing an Arc or Goal.  
  - Are still first-class Activities with Force Actual and timestamps, but temporarily lack a story home.  
  - Are periodically surfaced so the user (optionally with AI help) can:
    - Attach them to an existing Goal / Arc.
    - Group them into a new Goal / Arc.
    - Mark them as ongoing **Maintenance / overhead** that should be treated differently in reflection.

### Guidance for AI when generating Activities

When asked to generate an ordered Activity list for a Goal:

1. Break the Goal into logical phases (**Discovery → Build → Finish → Reflect**).
2. Create Activities that are **realistic and completable**.
3. Avoid micro-steps; prefer **5–20 meaningful Activities**.
4. Respect the Goal’s **Force Intent** when shaping tasks.
5. Assign initial **sequence/order**; keep it flexible.
6. Provide concise, **action-oriented names** and optional short descriptions.

---

## 6. Chapter

**(Retrospective narrative — summarizes a lived period)**

A **Chapter** is an AI-generated lookback over any date range. It pulls together everything that actually happened across **all Arcs and Goals**.

Its purpose is **meaning-making, not planning**.

### Mature product posture (how Chapters work in practice)

In a mature Kwilt, Chapters are generated from **Chapter templates** that define *when* a Chapter is produced, *what it includes*, and *how it is delivered*. This keeps “Chapters” coherent while supporting multiple real-world use cases without turning the reflection surface into a generic reporting dashboard.

#### Chapter templates

A **Chapter template** defines:

- **Cadence / period**: weekly (default), monthly, yearly (and later custom ranges).
- **Inclusion filter**: which Activities are eligible (e.g., only `done`, only `work` tag, only a specific Arc).
- **Output format**:
  - **Reflection** (identity-first narrative): meaning + patterns + gentle experiments.
  - **Report** (professional export): structured recap suitable for sharing (e.g., manager update).
- **Delivery**: in-app only, or in-app + opt-in email.

Templates are first-class and transparent: a Chapter should clearly show the template name and “what was included” so users trust the output.

#### Writing style (default reflection)

Default Chapters should be:

- **Grounded and human** (no corporate tone, no productivity clichés).
- **Data-anchored** (counts/time/what happened) with **humble interpretation** (no overconfident psychoanalysis).
- **Identity-aware** (trace meaning back to Arcs and Force patterns).
- **Non-shaming** (drift is described as information, not failure).

The output should respect user preferences (tone/detail/spiritual-language) when present.

#### Report-mode Chapters (explicitly non-reflective)

Some users need a “what did I do?” artifact (weekly manager update, annual accomplishments). The mature model supports this via **Report templates** that:

- keep language concise and professional,
- prioritize grouping and totals over narrative,
- are explicitly framed as an export artifact (so the reflection meaning of “Chapters” stays intact).

#### Delivery and automation posture

- Chapters can be **generated automatically** on a cadence for signed-in users when the server has the required history (Activities/Goals/Arcs).
- Email notifications (“Your Chapter is ready”) are **opt-in** and should be minimal by default (a short preview + a link to review in-app).
  - Email content should avoid leaking sensitive details unless the user explicitly chooses a report template designed for sharing.

### A Chapter answers

- What was this period of life about?
- Which Arcs received attention?
- Which Goals moved forward?
- How did the Forces show up across my Activities?
- What patterns or shifts occurred?
- What strengths emerged?
- Where was there drift or imbalance?
- How much effort went into **unanchored or maintenance work**, and does any of it deserve a clearer home in an Arc or Goal?

### Structure of a Chapter (conceptual)

A well-formed Chapter includes:

- A **title** capturing the theme of the period
- A **narrative summary** of what happened and how it felt
- **Observations** about Arcs and Goals
- **Patterns** in Force Actual across Activities
- **Highlights** — key achievements, breakthroughs, or stuck points
- **Insights** — what the user may want to consider next
- Optional **next-step suggestions** (e.g., potential Goals)

### Guidance for AI when generating a Chapter

When requested to generate a Chapter:

1. Gather all Activities within the date range.
2. Identify which **Arcs and Goals** were active.
3. Analyze aggregate **Forces (Actual)**.
4. Detect patterns:
   - bursts of effort
   - droughts
   - drift from Goal Force Intent
   - imbalances across Arcs or Forces
5. Generate a story that is **human, reflective, and observant** — not corporate or mechanical.
6. Offer gentle recommendations if appropriate, **grounded in the data**.

---

## 7. AI Collaboration Rules (Global)

Across all objects, AI should follow these principles.

### Anchor everything to identity

Always trace:

- Goals back to **Arcs**
- Activities back to **Goals**
- Insights back to **human meaning**

### Respect Intent vs Actual

- **Force Intent** guides how Goals are framed and Activities generated.
- **Force Actual** reflects **reality**; never overwrite or assume it.

### Maintain simplicity

Do **not** introduce unnecessary layers or objects unless explicitly requested.

### Keep language grounded and human

No productivity clichés, corporate tone, or jargon.

### Reflect patterns with humility

Chapters should feel like a **thoughtful companion observing the user’s life**, not a dashboard or KPI monitor.

### Support the user’s agency

AI assists in generating options, **not dictating behavior**.

---

## 8. Notes on Naming and UX (Arcs, Goals, Activities, Chapters)

- **Arcs**  
  - Represents the **story arc** or identity direction the user wants their character (self) to follow.  
  - Short, narrative, and evocative; may benefit from **light in-app framing** (e.g., “Your Arcs are the big storylines of who you’re becoming.”).

- **Goals**  
  - Live **inside an Arc** and are the clearest surface for progress and force intent.

- **Activities**  
  - Are the **only atomic planning object**; lists of Activities **are the plan**.

- **Chapters**  
  - Are **retrospective only**, summarizing lived experience into a narrative, not a backlog.

As the product evolves, any new UX labels or iconography for these objects should stay **consistent** with the identity-first philosophy and the intent/actual Force distinction captured here.


