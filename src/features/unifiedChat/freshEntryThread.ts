export function createFreshEntryThreadGate<TThread, TAggregate>(deps: {
  create: () => Promise<TThread>;
  load: (thread: TThread) => Promise<TAggregate>;
}) {
  let pending: Promise<TAggregate> | null = null;

  return {
    ensure(): Promise<TAggregate> {
      if (!pending) {
        pending = deps.create()
          .then(deps.load)
          .finally(() => {
            pending = null;
          });
      }
      return pending;
    },
  };
}
