import type { OnDeviceGenerationTask } from './onDeviceChatProvider';

export type OnDeviceGenerationQualityResult =
  | { accepted: true; text: string }
  | { accepted: false; reason: 'empty' | 'preface' | 'not_concise' | 'meaning_not_preserved' };

const RESPONSE_PREFACE = /^(?:(?:sure|of course)[!,.:\s-]+(?:here(?:'s| is)\b|the\b)|here(?:'s| is)\s+(?:the|a|your)\b)/i;
const FIDELITY_TASKS = new Set<OnDeviceGenerationTask>([
  'rewrite',
  'proofread',
  'shorten',
  'summarize',
]);
const STOP_WORDS = new Set([
  'and', 'are', 'but', 'for', 'from', 'have', 'into', 'its', 'more', 'not',
  'that', 'the', 'their', 'them', 'then', 'there', 'these', 'they', 'this',
  'those', 'was', 'were', 'will', 'with', 'would', 'you', 'your',
]);

function meaningfulWords(text: string): Set<string> {
  return new Set(
    text.toLocaleLowerCase()
      .match(/[\p{L}\p{N}]+/gu)
      ?.filter((word) => word.length >= 3 && !STOP_WORDS.has(word)) ?? [],
  );
}

function preservesMeaningfulSourceWord(prompt: string, output: string): boolean {
  const sourceWords = meaningfulWords(suppliedSource(prompt));
  if (sourceWords.size === 0) return true;
  const outputWords = meaningfulWords(output);
  return [...sourceWords].some((word) => outputWords.has(word));
}

export function canPublishOnDeviceGenerationSnapshot(input: {
  task: OnDeviceGenerationTask;
  prompt: string;
  output: string;
}): boolean {
  if (input.task !== 'rewrite' && input.task !== 'proofread') return false;
  const text = input.output.trim();
  return Boolean(
    text &&
    !RESPONSE_PREFACE.test(text) &&
    preservesMeaningfulSourceWord(input.prompt, text),
  );
}

function suppliedSource(prompt: string): string {
  const paragraphBoundary = prompt.search(/\n\s*\n/);
  if (paragraphBoundary >= 0) {
    return prompt.slice(paragraphBoundary).trim();
  }
  const instructionBoundary = prompt.indexOf(':');
  return instructionBoundary >= 0 ? prompt.slice(instructionBoundary + 1).trim() : prompt.trim();
}

export function validateOnDeviceGenerationResult(input: {
  task: OnDeviceGenerationTask;
  prompt: string;
  output: string;
}): OnDeviceGenerationQualityResult {
  const text = input.output.trim();
  if (!text) return { accepted: false, reason: 'empty' };
  if (RESPONSE_PREFACE.test(text)) return { accepted: false, reason: 'preface' };

  if (FIDELITY_TASKS.has(input.task)) {
    if (!preservesMeaningfulSourceWord(input.prompt, text)) {
      return { accepted: false, reason: 'meaning_not_preserved' };
    }
  }

  if (input.task === 'summarize') {
    const source = suppliedSource(input.prompt);
    if (source.length >= 120 && text.length > source.length * 0.6) {
      return { accepted: false, reason: 'not_concise' };
    }
  }

  return { accepted: true, text };
}
