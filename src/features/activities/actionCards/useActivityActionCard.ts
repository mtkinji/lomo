import { useCallback, useEffect, useRef, useState } from 'react';
import type { ActivityActionCardBinding } from './activityActionCardTypes';
import type {
  ActivityActionCardProjection,
  ActivityCardReceipt,
  ActivityCardViewerContext,
} from './activityActionCardTypes';
import {
  defaultActivityActionCardRegistry,
  type ActivityActionCardRegistry,
} from './activityActionCardRegistry';

export function useActivityActionCard(
  binding: ActivityActionCardBinding | null | undefined,
  context: ActivityCardViewerContext | null,
  registry: ActivityActionCardRegistry = defaultActivityActionCardRegistry,
): {
  projection: ActivityActionCardProjection | null;
  loading: boolean;
  invoking: boolean;
  receipt: ActivityCardReceipt | null;
  retry: () => void;
  invoke: (actionId: string) => Promise<ActivityCardReceipt | null>;
} {
  const [projection, setProjection] = useState<ActivityActionCardProjection | null>(null);
  const [loading, setLoading] = useState(Boolean(binding && context));
  const [invoking, setInvoking] = useState(false);
  const [receipt, setReceipt] = useState<ActivityCardReceipt | null>(null);
  const [attempt, setAttempt] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);
  useEffect(() => {
    let active = true;
    if (!binding || !context) {
      setProjection(null);
      setLoading(false);
      setReceipt(null);
      return () => { active = false; };
    }
    setLoading(true);
    void registry.resolve(binding, context).then((next) => {
      if (!active) return;
      setProjection(next);
      setLoading(false);
    });
    return () => { active = false; };
  }, [attempt, binding, context, registry]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  const invoke = useCallback(async (actionId: string) => {
    if (!binding || !context || invoking) return null;
    setInvoking(true);
    try {
      const nextReceipt = await registry.invoke(binding, actionId, context);
      if (mountedRef.current) {
        setReceipt(nextReceipt);
        setAttempt((value) => value + 1);
      }
      return nextReceipt;
    } finally {
      if (mountedRef.current) setInvoking(false);
    }
  }, [binding, context, invoking, registry]);

  return { projection, loading, invoking, receipt, retry, invoke };
}
