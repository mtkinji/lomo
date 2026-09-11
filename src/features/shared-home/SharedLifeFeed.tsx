import { useToastStore } from "../../store/useToastStore";
import { shareHomeMoment } from "./shareHomeMoment";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  FlatList,
  Alert,
  AppState,
  StyleSheet,
  View,
  type ViewToken,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Button, EmptyState, HStack, Text, VStack } from "../../ui/primitives";
import { KwiltLoader } from "../../ui/KwiltLoader";
import { spacing, typography } from "../../theme";
import { navigateWhenReady } from "../../navigation/rootNavigationRef";
import { useHouseholdModeStore } from "../household/sharedDevice/useHouseholdModeStore";
import { UgcReportDrawer } from "../safety/UgcReportDrawer";
import type { UgcReportTarget } from "../../services/ugcSafety";
import { useSharedLife } from "./useSharedLife";
import {
  SharedLifeNeedsYou,
  SharedLifeShareButton,
  SharedLifeFeedMenu,
  SharedLifeCatchUpRail,
} from "./SharedLifeFeedControls";
import { SharedLifeComposer } from "./SharedLifeComposer";
import { SharedLifeChoreCard } from "./SharedLifeChoreCard";
import { SharedLifePostCard } from "./SharedLifePostCard";
import { SharedLifeConversation } from "./SharedLifeConversation";
import { SharedLifeConnections } from "./SharedLifeConnections";
import { feedStyles } from "./FeedItemParts";
import { DeliveryCard } from "./SharedHomeDeliveryCard";
import { useSharedLifeDeliveries } from "./useSharedLifeDeliveries";
import { resolveSharedHomeDestination } from "./sharedHomeDestination";
import { groupSharedHomeDeliveries } from "./sharedHomePresentation";
import { useHomeShareRequest } from "./sharedLifeShareRequest";
import type { SharedHomeDelivery } from "./sharedHomeTypes";
import type { HomeAttachment, HomePost, HomeCatchUp } from "./sharedLifeTypes";
import { CanvasFlatListWithRef as CanvasFlatList } from "../../ui/layout/CanvasFlatList";
import { KwiltRefreshFrame, useKwiltRefresh } from "../../ui/KwiltRefresh";
import { SharedLifeBrowser } from "./SharedLifeBrowser";
import { SharedLifeCollections } from "./SharedLifeLibrary";
import { SharedLifeAppreciation } from "./SharedLifeAppreciation";
import type { SharedLifeRepository } from "./sharedLifeRepository";
import {
  restoreHomeOffset,
  type HomeReadingAnchor,
} from "./sharedLifePresentation";
import { useHomeRecommendations } from "./useHomeRecommendations";
import {
  HomeRecommendations,
  HomeNextStepsPage,
} from "./HomeRecommendationRegion";
import type { HomeRecommendation } from "./homeRecommendations";
import { homeRecommendationTarget } from "./homeRecommendationNavigation";
import { useHomeReaction } from "./useHomeReaction";
type RecommendationPreview = {
  model: ReturnType<typeof useHomeRecommendations>;
  onOpen: (offer: HomeRecommendation) => void;
};
type FeedFrame = (
  content: ReactNode,
  shareAction: ReactNode,
  moreMenu?: ReactNode,
) => ReactNode;
export function SharedLifeFeed({
  userId,
  highlightedDeliveryId,
  previewRepository,
  recommendationPreview,
  renderFrame = (content) => content,
}: {
  userId: string | null;
  highlightedDeliveryId?: string;
  previewRepository?: SharedLifeRepository;
  recommendationPreview?: RecommendationPreview;
  renderFrame?: FeedFrame;
}) {
  const householdMode = useHouseholdModeStore((state) => state.session);
  if (householdMode)
    return renderFrame(
      <EmptyState
        variant="screen"
        title="Home uses your personal account"
        instructions="Leave Household mode to share and read personal moments."
      />,
      null,
    );
  if (!userId)
    return renderFrame(
      <EmptyState
        variant="screen"
        title="Your people, your moments"
        instructions="Sign in to share moments with your household and people you know."
      />,
      null,
    );
  return (
    <SignedInSharedLife
      key={userId}
      userId={userId}
      highlightedDeliveryId={highlightedDeliveryId}
      previewRepository={__DEV__ ? previewRepository : undefined}
      recommendationPreview={
        __DEV__ && previewRepository ? recommendationPreview : undefined
      }
      renderFrame={renderFrame}
    />
  );
}
function SignedInSharedLife({
  userId,
  highlightedDeliveryId,
  previewRepository,
  recommendationPreview,
  renderFrame,
}: {
  userId: string;
  highlightedDeliveryId?: string;
  previewRepository?: SharedLifeRepository;
  recommendationPreview?: RecommendationPreview;
  renderFrame: FeedFrame;
}) {
  const life = useSharedLife(userId, previewRepository);
  const liveRecommendations = useHomeRecommendations(
    userId,
    !previewRepository,
  );
  const recommendations = recommendationPreview?.model ?? liveRecommendations;
  const [nextSteps, setNextSteps] = useState(false);
  const openRecommendation = (offer: HomeRecommendation) => {
    if (recommendationPreview) {
      recommendationPreview.onOpen(offer);
      setNextSteps(false);
      return;
    }
    if (!recommendations.eligible) return;
    const target = homeRecommendationTarget(offer.destination);
    const result = navigateWhenReady(target.name, target.params);
    if (!result.ok) return;
    recommendations.dispatch({
      type: "offer",
      id: offer.id,
      status: "accepted",
    });
    setNextSteps(false);
  };
  const [momentsOnly, setMomentsOnly] = useState(false);
  const [bubbles, setBubbles] = useState<HomeCatchUp[]>([]);
  const [browse, setBrowse] = useState<{
    title: string;
    authorId?: string;
    householdId?: string;
    library?: boolean;
    catchup?: HomeCatchUp;
  } | null>(null);
  const [organize, setOrganize] = useState<HomePost | null>(null);
  const [reactors, setReactors] = useState<string | null>(null);
  const [recentSave, setRecentSave] = useState<HomePost | null>(null);
  const bubbleGeneration = useRef(0);
  const reactions = useHomeReaction(life.repository.command, life.posts);
  const [savedOverrides, setSavedOverrides] = useState<Record<string, boolean>>(
    {},
  );
  const listRef = useRef<
    FlatList<{
      id: string;
      date: string;
      post: HomePost | null;
      delivery: SharedHomeDelivery | null;
    }>
  >(null);
  const rowHeights = useRef<Record<string, number>>({});
  const headerHeight = useRef(0);
  const readerAtTop = useRef(true);
  const reading = useRef<HomeReadingAnchor | null>(null);
  const restorePending = useRef(false);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") restorePending.current = true;
    });
    return () => sub.remove();
  }, []);
  const gallery = useRef(new Map<string, number>());
  const expanded = useRef(new Set<string>());
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") setBubbles([]);
    });
    return () => sub.remove();
  }, []);
  const refreshBubbles = useCallback(() => {
    if (AppState.currentState !== "active") return;
    const generation = ++bubbleGeneration.current;
    void life.repository
      .command<HomeCatchUp[]>("catchup")
      .then((v) => {
        if (
          active.current &&
          generation === bubbleGeneration.current &&
          AppState.currentState === "active"
        )
          setBubbles(v);
      })
      .catch(() => {
        if (active.current && generation === bubbleGeneration.current)
          setBubbles([]);
      });
  }, [life.repository]);
  useEffect(() => {
    refreshBubbles();
  }, [refreshBubbles, life.posts]);
  const refreshUi = useKwiltRefresh({
    onRefresh: async () => {
      await Promise.all([life.refresh(), refreshDeliveries()]);
    },
  });
  const [composer, setComposer] = useState<{
    attachment?: HomeAttachment;
    intent?: "photo" | "write";
  } | null>(null);
  const [conversation, setConversation] = useState<{
    post: HomePost;
    editing?: boolean;
  } | null>(null);
  const [connections, setConnections] = useState(false);
  const { deliveries, deliveryError, refreshDeliveries } =
    useSharedLifeDeliveries(
      userId,
      life.repository,
      Boolean(previewRepository),
    );
  const [report, setReport] = useState<UgcReportTarget | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);
  const request = useHomeShareRequest((state) => state.request);
  const clearRequest = useHomeShareRequest((state) => state.clear);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useFocusEffect(
    useCallback(() => {
      void life.revalidate();
    }, [life.revalidate]),
  );
  useEffect(() => {
    if (request?.userId === userId && !life.loading && !life.error) {
      setComposer({ attachment: request.attachment });
      clearRequest();
    }
  }, [request, userId, life.loading, life.error, clearRequest]);
  const mutate = async (op: string, args: object, success?: string) => {
    if (mutating) return false;
    setMutating(true);
    setNotice(null);
    try {
      await life.repository.command(op, args);
      if (op === "delete")
        void life.repository.cleanupMedia().catch(() => undefined);
      if (!active.current) return;
      if (success) setNotice(success);
      await life.revalidate();
      return true;
    } catch (e) {
      if (active.current)
        setNotice(e instanceof Error ? e.message : "That could not be saved.");
      return false;
    } finally {
      if (active.current) setMutating(false);
    }
  };
  useEffect(() => {
    void life.repository.cleanupMedia().catch(() => undefined);
  }, [life.repository]);
  const groups = groupSharedHomeDeliveries(deliveries);
  const stream = [
    ...life.posts.map((post) => ({
      id: post.id,
      date: post.createdAt,
      post,
      delivery: null,
    })),
    ...(!Object.keys(life.filter).length
      ? groups.sharedWithYou.map((delivery) => ({
          id: delivery.id,
          date: delivery.createdAt,
          post: null,
          delivery,
        }))
      : []),
  ]
    .filter((item) => !momentsOnly || item.post?.kind !== "chore_update")
    .sort((a, b) => b.date.localeCompare(a.date));
  const openDelivery = (delivery: SharedHomeDelivery) =>
    navigateWhenReady(...resolveSharedHomeDestination(delivery.destination));
  const deliveryCard = (delivery: SharedHomeDelivery) => (
    <DeliveryCard
      key={delivery.id}
      delivery={delivery}
      now={new Date()}
      onOpen={() => openDelivery(delivery)}
      highlighted={highlightedDeliveryId === delivery.id}
      onReport={
        delivery.actorUserId
          ? () =>
              setReport({
                kind:
                  delivery.eventKind === "goal_note"
                    ? "goal_feed_event"
                    : "shared_delivery",
                id: delivery.id,
                reportedUserId: delivery.actorUserId ?? null,
                displayName: delivery.actorDisplayName ?? "this person",
                contextLabel: "Shared moment",
              })
          : undefined
      }
    />
  );
  const present = (original: HomePost): HomePost => {
    const p =
      original.id in savedOverrides
        ? { ...original, saved: savedOverrides[original.id] }
        : original;
    return reactions.values[p.id]
      ? {
          ...p,
          myReaction: reactions.values[p.id].reaction,
          reactionCount: reactions.values[p.id].count,
        }
      : p;
  };
  const canSeeFeed = useRef(true);
  canSeeFeed.current =
    !composer &&
    !conversation &&
    !browse &&
    !connections &&
    !organize &&
    !reactors &&
    !nextSteps;
  const seen = useRef(new Set<string>());
  const viewable = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (AppState.currentState !== "active" || !canSeeFeed.current) return;
      const ids = viewableItems
        .map((v) => v.item.post as HomePost | null)
        .filter((p): p is HomePost => !!p && p.kind !== "chore_update")
        .map((p) => p.id)
        .filter((id) => !seen.current.has(id));
      if (ids.length) {
        ids.forEach((id) => seen.current.add(id));
        void life.repository
          .command("seen", { ids })
          .catch(() => ids.forEach((id) => seen.current.delete(id)));
      }
    },
  ).current;
  const viewabilityPairs = useRef([
    {
      viewabilityConfig: {
        itemVisiblePercentThreshold: 50,
        minimumViewTime: 1000,
      },
      onViewableItemsChanged: viewable,
    },
    {
      viewabilityConfig: {
        viewAreaCoveragePercentThreshold: 50,
        minimumViewTime: 1000,
      },
      onViewableItemsChanged: viewable,
    },
  ]).current;
  const renderItem = (item: {
    id: string;
    post: HomePost | null;
    delivery: SharedHomeDelivery | null;
  }) =>
    item.post?.kind === "chore_update" ? (
      <SharedLifeChoreCard
        key={item.id}
        post={present(item.post)}
        onOpen={() => setConversation({ post: item.post! })}
        onReact={() => {
          reactions.toggle(
            item.id,
            item.post!.myReaction,
            item.post!.reactionCount,
          );
        }}
        onReport={() =>
          setReport({
            kind: "home_post",
            id: item.id,
            reportedUserId: null,
            displayName: "this household update",
            contextLabel: "Chore update",
          })
        }
      />
    ) : item.post ? (
      <SharedLifePostCard
        key={item.id}
        post={present(item.post)}
        onOpen={() => setConversation({ post: item.post! })}
        onAuthor={() =>
          setBrowse({
            title: item.post!.authorName,
            authorId: item.post!.authorId ?? undefined,
          })
        }
        onReact={() => {
          reactions.toggle(
            item.id,
            item.post!.myReaction,
            item.post!.reactionCount,
          );
        }}
        expanded={expanded.current.has(item.id)}
        onExpand={() => {
          expanded.current.has(item.id)
            ? expanded.current.delete(item.id)
            : expanded.current.add(item.id);
        }}
        index={gallery.current.get(item.id) ?? 0}
        onIndexChange={(i) => gallery.current.set(item.id, i)}
        onBookmark={() => {
          void mutate(
            "bookmark",
            { id: item.id, saved: !present(item.post!).saved },
            present(item.post!).saved
              ? "Moment removed from Saved."
              : "Moment saved.",
          ).then((ok) => {
            if (!ok || !active.current) return;
            const saved = !present(item.post!).saved;
            setSavedOverrides((v) => ({ ...v, [item.id]: saved }));
            if (saved) setRecentSave(item.post!);
          });
        }}
        onReactors={() => setReactors(item.id)}
        onOrganize={() => setOrganize(item.post!)}
        onViewExplore={() => {
          navigateWhenReady("Explore", {
            screen: "ExploreMap",
            params: { homeSavedPlace: item.id },
          });
        }}
        onSave={() => {
          void mutate("save_place", { id: item.id }, "Place saved to Explore.");
        }}
        onReport={() =>
          setReport({
            kind: "home_post",
            id: item.id,
            reportedUserId: item.post!.authorId,
            displayName: item.post!.authorName,
            contextLabel: "Home post",
          })
        }
        onEdit={
          item.post.authorId === userId
            ? () => setConversation({ post: item.post!, editing: true })
            : undefined
        }
        onDelete={
          item.post.authorId === userId
            ? () =>
                Alert.alert(
                  "Delete this post?",
                  "The post and its responses will be removed for everyone.",
                  [
                    { text: "Keep post", style: "cancel" },
                    {
                      text: "Delete post",
                      style: "destructive",
                      onPress: () => {
                        void mutate("delete", { id: item.id });
                      },
                    },
                  ],
                )
            : undefined
        }
      />
    ) : (
      deliveryCard(item.delivery!)
    );
  const overlays = (
    <>
      {organize ? (
        <SharedLifeCollections
          repository={life.repository}
          post={organize}
          onClose={() => setOrganize(null)}
        />
      ) : null}
      {reactors ? (
        <SharedLifeAppreciation
          postId={reactors}
          repository={life.repository}
          onClose={() => setReactors(null)}
        />
      ) : null}
      {conversation ? (
        <SharedLifeConversation
          {...conversation}
          userId={userId}
          onReport={(target) => {
            setConversation(null);
            setReport(target);
          }}
          repository={life.repository}
          onClose={() => setConversation(null)}
          onChanged={() => {
            void life.revalidate();
          }}
        />
      ) : null}
    </>
  );
  const browserPage = (
    <>
      {browse ? (
        <SharedLifeBrowser
          repository={life.repository}
          mode={browse}
          onClose={() => {
            setBrowse(null);
            refreshBubbles();
          }}
          renderPost={(p) => renderItem({ id: p.id, post: p, delivery: null })}
        >
          {overlays}
        </SharedLifeBrowser>
      ) : null}
    </>
  );
  const moreMenu = (
    <SharedLifeFeedMenu
      onNextSteps={
        !previewRepository || recommendationPreview
          ? () => setNextSteps(true)
          : undefined
      }
      households={life.bootstrap.households}
      householdId={life.filter.householdId}
      selectedChoice={
        momentsOnly
          ? "moments"
          : life.filter.saved
            ? "places"
            : !life.filter.householdId
              ? "all"
              : undefined
      }
      onHousehold={(id) => {
        life.setFilter({ householdId: id });
      }}
      onChoose={(choice) => {
        if (choice === "all") {
          life.setFilter({});
          setMomentsOnly(false);
        }
        if (choice === "moments") setMomentsOnly(true);
        if (choice === "people") setConnections(true);
        if (choice === "mine")
          setBrowse({ title: "My moments", authorId: userId });
        if (choice === "saved") setBrowse({ title: "Saved", library: true });
        if (choice === "places") life.setFilter({ saved: true });
      }}
    />
  );
  const shareAction = (
    <SharedLifeShareButton onChoose={(intent) => setComposer({ intent })} />
  );
  return renderFrame(
    <>
      <KwiltRefreshFrame
        refreshOverlay={refreshUi.refreshOverlay}
        refreshing={refreshUi.refreshing}
      >
        <CanvasFlatList
          ref={listRef}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 0,
          }}
          onScrollBeginDrag={() => {
            readerAtTop.current = false;
          }}
          onScrollEndDrag={(e) => {
            readerAtTop.current = e.nativeEvent.contentOffset.y <= 1;
          }}
          onMomentumScrollBegin={() => {
            readerAtTop.current = false;
          }}
          onMomentumScrollEnd={(e) => {
            readerAtTop.current = e.nativeEvent.contentOffset.y <= 1;
          }}
          onContentSizeChange={() => {
            if (
              restorePending.current &&
              !life.loading &&
              (readerAtTop.current || (life.posts.length && reading.current))
            ) {
              const ids = stream.map(
                (i) => (i.post ? "post:" : "delivery:") + i.id,
              );
              const y = readerAtTop.current
                ? 0
                : reading.current
                  ? restoreHomeOffset(
                      reading.current,
                      ids,
                      rowHeights.current,
                      headerHeight.current,
                      spacing.xl,
                    )
                  : null;
              if (y !== null) {
                restorePending.current = false;
                requestAnimationFrame(() =>
                  listRef.current?.scrollToOffset({
                    offset: y,
                    animated: false,
                  }),
                );
              }
            }
          }}
          style={feedStyles.canvas}
          data={stream}
          keyExtractor={(item) => (item.post ? "post:" : "delivery:") + item.id}
          renderItem={({ item }) => (
            <View
              onLayout={(e) => {
                rowHeights.current[
                  (item.post ? "post:" : "delivery:") + item.id
                ] = e.nativeEvent.layout.height;
              }}
            >
              {renderItem(item)}
            </View>
          )}
          ItemSeparatorComponent={() => (
            <View style={{ height: spacing.xl }} />
          )}
          contentContainerStyle={{ paddingBottom: spacing["2xl"] }}
          refreshControl={refreshUi.refreshControl}
          onScroll={(e) => {
            refreshUi.onScroll(e);
            if (
              AppState.currentState !== "active" ||
              restorePending.current ||
              !life.posts.length
            )
              return;
            const y = e.nativeEvent.contentOffset.y;
            let top = headerHeight.current;
            const ids = stream.map(
              (i) => (i.post ? "post:" : "delivery:") + i.id,
            );
            for (const id of ids) {
              const height = rowHeights.current[id] ?? 0;
              if (top + height > y) {
                reading.current = {
                  id,
                  within: Math.max(0, y - top),
                  order: ids,
                };
                break;
              }
              top += height + spacing.xl;
            }
          }}
          scrollEventThrottle={refreshUi.scrollEventThrottle}
          viewabilityConfigCallbackPairs={viewabilityPairs}
          testID="home.sharedLife"
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View
              style={styles.header}
              testID="home.recommendationHeader"
              onLayout={(e) => {
                const changed =
                  headerHeight.current !== e.nativeEvent.layout.height;
                headerHeight.current = e.nativeEvent.layout.height;
                // Native anchoring can insert an asynchronously loaded header above offset zero.
                // Keep the invitation visible there; preserve the post anchor once reading starts.
                if (changed && readerAtTop.current && !restorePending.current) {
                  requestAnimationFrame(() => {
                    if (readerAtTop.current)
                      listRef.current?.scrollToOffset({
                        offset: 0,
                        animated: false,
                      });
                  });
                }
              }}
            >
              <HomeRecommendations
                featured={recommendations.featured}
                complementary={recommendations.complementary}
                dispatch={recommendations.dispatch}
                onOpen={openRecommendation}
                onOverview={() => setNextSteps(true)}
              />
              <SharedLifeCatchUpRail
                bubbles={bubbles}
                onOpen={(b) => setBrowse({ title: b.name, catchup: b })}
                onPeople={() => setConnections(true)}
              />
              <SharedLifeNeedsYou
                items={groups.needsYou}
                renderDelivery={deliveryCard}
                onOpen={openDelivery}
              />
              {notice ? <Text accessibilityRole="alert">{notice}</Text> : null}
              {recentSave ? (
                <Button
                  variant="ghost"
                  onPress={() => {
                    setOrganize(recentSave);
                    setRecentSave(null);
                  }}
                >
                  Organize saved moment
                </Button>
              ) : null}
              {Object.values(reactions.values).some((v) => v.error) ? (
                <Text accessibilityRole="alert">
                  A reaction could not be saved. Tap it to retry.
                </Text>
              ) : null}
              {life.error ? (
                <Text accessibilityRole="alert">{life.error}</Text>
              ) : null}
              {deliveryError ? (
                <Button
                  variant="ghost"
                  onPress={() => void refreshDeliveries()}
                >
                  Retry invitations
                </Button>
              ) : null}
              {life.incoming.length ? (
                <Button variant="outline" onPress={() => void life.refresh()}>
                  {`${life.incoming.length} new moments`}
                </Button>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.header}>
              {life.loading ? (
                <KwiltLoader />
              ) : life.error ? (
                <Button variant="outline" onPress={() => void life.refresh()}>
                  Retry Home
                </Button>
              ) : (
                <>
                  <Text style={styles.emptyTitle}>
                    {recommendations.featured
                      ? "Your people, your moments"
                      : "Let your people into your day"}
                  </Text>
                  <Text>
                    A photo, a discovery, a little story. Ordinary moments
                    belong here.
                  </Text>
                  <Button
                    variant={recommendations.featured ? "ghost" : "outline"}
                    onPress={() => setComposer({})}
                  >
                    Share a moment
                  </Button>
                </>
              )}
            </View>
          }
          ListFooterComponent={
            <View style={styles.header}>
              {life.more ? (
                <Button
                  variant="ghost"
                  loading={life.loading}
                  onPress={() => void life.refresh(true)}
                >
                  Older moments
                </Button>
              ) : stream.length ? (
                <Text tone="secondary">You’re caught up.</Text>
              ) : null}
            </View>
          }
        />
      </KwiltRefreshFrame>
      {nextSteps ? (
        <HomeNextStepsPage
          model={recommendations}
          onOpen={openRecommendation}
          onClose={() => setNextSteps(false)}
        />
      ) : null}
      {!connections ? browserPage : null}
      {!browse ? overlays : null}
      {composer ? (
        <SharedLifeComposer
          userId={userId}
          bootstrap={life.bootstrap}
          repository={life.repository}
          attachment={composer.attachment}
          intent={composer.intent}
          onClose={() => setComposer(null)}
          onPublished={(postId) => {
            setComposer(null);
            useToastStore
              .getState()
              .showToast({
                message: "Posted to Home",
                durationMs: 6000,
                actionLabel: "Share",
                actionOnPress: () => void shareHomeMoment(postId, userId),
              });
            void life.refresh();
          }}
        />
      ) : null}
      {connections ? (
        <SharedLifeConnections
          bootstrap={life.bootstrap}
          repository={life.repository}
          onHistory={setBrowse}
          onClose={() => {
            setConnections(false);
            void life.refresh();
          }}
        >
          {browserPage}
        </SharedLifeConnections>
      ) : null}
      <UgcReportDrawer
        target={report}
        onClose={() => setReport(null)}
        onBlocked={() => {
          setReport(null);
          void life.refresh();
          void refreshDeliveries();
        }}
      />
    </>,
    shareAction,
    moreMenu,
  );
}
const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  emptyTitle: { ...typography.titleSm },
});
