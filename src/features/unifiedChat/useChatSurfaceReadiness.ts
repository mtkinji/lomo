import { useEffect, useMemo, useRef, useState } from 'react';

export function useChatSurfaceReadiness(enabled: boolean) {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<{ phase: 'loading' | 'ready' | 'error'; evidence?: 'rendered' | 'legacy'; error?: string; elapsedMs?: number }>({ phase: enabled ? 'loading' : 'ready' });
  const generation = useRef(0);
  const active = useRef(true);
  const phase = useRef(status.phase);
  const started = useRef(Date.now());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handshake = useRef({ supportsAck: false, bridge: false, document: false, initialization: '' });
  const actions = useMemo(() => {
    const current = () => active.current && generation.current === attempt;
    const clear = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; };
    const ready = (evidence: 'rendered' | 'legacy') => {
      if (!current() || phase.current !== 'loading') return;
      phase.current = 'ready'; clear();
      setStatus({ phase: 'ready', evidence, elapsedMs: Date.now() - started.current });
    };
    const legacy = () => {
      const state = handshake.current;
      if (state.bridge && !state.supportsAck && state.document && state.initialization) ready('legacy');
    };
    return {
      fail(error = 'Chat couldn’t open. Check your connection, then try again.') {
        if (!current()) return;
        phase.current = 'error'; clear();
        setStatus({ phase: 'error', error, elapsedMs: Date.now() - started.current });
      },
      retry() {
        if (!current()) return;
        clear(); generation.current += 1; phase.current = 'loading';
        handshake.current = { supportsAck: false, bridge: false, document: false, initialization: '' };
        started.current = Date.now(); setStatus({ phase: 'loading' }); setAttempt(generation.current);
      },
      bridgeReady(supportsAck: boolean) {
        if (!current()) return;
        handshake.current.bridge = true; handshake.current.supportsAck = supportsAck; legacy();
      },
      documentLoaded() { if (current()) { handshake.current.document = true; legacy(); } },
      initialized(requestId: string) { if (current()) { handshake.current.initialization = requestId; legacy(); } },
      rendered(requestId: string) {
        if (current() && handshake.current.supportsAck && handshake.current.initialization === requestId) ready('rendered');
      },
    };
  }, [attempt]);
  useEffect(() => {
    active.current = true;
    if (enabled && phase.current === 'loading') timer.current = setTimeout(() => actions.fail('Chat is taking too long to open. Try again.'), 8000);
    return () => { active.current = false; if (timer.current) clearTimeout(timer.current); };
  }, [enabled, actions]);
  return { ...status, attempt, ...actions };
}
