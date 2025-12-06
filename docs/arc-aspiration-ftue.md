Kwilt FTUE – Arc-Led Identity Aspiration

## Purpose

This document captures the updated philosophy and product direction for how Kwilt guides new users into the product, with a specific focus on identity aspiration and Arcs. It also defines our **gold-standard model for Arc creation** that should be used consistently across FTUE, coach-led Arc creation, and future identity flows.

- **Arcs = Aspirations**: In this model, an `Arc` is the concrete container for a user’s current identity aspiration. We may eventually rename Arcs to “Aspirations” in the UI, but we are **not** introducing a new data type or new fields on `Arc` for “aspiration.” The existing `Arc.name` and `Arc.narrative` remain the primary fields where the aspiration is expressed.
- **FTUE goal**: In the first 40–55 seconds of the app, help the user articulate a felt, emotionally resonant identity aspiration and turn it into a single onboarding Arc—using as few taps and as little typing as possible.
- **Replacement of goal-first onboarding**: This identity-first, Arc-led FTUE **replaces** the current first-goal–oriented onboarding workflow. The “first object” we create is an Arc (aspiration), not a goal.

## Conceptual model

### Arcs as identity aspirations

- **Arcs describe “who I’m becoming in this season.”**
  - `Arc.name`: short, legible, tappable label for the aspiration (e.g., “Calm Under Pressure,” “The Builder,” “Steady Creative Energy”).
  - `Arc.narrative`: a compact, multi-sentence description of the identity trajectory and felt experience of that Arc (typically 3–6 sentences). It should:
    - Name **who they’re becoming** in a specific arena of life.
    - Bake in a guiding idea or *North Star* line (without needing a separate field).
    - Explain **why this matters to them** and how it shows up in ordinary life.
- **No new “aspiration” field** is added to the Arc object.
  - We treat “aspiration” as the semantic meaning of an Arc, not a new schema primitive.
  - Future language choices (e.g., renaming Arcs → Aspirations in the UI) are product/UX decisions layered on top of the existing Arc model.

### Shift from goals → Arcs in FTUE

- Previous v2 onboarding:
  - Collected: name, birthday/age, a free-text desire, and produced a first **Goal** with an optional Arc context.
  - Center of gravity: outcome-focused (“what do you want to accomplish?”).
- New FTUE:
  - Collects a light, tap-first set of **identity signals** and uses AI to synthesize an **Arc that embodies who they’re becoming.**
  - Center of gravity: identity- and aspiration-focused (“who is future-you becoming?”).
  - Goals and activities can be layered on later, once the user has a felt identity context inside Kwilt.

## FTUE design – Fast → Felt → Framed → Reflected

The FTUE is intentionally simple on the surface and sophisticated underneath. It is designed for teens and slower-to-warm users like “Charlie,” with:

- **Low cognitive load**
- **High emotional resonance**
- **Fast completion**
- **Strong scientific grounding**
- **An AI layer that does heavy lifting quietly**

The core design principle:

- **Fast**: no single question should require more than ~2 seconds of thought.
- **Felt**: start with vibes before traits—access emotion before cognition.
- **Framed**: give the mind something concrete to respond to, not a blank canvas.
- **Reflected**: let AI synthesize meaning; the user taps and recognizes themselves.

### Phase 1 – Soft start (3s)

- **Surface**: A single, gentle card animates into the app canvas:
  - “Let’s uncover the version of you that feels the most you.”
- **Purpose**: Warm up the emotional system and reduce pressure before asking anything of the user.
- **Interaction**: No input; a brief dwell that sets tone.
- **AI**: None; static copy.

### Phase 2 – Feel the future (8s)

- **Prompt**: “When you imagine your future self… what’s the vibe they give off?”
- **Interaction**: Single-select chips:
  - calm, confident, kind, curious, strong, creative, focused (6–8 options total).
- **What we capture (conceptually)**:
  - Dominant emotional tone.
  - Polarity (active vs. steady).
  - Developmental alignment (e.g., confidence → autonomy; kindness → relatedness).
- **Purpose**: Anchor the identity aspiration to a felt emotional signature (narrative identity science backbone).

### Phase 3 – Social mirror (6s)

- **Prompt**: “And how do people experience that future you?”
- **Interaction**: Single-select chips:
  - someone people trust  
  - someone who keeps their cool  
  - someone who brings others together  
  - someone who works hard  
  - someone who surprises people  
  - someone others want around
- **What we capture**:
  - Relational identity orientation.
  - Aspired social role.
  - Possible-self valence (hoped-for).
- **Purpose**: Make it easier than “describe yourself”; especially intuitive for teens.

### Phase 4 – Core strength (7s)

- **Prompt**: “What kind of strength does future-you grow into?”
- **Interaction**: Single-select chips:
  - physical skill  
  - thinking skill  
  - creative skill  
  - leadership skill  
  - focus + discipline  
  - supporting others  
  - problem-solving
- **What we capture**:
  - Competence direction.
  - Self-determination driver (competence, autonomy, relatedness).
  - Where aspiration energy clusters.
- **Purpose**: Shape how we frame the Arc’s narrative (“who you’re becoming”).

### Phase 5 – Everyday moment (10s)

- **Prompt**: “Picture future-you on a normal day—not a big moment. What are they doing that makes them feel proud?”
- **Interaction**: Single-select chips:
  - practicing a skill  
  - helping someone  
  - creating something  
  - solving a tough problem  
  - showing up consistently  
  - trying something challenging  
  - staying calm  
  - improving
- **What we capture**:
  - Identity in action (narrative identity theory).
  - Motivation type.
  - Behavioral orientation (effort, service, creativity, mastery, etc.).
- **Purpose**: Translate aspiration into “everyday life” terms; small behaviors, not trophies.

### Phase 6 – One-word identity (optional, 5–7s)

- **Prompt**: “If that future-you had a nickname, what would it be?”
- **UX**:
  - Small, low-pressure input at the bottom of the card.
  - Examples fade in/out: The Builder, The Quiet Genius, The Competitor, The Reliable One, The Explorer, The Calm One.
  - The primary path is still **tap**: a large “Skip” button; typing is optional.
- **What we capture**:
  - Internal metaphor.
  - Self-concept crystallization.
  - Narrative framing preference.
- **Purpose**: For users who *choose* to type a word, we get extremely rich signal. For everyone else, skipping is frictionless.

### Phase 7 – AI synthesizes the aspiration (1s, behind the scenes)

- **Inputs**:
  - Emotional vibe.
  - Social presence.
  - Core strength.
  - Everyday behavior.
  - Optional nickname.
  - Optional age band (teen vs adult) inferred from profile/birthdate when available.
- **Models / theory baked into prompting**:
  - Narrative Identity Theory (structure).
  - Possible Selves research (hoped-for self).
  - Self-Determination Theory (motivation alignment).
  - Motivational Interviewing (non-prescriptive phrasing).
  - Positive Psychology (best possible self framing).
- **Output (conceptual)**:
  - A one-sentence identity aspiration (who they’re becoming).
  - A one-line “next small step” suggestion (gentle, actionable).
- **Where it lands in the product**:
  - `Arc.name` – concise, identity-flavored label (we may map the nickname or a distilled phrase here).
  - `Arc.narrative` – the full aspiration sentence (“You’re becoming someone who…”).

### Phase 8 – Reveal the Arc (3s)

- **Surface**:
  - “You’re becoming someone who…”  
    → followed by the personalized aspiration sentence.
  - “Your next small step: …”  
    → one concrete, low-pressure action line (e.g., “Practice what matters for just 5 minutes.”).
- **Interaction**: Short pause for emotional resonance; the user reads and recognizes themselves.
- **Purpose**: Make the aspiration *felt* and ownable, not abstract.

### Phase 9 – Confirmation + ownership (3s)

- **Prompt**: “Does this feel like the future you?”
- **Interaction**:
  - Two large, clear buttons: **Yes** / **Close but tweak it**.
- **If “Yes”**:
  - The Arc is created and committed:
    - `Arc.name` and `Arc.narrative` are stored from the synthesized output.
    - We may optionally track that this is the **onboarding Arc** to feature it more prominently.
- **If “Close but tweak it”**:
  - AI asks **one clarifying question** that can be answered by taps only (no free typing).
  - We present 3–5 AI-generated chip options based on that question.
  - On selection, AI regenerates the aspiration (Arc name + narrative) using all inputs + the tweak, and we repeat the confirmation briefly.
- **Purpose**: Preserve user agency and nuance without dragging them into free-text editing.

### Phase 10 – Integrate into Kwilt (instant)

- **Store**:
  - The onboarding Arc is added to the user’s Arc list.
  - It effectively becomes the top of their identity layer: “this is who I’m becoming right now.”
- **Use downstream**:
  - Future goal creation, activities, and content can use this Arc to ground suggestions (“within this aspiration, what’s the next step?”).
  - The aspiration may be featured visually at the top of the Arcs or Home experience.

## AI prompting layers

### 1. System prompt (persistent context)

- Identity-development system prompt (abbreviated):
  - The AI is framed as an **identity-development coach** grounded in:
    - Narrative Identity Theory.
    - Possible Selves research.
    - Self-Determination Theory.
    - Motivational Interviewing.
    - Positive Psychology.
  - Responsibilities:
    - Synthesize user selections into **short, emotionally resonant, non-prescriptive** identity language.
    - Avoid career labels by default; focus on character, energy, and trajectory.
    - Avoid telling the user who they *should* be—reflect who they are *becoming* based on their own choices.

### 2. Synthesis prompt (after user answers)

- Given the collected fields (vibe, social presence, strength, everyday action, optional nickname, optional age band), the model:
  - Generates a 1–2 sentence identity aspiration describing who the user is becoming.
  - Avoids goals/achievements; emphasizes character and trajectory.
  - Produces a single “Your next small step: …” line that is concrete but gentle.
- The output is projected directly into:
  - `Arc.narrative` – the main aspiration sentence.
  - `Arc.name` – a short phrase derived from the aspiration and/or nickname.

### 3. Optional tweak prompt

- If the user taps “Close but tweak it,” the model:
  - Asks **one clarifying question** that can be answered via a single tap (chips).
  - Examples:
    - “Should this feel more calm or more high-energy?”
    - “Should it emphasize relationships more or personal mastery more?”
  - After the user taps an answer, the model regenerates the aspiration with that constraint, keeping language simple and aligned.

### 4. Safety + age adjustment

- Tone and complexity are adjusted based on inferred **age band**:
  - Ages 13–16: simpler language, high-energy, approachable, minimal abstraction.
  - Adults: reflective, slightly more nuanced, still concrete.
  - Very young teens: no jargon, low abstraction, no heavy self-help language.
- The safety posture is:
  - No pathologizing language.
  - No pressure or “shoulds.”
  - Emphasis on growth, experimentation, and “next small steps.”

## UX principles for this FTUE

- **Tap-first, type-optional**:
  - Primary user actions are taps on clearly labeled chips and buttons.
  - Typing is only invited once (one-word nickname) and is fully optional.
- **Emotion before explanation**:
  - Start with vibe and social presence, not demographic or goal fields.
  - Let users recognize themselves before we ever ask them to describe themselves.
- **Short, legible copy**:
  - Every question should be answerable in ~2 seconds.
  - No dense paragraphs; break text into 1–2 lines per block.
- **Non-prescriptive coaching tone**:
  - We mirror back who they’re becoming instead of prescribing a direction.
  - Language is low-pressure, warm, and concrete.
- **App shell + canvas preserved**:
  - The FTUE runs inside the existing **app shell** (nav + page margins) with the **FTUE cards** living on the main **canvas**, so it feels like a natural part of Kwilt rather than a separate mini-app.

## Implementation notes (high level)

- This FTUE is implemented as an updated first-time onboarding workflow that:
  - **Replaces** the current goal-first v2 workflow.
  - Produces a single **Arc** with a name and narrative that embody the user’s identity aspiration.
- The host UI:
  - Continues to use the shared `AgentWorkspace` and onboarding presenter within the existing app shell.
  - Renders the phased cards (chips, optional text input, reveal, confirm/tweak) on the main app canvas.
- Data and architecture:
  - No new core types are introduced; Arcs remain the primary aspirational object.
  - The onboarding Arc can be tagged or recognized in the store as the “identity aspiration” Arc for this season, but this is a semantic convention rather than a new schema field.


