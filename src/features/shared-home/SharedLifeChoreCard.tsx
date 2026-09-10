import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text, VStack } from "../../ui/primitives";
import { typography, spacing } from "../../theme";
import { choreHeadline } from "./sharedLifePresentation";
import {
  FeedItemActions,
  FeedItemMetadata,
  FeedItemSurface,
  FeedItemResponses,
} from "./FeedItemParts";
import type { HomePost } from "./sharedLifeTypes";

/** Same source context in the feed and its conversation; never renders proof photos or review notes. */
export function HomeChoreDetails({
  post,
  expanded = false,
}: {
  post: HomePost;
  expanded?: boolean;
}) {
  const [showItems, setShowItems] = useState(expanded);
  const items = post.choreUpdate?.items ?? [];
  return (
    <VStack space="sm">
      <Text style={styles.headline}>{choreHeadline(post)}</Text>
      {items.slice(0, showItems ? undefined : 2).map((item) => (
        <VStack key={item.occurrenceId} space="xs">
          <Text>{item.title}</Text>
          {item.state === "waiting_approval" ? (
            <Text tone="secondary">Awaiting approval</Text>
          ) : null}
          {item.reportedEarlier && item.scheduledDate ? (
            <Text tone="secondary">{`Reported for ${new Date(`${item.scheduledDate}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}</Text>
          ) : null}
        </VStack>
      ))}
      {items.length > 2 && !expanded ? (
        <Button
          variant="ghost"
          size="sm"
          accessibilityState={{ expanded: showItems }}
          onPress={() => setShowItems(!showItems)}
        >
          {showItems ? "Hide chores" : "Show chores"}
        </Button>
      ) : null}
    </VStack>
  );
}
export function SharedLifeChoreCard({
  post,
  onReact,
  onOpen,
  onReport,
}: {
  post: HomePost;
  onReact: () => void;
  onOpen: () => void;
  onReport: () => void;
}) {
  return (
    <View style={{ paddingHorizontal: spacing.lg }}>
      <VStack space="sm">
        <FeedItemSurface treatment="contribution">
          <HomeChoreDetails post={post} />
        </FeedItemSurface>
        <FeedItemActions
          optionsLabel="Chore update options"
          options={[{ label: "Report update", onPress: onReport }]}
        >
          <FeedItemResponses
            kind="thanks"
            selected={Boolean(post.myReaction)}
            count={post.reactionCount}
            onReact={onReact}
            onOpen={onOpen}
            authorName={post.authorName}
          />
        </FeedItemActions>
        <FeedItemMetadata
          name={post.authorName}
          context={post.householdName ?? "Our household"}
          createdAt={post.createdAt}
        />
      </VStack>
    </View>
  );
}

const styles = StyleSheet.create({
  headline: { ...typography.body, fontWeight: "600" },
  meta: { ...typography.bodySm, flex: 1 },
});
