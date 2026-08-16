export const KWILT_GENERATION_JOB_IDS = [
  'arc_generation',
  'goal_generation',
  'deep_planning',
  'activity_generation',
  'arc_image_query',
  'conversation_summary',
  'lightweight_helper',
  'story_game',
  'agent_judgment',
  'current_information',
  'unified_chat_attachment',
  'default_chat',
  'chat_rewrite',
  'chat_proofread',
  'chat_shorten',
  'chat_summarize',
  'chat_brainstorm',
  'thread_title',
] as const;

export type KwiltGenerationJobId = typeof KWILT_GENERATION_JOB_IDS[number];
export type KwiltCloudTier = 'economy' | 'advanced';
export type KwiltCloudFallbackPolicy = 'allowed' | 'allowed_with_reduced_context' | 'forbidden';
export type KwiltLocalPromotion = 'disabled' | 'challenger' | 'default';
export type KwiltGenerationPrivacyClass = 'ordinary_text' | 'private_text' | 'external_content';

export type KwiltLocalGenerationContract = Readonly<{
  promotion: KwiltLocalPromotion;
  maximumInputCharacters: number;
  maximumResponseTokens: number;
  targetFirstUsefulOutputMs: number;
  targetTotalDurationMs: number;
}>;

export type KwiltGenerationJobContract = Readonly<{
  id: KwiltGenerationJobId;
  version: 1;
  owner: string;
  privacyClass: KwiltGenerationPrivacyClass;
  cloudFallbackPolicy: KwiltCloudFallbackPolicy;
  cloudTier: KwiltCloudTier;
  cloudModel: string;
  local: KwiltLocalGenerationContract | null;
}>;

const local = (
  promotion: KwiltLocalPromotion,
  maximumInputCharacters: number,
  maximumResponseTokens: number,
  targetFirstUsefulOutputMs: number,
  targetTotalDurationMs: number,
): KwiltLocalGenerationContract => Object.freeze({
  promotion,
  maximumInputCharacters,
  maximumResponseTokens,
  targetFirstUsefulOutputMs,
  targetTotalDurationMs,
});

const contract = (
  value: Omit<KwiltGenerationJobContract, 'version'>,
): KwiltGenerationJobContract => Object.freeze({ ...value, version: 1 as const });

export const KWILT_GENERATION_JOB_CONTRACTS: Readonly<
  Record<KwiltGenerationJobId, KwiltGenerationJobContract>
> = Object.freeze({
  arc_generation: contract({ id: 'arc_generation', owner: 'arcs', privacyClass: 'private_text', cloudFallbackPolicy: 'allowed', cloudTier: 'advanced', cloudModel: 'gpt-4o', local: null }),
  goal_generation: contract({ id: 'goal_generation', owner: 'goals', privacyClass: 'private_text', cloudFallbackPolicy: 'allowed', cloudTier: 'advanced', cloudModel: 'gpt-4o', local: null }),
  deep_planning: contract({ id: 'deep_planning', owner: 'plan', privacyClass: 'private_text', cloudFallbackPolicy: 'allowed', cloudTier: 'advanced', cloudModel: 'gpt-5.2', local: null }),
  activity_generation: contract({ id: 'activity_generation', owner: 'activities', privacyClass: 'private_text', cloudFallbackPolicy: 'allowed', cloudTier: 'economy', cloudModel: 'gpt-4o-mini', local: null }),
  arc_image_query: contract({ id: 'arc_image_query', owner: 'arcs', privacyClass: 'ordinary_text', cloudFallbackPolicy: 'allowed', cloudTier: 'economy', cloudModel: 'gpt-4o-mini', local: null }),
  conversation_summary: contract({ id: 'conversation_summary', owner: 'chat', privacyClass: 'private_text', cloudFallbackPolicy: 'allowed', cloudTier: 'economy', cloudModel: 'gpt-4o-mini', local: local('challenger', 8_000, 256, 4_000, 6_000) }),
  lightweight_helper: contract({ id: 'lightweight_helper', owner: 'ai-runtime', privacyClass: 'ordinary_text', cloudFallbackPolicy: 'allowed', cloudTier: 'economy', cloudModel: 'gpt-4o-mini', local: null }),
  story_game: contract({ id: 'story_game', owner: 'games', privacyClass: 'ordinary_text', cloudFallbackPolicy: 'allowed', cloudTier: 'economy', cloudModel: 'gpt-4o-mini', local: null }),
  agent_judgment: contract({ id: 'agent_judgment', owner: 'agent-runtime', privacyClass: 'private_text', cloudFallbackPolicy: 'allowed', cloudTier: 'advanced', cloudModel: 'gpt-5.6-luna', local: null }),
  current_information: contract({ id: 'current_information', owner: 'ai-runtime', privacyClass: 'external_content', cloudFallbackPolicy: 'allowed', cloudTier: 'advanced', cloudModel: 'gpt-5.2', local: null }),
  unified_chat_attachment: contract({ id: 'unified_chat_attachment', owner: 'chat', privacyClass: 'external_content', cloudFallbackPolicy: 'allowed', cloudTier: 'advanced', cloudModel: 'gpt-5-mini', local: null }),
  default_chat: contract({ id: 'default_chat', owner: 'chat', privacyClass: 'private_text', cloudFallbackPolicy: 'allowed', cloudTier: 'economy', cloudModel: 'gpt-4o-mini', local: null }),
  chat_rewrite: contract({ id: 'chat_rewrite', owner: 'chat', privacyClass: 'private_text', cloudFallbackPolicy: 'allowed', cloudTier: 'economy', cloudModel: 'gpt-4o-mini', local: local('default', 3_000, 96, 1_200, 3_000) }),
  chat_proofread: contract({ id: 'chat_proofread', owner: 'chat', privacyClass: 'private_text', cloudFallbackPolicy: 'allowed', cloudTier: 'economy', cloudModel: 'gpt-4o-mini', local: local('default', 3_000, 96, 1_200, 3_000) }),
  chat_shorten: contract({ id: 'chat_shorten', owner: 'chat', privacyClass: 'private_text', cloudFallbackPolicy: 'allowed', cloudTier: 'economy', cloudModel: 'gpt-4o-mini', local: local('challenger', 3_000, 96, 2_000, 3_500) }),
  chat_summarize: contract({ id: 'chat_summarize', owner: 'chat', privacyClass: 'private_text', cloudFallbackPolicy: 'allowed', cloudTier: 'economy', cloudModel: 'gpt-4o-mini', local: local('default', 3_000, 128, 3_500, 3_500) }),
  chat_brainstorm: contract({ id: 'chat_brainstorm', owner: 'chat', privacyClass: 'ordinary_text', cloudFallbackPolicy: 'allowed', cloudTier: 'economy', cloudModel: 'gpt-4o-mini', local: local('challenger', 1_200, 128, 2_000, 3_500) }),
  thread_title: contract({ id: 'thread_title', owner: 'chat', privacyClass: 'private_text', cloudFallbackPolicy: 'allowed', cloudTier: 'economy', cloudModel: 'gpt-4o-mini', local: local('default', 2_400, 32, 2_400, 2_400) }),
});

export function getKwiltGenerationJobContract(
  id: KwiltGenerationJobId,
): KwiltGenerationJobContract {
  const value = KWILT_GENERATION_JOB_CONTRACTS[id];
  if (!value) throw new Error(`Unknown Kwilt generation job: ${String(id)}`);
  return value;
}
