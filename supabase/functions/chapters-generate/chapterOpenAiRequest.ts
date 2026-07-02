type ChapterTemplateKind = 'reflection' | 'report';

type ChapterOpenAiMessage = {
  role: string;
  content: string;
};

type ChapterOpenAiRequestParams = {
  model: string;
  messages: ChapterOpenAiMessage[];
  template: {
    kind: ChapterTemplateKind;
    detailLevel: string | null;
    tone: string | null;
  };
  periodDays: number;
  stricter?: boolean;
};

export type ChapterOpenAiRequestBody = {
  model: string;
  messages: ChapterOpenAiMessage[];
  temperature: number;
  max_tokens: number;
  response_format: { type: 'json_object' };
};

function resolveMaxOutputTokens(params: { detailLevel: string | null; kind: ChapterTemplateKind }): number {
  const dl = (params.detailLevel ?? '').trim().toLowerCase();
  const base = params.kind === 'report' ? 900 : 1100;
  if (dl === 'short') return Math.min(800, base);
  if (dl === 'deep') return Math.max(1600, base + 500);
  return base;
}

function resolveTemperature(kind: ChapterTemplateKind, tone: string | null): number {
  if (kind === 'report') return 0.25;
  const t = (tone ?? '').trim().toLowerCase();
  if (t === 'direct') return 0.45;
  if (t === 'playful') return 0.8;
  return 0.65;
}

export function buildChapterOpenAiRequestBody({
  model,
  messages,
  template,
  periodDays,
  stricter,
}: ChapterOpenAiRequestParams): ChapterOpenAiRequestBody {
  const baseMaxTokens = resolveMaxOutputTokens({
    detailLevel: template.detailLevel,
    kind: template.kind,
  });
  const maxTokens = Math.max(baseMaxTokens, periodDays >= 180 ? 2200 : 1800);
  const baseTemperature = resolveTemperature(template.kind, template.tone);
  const temperature = stricter ? Math.max(0.2, baseTemperature - 0.2) : baseTemperature;

  return {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' },
  };
}
