export function createFreshEntryThreadGate<TThread, TAggregate>(deps: {
  create: () => Promise<TThread>;
  load: (thread: TThread) => Promise<TAggregate>;
  prepare?: (aggregate: TAggregate) => Promise<TAggregate>;
  cleanup?: (thread: TThread) => Promise<void>;
}) {
  let pending: Promise<TAggregate> | null = null;

  return {
    ensure(): Promise<TAggregate> {
      if (!pending) {
        pending = deps.create()
          .then(async (thread) => {
            try {
              const aggregate = await deps.load(thread);
              return deps.prepare ? await deps.prepare(aggregate) : aggregate;
            } catch (error) {
              await deps.cleanup?.(thread).catch(() => undefined);
              throw error;
            }
          })
          .finally(() => {
            pending = null;
          });
      }
      return pending;
    },
  };
}
