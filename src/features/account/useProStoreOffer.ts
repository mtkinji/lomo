import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getProStoreOfferSnapshot,
  type ProStoreOfferSnapshot,
} from '../../services/entitlements';
import { useEntitlementsStore } from '../../store/useEntitlementsStore';

export type ProStoreOfferLoadState =
  | { status: 'loading'; snapshot: null }
  | { status: 'ready'; snapshot: ProStoreOfferSnapshot }
  | { status: 'unavailable'; snapshot: ProStoreOfferSnapshot | null };

export function useProStoreOffer(): ProStoreOfferLoadState & { retry: () => void } {
  const identifiedAppUserID = useEntitlementsStore((state) => state.identifiedAppUserID);
  const requestSequenceRef = useRef(0);
  const [state, setState] = useState<ProStoreOfferLoadState>({
    status: 'loading',
    snapshot: null,
  });

  const load = useCallback(() => {
    const requestSequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestSequence;
    setState({ status: 'loading', snapshot: null });
    void getProStoreOfferSnapshot(identifiedAppUserID)
      .then((snapshot) => {
        if (requestSequenceRef.current !== requestSequence) return;
        if (snapshot.status === 'ready') {
          setState({ status: 'ready', snapshot });
        } else {
          setState({ status: 'unavailable', snapshot });
        }
      })
      .catch(() => {
        if (requestSequenceRef.current !== requestSequence) return;
        setState({ status: 'unavailable', snapshot: null });
      });
  }, [identifiedAppUserID]);

  useEffect(() => {
    load();
    return () => {
      requestSequenceRef.current += 1;
    };
  }, [load]);

  return { ...state, retry: load };
}
