import type { Arc } from './types';

/**
 * Canonical, hand-crafted Arc exemplars used as a reference set for
 * judging / coaching newly proposed Arcs. These are _not_ persisted in
 * the main store; they exist purely as gold-standard shapes for
 * prompts, comparisons, and UX copy.
 *
 * They are intentionally richer than the minimal `Arc` model so we can
 * capture north-star summaries and force emphasis without polluting the
 * core domain type.
 */

export type IdealArcTemplateId =
  | 'discipleship'
  | 'family_stewardship'
  | 'craft_contribution'
  | 'making_embodied_creativity'
  | 'venture_entrepreneurship';

export type IdealArcForceId =
  | 'force-activity'
  | 'force-connection'
  | 'force-mastery'
  | 'force-spirituality';

export type IdealArcTemplate = {
  /**
   * Stable identifier for this ideal Arc used in prompts and any
   * internal logic. Does NOT collide with real `Arc.id` values.
   */
  id: IdealArcTemplateId;
  /**
   * Emoji + short Arc name. This maps 1:1 to how we expect `Arc.name`
   * to be shaped in the product.
   */
  name: Arc['name'];
  /**
   * Full, multi-paragraph narrative describing the identity direction.
   * This is the gold-standard reference for `Arc.narrative`.
   */
  narrative: NonNullable<Arc['narrative']>;
  /**
   * Optional one-sentence north star that captures the heartbeat of the
   * Arc in a compact way.
   */
  northStar?: string;
  /**
   * Canonical Four Forces this Arc leans on. Expressed in terms of
   * `Force.id` values so judge / coach logic can line up with
   * `canonicalForces` and Goal Force Intent.
   */
  forceEmphasis: IdealArcForceId[];
  /**
   * Optional list of exemplar Goal titles that naturally “live” in this
   * Arc. These are useful for prompts and future seeding, but are not
   * treated as real `Goal` records.
   */
  exemplarGoalTitles?: string[];
};

export const IDEAL_ARC_TEMPLATES: IdealArcTemplate[] = [
  {
    id: 'discipleship',
    name: '♾️ Discipleship',
    northStar:
      'Become a disciple of Christ whose life quietly reflects His character, love, and integrity in every sphere of influence.',
    narrative: `
I want my life to be shaped—quietly, steadily, and sincerely—by the teachings and character of Jesus Christ. Discipleship is not something I visit occasionally; it is the deep interior orientation of my heart. It is a willingness to be taught, formed, and corrected. It is the daily practice of turning toward God, even when life is full, noisy, or complex.

In this Arc, I seek a life marked by gentleness, courage, humility, and charity. I want to see others the way Christ sees them. I want to make choices that reflect His integrity and His priorities. Discipleship means letting Christ influence how I speak, how I work, how I lead my family, and how I treat others—especially in small moments when no one else is watching.

Ultimately, this Arc is about becoming a person whose actions and presence reflect something of Christ’s love and steadiness. It is the quiet work of aligning my outer life with my inner convictions.
    `.trim(),
    forceEmphasis: ['force-connection', 'force-spirituality'],
  },
  {
    id: 'family_stewardship',
    name: '🏡 Family Stewardship',
    northStar:
      'Build a home where Blaire and our children feel known, safe, loved, and lifted toward their own callings.',
    narrative: `
My family is the most sacred stewardship I’ve been given. I want to be the kind of husband and father who creates an atmosphere of warmth, trust, and joy—a place where each person feels safe, known, and lifted. This means leading with patience, listening with real attention, and being present emotionally, spiritually, and physically.

Family stewardship also means being intentional: forming traditions, creating shared experiences, modeling resilience and faith, and investing in each child’s growth. It means choosing generosity over frustration, relationship over speed, and kindness over convenience. My leadership at home is not about control but about care—building a foundation of love and stability that my children will carry with them long after they leave our home.

In this Arc, I want to cultivate a family culture where discipleship becomes lived experience: in conversation, in service, in forgiveness, and in the small rituals of daily life.
    `.trim(),
    forceEmphasis: ['force-connection', 'force-activity'],
  },
  {
    id: 'craft_contribution',
    name: '🧠 Craft & Contribution (Product Leadership)',
    northStar:
      'Become a builder-PM whose work is thoughtful, precise, and oriented toward real human good.',
    narrative: `
I want to become a product builder whose work is marked by clarity, compassion, and craftsmanship. This Arc is about developing the ability to see complexity clearly, to name problems honestly, and to build solutions that genuinely help people. It’s the pursuit of excellence—not for ego, but because thoughtful work is a form of service.

I want my work to be rigorous and human at the same time. That means listening deeply to users, elevating their voices inside teams, and making decisions that reflect discernment rather than noise. It means writing clearly, building simply, and shipping things that solve real problems—not just impress peers.

This Arc is also about contribution. I want to mentor others, share my knowledge freely, and increase the clarity and capability of the people I work with. Ultimately, I want my craft to be an expression of discipleship: tools and systems built with integrity, intention, and care.
    `.trim(),
    forceEmphasis: ['force-mastery'],
  },
  {
    id: 'making_embodied_creativity',
    name: '🪚 Making & Embodied Creativity (Woodworking + Hands-On Craft)',
    northStar:
      'Cultivate the hands and habits of a craftsman—creating things that are durable, beautiful, and made with care.',
    narrative: `
I want to stay connected to the physical world through the work of my hands—building, shaping, repairing, and creating things that are tangible and lasting. Making reminds me that growth isn’t only intellectual. It’s slow, physical, patient, and grounded. It teaches me presence. It teaches me to notice details. It teaches me to treat materials with respect.

In this Arc, I want to cultivate skill, precision, and an appreciation for the quiet wisdom of craft. Woodworking, building, and physical projects are a form of meditation for me: they steady me, reset me, and create beauty and usefulness for the people I love. They are a counterweight to digital complexity.

Making is also spiritual. It echoes creation itself. When I shape something with my hands, I participate in a small act of order, patience, and service. This Arc ensures I remain a whole person—mind, heart, and hands.
    `.trim(),
    forceEmphasis: ['force-activity', 'force-mastery'],
    exemplarGoalTitles: [
      '🧰 Create a workshop environment that makes making easier',
      '🧑‍🏫 Build skill progression through “purposeful projects”',
      '🏁 Be a project finisher!',
    ],
  },
  {
    id: 'venture_entrepreneurship',
    name: '🚀 Venture / Entrepreneurship',
    northStar:
      'Build ventures that simplify complexity, honor humanity, and create meaningful value in the world.',
    narrative: `
I want to build ventures that are principled, thoughtful, and genuinely helpful. Entrepreneurship is not about speed or hype for me—it’s about stewarding ideas that could make people’s lives more coherent, more peaceful, or more empowered. This Arc represents my desire to take responsibility for my creativity and see it through to real-world impact.

I want to approach ventures with clarity, honesty, and a long-term mindset. I want to build things that endure, not just things that launch. This means developing the ability to choose wisely, to design simply, to listen to users, to iterate humbly, and to lead with integrity.

In this Arc, entrepreneurship becomes a moral practice: aligning opportunities with values, building with care, and using my gifts to create things that serve others—not just myself.
    `.trim(),
    forceEmphasis: ['force-mastery'],
  },
];

export const getIdealArcTemplateById = (
  id: IdealArcTemplateId
): IdealArcTemplate | undefined => IDEAL_ARC_TEMPLATES.find((template) => template.id === id);

export const listIdealArcTemplates = (): IdealArcTemplate[] => IDEAL_ARC_TEMPLATES;

export type ArcNarrativeJudgement = {
  /**
   * Lightweight 0–10 quality score for an Arc-style name + narrative.
   * This is intentionally heuristic and meant for debugging / prompts,
   * not user-facing grading.
   */
  score: number;
  components: {
    /**
     * 0–4 — rewards narratives that are long enough to say something
     * real, but not so long that they feel like an essay.
     */
    narrativeLength: number;
    /**
     * 0–3 — checks for first-person, identity-oriented language
     * (“I want”, “become”, etc).
     */
    identityLanguage: number;
    /**
     * 0–3 — rewards multi-sentence structure so the Arc can carry a
     * beginning, middle, and why-it-matters.
     */
    structure: number;
  };
};

/**
 * Heuristic scorer for Arc-style narratives. Uses only local text
 * features (length, first-person identity language, sentence shape) so
 * it can run entirely on-device and be safe to call from console logs.
 *
 * Any object with `name` and `narrative` fields (including GeneratedArc
 * and real Arc records) can be passed in.
 */
export const scoreArcNarrative = (arc: {
  name: string;
  narrative?: string | null;
}): ArcNarrativeJudgement => {
  const name = (arc.name ?? '').trim();
  const narrative = (arc.narrative ?? '').trim();
  const combined = `${name} ${narrative}`.trim();

  if (!combined) {
    return {
      score: 0,
      components: { narrativeLength: 0, identityLanguage: 0, structure: 0 },
    };
  }

  // --- Narrative length (0–4) ----------------------------------------
  const wordCount = narrative.length > 0 ? narrative.split(/\s+/).filter(Boolean).length : 0;
  let narrativeLength = 0;
  if (wordCount >= 40 && wordCount <= 140) {
    narrativeLength = 4;
  } else if (wordCount >= 30) {
    narrativeLength = 3;
  } else if (wordCount >= 15) {
    narrativeLength = 2;
  } else if (wordCount > 0) {
    narrativeLength = 1;
  }

  // --- Identity-oriented language (0–3) ------------------------------
  const lower = combined.toLowerCase();
  let identityLanguage = 0;
  // Require "I want" for max identity score
  if (/\bi want\b/.test(lower)) {
    identityLanguage = 3;
  } else if (/\b(become|becoming)\b/.test(lower)) {
    identityLanguage = 2;
  } else if (/\bi (hope|long|aim|imagine|seek)\b/.test(lower)) {
    identityLanguage = 1;
  }

  // --- Sentence structure (0–3) --------------------------------------
  const sentenceCount =
    narrative.length > 0
      ? narrative
          .split(/[.!?]+/)
          .map((part) => part.trim())
          .filter((part) => part.length > 0).length
      : 0;

  let structure = 0;
  // Award full points only for exactly 3 sentences
  if (sentenceCount === 3) {
    structure = 3;
  } else if (sentenceCount === 2) {
    structure = 2;
  } else if (sentenceCount === 1) {
    structure = 1;
  }

  const raw = narrativeLength + identityLanguage + structure;
  const score = Math.max(0, Math.min(10, raw));

  return {
    score,
    components: {
      narrativeLength,
      identityLanguage,
      structure,
    },
  };
};



