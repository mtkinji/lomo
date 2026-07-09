export type VisualSearchObjectKind = 'arc' | 'goal' | 'activity';

export type VisualSearchQueryInput = {
  objectKind: VisualSearchObjectKind;
  name: string;
  description?: string;
  relatedTitles?: string[];
};

export type VisualSearchQueryParts = {
  subject: string;
  style: string;
  context: string;
  avoid: string[];
  query: string;
};

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

const GOAL_STOP_WORDS = new Set([
  ...ABSTRACT_ARC_WORDS,
  'finish',
  'host',
  'month',
  'monthly',
  'twice',
  'weekly',
]);

const ACTIVITY_STOP_WORDS = new Set([
  ...GOAL_STOP_WORDS,
  'complete',
  'fix',
  'review',
  'submit',
  'task',
  'todo',
  'to-do',
  'update',
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

const COMMON_AVOID = ['stock photo', 'corporate', 'office', 'desk'];

const ARC_THEME_RULES: Array<{
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

const GOAL_THEME_RULES: Array<{
  keywords: string[];
  theme: SearchTheme;
}> = [
  {
    keywords: ['dinner', 'meal', 'family', 'kids', 'parent', 'home', 'connection'],
    theme: {
      subject: 'family table',
      style: 'documentary light',
      context: 'family table',
    },
  },
  {
    keywords: ['run', 'running', 'race', 'marathon', 'fitness', 'training', 'workout'],
    theme: {
      subject: 'runner training',
      style: 'cinematic motion',
      context: 'morning trail',
    },
  },
  {
    keywords: ['write', 'book', 'essay', 'study', 'learn', 'creative'],
    theme: {
      subject: 'writing desk',
      style: 'editorial detail',
      context: 'soft window light',
    },
  },
  {
    keywords: ['money', 'budget', 'finance', 'tax', 'taxes', 'save', 'debt'],
    theme: {
      subject: 'organized documents',
      style: 'clean lines',
      context: 'natural light',
    },
  },
];

const ACTIVITY_THEME_RULES: Array<{
  keywords: string[];
  theme: SearchTheme;
}> = [
  {
    keywords: ['tax', 'taxes', 'paperwork', 'document', 'documents', 'finance', 'form', 'forms'],
    theme: {
      subject: 'tax documents',
      style: 'paperwork desk',
      context: 'natural light',
    },
  },
  {
    keywords: ['garage', 'shelf', 'repair', 'tools', 'workbench', 'wood'],
    theme: {
      subject: 'workbench tools',
      style: 'tools workbench',
      context: 'natural light',
    },
  },
  {
    keywords: ['cook', 'dinner', 'meal', 'grocery', 'kitchen'],
    theme: {
      subject: 'kitchen prep',
      style: 'warm documentary',
      context: 'home kitchen',
    },
  },
  {
    keywords: ['run', 'walk', 'workout', 'gym', 'training'],
    theme: {
      subject: 'running shoes',
      style: 'active detail',
      context: 'morning light',
    },
  },
  {
    keywords: ['write', 'essay', 'book', 'draft', 'read', 'study'],
    theme: {
      subject: 'notebook pen',
      style: 'editorial detail',
      context: 'soft window light',
    },
  },
];

const DEFAULT_THEME: SearchTheme = {
  subject: 'open road',
  style: 'cinematic landscape',
  context: 'golden hour',
};

const DEFAULT_GOAL_THEME: SearchTheme = {
  subject: 'clear path',
  style: 'natural light',
  context: 'open landscape',
};

const DEFAULT_ACTIVITY_THEME: SearchTheme = {
  subject: 'simple tools',
  style: 'practical detail',
  context: 'natural light',
};

function normalizeText(value: string | undefined): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueWords(value: string, stopWords: Set<string>): string[] {
  const seen = new Set<string>();
  const words: string[] = [];
  for (const word of normalizeText(value).split(' ')) {
    if (word.length < 3) continue;
    if (stopWords.has(word)) continue;
    if (seen.has(word)) continue;
    seen.add(word);
    words.push(word);
  }
  return words;
}

function inputHaystack(input: VisualSearchQueryInput): string {
  return normalizeText([
    input.name,
    input.description,
    ...(input.relatedTitles ?? []),
  ].filter(Boolean).join(' '));
}

function chooseTheme(input: VisualSearchQueryInput): SearchTheme {
  const haystack = inputHaystack(input);
  const rules =
    input.objectKind === 'activity'
      ? ACTIVITY_THEME_RULES
      : input.objectKind === 'goal'
        ? GOAL_THEME_RULES
        : ARC_THEME_RULES;

  for (const rule of rules) {
    if (rule.keywords.some((keyword) => haystack.includes(keyword))) {
      return rule.theme;
    }
  }

  if (input.objectKind === 'activity') return DEFAULT_ACTIVITY_THEME;
  if (input.objectKind === 'goal') return DEFAULT_GOAL_THEME;
  return DEFAULT_THEME;
}

function stopWordsFor(kind: VisualSearchObjectKind): Set<string> {
  if (kind === 'activity') return ACTIVITY_STOP_WORDS;
  if (kind === 'goal') return GOAL_STOP_WORDS;
  return ABSTRACT_ARC_WORDS;
}

function cleanModelPhrase(value: string | null | undefined, kind: VisualSearchObjectKind): string {
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
    .filter((word) => word.length >= 3 && !stopWordsFor(kind).has(word))
    .slice(0, 3)
    .join(' ');
}

function compactQuery(parts: string[]): string {
  const words = parts
    .map((part) => normalizeText(part))
    .filter(Boolean)
    .join(' ')
    .split(' ')
    .filter((word, index, list) => list.indexOf(word) === index)
    .slice(0, 7);

  return words.join(' ');
}

function activitySubject(input: VisualSearchQueryInput, theme: SearchTheme, modelPhrase?: string | null): string {
  const haystack = inputHaystack(input);
  if (haystack.includes('tax') || haystack.includes('paperwork')) return theme.subject;
  if (haystack.includes('garage') && haystack.includes('shelf')) return 'garage shelf';
  if (haystack.includes('garage') || haystack.includes('tools') || haystack.includes('workbench')) {
    const words = uniqueWords([input.name, ...(input.relatedTitles ?? [])].join(' '), ACTIVITY_STOP_WORDS).slice(0, 2);
    return words.join(' ') || theme.subject;
  }

  const modelSubject = cleanModelPhrase(modelPhrase, input.objectKind);
  if (modelSubject) return modelSubject;

  const words = uniqueWords([input.name, ...(input.relatedTitles ?? [])].join(' '), ACTIVITY_STOP_WORDS).slice(0, 2);
  return words.join(' ') || theme.subject;
}

function goalSubject(input: VisualSearchQueryInput, theme: SearchTheme, modelPhrase?: string | null): string {
  const modelSubject = cleanModelPhrase(modelPhrase, input.objectKind);
  if (modelSubject) return modelSubject;

  const words = uniqueWords([input.name, ...(input.relatedTitles ?? [])].join(' '), GOAL_STOP_WORDS).slice(0, 2);
  return words.join(' ') || theme.subject;
}

function arcSubject(input: VisualSearchQueryInput, theme: SearchTheme, modelPhrase?: string | null): string {
  const modelSubject = cleanModelPhrase(modelPhrase, input.objectKind);
  if (modelSubject) return modelSubject;

  const words = uniqueWords([input.name, ...(input.relatedTitles ?? [])].join(' '), ABSTRACT_ARC_WORDS).slice(0, 2);
  return words.join(' ') || theme.subject;
}

export function buildVisualSearchQueryParts(
  input: VisualSearchQueryInput,
  modelPhrase?: string | null
): VisualSearchQueryParts | null {
  const theme = chooseTheme(input);
  const subject =
    input.objectKind === 'activity'
      ? activitySubject(input, theme, modelPhrase)
      : input.objectKind === 'goal'
        ? goalSubject(input, theme, modelPhrase)
        : arcSubject(input, theme, modelPhrase);
  const query = compactQuery([subject, theme.style, theme.context]);

  if (!query) return null;

  return {
    subject,
    style: theme.style,
    context: theme.context,
    avoid: COMMON_AVOID,
    query,
  };
}

export function buildVisualSearchQuery(
  input: VisualSearchQueryInput,
  modelPhrase?: string | null
): string | null {
  return buildVisualSearchQueryParts(input, modelPhrase)?.query ?? null;
}

export function buildVisualSearchFallbackQuery(input: VisualSearchQueryInput): string | null {
  return buildVisualSearchQuery(input, null);
}

export function buildArcBannerImageSearchTerm(
  input: ArcBannerImageSearchInput,
  modelPhrase?: string | null
): string | null {
  return buildVisualSearchQuery(
    {
      objectKind: 'arc',
      name: input.arcName,
      description: input.arcNarrative,
      relatedTitles: input.goalTitles,
    },
    modelPhrase
  );
}

export function buildArcBannerFallbackSearchTerm(
  input: ArcBannerImageSearchInput
): string | null {
  return buildArcBannerImageSearchTerm(input, null);
}
