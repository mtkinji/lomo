export type ArcIdentitySlices = {
  identity: string;
  why: string;
  daily: string;
};

export type AspirationPayload = {
  arcName: string;
  aspirationSentence: string;
  nextSmallStep: string;
};

export type ArcDevelopmentInsights = {
  strengths: string[];
  growthEdges: string[];
  pitfalls: string[];
};

export type ParseAspirationFromReplyOptions = {
  fallbackNextSmallStep: string;
};

export const MIN_INSIGHTS_PER_SECTION = 2;

const BANNED_ARC_MUSH_PHRASES = [
  'in a grounded way',
  'rooted in',
  'powered by',
  'radiant',
  'tapestry',
  'essence',
  'unlock',
] as const;

export function containsArcMushPhrases(text: string): boolean {
  const normalized = text.toLowerCase();
  return BANNED_ARC_MUSH_PHRASES.some((phrase) => normalized.includes(phrase));
}

// Lightweight sentence splitter tailored for Arc narratives.
// Assumes three declarative sentences but degrades gracefully.
export function splitAspirationNarrative(narrative?: string | null): ArcIdentitySlices | null {
  if (!narrative) return null;
  const text = narrative.trim();
  if (!text) return null;

  const abbreviations = new Set(['e.g.', 'i.e.', 'dr.', 'mr.', 'ms.']);
  const sentences: string[] = [];
  let start = 0;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const isTerminalPunctuation = ch === '.' || ch === '!' || ch === '?';
    if (!isTerminalPunctuation) continue;

    const prevChar = i > 0 ? text[i - 1] : '';
    const nextChar = i + 1 < text.length ? text[i + 1] : '';

    if (ch === '.' && /\d/.test(prevChar) && /\d/.test(nextChar)) {
      continue;
    }

    const abbreviationCandidate = text
      .slice(0, i + 1)
      .toLowerCase()
      .match(/(?:^|\s)(e\.g\.|i\.e\.|dr\.|mr\.|ms\.)$/)?.[1];
    if (abbreviationCandidate && abbreviations.has(abbreviationCandidate)) {
      continue;
    }

    if (nextChar && !/\s/.test(nextChar)) {
      continue;
    }

    const rawSentence = text.slice(start, i + 1).trim();
    if (rawSentence.length > 0) {
      sentences.push(rawSentence);
    }
    start = i + 1;
    if (sentences.length === 3) break;
  }

  if (sentences.length < 3 && start < text.length) {
    const tail = text.slice(start).trim();
    if (tail) {
      sentences.push(tail);
    }
  }

  if (sentences.length !== 3) {
    return null;
  }

  const [identity, why, daily] = sentences;
  return { identity, why, daily };
}

export function sanitizeArcName(name: string): string {
  if (!name) return 'The Steady Self';

  let cleaned = name.trim();

  cleaned = cleaned.replace(
    /^(toward|towards|becoming|i want to|i want|i['\u2019]d love to|i['\u2019]d like to|i would love to|i would like to|i['\u2019]d|i can)\s+/i,
    '',
  );

  cleaned = cleaned.replace(/\bi want\b/gi, '');
  cleaned = cleaned.replace(/\bi['\u2019]d\b/gi, '');

  const words = cleaned.split(/\s+/).filter((word) => {
    const lower = word.toLowerCase();
    const hasLetter = /[\p{L}\p{N}]/u.test(lower);
    return (
      word.length > 0 &&
      hasLetter &&
      ![
        'to',
        'a',
        'an',
        'and',
        'or',
        'but',
        'in',
        'on',
        'at',
        'for',
        'of',
        'with',
        'love',
        'like',
        'want',
        'would',
      ].includes(lower) &&
      !lower.match(/^(i|you|we|they|it)$/)
    );
  });

  const meaningfulWords = words.slice(0, 5);
  if (meaningfulWords.length === 0) {
    return 'The Steady Self';
  }

  return meaningfulWords
    .map((word) => {
      const hasInternalCaps = /[A-Z]/.test(word.slice(1));
      if (hasInternalCaps) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

export function parseAspirationFromReply(
  reply: string,
  options: ParseAspirationFromReplyOptions,
): AspirationPayload | null {
  try {
    const startIdx = reply.indexOf('{');
    const endIdx = reply.lastIndexOf('}');
    const jsonText =
      startIdx !== -1 && endIdx !== -1 && endIdx > startIdx
        ? reply.slice(startIdx, endIdx + 1)
        : reply;

    const parsed = JSON.parse(jsonText) as {
      name?: string;
      narrative?: string;
      arcName?: string;
      aspirationSentence?: string;
      nextSmallStep?: string | null;
    };

    const arcName = parsed.name || parsed.arcName;
    const aspirationSentence = parsed.narrative || parsed.aspirationSentence;

    if (arcName && aspirationSentence) {
      const nextSmallStep =
        parsed.nextSmallStep && parsed.nextSmallStep.trim().length > 0
          ? parsed.nextSmallStep
          : options.fallbackNextSmallStep;

      return {
        arcName: sanitizeArcName(arcName),
        aspirationSentence,
        nextSmallStep,
      };
    }
  } catch {
    // Try markdown-style parsing next.
  }

  const nameMatch = reply.match(/\*\*Arc Name:\*\*\s*"?([^"\n]+)"?/i);
  if (!nameMatch || !nameMatch[1]?.trim()) {
    return null;
  }

  const rawName = nameMatch[1].trim();
  const arcName = sanitizeArcName(rawName);
  if (!arcName) {
    return null;
  }

  const afterTitle = reply.slice((nameMatch.index ?? 0) + nameMatch[0].length).trim();
  if (!afterTitle) {
    return null;
  }

  return {
    arcName,
    aspirationSentence: afterTitle,
    nextSmallStep: options.fallbackNextSmallStep,
  };
}

export function parseInsightsFromReply(reply: string): ArcDevelopmentInsights | null {
  try {
    const startIdx = reply.indexOf('{');
    const endIdx = reply.lastIndexOf('}');
    const jsonText =
      startIdx !== -1 && endIdx !== -1 && endIdx > startIdx
        ? reply.slice(startIdx, endIdx + 1)
        : reply;

    const parsed = JSON.parse(jsonText) as {
      strengths?: string[];
      growthEdges?: string[];
      pitfalls?: string[];
    };

    if (!parsed.strengths || !parsed.growthEdges || !parsed.pitfalls) {
      return null;
    }

    const normalizeInsightLine = (value: string): string => {
      const trimmed = value.trim();
      return trimmed
        .replace(/^\s*(?:[-*\u2022]\s+|\d+[.)]\s+)/, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const strengths = parsed.strengths
      .filter((item) => typeof item === 'string' && item.trim())
      .map((item) => normalizeInsightLine(item as string));
    const growthEdges = parsed.growthEdges
      .filter((item) => typeof item === 'string' && item.trim())
      .map((item) => normalizeInsightLine(item as string));
    const pitfalls = parsed.pitfalls
      .filter((item) => typeof item === 'string' && item.trim())
      .map((item) => normalizeInsightLine(item as string));

    if (
      strengths.length < MIN_INSIGHTS_PER_SECTION ||
      growthEdges.length < MIN_INSIGHTS_PER_SECTION ||
      pitfalls.length < MIN_INSIGHTS_PER_SECTION
    ) {
      return null;
    }

    return { strengths, growthEdges, pitfalls };
  } catch {
    return null;
  }
}

export function isHarshOrClinicalInsightLine(value: string): boolean {
  const line = value.trim();
  if (!line) return true;

  if (/^\s*(individuals?|many individuals?)\b/i.test(line)) return true;

  const bannedPhrases: RegExp[] = [
    /\b(should|must|have to|need to)\b/i,
    /\b(grapple|struggle|struggling|overextend|overextending|neglect|trap|pitfall|fault|flaw)\b/i,
    /\b(challenge|challenges)\b/i,
    /\b(fall into)\b/i,
    /\b(perfectionism|perfectly)\b/i,
    /\b(always|never)\b/i,
  ];
  return bannedPhrases.some((re) => re.test(line));
}

export function isHarshOrClinicalInsightSet(insights: ArcDevelopmentInsights): boolean {
  const all = [...insights.strengths, ...insights.growthEdges, ...insights.pitfalls];
  return all.some(isHarshOrClinicalInsightLine);
}
