import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  AppState,
  FlatList,
  StyleSheet,
  View,
  type ViewToken,
} from "react-native";
import { Button, HStack, SearchField, Text, VStack } from "../../ui/primitives";
import { spacing } from "../../theme";
import { SharedLifePage } from "./SharedLifePage";
import { SharedLifeCollections } from "./SharedLifeLibrary";
import type { SharedLifeRepository } from "./sharedLifeRepository";
import type { HomeCatchUp, HomeCollection, HomePost } from "./sharedLifeTypes";
export function SharedLifeBrowser({
  repository,
  mode,
  onClose,
  renderPost,
  children,
}: {
  repository: SharedLifeRepository;
  mode: {
    title: string;
    authorId?: string;
    householdId?: string;
    catchup?: HomeCatchUp;
    library?: boolean;
  };
  onClose: () => void;
  renderPost: (p: HomePost) => ReactNode;
  children?: ReactNode;
}) {
  const [posts, setPosts] = useState<HomePost[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [more, setMore] = useState(false);
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState(false);
  const [collections, setCollections] = useState(false);
  const [collection, setCollection] = useState<HomeCollection | null>(null);
  const [history, setHistory] = useState(false);
  const suspended = useRef<HomePost[] | null>(null);
  const listRef = useRef<FlatList<HomePost>>(null);
  const offset = useRef(0);
  const restoreOffset = useRef(false);
  const postsRef = useRef(posts);
  postsRef.current = posts;
  const catchup = history ? undefined : mode.catchup;
  const until = useRef(new Date().toISOString()).current;
  const generation = useRef(0);
  const seen = useRef(new Set<string>());
  const fetchPage = async (append = false) => {
    const request = ++generation.current;
    setBusy(true);
    const last = append ? posts.at(-1) : null;
    try {
      const page = await repository.command<{ posts: HomePost[] }>(
        catchup ? "catchup_posts" : mode.library ? "library" : "feed",
        catchup
          ? { ...catchup, until }
          : {
              authorId:
                mode.authorId ??
                (mode.catchup?.kind === "person" ? mode.catchup.id : undefined),
              householdId:
                mode.householdId ??
                (mode.catchup?.kind === "household"
                  ? mode.catchup.id
                  : undefined),
              query,
              places,
              collectionId: collection?.id,
              ...(last
                ? {
                    before: last.createdAt,
                    beforeSavedAt: last.savedAt,
                    beforeId: last.id,
                  }
                : {}),
            },
      );
      if (request !== generation.current) return;
      setPosts((old) =>
        append
          ? [
              ...old,
              ...page.posts.filter((p) => !old.some((x) => x.id === p.id)),
            ]
          : page.posts,
      );
      setMore(page.posts.length === (catchup ? 100 : 30));
      setError("");
    } catch {
      if (request === generation.current) {
        setPosts([]);
        setError("These moments could not be loaded. Try again.");
      }
    } finally {
      if (request === generation.current) setBusy(false);
    }
  };
  useEffect(() => {
    suspended.current = null;
    void fetchPage();
    return () => {
      generation.current++;
    };
  }, [mode, places, collection, query, history]);
  const viewability = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (AppState.currentState !== "active") return;
      const ids = viewableItems
        .map((v) => (v.item as HomePost).id)
        .filter((id) => !seen.current.has(id));
      if (ids.length) {
        ids.forEach((id) => seen.current.add(id));
        void repository
          .command("seen", { ids })
          .catch(() => ids.forEach((id) => seen.current.delete(id)));
      }
    },
  ).current;
  useEffect(() => {
    let active = true;
    const revalidate = (remembered?: HomePost[]) => {
      const epoch = generation.current;
      const source = remembered ?? postsRef.current;
      const ids = source.map((p) => p.id);
      if (!ids.length) return;
      void repository
        .command<{ posts: HomePost[] }>("refresh_posts", { ids })
        .then((result) => {
          if (active && epoch === generation.current)
            setPosts(() =>
              source.flatMap((p) => {
                const next = result.posts.find((x) => x.id === p.id);
                return next ? [next] : [];
              }),
            );
        })
        .catch(() => {
          if (active && epoch === generation.current) {
            setPosts([]);
            setError("Reconnect to refresh these moments.");
          }
        });
    };
    const timer = setInterval(() => {
      if (AppState.currentState === "active") revalidate();
    }, 15000);
    const subscription = AppState.addEventListener("change", (state) => {
      generation.current++;
      if (state !== "active") {
        if (!suspended.current) suspended.current = postsRef.current;
        restoreOffset.current = true;
        setPosts([]);
      } else {
        const remembered = suspended.current;
        suspended.current = null;
        setBusy(false);
        if (remembered?.length) revalidate(remembered);
        else void fetchPage();
      }
    });
    return () => {
      active = false;
      clearInterval(timer);
      subscription.remove();
    };
  }, [repository, mode, history, places, collection, query]);
  const pairs = useRef([
    {
      viewabilityConfig: {
        itemVisiblePercentThreshold: 50,
        minimumViewTime: 1000,
      },
      onViewableItemsChanged: viewability,
    },
    {
      viewabilityConfig: {
        viewAreaCoveragePercentThreshold: 50,
        minimumViewTime: 1000,
      },
      onViewableItemsChanged: viewability,
    },
  ]).current;
  return (
    <SharedLifePage title={collection?.name ?? mode.title} onClose={onClose}>
      <FlatList
        ref={listRef}
        onScroll={(e) => { if (!restoreOffset.current) offset.current = e.nativeEvent.contentOffset.y; }}
        onContentSizeChange={() => {
          if (restoreOffset.current && posts.length) {
            restoreOffset.current = false;
            listRef.current?.scrollToOffset({offset: offset.current, animated: false});
          }
        }}
        data={posts}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <>{renderPost(item)}</>}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.list}
        viewabilityConfigCallbackPairs={pairs}
        ListHeaderComponent={
          <View style={styles.header}>
            {mode.library ? (
              <>
                <SearchField
                  accessibilityLabel="Search saved moments"
                  clearAccessibilityLabel="Clear saved moments search"
                  accentLabelOnFocus={false}
                  label="Search saved moments"
                  value={query}
                  onChangeText={setQuery}
                />
                <HStack>
                  <Button
                    variant="ghost"
                    onPress={() => {
                      setPlaces(false);
                      setCollection(null);
                    }}
                  >
                    All saved
                  </Button>
                  <Button
                    variant="ghost"
                    onPress={() => setPlaces(!places)}
                    accessibilityState={{ selected: places }}
                  >
                    Places
                  </Button>
                  <Button variant="ghost" onPress={() => setCollections(true)}>
                    Collections
                  </Button>
                </HStack>
              </>
            ) : null}
            {error ? <Text accessibilityRole="alert">{error}</Text> : null}
          </View>
        }
        ListFooterComponent={
          <View style={styles.header}>
            {busy ? (
              <Text>Loading moments…</Text>
            ) : more ? (
              <Button variant="ghost" onPress={() => void fetchPage(!catchup)}>
                More moments
              </Button>
            ) : (
              <Text tone="secondary">
                {catchup
                  ? `You’re caught up with ${mode.title}.`
                  : posts.length
                    ? "All moments shown."
                    : "No moments here yet."}
              </Text>
            )}
            {catchup ? (
              <VStack>
                <Button variant="ghost" onPress={() => setHistory(true)}>
                  See all moments
                </Button>
                <Button variant="ghost" onPress={onClose}>
                  Back to Home
                </Button>
              </VStack>
            ) : null}
            {error ? (
              <Button variant="ghost" onPress={() => void fetchPage()}>
                Retry
              </Button>
            ) : null}
          </View>
        }
      />
      {collections ? (
        <SharedLifeCollections
          repository={repository}
          onClose={() => setCollections(false)}
          onSelect={(c) => {
            setCollections(false);
            setCollection(c);
          }}
        />
      ) : null}
      {children}
    </SharedLifePage>
  );
}
const styles = StyleSheet.create({
  separator: { height: spacing["2xl"] },
  list: { paddingBottom: spacing["3xl"] },
  header: { padding: spacing.lg, gap: spacing.md },
});
