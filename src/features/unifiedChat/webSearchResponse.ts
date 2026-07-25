import type { CoachChatTurn } from '../../services/ai';

export type CurrentInformationSource = {
  number: number;
  title: string;
  url: string;
};

export type ParsedCurrentInformationResponse = {
  text: string;
  sources: CurrentInformationSource[];
  visibleBody: string;
};

type UrlCitation = {
  type: 'url_citation';
  start_index: number;
  end_index: number;
  title: string;
  url: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeCitation(value: unknown): UrlCitation | null {
  if (!isRecord(value) || value.type !== 'url_citation' || !isHttpsUrl(value.url)) return null;
  if (typeof value.title !== 'string' || value.title.trim().length === 0) return null;
  if (!Number.isInteger(value.start_index) || !Number.isInteger(value.end_index)) return null;
  return {
    type: 'url_citation',
    start_index: Number(value.start_index),
    end_index: Number(value.end_index),
    title: value.title.replace(/\s+/g, ' ').trim().slice(0, 140),
    url: value.url,
  };
}

export function buildCurrentInformationRequest({
  model,
  systemPrompt,
  messages,
}: {
  model: string;
  systemPrompt: string;
  messages: readonly CoachChatTurn[];
}) {
  return {
    model,
    instructions: systemPrompt,
    input: messages.map((message) => ({ role: message.role, content: message.content })),
    tools: [{ type: 'web_search' as const }],
    tool_choice: 'auto' as const,
    max_output_tokens: 1200,
  };
}

export function parseCurrentInformationResponse(
  raw: unknown,
): ParsedCurrentInformationResponse | null {
  if (!isRecord(raw) || !Array.isArray(raw.output)) return null;
  const outputText = raw.output
    .filter(isRecord)
    .filter((item) => item.type === 'message' && Array.isArray(item.content))
    .flatMap((item) => item.content as unknown[])
    .find((item) => isRecord(item) && item.type === 'output_text');
  if (!isRecord(outputText) || typeof outputText.text !== 'string') return null;
  const body = outputText.text.trim();
  if (!body || !Array.isArray(outputText.annotations)) return null;

  const citations = outputText.annotations
    .map(normalizeCitation)
    .filter((item): item is UrlCitation => Boolean(item));
  const unique = [...new Map(citations.map((citation) => [citation.url, citation])).values()]
    .slice(0, 6);
  if (unique.length === 0) return null;

  const sources = unique.map((citation, index) => ({
    number: index + 1,
    title: citation.title,
    url: citation.url,
  }));
  const marker = sources.map((source) => `[${source.number}]`).join('');
  const text = `${body} ${marker}`;
  const sourceLine = sources
    .map((source) => `[${source.number}] [${source.title}](${source.url})`)
    .join(' · ');
  return {
    text,
    sources,
    visibleBody: `${text}\n\nSources: ${sourceLine}`,
  };
}

export function extractInspectableSourceUrls(body: string): string[] {
  const urls = new Set<string>();
  const markdownLink = /\[[^\]]+\]\((https:\/\/[^\s)]+)\)/g;
  for (const match of body.matchAll(markdownLink)) {
    if (isHttpsUrl(match[1])) urls.add(match[1]);
  }
  return [...urls];
}
