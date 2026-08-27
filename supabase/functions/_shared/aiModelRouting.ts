import {
  getKwiltGenerationJobContract,
  KWILT_GENERATION_JOB_CONTRACTS,
  type KwiltGenerationJobId,
} from '../../../packages/kwilt-agent-runtime/src/generationJobContracts.ts';

export type KwiltAiJob = KwiltGenerationJobId;

export type KwiltAiRoute = '/v1/chat/completions' | '/v1/images/generations' | '/v1/commit' | string;

export function normalizeKwiltAiJob(raw: unknown): KwiltAiJob {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (value in KWILT_GENERATION_JOB_CONTRACTS) return value as KwiltAiJob;
  return 'default_chat';
}

export function resolveKwiltAiModel(params: {
  route: KwiltAiRoute;
  requestedModel?: string | null;
  job?: string | null;
}): string | null {
  if (params.route === '/v1/images/generations') return 'gpt-image-1';
  if (params.route === '/v1/responses') {
    const job = typeof params.job === 'string' && params.job in KWILT_GENERATION_JOB_CONTRACTS
      ? params.job as KwiltGenerationJobId
      : null;
    if (!job) return null;
    const contract = getKwiltGenerationJobContract(job);
    return contract.responses || job === 'current_information' || job === 'unified_chat_attachment' || job === 'agent_judgment'
      ? contract.cloudModel
      : null;
  }
  if (params.route !== '/v1/chat/completions') return params.requestedModel ?? null;

  const contract = getKwiltGenerationJobContract(normalizeKwiltAiJob(params.job));
  return contract.responses ? null : contract.cloudModel;
}
