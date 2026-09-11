import { useCallback, useEffect, useRef } from 'react';

/** Loads a selected conversation and publishes its recovered state. */
export function useChatThreadLoader<T>({
  selectionKey, load, onLoaded, onError,
}: {
  selectionKey: string;
  load: (threadId: string) => Promise<T>;
  onLoaded: (value: T, threadId: string) => void;
  onError: () => void;
}) {
  const selectionRef = useRef({ key: selectionKey, request: 0 });
  if (selectionRef.current.key !== selectionKey) {
    selectionRef.current = { key: selectionKey, request: 0 };
  }
  const selection = selectionRef.current;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      selectionRef.current.request += 1;
    };
  }, []);

  return useCallback(async (threadId: string) => {
    // A history-list fetch may invoke an old callback after navigation changed.
    if (!mounted.current || selectionRef.current !== selection) return;
    const request = ++selection.request;
    const isCurrent = () => mounted.current && selectionRef.current === selection
      && selection.request === request;
    try {
      const next = await load(threadId);
      if (isCurrent()) onLoaded(next, threadId);
    } catch {
      if (isCurrent()) onError();
    }
  }, [selection, load, onLoaded, onError]);
}
