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
  'Return exactly ONE Arc suggestion unless another workflow explicitly requests multiple.',
  'Arc name: 2-5 meaningful words. Prefer 2-4 words.',
  'Arc name must describe a person-in-formation, not an activity, project, job title, category, or process.',
  'Arc narrative: exactly 3 sentences, single paragraph with no newlines, 35-65 words.',
  'Narrative sentence 1 MUST start with: "You are becoming".',
  'Narrative sentence 1 names the identity trajectory.',
  'Narrative sentence 2 names the central insight, tension, or why this matters.',
  'Narrative sentence 3 names 1-3 concrete ordinary-life behaviors that would make progress visible.',
  'Keep each sentence readable on mobile. Prefer shorter sentences over packed compound sentences.',
  'Avoid short-horizon goal language like "this week", "today", "next step", "focus block", or "outcome" unless the user explicitly wrote it.',
  'Avoid turning the Arc into a productivity system. The proposal should name a becoming-self, not a way to manage tasks.',
  'Use "you", not "I".',
  'Do not start with "I want".',
  'Avoid parenthetical lists in the proposal narrative.',
  'Avoid semicolon-heavy or comma-stacked sentences that read like compressed essays.',
  'Avoid clichés and mush phrases: no "journey", no "mindset", no "purposeful impact", no "unlock my potential", no "best self", no "level up".',
  'Avoid guru/cosmic/therapy language and prescriptive "shoulds".',
  'Avoid generic filler phrases like "bring that dream to life", "one small step", or "meaningful change" unless the user used those words.',
  'Avoid loaded clinical terms like "burnout" unless the user explicitly provided that language.',
  'Avoid shame-coded phrases like "reaching for escape" unless the user used similar language; prefer gentler language like "reaching for distraction" or "drifting into avoidance".',
].join('\n');

/**
 * How we want those 3 sentences to function.
 * We explicitly bake in the two concreteness requirements that improve rubric scores:
 * - an everyday scene
 * - a small concrete behavior cue (no explicit timeframe)
 */
export const HYBRID_ARC_SENTENCE_ROLES = [
  'Sentence 1: Start with "You are becoming..." and name the identity trajectory in plain language.',
  'Sentence 2: Name the central insight, tension, or why this matters.',
  'Sentence 3: Name 1-3 concrete ordinary-life behaviors that would make progress visible.',
].join('\n');

/**
 * Extra instructions aimed at moving Arc quality from merely "correct" to
 * personally resonant. These came out of synthetic-response review: weaker
 * drafts were often valid JSON and followed the sentence pattern, but they
 * still felt interchangeable because they summarized every input instead of
 * choosing a sharp human center.
 */
export const HYBRID_ARC_RESONANCE_REQUIREMENTS = [
  'Before drafting, silently choose ONE resonance anchor and ONE growth tension.',
  '',
  'For Survey v2 inputs, resonance anchor priority:',
  '1) identityDirection, especially the user-facing label and generationMeaning;',
  '2) howThisShowsUpSeeds, especially concrete ordinary-day behaviors;',
  '3) primaryArena;',
  '4) whyNow;',
  '5) personalTexture or custom text.',
  '',
  'If multiple Survey v2 signals compete, prioritize:',
  '1) identityDirection;',
  '2) primaryArena;',
  '3) howThisShowsUpSeeds / ordinary-day progress;',
  '4) driftPatterns;',
  '5) tonePreferences.',
  '',
  'For Survey v2 inputs, growth tension priority:',
  '1) driftPatterns;',
  '2) whyNow;',
  '3) mismatch between desired direction and current obstacle;',
  '4) any user-supplied custom text that names friction.',
  '',
  'For legacy Survey v1 inputs, resonance anchor priority:',
  '1) the ordinary proud moment;',
  '2) a concrete dream, if present;',
  '3) role-model / admired-quality signals;',
  '4) domain + motivation.',
  '',
  'If the user gave a concrete dream or project, use it as an expression of the Arc, not as the whole Arc.',
  'A strong Arc should usually be broader than the project that inspired it.',
  '',
  'Tone preferences are optional flavor, not required content. Use them only when they naturally strengthen the Arc.',
  'If the user selects include_faith, faith may be treated as a source of grounding, meaning, or return, but do not make theological claims or over-spiritualize the Arc.',
  'If the user selects include_creative_work but the primary arena is not creative work, do not make creative work the main endpoint. Mention it only if it naturally fits.',
  '',
  'Use the anchor and tension to make the Arc feel like it could only belong to this user.',
  'Do NOT try to mention every input. A strong Arc usually uses 2-4 signals deeply instead of many signals shallowly.',
  '',
  'The best proposal should create a quick recognition moment: the user should feel, "Yes, that names what I am trying to become."',
].join('\n');

/**
 * Naming rules that keep Arc names from landing in the "technically valid but
 * forgettable" zone. Names should feel like containers a person might actually
 * adopt, not rubric labels.
 */
export const HYBRID_ARC_NAME_RESONANCE_RULES = [
  'Name selection rules:',
  '- Name the kind of person the user is becoming, not the activity they are doing.',
  '- Prefer 2-5 words that feel human, memorable, and identity-shaped.',
  '- Avoid generic names like "Creative Entrepreneur", "Health Growth", "Personal Development", "Better Parent", "Productivity", or "Identity Growth".',
  '- Avoid activity/process names like "Creative Shipping", "Goal Building", or "Life Alignment".',
  '- Avoid functional operator names like "The Prioritizer", "The Optimizer", "The Executor", "The Planner", or "The Achiever".',
  '- For focus/prioritization inputs, prefer human names like "The Steady Keeper", "The Clear Keeper", "The Grounded Steward", or "The Focused Builder".',
  '- If a big dream names a real arena (album, studio, cabin, app, varsity, classroom), let that arena influence the identity name without making the project itself the Arc.',
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
    'Resonance requirements:',
    HYBRID_ARC_RESONANCE_REQUIREMENTS,
    '',
    'Arc name resonance:',
    HYBRID_ARC_NAME_RESONANCE_RULES,
    '',
    'Quality requirements:',
    HYBRID_ARC_QUALITY_REQUIREMENTS,
  ].join('\n');
};

