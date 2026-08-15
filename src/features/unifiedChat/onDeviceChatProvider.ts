import foundationModelsModule, {
  type KwiltFoundationModelsAvailability,
  type KwiltFoundationModelsGenerationOptions,
  type KwiltFoundationModelsGenerationResult,
} from '../../../modules/kwilt-foundation-models';
import type { OnDeviceChatTask } from './localChatRoute';
import { ON_DEVICE_CHAT_JOB_BY_TASK } from './localChatRoute';
import { getKwiltGenerationJobContract } from '@kwilt/agent-runtime';

export type OnDeviceGenerationTask = OnDeviceChatTask | 'thread_title';

export type OnDeviceChatRequest = {
  task: OnDeviceGenerationTask;
  prompt: string;
};

export type OnDeviceChatResult =
  | { status: 'completed'; text: string; durationMs: number }
  | { status: 'unavailable' | 'failed' | 'cancelled'; reason: string };

export type GenerateOnDeviceChatResponse = (
  request: OnDeviceChatRequest,
  signal?: AbortSignal,
) => Promise<OnDeviceChatResult>;

type FoundationModelsProviderModule = {
  availability(localeIdentifier?: string): Promise<KwiltFoundationModelsAvailability>;
  generateText(
    options: KwiltFoundationModelsGenerationOptions,
  ): Promise<KwiltFoundationModelsGenerationResult>;
  cancelGeneration(requestId: string): void;
};

let nextRequestSequence = 0;

const TASK_INSTRUCTIONS: Record<OnDeviceGenerationTask, string> = {
  rewrite: 'Rewrite the supplied text as requested. Preserve its meaning and facts. Return only the rewritten text, with no preface or commentary.',
  proofread: 'Correct grammar, spelling, and punctuation while preserving meaning and voice. Return only the corrected text, with no preface or commentary.',
  shorten: 'Make the supplied text meaningfully shorter while preserving its important facts and intent. Return only the shortened text, with no preface or commentary.',
  summarize: 'Summarize only the supplied text. Do not add facts or advice. Return the concise summary with no preface or commentary.',
  brainstorm: 'Generate a small, useful set of ideas that directly answers the request. Be concise and do not claim current or external facts.',
  thread_title: 'Name the supplied opening exchange with a specific 3–6 word title under 36 characters. Do not use sensitive details, names, dates, quotes, or generic chat labels. Return only the title with no punctuation, preface, or commentary.',
};

function generationJobId(task: OnDeviceGenerationTask) {
  return task === 'thread_title' ? 'thread_title' : ON_DEVICE_CHAT_JOB_BY_TASK[task];
}

export async function generateOnDeviceChatResponse(
  request: OnDeviceChatRequest,
  nativeModule: FoundationModelsProviderModule | null = foundationModelsModule,
  signal?: AbortSignal,
): Promise<OnDeviceChatResult> {
  if (!nativeModule) return { status: 'unavailable', reason: 'module_unavailable' };
  if (signal?.aborted) return { status: 'cancelled', reason: 'cancelled' };

  let availability: KwiltFoundationModelsAvailability;
  try {
    availability = await nativeModule.availability();
  } catch {
    return { status: 'failed', reason: 'availability_failed' };
  }
  if (signal?.aborted) return { status: 'cancelled', reason: 'cancelled' };
  if (availability.state !== 'available') {
    return { status: 'unavailable', reason: availability.reason };
  }

  const requestId = `chat-${Date.now()}-${nextRequestSequence += 1}`;
  let aborted = false;
  const cancel = () => {
    aborted = true;
    nativeModule.cancelGeneration(requestId);
  };
  signal?.addEventListener('abort', cancel, { once: true });
  try {
    const job = getKwiltGenerationJobContract(generationJobId(request.task));
    if (job.local?.promotion !== 'default') {
      return { status: 'unavailable', reason: 'job_not_promoted' };
    }
    const result = await nativeModule.generateText({
      requestId,
      prompt: request.prompt,
      instructions: TASK_INSTRUCTIONS[request.task],
      maximumResponseTokens: job.local.maximumResponseTokens,
    });
    if (aborted || signal?.aborted) return { status: 'cancelled', reason: 'cancelled' };
    const text = result.text.trim();
    if (!text) return { status: 'failed', reason: 'empty_response' };
    return { status: 'completed', text, durationMs: result.durationMs };
  } catch {
    return aborted || signal?.aborted
      ? { status: 'cancelled', reason: 'cancelled' }
      : { status: 'failed', reason: 'generation_failed' };
  } finally {
    signal?.removeEventListener('abort', cancel);
  }
}

export const defaultGenerateOnDeviceChatResponse: GenerateOnDeviceChatResponse = (
  request,
  signal,
) => generateOnDeviceChatResponse(request, foundationModelsModule, signal);
