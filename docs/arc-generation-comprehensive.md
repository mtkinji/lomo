# Comprehensive Arc Generation Concept

This document consolidates the complete model for how Arcs are generated in Kwilt, including naming conventions, narrative structure, grading criteria, and the full generation workflow.

---

## 1. What is an Arc?

An **Arc** represents a slow-changing **identity direction**: a domain of life where the person aims to become deeper, more capable, or more aligned with their values and responsibilities.

### Core Characteristics

- **Not** a project, task category, or bucket of action
- **Is** a storyline of becoming
- Highly stable over time (should not be created casually)
- Provides a home for Goals
- Expresses who the user is trying to become in that domain
- Anchors reflection and long-range meaning

### Examples

- ♾️ Discipleship
- 🏡 Family Stewardship
- 🧠 Craft & Contribution (Product Leadership)
- 🪚 Making & Embodied Creativity
- 🚀 Venture / Entrepreneurship
- Becoming a Project Finisher

---

## 2. Arc Data Structure

### Core Fields

```typescript
interface Arc {
  id: string;
  name: string;                    // Short, identity-oriented label
  narrative?: string;              // Multi-sentence identity description
  status: 'active' | 'paused' | 'archived';
  startDate?: string;
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### Extended Fields (Generated Post-Creation)

```typescript
// Optional developmental insights (generated via AI)
developmentStrengths?: string[];      // 2-3 bullets about growth capacities
developmentGrowthEdges?: string[];   // 2-3 bullets about common tensions
developmentPitfalls?: string[];      // 2-3 bullets about common traps

// Visual representation
thumbnailUrl?: string;
thumbnailVariant?: number;
heroImageMeta?: {
  source: 'ai' | 'upload';
  prompt?: string;
  createdAt: string;
};
```

---

## 3. Arc Name (`Arc.name`)

### Requirements

- **Identity-oriented**, not task-based
- **Stable over time** (not tied to specific projects or outcomes)
- **User's own language** (feels personal, not generic)
- **Avoids corporate or self-help jargon**
- **Short and legible** (tappable label)
- **May include emoji** for visual distinction

### Examples

- "Calm Under Pressure"
- "The Builder"
- "Steady Creative Energy"
- "♾️ Discipleship"
- "🏡 Family Stewardship"

### Naming Guidelines

- Focus on **who they're becoming**, not what they're doing
- Use first-person framing when appropriate ("Becoming a Finisher")
- Can be abstract but should feel concrete and actionable
- Should resonate emotionally with the user

---

## 4. Arc Narrative (`Arc.narrative`)

### Purpose

A compact, multi-sentence description (typically 3–6 sentences) that:

1. Names **who they're becoming** in a specific arena of life
2. Bakes in a guiding idea or *North Star* line (without needing a separate field)
3. Explains **why this matters to them** and how it shows up in ordinary life
4. Describes the identity trajectory and felt experience of that Arc

### Structure Requirements

- **Word count**: 30–180 words (optimal: 30–180)
- **Sentence count**: 3+ sentences (optimal: 3–6)
- **First-person identity language**: Must include phrases like:
  - "I want..."
  - "become/becoming..."
  - "I hope/long/aim/imagine/seek..."

### Content Requirements

- **Identity-focused**: Describes character, trajectory, and becoming
- **Grounded**: Uses concrete, everyday language
- **Personal**: Reflects the user's own values and motivations
- **Non-prescriptive**: Avoids "should" language
- **Multi-dimensional**: Covers beginning (who), middle (how), and why-it-matters

### Example Narratives

**Discipleship Arc:**
```
I want my life to be shaped—quietly, steadily, and sincerely—by the teachings and character of Jesus Christ. Discipleship is not something I visit occasionally; it is the deep interior orientation of my heart. It is a willingness to be taught, formed, and corrected. It is the daily practice of turning toward God, even when life is full, noisy, or complex.

In this Arc, I seek a life marked by gentleness, courage, humility, and charity. I want to see others the way Christ sees them. I want to make choices that reflect His integrity and His priorities. Discipleship means letting Christ influence how I speak, how I work, how I lead my family, and how I treat others—especially in small moments when no one else is watching.

Ultimately, this Arc is about becoming a person whose actions and presence reflect something of Christ's love and steadiness. It is the quiet work of aligning my outer life with my inner convictions.
```

**Making & Embodied Creativity Arc:**
```
I want to stay connected to the physical world through the work of my hands—building, shaping, repairing, and creating things that are tangible and lasting. Making reminds me that growth isn't only intellectual. It's slow, physical, patient, and grounded. It teaches me presence. It teaches me to notice details. It teaches me to treat materials with respect.

In this Arc, I want to cultivate skill, precision, and an appreciation for the quiet wisdom of craft. Woodworking, building, and physical projects are a form of meditation for me: they steady me, reset me, and create beauty and usefulness for the people I love. They are a counterweight to digital complexity.

Making is also spiritual. It echoes creation itself. When I shape something with my hands, I participate in a small act of order, patience, and service. This Arc ensures I remain a whole person—mind, heart, and hands.
```

---

## 5. Gold-Standard Arc Creation Model

The **gold-standard Arc creation model** is defined in `docs/arc-aspiration-ftue.md` and specifies five core identity ingredients:

### 5.1 Domain of Becoming

**Question**: "Which part of life feels most in need of attention right now?"

- Faith/spirituality
- Family/relationships
- Work/craft
- Health/physical
- Community/service
- Creativity/making
- Something else

**Purpose**: Locates the arena where identity growth is most needed.

### 5.2 Motivational Style (Emotional Vibe)

**Question**: "When you imagine your future self… what's the vibe they give off?"

**Options**: calm, confident, kind, curious, strong, creative, focused

**What it captures**:
- Dominant emotional tone
- Polarity (active vs. steady)
- Developmental alignment (confidence → autonomy; kindness → relatedness)

**Purpose**: Anchors the identity aspiration to a felt emotional signature (narrative identity science backbone).

### 5.3 Signature Trait (Social Presence)

**Question**: "And how do people experience that future you?"

**Options**:
- someone people trust
- someone who keeps their cool
- someone who brings others together
- someone who works hard
- someone who surprises people
- someone others want around

**What it captures**:
- Relational identity orientation
- Aspired social role
- Possible-self valence (hoped-for)

**Purpose**: Makes it easier than "describe yourself"; especially intuitive for teens.

### 5.4 Growth Edge (Core Strength)

**Question**: "What kind of strength does future-you grow into?"

**Options**:
- physical skill
- thinking skill
- creative skill
- leadership skill
- focus + discipline
- supporting others
- problem-solving

**What it captures**:
- Competence direction
- Self-determination driver (competence, autonomy, relatedness)
- Where aspiration energy clusters

**Purpose**: Shapes how we frame the Arc's narrative ("who you're becoming").

### 5.5 Everyday Proud Moment (Behavioral Orientation)

**Question**: "Picture future-you on a normal day—not a big moment. What are they doing that makes them feel proud?"

**Options**:
- practicing a skill
- helping someone
- creating something
- solving a tough problem
- showing up consistently
- trying something challenging
- staying calm
- improving

**What it captures**:
- Identity in action (narrative identity theory)
- Motivation type
- Behavioral orientation (effort, service, creativity, mastery, etc.)

**Purpose**: Translates aspiration into "everyday life" terms; small behaviors, not trophies.

### 5.6 Optional: One-Word Identity (Nickname)

**Question**: "If that future-you had a nickname, what would it be?"

**Examples**: The Builder, The Quiet Genius, The Competitor, The Reliable One, The Explorer, The Calm One

**What it captures**:
- Internal metaphor
- Self-concept crystallization
- Narrative framing preference

**Purpose**: For users who choose to type a word, we get extremely rich signal. For everyone else, skipping is frictionless.

---

## 6. Arc Generation Workflow

### 6.1 FTUE Flow (Tap-Centric Onboarding)

**Phase 1 – Soft Start (3s)**
- Surface: "Let's uncover the version of you that feels the most you."
- Purpose: Warm up the emotional system
- Interaction: No input; brief dwell

**Phase 2 – Feel the Future (8s)**
- Prompt: "When you imagine your future self… what's the vibe they give off?"
- Interaction: Single-select chips (calm, confident, kind, etc.)

**Phase 3 – Social Mirror (6s)**
- Prompt: "And how do people experience that future you?"
- Interaction: Single-select chips (someone people trust, etc.)

**Phase 4 – Core Strength (7s)**
- Prompt: "What kind of strength does future-you grow into?"
- Interaction: Single-select chips (physical skill, thinking skill, etc.)

**Phase 5 – Everyday Moment (10s)**
- Prompt: "Picture future-you on a normal day—not a big moment. What are they doing that makes them feel proud?"
- Interaction: Single-select chips (practicing a skill, helping someone, etc.)

**Phase 6 – One-Word Identity (optional, 5–7s)**
- Prompt: "If that future-you had a nickname, what would it be?"
- Interaction: Optional text input with examples; large "Skip" button

**Phase 7 – AI Synthesis (1s, behind the scenes)**
- Inputs: All collected fields + optional age band
- Models: Narrative Identity Theory, Possible Selves, Self-Determination Theory, Motivational Interviewing, Positive Psychology
- Output: `Arc.name` + `Arc.narrative`

**Phase 8 – Reveal the Arc (3s)**
- Surface: "You're becoming someone who…" + personalized aspiration sentence
- Interaction: Short pause for emotional resonance

**Phase 9 – Confirmation + Ownership (3s)**
- Prompt: "Does this feel like the future you?"
- Interaction: **Yes** / **Close but tweak it**
- If tweak: AI asks one clarifying question → chips → regenerates

**Phase 10 – Integration (instant)**
- Arc stored and added to user's Arc list

### 6.2 Coach-Led Arc Creation (Chat-Based)

**System Prompt**: Arc Creation Agent (from `src/features/ai/chatRegistry.ts`)

**Question Flow**:

A. **Surface the domain and tension**
- "Which part of life feels most in need of attention right now?"
- "In that part of life, what feels heavy, unsettled, or not quite right?"

B. **Name the identity direction**
- "If this part of life were going really well, what kind of person would you be in it?"
- Optional: "What qualities or patterns would show you that you were really becoming that kind of person?"

C. **Understand constraints**
- "Are there any responsibilities or constraints this Arc should respect?"

D. **Propose and refine**
- AI proposes 2–3 candidate Arc names and narratives
- User collaborates to refine

E. **Optional Force Intent profile**
- Suggest emphasis pattern across Four Forces

F. **Produce final Arc**
- Name: concise, meaningful identity direction
- Narrative: reflective paragraph summarizing who the person is becoming
- Optional Force Intent: indication of which Forces typically shape this Arc

**Output Format**: `ARC_PROPOSAL_JSON:` followed by JSON:
```json
{
  "name": "<Arc name>",
  "narrative": "<short narrative>",
  "status": "active",
  "suggestedForces": ["✨ Spirituality", "🧠 Mastery"]
}
```

---

## 7. Arc Narrative Scoring Criteria

The system uses a heuristic scorer (`scoreArcNarrative`) to evaluate Arc quality on a 0–10 scale:

### 7.1 Scoring Components

**1. Narrative Length (0–4 points)**
- 4 points: 30–180 words (optimal)
- 3 points: 15+ words
- 2 points: 8+ words
- 1 point: >0 words
- 0 points: empty

**2. Identity Language (0–3 points)**
- +2 points: Contains "I want"
- +1 point: Contains "become/becoming"
- +1 point: Contains "I hope/long/aim/imagine/seek"
- Max: 3 points

**3. Sentence Structure (0–3 points)**
- 3 points: 3+ sentences
- 2 points: 2 sentences
- 1 point: 1 sentence
- 0 points: no sentences

### 7.2 Final Score

```
score = narrativeLength + identityLanguage + structure
score = Math.max(0, Math.min(10, raw))
```

### 7.3 Usage

- Used for debugging and prompt quality checks
- **Not** user-facing
- Logged in development mode when Arcs are created
- Helps ensure AI-generated Arcs meet quality standards

---

## 8. Arc Development Insights

After an Arc is created, the system generates optional developmental insights that help users understand how people typically grow into this kind of Arc.

### 8.1 Structure

```typescript
type ArcDevelopmentInsights = {
  strengths: string[];      // 2-3 bullets
  growthEdges: string[];    // 2-3 bullets
  pitfalls: string[];       // 2-3 bullets
};
```

### 8.2 Generation Process

1. **Template Matching**: System finds best-matching `IdealArcTemplate` based on token overlap
2. **AI Generation**: Uses coach chat to generate insights grounded in:
   - Arc name and narrative
   - Matched ideal template (if found)
   - User profile summary
3. **Quality Scoring**: Each candidate is scored (0–10) on:
   - **Alignment**: Do bullets relate to Arc name/narrative?
   - **Developmental Accuracy**: Believable growth patterns without diagnosing
   - **Realism**: Could these show up in an ordinary week?
   - **Clarity**: Short, scannable, free of vague language
4. **Iteration**: Up to 3 attempts, keeping best candidate (threshold: 7.5)
5. **Fallback**: If generation fails, uses local fallback based on Arc + template

### 8.3 Content Guidelines

**Hard Rules**:
- Do NOT use the word "should"
- Do NOT tell the user what to do or give step-by-step advice
- Do NOT diagnose traits, disorders, or fixed labels
- Keep language grounded, concrete, and non-cosmic (no destiny, vibration, radiance, etc.)
- Speak in third-person plural framing ("people on this path often…")
- Bullets must be short (one line each) and easy to scan

**Example Insights**:

**Strengths**:
- "Letting small, concrete projects carry this identity instead of waiting for a perfect season."
- "Returning to the heart of '[north star]' when choices or opportunities feel noisy."

**Growth Edges**:
- "Choosing one clear lane for this Arc at a time instead of trying to express it everywhere at once."
- "Letting the Arc grow through repeatable habits, not only big pushes of effort."

**Pitfalls**:
- "Treating this Arc as a side note rather than a real part of your identity."
- "Waiting until life is perfectly organized before taking small steps inside this Arc."

---

## 9. Ideal Arc Templates

The system maintains a set of **canonical, hand-crafted Arc exemplars** used as reference for judging/coaching newly proposed Arcs.

### 9.1 Template Structure

```typescript
type IdealArcTemplate = {
  id: IdealArcTemplateId;
  name: Arc['name'];                    // Emoji + short Arc name
  narrative: NonNullable<Arc['narrative']>;  // Full multi-paragraph narrative
  northStar?: string;                    // One-sentence heartbeat
  forceEmphasis: IdealArcForceId[];     // Canonical Four Forces this Arc leans on
  exemplarGoalTitles?: string[];        // Example Goal titles that live in this Arc
};
```

### 9.2 Available Templates

1. **discipleship** - ♾️ Discipleship
   - Force Emphasis: Connection, Spirituality
   - North Star: "Become a disciple of Christ whose life quietly reflects His character, love, and integrity in every sphere of influence."

2. **family_stewardship** - 🏡 Family Stewardship
   - Force Emphasis: Connection, Activity
   - North Star: "Build a home where Blaire and our children feel known, safe, loved, and lifted toward their own callings."

3. **craft_contribution** - 🧠 Craft & Contribution (Product Leadership)
   - Force Emphasis: Mastery
   - North Star: "Become a builder-PM whose work is thoughtful, precise, and oriented toward real human good."

4. **making_embodied_creativity** - 🪚 Making & Embodied Creativity
   - Force Emphasis: Activity, Mastery
   - North Star: "Cultivate the hands and habits of a craftsman—creating things that are durable, beautiful, and made with care."
   - Exemplar Goals: "Create a workshop environment that makes making easier", "Build skill progression through 'purposeful projects'", "Be a project finisher!"

5. **venture_entrepreneurship** - 🚀 Venture / Entrepreneurship
   - Force Emphasis: Mastery
   - North Star: "Build ventures that simplify complexity, honor humanity, and create meaningful value in the world."

### 9.3 Template Matching Algorithm

When generating development insights, the system:

1. Tokenizes Arc name + narrative
2. Tokenizes template name + northStar + narrative
3. Calculates token overlap
4. Adds bonus (+2) if first word of Arc name matches template name
5. Returns best-matching template (if score > 0)

---

## 10. AI Prompting Layers

### 10.1 System Prompt (Persistent Context)

**Identity-development coach** grounded in:
- Narrative Identity Theory
- Possible Selves research
- Self-Determination Theory
- Motivational Interviewing
- Positive Psychology

**Responsibilities**:
- Synthesize user selections into short, emotionally resonant, non-prescriptive identity language
- Avoid career labels by default; focus on character, energy, and trajectory
- Avoid telling the user who they *should* be—reflect who they are *becoming*

### 10.2 Synthesis Prompt (After User Answers)

Given collected fields (vibe, social presence, strength, everyday action, optional nickname, optional age band):

- Generates 1–2 sentence identity aspiration describing who the user is becoming
- Avoids goals/achievements; emphasizes character and trajectory
- Produces single "Your next small step: …" line (concrete but gentle)

**Output projection**:
- `Arc.narrative` – main aspiration sentence
- `Arc.name` – short phrase derived from aspiration and/or nickname

### 10.3 Optional Tweak Prompt

If user taps "Close but tweak it":
- Asks **one clarifying question** answerable via single tap (chips)
- Examples:
  - "Should this feel more calm or more high-energy?"
  - "Should it emphasize relationships more or personal mastery more?"
- After user taps answer, regenerates aspiration with that constraint

### 10.4 Safety + Age Adjustment

**Tone and complexity adjusted by age band**:
- Ages 13–16: simpler language, high-energy, approachable, minimal abstraction
- Adults: reflective, slightly more nuanced, still concrete
- Very young teens: no jargon, low abstraction, no heavy self-help language

**Safety posture**:
- No pathologizing language
- No pressure or "shoulds"
- Emphasis on growth, experimentation, and "next small steps"

---

## 11. Four Forces (Optional Context)

Arcs may optionally reference the **Four Forces** to help shape understanding:

- **✨ Spirituality** — alignment with God, inner character, integrity, discipleship
- **🧠 Mastery** — skill, clarity, craft, learning, problem-solving
- **🏃 Activity** — physical doing, execution, embodied or hands-on work
- **🤝 Connection** — relationships, service, support, collaboration

Forces are scored 0–3 to reflect intensity or relevance. When generating Arcs, Forces can be suggested but are not required.

---

## 12. Implementation Notes

### 12.1 Data Flow

1. **User Input** → Tap-based selections (FTUE) or chat responses (coach-led)
2. **AI Synthesis** → Generates `Arc.name` and `Arc.narrative`
3. **Quality Check** → `scoreArcNarrative()` evaluates quality (dev mode)
4. **Arc Creation** → Arc stored with `status: 'active'`
5. **Post-Creation** → `ensureArcDevelopmentInsights()` generates insights asynchronously

### 12.2 Key Functions

- `generateArcs()` - Main entry point for AI Arc generation
- `scoreArcNarrative()` - Heuristic quality scorer (0–10)
- `ensureArcDevelopmentInsights()` - Generates developmental insights post-creation
- `findBestMatchingTemplate()` - Matches Arc to ideal template
- `scoreArcInsightQuality()` - Evaluates insight quality (0–10)

### 12.3 Files

- `src/domain/types.ts` - Arc type definition
- `src/domain/idealArcs.ts` - Ideal templates and scoring logic
- `src/services/ai.ts` - Arc generation API calls
- `src/features/ai/chatRegistry.ts` - Arc Creation Agent system prompt
- `src/features/arcs/arcDevelopmentInsights.ts` - Insight generationr
- `docs/arc-aspiration-ftue.md` - Gold-standard FTUE model
- `docs/life-architecture-model.md` - Core Arc philosophy

---

## 13. Summary: Arc Generation Checklist

When generating an Arc, ensure:

✅ **Name** is identity-oriented, stable, and uses user's language  
✅ **Narrative** is 30–180 words, 3+ sentences, with first-person identity language  
✅ **Content** describes who they're becoming, why it matters, and how it shows up  
✅ **Tone** is grounded, personal, non-prescriptive, and age-appropriate  
✅ **Structure** includes beginning (who), middle (how), and why-it-matters  
✅ **Quality score** (if checked) is 7+ out of 10  
✅ **Post-creation** insights are generated asynchronously  
✅ **Template matching** (if applicable) helps ground development insights  

---

*This document consolidates Arc generation concepts from: `docs/life-architecture-model.md`, `docs/arc-aspiration-ftue.md`, `src/domain/idealArcs.ts`, `src/features/ai/chatRegistry.ts`, `src/services/ai.ts`, and `src/features/arcs/arcDevelopmentInsights.ts`.*

