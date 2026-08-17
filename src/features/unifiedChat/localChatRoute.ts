import type { UnifiedChatRequestPolicy } from './requestPolicy';
import {
  getKwiltGenerationJobContract,
  type KwiltGenerationJobId,
} from '@kwilt/agent-runtime';

export type OnDeviceChatTask =
  | 'rewrite'
  | 'proofread'
  | 'shorten'
  | 'summarize'
  | 'brainstorm';

export type LocalChatRoute =
  | { kind: 'authored'; response: string }
  | { kind: 'on_device'; task: OnDeviceChatTask; prompt: string }
  | { kind: 'cloud' };

type LocalChatRouteInput = {
  prompt: string;
  requestPolicy: Pick<
    UnifiedChatRequestPolicy,
    'requestClass' | 'participatingCapabilities' | 'usePrivateContext'
  >;
  requiresWebSearch: boolean;
  attachmentCount: number;
  evidenceCount: number;
  isRetry: boolean;
};

const AUTHORED_RESPONSES: ReadonlyArray<[RegExp, string]> = [
  [/^(?:yo|sup|what'?s up)[!.?]*$/i, 'Hey! What’s up?'],
  [/^(?:(?:hi|hello|hey)(?:\s+(?:there|kwilt))?|hiya|howdy)[!.?]*$/i, 'Hey! How can I help?'],
  [/^(?:thanks|thank you|thx)[!.?]*$/i, 'You’re welcome!'],
  [/^(?:got it|ok|okay|cool|perfect|nice)[!.?]*$/i, 'Got it.'],
  [/^(?:sounds good)[!.?]*$/i, 'Sounds good.'],
  [/^(?:how are you|how(?:'s| is) it going)[!.?]*$/i, 'I’m here and ready to help.'],
];

const HISTORY_REFERENCE_PATTERN = /\b(?:above|earlier|previous(?:ly)?|last (?:message|reply|response)|(?:our|this) (?:chat|conversation)|we discussed|(?:you|I) (?:just )?(?:said|wrote|mentioned)|that (?:email|message|text|draft))\b/i;

export const ON_DEVICE_CHAT_JOB_BY_TASK: Record<OnDeviceChatTask, KwiltGenerationJobId> = {
  rewrite: 'chat_rewrite',
  proofread: 'chat_proofread',
  shorten: 'chat_shorten',
  summarize: 'chat_summarize',
  brainstorm: 'chat_brainstorm',
};

const DEVICE_TASKS: ReadonlyArray<[OnDeviceChatTask, RegExp]> = [
  ['rewrite', /^\s*(?:rewrite|rephrase|polish|make (?:this|it) (?:warmer|friendlier|clearer|more concise))\b(?:\s*[:.]\s*|\s+)\S[\s\S]*$/i],
  ['proofread', /^\s*(?:proofread|fix (?:the )?(?:grammar|spelling))\b(?:\s*[:.]\s*|\s+)\S[\s\S]*$/i],
  ['shorten', /^\s*(?:shorten|condense|make (?:this|it) shorter)\b(?:\s*[:.]\s*|\s+)\S[\s\S]*$/i],
  ['summarize', /^\s*(?:summarize|sum up)\b(?:\s*[:.]\s*|\s+)\S[\s\S]*$/i],
  ['brainstorm', /^\s*(?:brainstorm|suggest|give me)\b[\s\S]*(?:ideas?|names?|titles?|options?)\b/i],
];

export function classifyOnDeviceChatTask(prompt: string): OnDeviceChatTask | null {
  const normalizedPrompt = prompt.trim();
  if (HISTORY_REFERENCE_PATTERN.test(normalizedPrompt)) return null;
  const match = DEVICE_TASKS.find(([task, pattern]) => {
    const local = getKwiltGenerationJobContract(ON_DEVICE_CHAT_JOB_BY_TASK[task]).local;
    return local?.promotion === 'default' &&
      normalizedPrompt.length <= local.maximumInputCharacters &&
      pattern.test(normalizedPrompt);
  });
  return match?.[0] ?? null;
}

export function resolveLocalChatRoute(input: LocalChatRouteInput): LocalChatRoute {
  const prompt = input.prompt.trim();
  if (
    input.requestPolicy.requestClass !== 'general' ||
    input.requestPolicy.usePrivateContext ||
    input.requestPolicy.participatingCapabilities.length > 0 ||
    input.requiresWebSearch ||
    input.attachmentCount > 0 ||
    input.evidenceCount > 0 ||
    input.isRetry
  ) {
    return { kind: 'cloud' };
  }

  const authored = AUTHORED_RESPONSES.find(([pattern]) => pattern.test(prompt));
  if (authored) return { kind: 'authored', response: authored[1] };

  const deviceTask = classifyOnDeviceChatTask(prompt);
  return deviceTask
    ? { kind: 'on_device', task: deviceTask, prompt }
    : { kind: 'cloud' };
}
