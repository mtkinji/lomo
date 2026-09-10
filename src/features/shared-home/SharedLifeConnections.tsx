import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SharedLifePage } from "./SharedLifePage";
import { BottomDrawerHeader } from "../../ui/layout/BottomDrawerHeader";
import { Button, Text, VStack, HStack } from "../../ui/primitives";
import { spacing } from "../../theme";
import type { HomeBootstrap, HomeConnection } from "./sharedLifeTypes";
import type { SharedLifeRepository } from "./sharedLifeRepository";
export function SharedLifeConnections({
  repository,
  bootstrap,
  onClose,
  onHistory,
  children,
}: {
  repository: SharedLifeRepository;
  bootstrap: HomeBootstrap;
  onClose: () => void;
  children?: ReactNode;
  onHistory?: (mode: {
    title: string;
    authorId?: string;
    householdId?: string;
  }) => void;
}) {
  const [items, setItems] = useState<HomeConnection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    try {
      setItems(await repository.connections());
    } catch {
      setError("Connections could not be loaded.");
    }
  }, [repository]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const act = async (op: string, args: object) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await repository.command(op, args);
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Connection could not be updated.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <SharedLifePage title="People & households" onClose={onClose}>
      <ScrollView contentContainerStyle={styles.body}>
        <VStack space="md">
          <Text tone="secondary">
            Follow the moments people choose to share. Approval gives you future
            posts, without opening private household life.
          </Text>
          {error ? <Text accessibilityRole="alert">{error}</Text> : null}
          {onHistory ? (
            <VStack space="sm">
              {bootstrap.households.map((h) => (
                <Button
                  key={h.id}
                  variant="ghost"
                  onPress={() =>
                    onHistory({ title: h.name, householdId: h.id })
                  }
                >{`${h.name} · Moments`}</Button>
              ))}
              {bootstrap.people.map((p) => (
                <Button
                  key={p.id}
                  variant="ghost"
                  onPress={() => onHistory({ title: p.name, authorId: p.id })}
                >{`${p.name} · Moments`}</Button>
              ))}
            </VStack>
          ) : null}
          {items.map((item) => (
            <VStack key={item.id} space="xs">
              <Text>
                {item.incoming
                  ? `${item.followerName} → ${item.targetName}`
                  : item.targetName}
              </Text>
              <Text tone="secondary">
                {item.state === "accepted"
                  ? "Following"
                  : item.incoming
                    ? "Wants to follow"
                    : "Waiting for approval"}
              </Text>
              <HStack space="xs">
                {onHistory && item.state === "accepted" ? (
                  <Button
                    variant="ghost"
                    onPress={() =>
                      onHistory({
                        title: item.incoming
                          ? item.followerName
                          : item.targetName,
                        authorId: item.incoming
                          ? item.followerId
                          : (item.targetUserId ?? undefined),
                        householdId: !item.incoming
                          ? (item.targetHouseholdId ?? undefined)
                          : undefined,
                      })
                    }
                  >
                    Moments
                  </Button>
                ) : null}
                {item.incoming && item.state === "pending" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onPress={() => {
                      void act("follow_accept", { id: item.id });
                    }}
                  >
                    Approve
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onPress={() => {
                    void act("follow_remove", { id: item.id });
                  }}
                >
                  {item.state === "pending"
                    ? "Cancel request"
                    : item.incoming
                      ? "Remove follower"
                      : "Unfollow"}
                </Button>
              </HStack>
            </VStack>
          ))}
          <Text>People you know</Text>
          {bootstrap.people
            .filter(
              (p) => !items.some((c) => !c.incoming && c.targetUserId === p.id),
            )
            .map((person) => (
              <Button
                key={person.id}
                variant="outline"
                disabled={busy}
                onPress={() => {
                  void act("follow_request", { targetUserId: person.id });
                }}
              >
                {`Follow ${person.name}`}
              </Button>
            ))}
          {bootstrap.householdChoices
            .filter(
              (h) =>
                !items.some((c) => !c.incoming && c.targetHouseholdId === h.id),
            )
            .map((h) => (
              <Button
                key={h.id}
                variant="outline"
                disabled={busy}
                onPress={() => {
                  void act("follow_request", { targetHouseholdId: h.id });
                }}
              >
                {`Follow ${h.name}`}
              </Button>
            ))}
          {!bootstrap.people.length ? (
            <Text tone="secondary">
              Your existing friends and household connections appear here. Add a
              friend in Sharing to connect with someone new.
            </Text>
          ) : null}
        </VStack>
      </ScrollView>
      {children}
    </SharedLifePage>
  );
}
const styles = StyleSheet.create({ body: { padding: spacing.md } });
