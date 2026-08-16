import foundationModelsModule, {
  type KwiltFoundationModelsAvailability,
  type KwiltFoundationModelsGenerationOptions,
  type KwiltFoundationModelsGenerationResult,
  type KwiltFoundationModelsGenerationSnapshot,
} from '../../../modules/kwilt-foundation-models';
import type { OnDeviceChatTask } from './localChatRoute';
import { ON_DEVICE_CHAT_JOB_BY_TASK } from './localChatRoute';
import { getKwiltGenerationJobContract } from '@kwilt/agent-runtime';
import {
  canPublishOnDeviceGenerationSnapshot,
  validateOnDeviceGenerationResult,
} from './onDeviceGenerationQuality';
import { resolveOnDeviceGenerationPromotion } from './onDeviceGenerationPolicy';

export type OnDeviceGenerationTask = OnDeviceChatTask | 'thread_title';

export type OnDeviceChatRequest = {
  task: OnDeviceGenerationTask;
  prompt: string;
};

export type OnDeviceChatResult =
  | {
      status: 'completed';
      text: string;
      durationMs: number;
      firstOutputMs?: number;
      warmState?: OnDeviceModelWarmState;
    }
  | {
      status: 'unavailable' | 'failed' | 'cancelled';
      reason: string;
      totalMs?: number;
      warmState?: OnDeviceModelWarmState;
    };

export type OnDeviceModelWarmState = 'cold' | 'warming' | 'warm';

export type GenerateOnDeviceChatResponse = (
  request: OnDeviceChatRequest,
  signal?: AbortSignal,
  onUpdate?: (text: string) => void,
) => Promise<OnDeviceChatResult>;

type FoundationModelsProviderModule = {
  availability(localeIdentifier?: string): Promise<KwiltFoundationModelsAvailability>;
  generateText(
    options: KwiltFoundationModelsGenerationOptions,
  ): Promise<KwiltFoundationModelsGenerationResult>;
  prewarm?: () => Promise<void>;
  addListener?: (
    eventName: 'onGenerationSnapshot',
    listener: (event: KwiltFoundationModelsGenerationSnapshot) => void,
  ) => { remove: () => void };
  cancelGeneration(requestId: string): void;
};

const STREAMING_LOCAL_TASKS = new Set<OnDeviceGenerationTask>(['rewrite', 'proofread']);
const prewarmByModule = new WeakMap<object, Promise<void>>();
const prewarmStateByModule = new WeakMap<object, OnDeviceModelWarmState>();

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
  onUpdate?: (text: string) => void,
): Promise<OnDeviceChatResult> {
  if (!nativeModule) return { status: 'unavailable', reason: 'module_unavailable' };
  if (signal?.aborted) return { status: 'cancelled', reason: 'cancelled' };

  const job = getKwiltGenerationJobContract(generationJobId(request.task));
  if (!job.local) return { status: 'unavailable', reason: 'job_not_local' };
  const effectivePromotion = await resolveOnDeviceGenerationPromotion(
    job.id,
    job.local.promotion,
  );
  if (signal?.aborted) return { status: 'cancelled', reason: 'cancelled' };
  if (effectivePromotion !== 'default') {
    return {
      status: 'unavailable',
      reason: effectivePromotion === 'disabled' ? 'remote_job_disabled' : 'job_not_promoted',
    };
  }

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
  const warmState = prewarmStateByModule.get(nativeModule) ?? 'cold';
  let firstOutputMs: number | undefined;
  let aborted = false;
  const cancel = () => {
    aborted = true;
    nativeModule.cancelGeneration(requestId);
  };
  const snapshotSubscription = nativeModule.addListener
    ? nativeModule.addListener('onGenerationSnapshot', (event) => {
        if (
          event.requestId === requestId &&
          !aborted &&
          !signal?.aborted &&
          STREAMING_LOCAL_TASKS.has(request.task)
        ) {
          const text = event.text.trim();
          if (canPublishOnDeviceGenerationSnapshot({
            task: request.task,
            prompt: request.prompt,
            output: text,
          })) {
            firstOutputMs ??= event.durationMs;
            onUpdate?.(text);
          }
        }
      })
    : null;
  signal?.addEventListener('abort', cancel, { once: true });
  try {
    const result = await nativeModule.generateText({
      requestId,
      prompt: request.prompt,
      instructions: TASK_INSTRUCTIONS[request.task],
      maximumResponseTokens: job.local.maximumResponseTokens,
    });
    if (aborted || signal?.aborted) return { status: 'cancelled', reason: 'cancelled' };
    const quality = validateOnDeviceGenerationResult({
      task: request.task,
      prompt: request.prompt,
      output: result.text,
    });
    if (!quality.accepted) {
      return {
        status: 'failed',
        reason: 'quality_gate_failed',
        totalMs: result.durationMs,
        warmState,
      };
    }
    return {
      status: 'completed',
      text: quality.text,
      durationMs: result.durationMs,
      firstOutputMs: firstOutputMs ?? result.durationMs,
      warmState,
    };
  } catch {
    return aborted || signal?.aborted
      ? { status: 'cancelled', reason: 'cancelled' }
      : { status: 'failed', reason: 'generation_failed' };
  } finally {
    signal?.removeEventListener('abort', cancel);
    snapshotSubscription?.remove();
  }
}

export async function prewarmOnDeviceChatModel(
  nativeModule: FoundationModelsProviderModule | null = foundationModelsModule,
): Promise<void> {
  if (!nativeModule?.prewarm) return;
  const existing = prewarmByModule.get(nativeModule);
  if (existing) return existing;
  prewarmStateByModule.set(nativeModule, 'warming');
  const pending = (async () => {
    const availability = await nativeModule.availability();
    if (availability.state === 'available') {
      await nativeModule.prewarm?.();
      prewarmStateByModule.set(nativeModule, 'warm');
    } else {
      prewarmStateByModule.set(nativeModule, 'cold');
    }
  })();
  prewarmByModule.set(nativeModule, pending);
  try {
    await pending;
  } catch {
    prewarmByModule.delete(nativeModule);
    prewarmStateByModule.set(nativeModule, 'cold');
  }
}

export const defaultGenerateOnDeviceChatResponse: GenerateOnDeviceChatResponse = (
  request,
  signal,
  onUpdate,
) => generateOnDeviceChatResponse(request, foundationModelsModule, signal, onUpdate);
