/**
 * Hybrid Arc Prompting (Minimalist + Archetype)
 *
 * Source of truth for the Arc-generation paradigm we want across the app:
 * - FTUE (first-time onboarding)
 * - General Arc creation ("Arc Coach" workflow)
 * - Any other Arc suggestion surfaces that call `ai.generateArcs`
 *
 * DESIGN GOALS (matches our rubric dimensions):
 * - Felt Accuracy: the Arc should feel like it "gets" the person
 * - Reading Ease: a 14-year-old can understand it instantly
 * - Everyday Concreteness: tangible scenes + micro-behaviors, not abstractions
 * - Non-parroting: transform inputs into identity language, don't copy phrases verbatim
 *
 * IMPORTANT:
 * Some production flows *do* collect explicit role-model taps (type / specific / why / admired qualities).
 * When present, those should be treated as **high-signal** inputs for felt accuracy.
 * When absent, we still borrow the Archetype idea by asking the model to
 * *infer admired qualities* from whatever signals we do have.
 */

/**
 * Common hard constraints that must be satisfied for every Arc output.
 * Keep this stable so rubric comparisons remain meaningful.
 */
export const HYBRID_ARC_HARD_CONSTRAINTS = [
  'Return 1–3 Arc suggestions (as requested).',
  'Arc name: 1–3 meaningful words (emoji allowed). Prefer 2 words.',
  'Arc narrative: exactly 3 sentences, single paragraph (no newlines), 40–120 words.',
  'Narrative MUST start with: "I want".',
  'Avoid clichés and mush phrases (no "journey", no "mindset", no "purposeful impact").',
  'Avoid guru/cosmic/therapy language and prescriptive "shoulds".',
].join('\n');

/**
 * How we want those 3 sentences to function.
 * We explicitly bake in the two concreteness requirements that improve rubric scores:
 * - an everyday scene
 * - a small concrete behavior cue (no explicit timeframe)
 */
export const HYBRID_ARC_SENTENCE_ROLES = [
  'Sentence 1: Start with "I want…" and state the identity direction in plain language.',
  'Sentence 2: Why this matters now (use user signals; keep it specific).',
  'Sentence 3: Include (a) one ordinary-life scene AND (b) one small concrete behavior cue that fits a normal day (no explicit timeframe language like "this week"). Make it easy to picture.',
].join('\n');

/**
 * Quality requirements aligned to our grading rubric.
 * This is the "Hybrid" part: minimal essentials + inferred archetype.
 */
export const HYBRID_ARC_QUALITY_REQUIREMENTS = [
  'Optimize for:',
  '1) Felt accuracy: it should feel true to this person’s signals (not generic).',
  '2) Reading ease: short sentences, short words; a 14-year-old understands instantly.',
  '3) Everyday concreteness: tangible verbs, small scenes, real-life detail.',
  '',
  'Show-don’t-tell rule (prevents virtue-only arcs):',
  '- If you reference an admired quality (e.g., steady, brave, disciplined), show it through an action or scene.',
  '- Do NOT write adjective-only or virtue-list sentences. Prefer verbs and ordinary-life detail.',
  '',
  'Non-parroting rule:',
  '- Do NOT copy raw input phrases verbatim. Translate them into natural identity language.',
  '',
  'Archetype (role-model translation):',
  '- If the user provided role model signals (type / person / why / admired qualities), use them as high-signal.',
  '- Translate them into *the user’s* identity language (do NOT name-drop the role model; do NOT copy the role model descriptor verbatim).',
  '',
  'Archetype fallback (when role-model signals are missing):',
  '- Silently infer 2–3 admired qualities (e.g., steady, courageous, craft-focused, generous).',
  '- Use them to sharpen the Arc’s identity voice.',
].join('\n');

/**
 * Small helper to embed these guidelines into prompts.
 * We keep this as a single block so different call sites stay consistent.
 */
export const buildHybridArcGuidelinesBlock = (): string => {
  return [
    'HYBRID ARC GENERATION (Minimalist + Archetype)',
    '',
    'Hard constraints:',
    HYBRID_ARC_HARD_CONSTRAINTS,
    '',
    'Sentence roles:',
    HYBRID_ARC_SENTENCE_ROLES,
    '',
    'Quality requirements:',
    HYBRID_ARC_QUALITY_REQUIREMENTS,
  ].join('\n');
};


