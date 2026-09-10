import { useEffect, useState } from "react";
import { Alert, Image, ScrollView, View } from "react-native";
import { Button, HStack, Text, VStack } from "../../ui/primitives";
import { colors, spacing } from "../../theme";
import { SharedLifePage } from "../shared-home/SharedLifePage";
import { SharedLifePostCard } from "../shared-home/SharedLifePostCard";
import { SharedLifeChoreCard } from "../shared-home/SharedLifeChoreCard";
import { feedStyles } from "../shared-home/FeedItemParts";
import { DeliveryCard } from "../shared-home/SharedHomeDeliveryCard";
import { HomeMediaSourceContext } from "../shared-home/SharedLifeMediaGallery";
import { HomeFeedItemLabControls } from "./HomeFeedItemLabControls";
import {
  homeFeedItemExamples,
  homeFeedReviewTypes,
} from "./homeFeedItemExamples";
const source = async (path: string) => {
  if (path.startsWith("missing-"))
    throw new Error("Intentional unavailable fixture");
  return Image.resolveAssetSource(
    require("../../../assets/images/focus/canyon-spring-poster.jpg"),
  );
};
const preview = () =>
  Alert.alert(
    "Fictional example",
    "This review screen does not publish or open real household content.",
  );
/** Review harness: actual production renderers, fictional in-memory data, no network mutations. */
export function HomeFeedItemLab({
  onClose,
  exampleId,
  captureOnly = false,
}: {
  onClose: () => void;
  exampleId?: string;
  captureOnly?: boolean;
}) {
  const [selectedId, setSelectedId] = useState(
    exampleId ?? homeFeedItemExamples[0].id,
  );
  const [typeId, setTypeId] = useState("");
  useEffect(() => {
    if (exampleId && homeFeedItemExamples.some((e) => e.id === exampleId)) {
      setSelectedId(exampleId);
      setTypeId("");
      setMixed(false);
    }
  }, [exampleId]);
  const matches = (e: (typeof homeFeedItemExamples)[number], id: string) =>
    id === "overview"
      ? [
          "text-short",
          "chore-single",
          "goal-note-available",
          "goal-invitation-pending",
        ].includes(e.id)
      : !id || e.typeId === id;
  const examples = homeFeedItemExamples.filter((e) => matches(e, typeId));
  const index = Math.max(
    0,
    examples.findIndex((e) => e.id === selectedId),
  );
  const [mixed, setMixed] = useState(false);
  const [reacted, setReacted] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const example = examples[index];
  const renderExample = (item: typeof example) => {
    if (item.delivery)
      return (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <DeliveryCard
            delivery={item.delivery}
            now={new Date()}
            onOpen={preview}
            onReport={preview}
          />
        </View>
      );
    if (!item.post) return null;
    const post = {
      ...item.post,
      saved: saved[item.id] ?? Boolean(item.post.saved),
      myReaction:
        (reacted[item.id] ?? Boolean(item.post.myReaction)) ? "heart" : null,
      reactionCount:
        item.post.reactionCount +
        Number(reacted[item.id] ?? Boolean(item.post.myReaction)) -
        Number(Boolean(item.post.myReaction)),
    };
    const onReact = () =>
      setReacted((old) => ({
        ...old,
        [item.id]: !(old[item.id] ?? Boolean(item.post?.myReaction)),
      }));
    return post.kind === "chore_update" ? (
      <SharedLifeChoreCard
        post={post}
        onReact={onReact}
        onOpen={preview}
        onReport={preview}
      />
    ) : (
      <SharedLifePostCard
        post={post}
        onReact={onReact}
        onOpen={preview}
        onAuthor={preview}
        onSave={preview}
        onViewExplore={preview}
        onReport={preview}
        onBookmark={() =>
          setSaved((old) => ({
            ...old,
            [item.id]: !(old[item.id] ?? Boolean(item.post?.saved)),
          }))
        }
        onReactors={preview}
        onOrganize={preview}
      />
    );
  };
  if (!__DEV__) return null;
  return (
    <HomeMediaSourceContext.Provider value={source}>
      <SharedLifePage
        title={captureOnly ? example.id : "Feed item lab"}
        onClose={onClose}
      >
        <View style={feedStyles.canvas}>
          {!captureOnly ? (
            <VStack
              space="xs"
              style={{
                paddingHorizontal: spacing.lg,
                paddingBottom: spacing.lg,
              }}
            >
              <Text tone="secondary">
                {homeFeedItemExamples.length} fictional variants ·{" "}
                {homeFeedReviewTypes.length} content categories · 4 patterns
              </Text>
              <HomeFeedItemLabControls
                typeId={typeId}
                onType={(id) => {
                  setTypeId(id);
                  setSelectedId(
                    homeFeedItemExamples.find((e) => matches(e, id))!.id,
                  );
                }}
                examples={examples}
                currentId={example.id}
                onExample={setSelectedId}
              />
              <HStack alignItems="center" justifyContent="space-between">
                <Button
                  variant="ghost"
                  accessibilityLabel="Previous example"
                  disabled={index === 0 || mixed}
                  onPress={() => setSelectedId(examples[index - 1].id)}
                >
                  Previous
                </Button>
                <Button variant="ghost" onPress={() => setMixed(!mixed)}>
                  {mixed ? "One at a time" : "Mixed feed"}
                </Button>
                <Button
                  variant="ghost"
                  accessibilityLabel="Next example"
                  disabled={index === examples.length - 1 || mixed}
                  onPress={() => setSelectedId(examples[index + 1].id)}
                >
                  Next
                </Button>
              </HStack>
              {!mixed ? (
                <>
                  <Text>{`${index + 1} / ${examples.length} · ${example.family}`}</Text>
                  <Text style={{ fontWeight: "600" }}>{example.name}</Text>
                </>
              ) : null}
            </VStack>
          ) : (
            <Text tone="secondary" style={{ padding: spacing.lg }}>
              Fictional review · {example.name}
            </Text>
          )}
          <ScrollView
            key={mixed ? "mixed" : example.id}
            contentContainerStyle={{ paddingBottom: spacing["2xl"] }}
          >
            {mixed ? (
              examples.map((item, i) => (
                <View
                  key={item.id}
                  style={{ marginTop: i ? spacing["2xl"] : 0 }}
                >
                  {renderExample(item)}
                </View>
              ))
            ) : (
              <>
                {renderExample(example)}
                {!captureOnly ? (
                  <View
                    style={{
                      marginTop: spacing["2xl"],
                      padding: spacing.lg,
                      backgroundColor: colors.shellAlt,
                    }}
                  >
                    <Text tone="secondary">Review question</Text>
                    <Text>{example.question}</Text>
                  </View>
                ) : null}
              </>
            )}
          </ScrollView>
        </View>
      </SharedLifePage>
    </HomeMediaSourceContext.Provider>
  );
}
