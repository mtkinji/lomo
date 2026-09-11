/** Abort settles the caller even when native preparation or response parsing ignores the signal. */
export function waitForVoiceTask<T>(task: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason instanceof Error ? signal.reason : new Error('Voice input cancelled.'));
    if (signal.aborted) { task.catch(() => undefined); abort(); return; }
    signal.addEventListener('abort', abort, { once: true });
    task.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

export async function withVoiceDeadline<T>(work: (signal: AbortSignal) => Promise<T>, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const cancel = () => controller.abort(new Error('Voice input cancelled.'));
  if (signal?.aborted) cancel();
  signal?.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(() => controller.abort(new Error('Transcription is taking too long. Try again.')), 20_000);
  try {
    if (controller.signal.aborted) throw new Error('Voice input cancelled.');
    return await waitForVoiceTask(work(controller.signal), controller.signal);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}

export function assertVoiceActive(signal: AbortSignal) {
  if (signal.aborted) throw signal.reason instanceof Error ? signal.reason : new Error('Voice input cancelled.');
}
