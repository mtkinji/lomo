export type KwiltAiJob =
  | 'arc_generation'
  | 'goal_generation'
  | 'deep_planning'
  | 'activity_generation'
  | 'arc_image_query'
  | 'conversation_summary'
  | 'lightweight_helper'
  | 'default_chat';

export type KwiltAiRoute = '/v1/chat/completions' | '/v1/images/generations' | '/v1/commit' | string;

const CHAT_MODEL_BY_JOB: Record<KwiltAiJob, string> = {
  arc_generation: 'gpt-4o',
  goal_generation: 'gpt-4o',
  deep_planning: 'gpt-5.2',
  activity_generation: 'gpt-4o-mini',
  arc_image_query: 'gpt-4o-mini',
  conversation_summary: 'gpt-4o-mini',
  lightweight_helper: 'gpt-4o-mini',
  default_chat: 'gpt-4o-mini',
};

export function normalizeKwiltAiJob(raw: unknown): KwiltAiJob {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (value in CHAT_MODEL_BY_JOB) return value as KwiltAiJob;
  return 'default_chat';
}

export function resolveKwiltAiModel(params: {
  route: KwiltAiRoute;
  requestedModel?: string | null;
  job?: string | null;
}): string | null {
  if (params.route === '/v1/images/generations') return 'gpt-image-1';
  if (params.route !== '/v1/chat/completions') return params.requestedModel ?? null;

  return CHAT_MODEL_BY_JOB[normalizeKwiltAiJob(params.job)];
}

