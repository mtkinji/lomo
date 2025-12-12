# FTUE Arc Generation Workflow Map

This document maps the complete end-to-end flow for generating Arcs during First Time User Experience (FTUE), including all prompts, steps, and decision points. Use this to identify simplification opportunities.

**Decision**: We are keeping the **10-question variant** (IdentityAspirationFlow) as the primary flow. Simplification efforts focus on streamlining prompts and generation logic while preserving the rich data collection.

---

## Quick Summary: Key Simplification Priorities

1. **Reduce prompt size**: From ~2,000 words to ~400-500 words
2. **Fix contradictions**: Remove "don't use first person" rule (examples use "I want")
3. **Fix example format**: Replace multi-paragraph examples with exact 3-sentence format
4. **Simplify quality scoring**: Reduce from 3 attempts/threshold 9 to simpler approach
5. **Centralize prompts**: Move from inline code to dedicated file
6. **Condense input summary**: Group related fields, skip empty ones

---

## Overview: Two Parallel Flows

There are currently **two different FTUE flows** in the codebase:

1. **IdentityAspirationFlow** (`src/features/onboarding/IdentityAspirationFlow.tsx`)
   - Complex flow with 10+ questions
   - Custom prompt building logic
   - Used for "tap-centric onboarding"

2. **OnboardingGuidedFlow** (`src/features/onboarding/OnboardingGuidedFlow.tsx`)
   - Uses workflow runtime with v2 spec
   - Simpler 5-question flow
   - Defined in `firstTimeOnboardingV2Spec.ts`

Both flows ultimately generate an Arc, but they collect different inputs and use different prompts.

---

## Flow 1: IdentityAspirationFlow (Complex Flow)

### Entry Point
- **File**: `src/features/onboarding/IdentityAspirationFlow.tsx`
- **Triggered from**: `AgentWorkspace.tsx` when `mode === 'firstTimeOnboarding'` and workflow is NOT v2

### Data Collection Phases (10 Questions)

1. **Domain of Becoming** (`domain`)
   - Question: "Which part of life feels most in need of attention right now?"
   - Options: 9 choices (Creativity & expression, Craft/skill/building, Leadership/influence, Relationships/connection, Purpose/meaning/contribution, Courage/confidence, Habits/discipline/energy, Adventure/exploration, Inner life/mindset)
   - Collects: `domainIds[]`

2. **Motivational Style** (`motivation`)
   - Question: "When you imagine your future self… what's the vibe they give off?"
   - Options: 8 choices (Making things, Being reliable, Achieving excellence, Solving problems, Helping people feel valued, Expressing ideas, Becoming stronger, Standing up for what matters)
   - Collects: `motivationIds[]`

3. **Signature Trait** (`trait`)
   - Question: "And how do people experience that future you?"
   - Options: 8 choices (Curiosity, Imagination, Loyalty, Competitive drive, Sense of humor, Calm, Intensity, Empathy)
   - Collects: `signatureTraitIds[]`

4. **Growth Edge** (`growth`)
   - Question: "What kind of strength does future-you grow into?"
   - Options: 8 choices (Staying consistent, Believing in yourself, Getting started, Speaking up, Finishing things, Managing emotions, Being patient, Staying focused)
   - Collects: `growthEdgeIds[]`

5. **Everyday Proud Moment** (`proudMoment`)
   - Question: "Picture future-you on a normal day—not a big moment. What are they doing that makes them feel proud?"
   - Options: 9 choices (Showing up when hard, Making something meaningful, Helping someone, Pushing yourself, Thinking in new way, Being honest/brave, Improving a skill, Supporting a friend, Taking care of body/energy)
   - Collects: `proudMomentIds[]`

6. **Source of Meaning** (`meaning`)
   - Question: "What gives your life meaning?"
   - Options: 8 choices (Creating things that last, Growing deep relationships, Mastering skills, Helping others thrive, Achieving something proud of, Bringing beauty/insight, Living faith/values, Becoming strongest self)
   - Collects: `meaningIds[]`

7. **Desired Impact** (`impact`)
   - Question: "How do you want to impact others?"
   - Options: 7 choices (Bringing clarity, Making lives easier, Helping people feel seen, Inspiring creativity, Solving meaningful problems, Bringing peace, Standing for integrity)
   - Collects: `impactIds[]`

8. **Core Values** (`values`)
   - Question: "What values matter most to you?"
   - Options: 8 choices (Honesty, Courage, Care, Wisdom/insight, Discipline, Curiosity, Stewardship/responsibility, Simplicity)
   - Collects: `valueIds[]`

9. **Life Philosophy** (`philosophy`)
   - Question: "How do you approach life?"
   - Options: 7 choices (Clarity/intention, Creativity/experimentation, Calm/steadiness, Passion/boldness, Humility/learning, Integrity/long-term, Service/generosity)
   - Collects: `philosophyIds[]`

10. **Vocational Orientation** (`vocation`)
    - Question: "What kind of work or creation energizes you?"
    - Options: 8 choices (Making/building, Designing simple solutions, Leading/organizing, Exploring ideas/research, Creating art/experiences, Solving complex problems, Helping/teaching, Starting ventures)
    - Collects: `vocationIds[]`

11. **Big Dreams** (`dreams`) - Optional free text
    - Question: "What's one big thing you'd love to bring to life someday?"
    - Collects: `dreamInput` (free text)

12. **Nickname** (`nickname`) - Optional
    - Question: "If that future-you had a nickname, what would it be?"
    - Collects: `nickname` (free text)

### Generation Phase (`generating`)

**Function**: `generateArc()` (lines 1340-1676)

**Prompt Building Logic**:
- Builds a massive prompt (~200 lines) with:
  - System instructions (lines 1381-1458)
  - Quality examples (3 full Arc narratives)
  - Input summary (all 10+ collected fields)
  - Optional judge feedback from previous attempts

**Key Prompt Sections**:

1. **System Instructions** (lines 1381-1458):
   ```
   🌟 KWILT DEEP ARC GENERATION — SYSTEM PROMPT
   
   You are generating a deep Identity Arc...
   
   Hard rules:
   - Do NOT use "You're becoming..." or "You're growing into..."
   - Do NOT use first person ("I")
   - Do NOT give advice, steps, or prescriptive "you should" language
   - Do NOT stack long lists of traits or read like a résumé
   - Do NOT mention questions, options, or how the Arc was constructed
   - Do NOT use therapy language, corporate tone, or mystical/cosmic phrasing
   - Avoid "spiritual LinkedIn" words like: tapestry, legacy, harmonious existence...
   
   Identity spine:
   - Choose ONE clear identity through-line
   
   Structure:
   1) Arc Name: "The {Identity Noun}"
   2) Description (3–4 sentences, ~60–100 words total, in two paragraphs)
   ```

2. **Quality Examples** (lines 1433-1443):
   - Includes 3 full multi-paragraph Arc narratives (Craft & Contribution, Making & Embodied Creativity, Venture/Entrepreneurship)
   - Note: These examples are LONGER than the target output (which should be 3 sentences)

3. **Input Summary** (lines 1349-1377):
   - Formats all collected fields into bullet points
   - Includes optional tweak hints

**AI Call**:
- Uses `sendCoachChat()` with mode `'firstTimeOnboarding'`
- Calls OpenAI Chat Completions API
- Temperature: 0.3 (from `ai.ts` line 880)

**Quality Scoring**:
- Function: `scoreAspirationQuality()` (lines 964-1075)
- Uses a separate AI call to judge quality (0-10 scale)
- Checks: alignment, developmental accuracy, realism, clarity
- Threshold: 9/10
- Max attempts: 3
- If quality < 9, uses feedback loop to regenerate

**Parsing**:
- Function: `parseAspirationFromReply()` (extracts JSON from response)
- Expected format:
  ```json
  {
    "arcName": string,
    "aspirationSentence": string,  // 3-4 sentences
    "nextSmallStep": string
  }
  ```

**Fallback Logic**:
- If parsing fails → tries again (up to 3 times)
- If all attempts fail → `buildLocalAspirationFallback()` (client-side synthesis)
- If quality never reaches threshold → uses best candidate OR fallback

### Reveal Phase (`reveal`)
- Shows generated Arc to user
- Displays Arc name, narrative, and next small step

### Tweak Phase (`tweak`) - Optional
- If user wants to adjust
- Options: More calm/steady, More energy/boldness, More about relationships, More about skill/mastery, Simpler language
- Regenerates with tweak hint

### Confirmation Phase
- User confirms or requests another tweak
- On confirm → Arc is saved

---

## Flow 2: OnboardingGuidedFlow (V2 Workflow)

### Entry Point
- **File**: `src/features/onboarding/OnboardingGuidedFlow.tsx`
- **Workflow Spec**: `src/domain/workflowSpecs/firstTimeOnboardingV2Spec.ts`
- **Triggered from**: `AgentWorkspace.tsx` when workflow is v2

### Workflow Steps (Defined in Spec)

1. **soft_start** (`assistant_copy_only`)
   - Static copy: "Let's uncover the version of you that feels the most you."
   - No user input
   - Next: `vibe_select`

2. **vibe_select** (`form`)
   - Question: "When you imagine your future self… what's the vibe they give off?"
   - Options: Single-select chips (calm, confident, kind, curious, strong, creative, focused)
   - Collects: `vibe`
   - Next: `social_mirror`

3. **social_mirror** (`form`)
   - Question: "And how do people experience that future you?"
   - Options: Single-select chips (someone people trust, someone who keeps their cool, someone who brings others together, someone who works hard, someone who surprises people, someone others want around)
   - Collects: `socialPresence`
   - Next: `core_strength`

4. **core_strength** (`form`)
   - Question: "What kind of strength does future-you grow into?"
   - Options: Single-select chips (physical skill, thinking skill, creative skill, leadership skill, focus + discipline, supporting others, problem-solving)
   - Collects: `coreStrength`
   - Next: `everyday_moment`

5. **everyday_moment** (`form`)
   - Question: "Picture future-you on a normal day—not a big moment. What are they doing that makes them feel proud?"
   - Options: Single-select chips (practicing a skill, helping someone, creating something, solving a tough problem, showing up consistently, trying something challenging, staying calm, improving)
   - Collects: `everydayAction`
   - Next: `nickname_optional`

6. **nickname_optional** (`form`)
   - Question: "If that future-you had a nickname, what would it be?"
   - Optional text input with examples
   - Large "Skip" button
   - Collects: `nickname` (optional)
   - Next: `aspiration_generate`

7. **aspiration_generate** (`agent_generate`)
   - **This is the key generation step**
   - Collects: `arcName`, `arcNarrative`, `nextSmallStep`
   - **Prompt**: See detailed prompt below
   - Next: `aspiration_reveal`

8. **aspiration_reveal** (`assistant_copy_only`)
   - Static copy: "Here's a first snapshot of the identity you're growing into, plus one tiny next step to help you live it."
   - Shows Arc card
   - Next: `aspiration_confirm`

9. **aspiration_confirm** (`form`)
   - Question: "Does this feel like the future you?"
   - Options: Yes / Close but tweak it
   - Collects: `confirmed`
   - If tweak: AI asks one clarifying question → chips → regenerates
   - Next: `closing_arc`

10. **closing_arc** (`assistant_copy_only`)
    - Static copy: Closing message about Arc being saved
    - Flow complete

### Generation Step Prompt (`aspiration_generate`)

**Location**: `firstTimeOnboardingV2Spec.ts` lines 271-276

**Full Prompt** (very long, ~500 words):
```
Using the collected inputs — vibe, socialPresence, coreStrength, everydayAction, optional nickname, and any age/profile context the host has already provided in hidden system messages — generate an identity Arc with exactly 3 sentences plus a single gentle "next small step".

QUALITY EXAMPLES (study these for tone and depth):

Example 1 - Craft & Contribution:
Name: "🧠 Craft & Contribution"
Narrative: "I want to become a product builder whose work is marked by clarity, compassion, and craftsmanship. This Arc is about developing the ability to see complexity clearly, to name problems honestly, and to build solutions that genuinely help people. It's the pursuit of excellence—not for ego, but because thoughtful work is a form of service."

Example 2 - Making & Embodied Creativity:
Name: "🪚 Making & Embodied Creativity"
Narrative: "I want to stay connected to the physical world through the work of my hands—building, shaping, repairing, and creating things that are tangible and lasting. Making reminds me that growth isn't only intellectual. It's slow, physical, patient, and grounded. It teaches me presence. It teaches me to notice details. It teaches me to treat materials with respect."

Example 3 - Venture / Entrepreneurship:
Name: "🚀 Venture / Entrepreneurship"
Narrative: "I want to build ventures that are principled, thoughtful, and genuinely helpful. Entrepreneurship is not about speed or hype for me—it's about stewarding ideas that could make people's lives more coherent, more peaceful, or more empowered. This Arc represents my desire to take responsibility for my creativity and see it through to real-world impact."

Key qualities to match: specific concrete language, clear "I want" statements, natural flow, grounded in real scenes, reflects genuine identity direction.

Respond ONLY with a JSON object in this shape (no extra commentary):
{
  "arcName": string, // 1–3 words (emoji prefix allowed), describing an identity direction or arena, stable over time, reflecting the user's inputs. Use patterns like Domain+Posture, Value+Domain, Two-noun frame, or canonical templates.
  "aspirationSentence": string, // exactly 3 sentences in one paragraph, 40–120 words, FIRST sentence must start with "I want…", use plain grounded language suitable for ages 14–50+, avoid guru-speak/cosmic language/therapy language/prescriptive "shoulds". Sentence 1 expresses identity direction, Sentence 2 explains why it matters now, Sentence 3 gives one concrete ordinary-life scene. CRITICAL: All sentences must be grammatically complete and natural-sounding. Transform user inputs into proper prose rather than inserting raw phrases verbatim. Extract core concepts from user dreams/inputs and express them naturally.
  "nextSmallStep": string // one sentence starting with "Your next small step: …"
}

The Arc should focus on character, energy, and trajectory (who they want to become), not achievements or metrics. The nextSmallStep must be concrete but low-pressure (e.g., "Practice what matters for just 5 minutes.").
```

**Additional Context**:
- System prompt from `chatRegistry.ts` (`FIRST_TIME_ONBOARDING_PROMPT`) is also included
- User profile summary is added via `buildUserProfileSummary()` in `ai.ts`
- Temperature: 0.3 (for arc generation modes)

**Execution**:
- Called via `sendStepAssistantCopy('aspiration_generate')` in `OnboardingGuidedFlow.tsx`
- Uses `sendCoachChat()` with workflow context
- Response is parsed for JSON
- No quality scoring loop (simpler than Flow 1)

---

## System Prompts Layer

### Chat Mode Registry

**File**: `src/features/ai/chatRegistry.ts`

**FIRST_TIME_ONBOARDING_PROMPT** (lines 143-188):
```
You are an identity-development AI grounded in narrative identity theory, possible selves research, self-determination theory, motivational interviewing, and positive psychology.

In this mode you are the **First-Time Onboarding Guide** for a thoughtful, story-centered planner that helps users design their life operating model. Your job is to quietly synthesize a short, emotionally resonant, non-prescriptive identity aspiration from a handful of structured, tap-first inputs. The host owns the UI and step sequence; you provide meaning.

### How the workflow talks to you
- The host collects structured answers via cards (vibe, social presence, core strength, everyday proud moment, optional nickname, and occasional tweak preferences).
- When it needs your help, it will send you a synthetic "user" message describing:
  - The current step and its purpose.
  - The fields collected so far.
  - Any validation hints or output schema (for example, the JSON shape for an aspiration).
- Treat these messages as **instructions**, not literal user utterances.
- Respond with a single short assistant message or a single JSON object, as requested by the prompt for that step.

### What you should do for identity aspiration
- Use the inputs you're given to infer:
  - The emotional vibe of the hoped-for self.
  - How others experience that self (social mirror).
  - The kind of strength they're growing into.
  - How that identity shows up on an ordinary day.
  - Any optional nickname or tweak preferences.
- Synthesize:
  - Arc.name: 1–3 words (emoji prefix allowed), describing an identity direction or arena, stable over time, reflecting the user's inputs. Use patterns like Domain+Posture, Value+Domain, Two-noun frame, or canonical templates.
  - Arc.narrative: exactly 3 sentences in one paragraph, 40–120 words, FIRST sentence must start with "I want…", use plain grounded language suitable for ages 14–50+, avoid guru-speak/cosmic language/therapy language/prescriptive "shoulds". Sentence 1 expresses identity direction, Sentence 2 explains why it matters now, Sentence 3 gives one concrete ordinary-life scene.
  - One gentle, concrete "next small step" starting with: "Your next small step: …".
- Focus on **character, energy, and trajectory**, not on achievements, metrics, or career labels.
- Avoid telling the user who they *should* be; reflect who they are *becoming* based on their own choices.
- If the user wants to tweak the Arc, regenerate using all the original rules, adjusting the tone toward the preference expressed in the user's feedback.

### Tone and age sensitivity
- Tone: warm, clear, grounded, low-pressure.
- Adjust complexity and examples quietly based on any age/season cues the host has already provided (for example, via hidden profile context):
  - Ages 13–16: simpler language, high-energy, concrete and encouraging.
  - Adults: reflective, slightly more nuanced, still concrete.
  - Very young teens: no jargon, low abstraction.
- Do not announce that you are adjusting tone; simply speak in a way that fits.

### Boundaries
- Stay inside the job of **identity aspiration + next small step**:
  - Do not design full plans, long goal lists, or productivity systems here.
  - Do not ask the user for more free-text fields unless explicitly instructed by the host.
- Keep outputs compact so they fit on a small mobile card:
  - Arc narratives: exactly 3 sentences, 40–120 words.
  - Next steps: 1 short sentence.
- Avoid hype and generic self-help language; sound like a thoughtful human coach, not a slogan.
```

**ARC_CREATION_SYSTEM_PROMPT** (lines 35-141):
- Used for coach-led Arc creation (not FTUE)
- Similar but more conversational
- Includes ideal Arc template examples

---

## AI Service Layer

### Main Functions

**File**: `src/services/ai.ts`

1. **`sendCoachChat()`** (lines 839-1052)
   - Generic chat endpoint for all coach interactions
   - Handles tool calls, follow-ups, dev logging
   - Temperature: 0.3 for arc generation modes, 0.55 otherwise

2. **`generateArcs()`** (lines 420-447)
   - Used for coach-led Arc creation (not FTUE)
   - Returns 2-3 Arc suggestions
   - Uses structured JSON schema

3. **`buildUserProfileSummary()`** (lines 78-209)
   - Builds context string from user profile
   - Includes: name, age, focus areas, communication preferences, etc.
   - Max length: 600 characters

---

## Quality Scoring & Validation

### Flow 1: IdentityAspirationFlow

**Function**: `scoreAspirationQuality()` (lines 964-1075)
- Makes separate AI call to judge quality
- Returns score (0-10) and reasoning
- Checks: alignment, developmental accuracy, realism, clarity
- Used in feedback loop (up to 3 attempts)

**Function**: `scoreArcInsightQuality()` (lines 1078-1190)
- Scores development insights (strengths, growth edges, pitfalls)
- Similar structure to aspiration scoring

### Flow 2: OnboardingGuidedFlow

- **No quality scoring loop**
- Relies on prompt quality and single generation
- Simpler, faster, but potentially lower quality

---

## Post-Generation: Development Insights

**File**: `src/features/arcs/arcDevelopmentInsights.ts`

After Arc is created:
1. Template matching: Finds best-matching `IdealArcTemplate`
2. AI generation: Uses coach chat to generate insights
3. Quality scoring: Scores each candidate (0-10)
4. Iteration: Up to 3 attempts, keeping best (threshold: 7.5)
5. Fallback: Local fallback if generation fails

**Insights Structure**:
- `strengths`: 2-3 bullets
- `growthEdges`: 2-3 bullets
- `pitfalls`: 2-3 bullets

---

## Simplification Opportunities

**Note**: We are keeping the 10-question variant (IdentityAspirationFlow) as the primary flow. Simplification efforts should focus on streamlining prompts and generation logic while preserving the rich data collection.

### 1. **Massive Prompt Bloat**
- Flow 1 prompt is ~2,000 words (~200 lines of code)
- Contains extensive rules, examples, and instructions
- Much of this could be moved to system prompt or simplified
- **Recommendation**: Reduce prompt to ~300-400 words by:
  - Moving core rules to system prompt
  - Keeping only essential instructions in generation prompt
  - Shortening examples to match exact target format

### 2. **Prompt Instructions Contradiction**
- Flow 1 prompt says: "Do NOT use first person ('I')"
- But examples use "I want" throughout
- Target output should use first-person ("I want")
- **Recommendation**: Remove contradiction, standardize on first-person ("I want") approach throughout

### 3. **Example Length Mismatch**
- Examples in prompts are multi-paragraph (100+ words, 6-8 sentences)
- Target output is 3 sentences (40-120 words)
- Examples don't match target format, causing confusion
- **Recommendation**: Replace examples with exact target format:
  - 3 sentences only
  - 40-120 words total
  - First sentence starts with "I want"
  - One concrete scene

### 4. **Prompt Redundancy**
- System prompt (`FIRST_TIME_ONBOARDING_PROMPT`) repeats many rules
- Generation prompt repeats same rules again
- Examples are duplicated in multiple places
- **Recommendation**: 
  - System prompt: High-level identity and tone guidance only
  - Generation prompt: Specific format requirements + input summary
  - Examples: Single source, exact target format

### 5. **Quality Scoring Complexity**
- Complex quality scoring loop (3 attempts, feedback, threshold 9/10)
- Separate AI call to judge quality adds latency and cost
- May be overkill if prompt is well-designed
- **Recommendation**: 
  - Option A: Keep but simplify (single attempt, lower threshold 7/10)
  - Option B: Remove loop, add simple validation (parse check, length check, basic grammar)
  - Use quality scoring for debugging/analytics only, not blocking

### 6. **Multiple Prompt Sources**
- Prompts live in:
  - `chatRegistry.ts` (system prompts)
  - `firstTimeOnboardingV2Spec.ts` (step prompts for Flow 2)
  - `IdentityAspirationFlow.tsx` (inline prompt building for Flow 1)
- **Recommendation**: Centralize Flow 1 prompts:
  - Extract prompt building logic from `IdentityAspirationFlow.tsx`
  - Move to `chatRegistry.ts` or dedicated prompts file
  - Keep inline only the input summary building

### 7. **Overly Verbose Instructions**
- Prompt contains many "Do NOT" rules that could be simplified
- Long explanations of what an Arc is (already in system prompt)
- Repetitive structure guidelines
- **Recommendation**: Consolidate rules into concise format:
  - Use positive instructions ("Use X") instead of negative ("Do NOT use Y")
  - Reference system prompt for high-level guidance
  - Focus on format requirements only

### 8. **Fallback Logic Complexity**
- Complex fallback (`buildLocalAspirationFallback()`) with client-side synthesis
- May be unnecessary if prompt quality is good
- **Recommendation**: Simplify fallback:
  - If parsing fails → retry once with clearer instructions
  - If still fails → simple template-based fallback (use nickname + domain)
  - Remove complex client-side synthesis

### 9. **Input Summary Verbosity**
- Input summary includes all 10+ fields with labels
- Some fields may be redundant or could be synthesized
- **Recommendation**: Condense input summary:
  - Group related fields (e.g., "values: honesty, courage, care")
  - Skip empty/optional fields
  - Focus on strongest signals (domain, motivation, dreams, nickname)

### 10. **Post-Generation Complexity**
- Development insights generation is separate, complex process
- Template matching, quality scoring, iteration loop
- May be overkill for FTUE
- **Recommendation**: Simplify or defer:
  - Generate insights asynchronously after Arc creation
  - Use simpler template matching (no quality scoring loop)
  - Or defer to post-onboarding entirely

---

## Recommended Simplification Path (Keeping 10 Questions)

### Phase 1: Fix Contradictions & Standardize Format
1. **Remove first-person contradiction**
   - Update prompt to require first-person ("I want")
   - Remove "Do NOT use first person" rule
   - Update examples to use first-person consistently

2. **Fix example format**
   - Replace multi-paragraph examples with 3-sentence examples
   - Match exact target format (40-120 words, "I want" start)
   - Keep examples in single source (idealArcs.ts or chatRegistry.ts)

### Phase 2: Reduce Prompt Size
3. **Extract core rules to system prompt**
   - Move high-level identity guidance to system prompt
   - Keep only format requirements in generation prompt
   - Reduce from ~2,000 words to ~400-500 words

4. **Simplify instructions**
   - Consolidate "Do NOT" rules into positive instructions
   - Remove redundant explanations
   - Focus on what to do, not what to avoid

5. **Condense input summary**
   - Group related fields
   - Skip empty fields
   - Focus on strongest signals

### Phase 3: Simplify Generation Logic
6. **Simplify quality scoring** (choose one):
   - Option A: Keep but reduce to 1-2 attempts, threshold 7/10
   - Option B: Remove loop, add simple validation only
   - Use quality scoring for analytics/debugging, not blocking

7. **Simplify fallback**
   - Retry once if parse fails
   - Simple template fallback if still fails
   - Remove complex client-side synthesis

8. **Centralize prompts**
   - Extract prompt building from `IdentityAspirationFlow.tsx`
   - Move to `chatRegistry.ts` or dedicated file
   - Single source of truth for examples

### Phase 4: Defer Complex Features
9. **Post-generation insights**
   - Generate asynchronously after Arc creation
   - Simplify template matching (no quality loop)
   - Or defer entirely to post-onboarding

---

## Current Prompt Word Counts

- **Flow 1 generation prompt**: ~2,000 words (including examples)
- **System prompt**: ~400 words
- **Total**: ~2,400 words of prompt instructions

**Target**: Reduce to ~400-500 words total
- System prompt: ~200 words (high-level guidance)
- Generation prompt: ~200-300 words (format + input summary)
- Examples: Reference external source (idealArcs.ts)

---

## Key Files Reference

- `src/features/onboarding/IdentityAspirationFlow.tsx` - Complex flow (3,210 lines)
- `src/features/onboarding/OnboardingGuidedFlow.tsx` - V2 workflow flow (2,033 lines)
- `src/domain/workflowSpecs/firstTimeOnboardingV2Spec.ts` - V2 workflow definition
- `src/features/ai/chatRegistry.ts` - System prompts
- `src/services/ai.ts` - AI service layer
- `src/features/arcs/arcDevelopmentInsights.ts` - Post-generation insights
- `src/domain/idealArcs.ts` - Ideal Arc templates

