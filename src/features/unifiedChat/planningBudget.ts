type PlanningBudgetOptions<TFallback> = {
  timeoutMs: number;
  fallback: TFallback;
  parentSignal?: AbortSignal;
};

function abortError(signal: AbortSignal): Error {
  if (signal.reason instanceof Error) return signal.reason;
  const error = new Error('Aborted');
  error.name = 'AbortError';
  return error;
}

export async function runWithPlanningBudget<TResult, TFallback>(
  run: (signal: AbortSignal) => Promise<TResult>,
  options: PlanningBudgetOptions<TFallback>,
): Promise<TResult | TFallback> {
  if (options.parentSignal?.aborted) throw abortError(options.parentSignal);
  if (options.timeoutMs <= 0) return options.fallback;

  const controller = new AbortController();
  let rejectForParentAbort: ((error: Error) => void) | null = null;
  const parentAbort = new Promise<never>((_resolve, reject) => {
    rejectForParentAbort = reject;
  });
  const abortFromParent = () => {
    controller.abort(options.parentSignal?.reason);
    if (options.parentSignal) rejectForParentAbort?.(abortError(options.parentSignal));
  };
  options.parentSignal?.addEventListener('abort', abortFromParent, { once: true });

  let timedOut = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<TFallback>((resolve) => {
    timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
      resolve(options.fallback);
    }, options.timeoutMs);
  });

  try {
    return await Promise.race([run(controller.signal), timeout, parentAbort]);
  } catch (error) {
    if (options.parentSignal?.aborted) throw abortError(options.parentSignal);
    if (timedOut || controller.signal.aborted) return options.fallback;
    throw error;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    options.parentSignal?.removeEventListener('abort', abortFromParent);
  }
}
