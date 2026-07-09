export type ArcBannerImageSearchInput = {
  arcName: string;
  arcNarrative?: string;
  goalTitles?: string[];
};

type SearchTheme = {
  subject: string;
  style: string;
  context: string;
};

const ABSTRACT_ARC_WORDS = new Set([
  'arc',
  'be',
  'become',
  'becoming',
  'better',
  'build',
  'builder',
  'business',
  'create',
  'creator',
  'daily',
  'do',
  'doing',
  'find',
  'founder',
  'focused',
  'future',
  'get',
  'grow',
  'growth',
  'habit',
  'identity',
  'improve',
  'journey',
  'leadership',
  'learn',
  'life',
  'make',
  'maker',
  'mindset',
  'more',
  'my',
  'practice',
  'progress',
  'project',
  'release',
  'routine',
  'self',
  'ship',
  'start',
  'strong',
  'the',
  'weekly',
  'work',
  'note',
]);

const STYLE_BLOCKLIST = [
  'stock photo',
  'office',
  'desk',
  'laptop',
  'business meeting',
  'corporate',
  'person smiling',
  'handshake',
];

const THEME_RULES: Array<{
  keywords: string[];
  theme: SearchTheme;
}> = [
  {
    keywords: ['run', 'running', 'marathon', 'fitness', 'strength', 'training', 'gym', 'lift', 'athlete'],
    theme: {
      subject: 'trail runner',
      style: 'cinematic motion',
      context: 'mountain sunrise',
    },
  },
  {
    keywords: ['health', 'sleep', 'nutrition', 'wellness', 'recovery', 'mindful', 'meditation'],
    theme: {
      subject: 'quiet morning',
      style: 'natural light',
      context: 'calm landscape',
    },
  },
  {
    keywords: ['family', 'parent', 'kids', 'marriage', 'partner', 'friend'],
    theme: {
      subject: 'warm home',
      style: 'documentary light',
      context: 'family table',
    },
  },
  {
    keywords: ['money', 'budget', 'finance', 'save', 'saving', 'invest', 'debt'],
    theme: {
      subject: 'city architecture',
      style: 'clean lines',
      context: 'golden hour',
    },
  },
  {
    keywords: ['career', 'leadership', 'founder', 'startup', 'business', 'ship', 'launch'],
    theme: {
      subject: 'modern architecture',
      style: 'bold perspective',
      context: 'city skyline',
    },
  },
  {
    keywords: ['write', 'writing', 'book', 'study', 'learn', 'reading', 'creative', 'artist', 'music'],
    theme: {
      subject: 'creative studio',
      style: 'editorial detail',
      context: 'soft window light',
    },
  },
  {
    keywords: ['travel', 'adventure', 'outside', 'outdoor', 'climb', 'hike', 'camp'],
    theme: {
      subject: 'alpine trail',
      style: 'wide angle',
      context: 'dramatic landscape',
    },
  },
];

const DEFAULT_THEME: SearchTheme = {
  subject: 'open road',
  style: 'cinematic landscape',
  context: 'golden hour',
};

function normalizeText(value: string | undefined): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueWords(value: string): string[] {
  const seen = new Set<string>();
  const words: string[] = [];
  for (const word of normalizeText(value).split(' ')) {
    if (word.length < 3) continue;
    if (ABSTRACT_ARC_WORDS.has(word)) continue;
    if (seen.has(word)) continue;
    seen.add(word);
    words.push(word);
  }
  return words;
}

function chooseTheme(input: ArcBannerImageSearchInput): SearchTheme {
  const haystack = normalizeText([
    input.arcName,
    input.arcNarrative,
    ...(input.goalTitles ?? []),
  ].filter(Boolean).join(' '));

  for (const rule of THEME_RULES) {
    if (rule.keywords.some((keyword) => haystack.includes(keyword))) {
      return rule.theme;
    }
  }

  return DEFAULT_THEME;
}

function cleanModelPhrase(value: string | null | undefined): string {
  const normalized = normalizeText(value ?? '');
  if (!normalized) return '';

  let cleaned = normalized;
  for (const blocked of STYLE_BLOCKLIST) {
    cleaned = cleaned.replace(new RegExp(`\\b${blocked.replace(/\s+/g, '\\s+')}\\b`, 'g'), ' ');
  }

  return cleaned
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter((word) => word.length >= 3 && !ABSTRACT_ARC_WORDS.has(word))
    .slice(0, 3)
    .join(' ');
}

export function buildArcBannerImageSearchTerm(
  input: ArcBannerImageSearchInput,
  modelPhrase?: string | null
): string | null {
  const theme = chooseTheme(input);
  const modelSubject = cleanModelPhrase(modelPhrase);
  const specificWords = uniqueWords([input.arcName, ...(input.goalTitles ?? [])].join(' ')).slice(0, 2);
  const subject = modelSubject || specificWords.join(' ') || theme.subject;

  const parts = [subject, theme.style, theme.context]
    .map((part) => normalizeText(part))
    .filter(Boolean)
    .join(' ');

  const words = parts
    .split(' ')
    .filter((word, index, list) => list.indexOf(word) === index)
    .slice(0, 7);

  if (words.length === 0) return null;
  return words.join(' ');
}

export function buildArcBannerFallbackSearchTerm(
  input: ArcBannerImageSearchInput
): string | null {
  return buildArcBannerImageSearchTerm(input, null);
}
