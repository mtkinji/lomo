import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet } from "react-native";
import { randomUUID } from "expo-crypto";
import { Button, HStack, Input, Text, VStack } from "../../ui/primitives";
import { spacing } from "../../theme";
import { SharedLifePage } from "./SharedLifePage";
import type { SharedLifeRepository } from "./sharedLifeRepository";
import type { HomeCollection, HomePost } from "./sharedLifeTypes";
export function SharedLifeCollections({
  repository,
  post,
  onClose,
  onSelect,
}: {
  repository: SharedLifeRepository;
  post?: HomePost;
  onClose: () => void;
  onSelect?: (c: HomeCollection) => void;
}) {
  const [items, setItems] = useState<HomeCollection[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = () =>
    repository
      .command<HomeCollection[]>("collections", { postId: post?.id })
      .then(setItems);
  useEffect(() => {
    let active = true;
    void repository
      .command<HomeCollection[]>("collections", { postId: post?.id })
      .then((v) => {
        if (active) setItems(v);
      })
      .catch(() => {
        if (active) setError("Collections could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, [repository, post?.id]);
  const run = async (op: string, args: object) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await repository.command(op, args);
      await refresh();
      setName("");
    } catch {
      setError("That change could not be saved. Try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <SharedLifePage
      title={post ? "Organize saved moment" : "Collections"}
      onClose={onClose}
    >
      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        <VStack space="xl">
          <Text tone="secondary">
            Private to you. Removing a collection keeps your saved moments.
          </Text>
          {error ? <Text accessibilityRole="alert">{error}</Text> : null}
          <Input
            accentLabelOnFocus={false}
            label="New collection"
            value={name}
            onChangeText={setName}
            maxLength={80}
          />
          <Button
            variant="outline"
            disabled={!name.trim() || busy}
            onPress={() =>
              void run("collection_put", { id: randomUUID(), name })
            }
          >
            Create collection
          </Button>
          {items
            .filter(
              (c) =>
                post ||
                !name ||
                c.name.toLowerCase().includes(name.toLowerCase()),
            )
            .map((c) => (
              <HStack key={c.id}>
                <Button
                  variant="ghost"
                  disabled={busy}
                  accessibilityState={{ selected: c.included }}
                  onPress={() =>
                    post
                      ? void run("collect", {
                          id: post.id,
                          collectionId: c.id,
                          included: !c.included,
                        })
                      : onSelect?.(c)
                  }
                >
                  {`${c.name}${c.included ? " ✓" : ""}`}
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy}
                  accessibilityLabel={`Delete collection ${c.name}`}
                  onPress={() =>
                    Alert.alert(
                      "Delete collection?",
                      "Your saved posts will remain in Saved.",
                      [
                        { text: "Keep", style: "cancel" },
                        {
                          text: "Delete collection",
                          style: "destructive",
                          onPress: () =>
                            void run("collection_delete", { id: c.id }),
                        },
                      ],
                    )
                  }
                >
                  •••
                </Button>
              </HStack>
            ))}
        </VStack>
      </ScrollView>
    </SharedLifePage>
  );
}
const styles = StyleSheet.create({
  body: { padding: spacing.lg, paddingBottom: spacing["3xl"] },
});
