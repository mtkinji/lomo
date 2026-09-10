import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getSharedHomeRepository } from "./sharedHomeRepository";
import type { SharedHomeDelivery } from "./sharedHomeTypes";
import type { SharedLifeRepository } from "./sharedLifeRepository";

export function useSharedLifeDeliveries(
  userId: string,
  repository: SharedLifeRepository,
  preview = false,
) {
  const [deliveries, setDeliveries] = useState<SharedHomeDelivery[]>([]);
  const [deliveryError, setDeliveryError] = useState(false);
  const active = useRef(true);
  const deliveryGeneration = useRef(0);
  const [sourceRepository] = useState(getSharedHomeRepository);
  const refreshDeliveries = useCallback(async () => {
    if (!active.current || AppState.currentState !== "active") return;
    const generation = ++deliveryGeneration.current;
    if (preview) {
      setDeliveries([]);
      return;
    }
    try {
      const [arrivals, notes] = await Promise.allSettled([
        sourceRepository.list(),
        repository.command<SharedHomeDelivery[]>("notes"),
      ]);
      const result = [
        ...(arrivals.status === "fulfilled" ? arrivals.value : []),
        ...(notes.status === "fulfilled" ? notes.value : []),
      ];
      if (active.current && generation === deliveryGeneration.current) {
        setDeliveries(result);
        setDeliveryError(
          arrivals.status === "rejected" || notes.status === "rejected",
        );
      }
    } catch {
      if (active.current && generation === deliveryGeneration.current) {
        setDeliveries([]);
        setDeliveryError(true);
      }
    }
  }, [repository, sourceRepository, preview, userId]);
  useEffect(() => {
    active.current = true;
    setDeliveries([]);
    setDeliveryError(false);
    const subscription = AppState.addEventListener("change", (state) => {
      // Invalidate even responses that started before suspension. Source bodies
      // must be reauthorized before they return to the foreground.
      deliveryGeneration.current++;
      setDeliveries([]);
      if (state === "active") void refreshDeliveries();
    });
    const stop = preview
      ? undefined
      : sourceRepository.subscribe(userId, () => {
          void refreshDeliveries();
        });
    // Goal-note membership changes do not emit a shared-delivery row event.
    const timer = setInterval(() => void refreshDeliveries(), 30_000);
    return () => {
      active.current = false;
      deliveryGeneration.current++;
      subscription.remove();
      clearInterval(timer);
      void stop?.();
    };
  }, [refreshDeliveries, sourceRepository, userId, preview]);
  useFocusEffect(
    useCallback(() => {
      void refreshDeliveries();
      return () => {
        deliveryGeneration.current++;
      };
    }, [refreshDeliveries]),
  );
  return { deliveries, deliveryError, refreshDeliveries };
}
