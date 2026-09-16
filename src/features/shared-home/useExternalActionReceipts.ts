import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchExternalConnections } from '../../services/externalConnections';
import {
  selectExternalActionReceipts,
  type ExternalActionReceipt,
} from './externalActionReceipts';

export function useExternalActionReceipts(userId: string) {
  const [receipts, setReceipts] = useState<ExternalActionReceipt[]>([]);
  const generation = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++generation.current;
    try {
      const result = await fetchExternalConnections();
      if (request === generation.current) {
        setReceipts(selectExternalActionReceipts(result));
      }
    } catch {
      // Home receipts are supporting evidence. Connection management retains
      // the explicit error and retry surface in Settings.
    }
  }, []);

  useEffect(() => {
    setReceipts([]);
    void refresh();
    return () => {
      generation.current += 1;
    };
  }, [refresh, userId]);

  return { receipts, refresh };
}
