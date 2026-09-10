import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { SharedLifePage } from "./SharedLifePage";
import { VStack, HStack, Text } from "../../ui/primitives";
import { ProfileAvatar } from "../../ui/ProfileAvatar";
import { spacing } from "../../theme";
import type { SharedLifeRepository } from "./sharedLifeRepository";
import type { HomePerson } from "./sharedLifeTypes";
export function SharedLifeAppreciation({
  postId,
  repository,
  onClose,
}: {
  postId: string;
  repository: SharedLifeRepository;
  onClose: () => void;
}) {
  const [people, setPeople] = useState<HomePerson[]>([]);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    let epoch = 0;
    const load = () => {
      const request = ++epoch;
      void repository
        .command<HomePerson[]>("reactors", { id: postId })
        .then((p) => {
          if (
            active &&
            request === epoch &&
            AppState.currentState === "active"
          ) {
            setPeople(p);
            setError(false);
          }
        })
        .catch(() => {
          if (active && request === epoch) {
            setPeople([]);
            setError(true);
          }
        });
    };
    load();
    const timer = setInterval(() => {
      if (AppState.currentState === "active") load();
    }, 15000);
    const sub = AppState.addEventListener("change", (state) => {
      epoch++;
      setPeople([]);
      if (state === "active") load();
    });
    return () => {
      active = false;
      clearInterval(timer);
      sub.remove();
    };
  }, [postId, repository]);
  return (
    <SharedLifePage title="Appreciation" onClose={onClose}>
      <VStack space="lg" style={{ padding: spacing.lg }}>
        {error ? (
          <Text>
            These responses are no longer available. Close and try again.
          </Text>
        ) : (
          people.map((p) => (
            <HStack key={p.id} space="md">
              <ProfileAvatar name={p.name} size={36} />
              <Text>{p.name}</Text>
            </HStack>
          ))
        )}
      </VStack>
    </SharedLifePage>
  );
}
