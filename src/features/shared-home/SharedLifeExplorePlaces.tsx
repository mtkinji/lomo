import { useEffect, useState } from "react";
import { AppState, Linking, Platform, View } from "react-native";
import { Button, Text, VStack } from "../../ui/primitives";
import { spacing } from "../../theme";
import { useAppStore } from "../../store/useAppStore";
import { getSharedLifeRepository } from "./sharedLifeRepository";
import type { HomeAttachment } from "./sharedLifeTypes";
type SavedPlace = Extract<HomeAttachment, { kind: "place" }> & { id: string };
export function SharedLifeExplorePlaces() {
  const userId = useAppStore((s) => s.authIdentity?.userId ?? null);
  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setPlaces([]);
    if (userId)
      void getSharedLifeRepository()
        .command<SavedPlace[]>("explore_places")
        .then((p) => {
          if (active) {
            setPlaces(p);
            setError(false);
          }
        })
        .catch(() => {
          if (active) setError(true);
        });
    const subscription = AppState.addEventListener("change", (state) => {
      active = false;
      setPlaces([]);
      if (state === "active") setRevision((r) => r + 1);
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, [userId, revision]);
  return (
    <VStack space="lg">
      <Text tone="secondary">
        Places saved from Home. Saving a place does not record a visit.
      </Text>
      {error ? (
        <Button variant="ghost" onPress={() => setRevision((r) => r + 1)}>
          Retry saved places
        </Button>
      ) : places.length ? (
        places.map((p) => (
          <View key={p.id} style={{ gap: spacing.sm }}>
            <Text>{p.name}</Text>
            <Button
              variant="ghost"
              onPress={() =>
                void Linking.openURL(
                  Platform.OS === "ios"
                    ? `https://maps.apple.com/?ll=${p.latitude},${p.longitude}&q=${encodeURIComponent(p.name)}`
                    : `https://www.google.com/maps/search/?api=1&query=${p.latitude},${p.longitude}`,
                )
              }
            >
              View map
            </Button>
            <Button
              variant="ghost"
              onPress={() => {
                void getSharedLifeRepository()
                  .command("remove_explore_place", { id: p.id })
                  .then(() => setRevision((r) => r + 1))
                  .catch(() => setError(true));
              }}
            >
              Remove saved place
            </Button>
          </View>
        ))
      ) : (
        <Text>No places saved from Home yet.</Text>
      )}
    </VStack>
  );
}
