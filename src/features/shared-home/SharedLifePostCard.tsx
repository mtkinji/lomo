import { useState } from "react";
import { Linking, Platform, View } from "react-native";
import { Button, Text, VStack } from "../../ui/primitives";
import { Pressable } from "../../ui/HapticPressable";
import { spacing } from "../../theme";
import { SharedLifeMediaGallery } from "./SharedLifeMediaGallery";
import { audienceLabel } from "./sharedLifePresentation";
import {
  FeedItemActions,
  FeedItemMetadata,
  FeedItemSurface,
  FeedItemContext,
  FeedItemResponses,
  feedStyles,
} from "./FeedItemParts";
import { appreciationText } from "./feedItemPresentation";
import type { HomePost } from "./sharedLifeTypes";
export function SharedLifePostCard({
  post,
  onOpen,
  onReact,
  onSave,
  onViewExplore,
  onAuthor,
  onReport,
  onEdit,
  onDelete,
  onBookmark,
  onReactors,
  onOrganize,
  expanded = false,
  onExpand,
  index = 0,
  onIndexChange,
}: {
  post: HomePost;
  onOpen: () => void;
  onReact: () => void;
  onSave: () => void;
  onViewExplore?: () => void;
  onAuthor: () => void;
  onReport: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onBookmark?: () => void;
  onReactors?: () => void;
  onOrganize?: () => void;
  expanded?: boolean;
  onExpand?: () => void;
  index?: number;
  onIndexChange?: (i: number) => void;
}) {
  const [overflow, setOverflow] = useState(false);
  const [localExpanded, setExpanded] = useState(expanded);
  const place = post.attachment?.kind === "place" ? post.attachment : null;
  const appreciation = appreciationText(
    post.reactors?.map((p) => p.name) ?? [],
    post.reactionCount,
  );
  return (
    <View style={[feedStyles.item, feedStyles.inset]}>
      <FeedItemSurface padded={false}>
        {post.media.length ? (
          <SharedLifeMediaGallery
            post={post}
            index={index}
            onIndexChange={onIndexChange}
          />
        ) : null}
        {post.text || post.attachment ? (
          <VStack space="md" style={feedStyles.content}>
            {post.text ? (
              <View>
                <Text
                  style={feedStyles.body}
                  numberOfLines={localExpanded ? undefined : 6}
                  onTextLayout={(e) => {
                    if (e.nativeEvent.lines.length >= 6) setOverflow(true);
                  }}
                >
                  {post.text}
                </Text>
                {overflow || post.text.length > 280 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    accessibilityState={{ expanded: localExpanded }}
                    onPress={() => {
                      setExpanded(!localExpanded);
                      onExpand?.();
                    }}
                  >
                    {localExpanded ? "Less" : "Read more"}
                  </Button>
                ) : null}
              </View>
            ) : null}
            {post.attachment ? (
              <FeedItemContext
                label={
                  place
                    ? "Place"
                    : post.attachment.kind === "goal_completed"
                      ? "Goal completed"
                      : "Outing"
                }
                title={
                  place
                    ? place.name
                    : "title" in post.attachment
                      ? post.attachment.title
                      : undefined
                }
              ></FeedItemContext>
            ) : null}
          </VStack>
        ) : null}
      </FeedItemSurface>
      <FeedItemActions
        optionsLabel={`Options for ${post.authorName}'s post`}
        options={[
          ...(place
            ? [
                {
                  label: post.savedToExplore
                    ? "View in Explore"
                    : "Save to Explore",
                  onPress: post.savedToExplore
                    ? (onViewExplore ?? onSave)
                    : onSave,
                },
                {
                  label: "View map",
                  onPress: () => {
                    void Linking.openURL(
                      Platform.OS === "ios"
                        ? `https://maps.apple.com/?ll=${place.latitude},${place.longitude}&q=${encodeURIComponent(place.name)}`
                        : `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`,
                    );
                  },
                },
              ]
            : []),
          ...(onBookmark
            ? [
                {
                  label: post.saved ? "Unsave moment" : "Save moment",
                  onPress: onBookmark,
                },
              ]
            : []),
          ...(appreciation && onReactors
            ? [{ label: appreciation, onPress: onReactors }]
            : []),
          ...(onEdit
            ? [{ label: "Edit words", onPress: onEdit }]
            : [{ label: "Report", onPress: onReport }]),
          ...(post.saved && onOrganize
            ? [{ label: "Organize saved moment", onPress: onOrganize }]
            : []),
          ...(onDelete
            ? [{ label: "Delete post", onPress: onDelete, destructive: true }]
            : []),
        ]}
      >
        <FeedItemResponses
          selected={Boolean(post.myReaction)}
          onReact={onReact}
          onOpen={onOpen}
          authorName={post.authorName}
        />
      </FeedItemActions>
      <FeedItemMetadata
        name={post.authorName}
        context={audienceLabel(post)}
        createdAt={post.createdAt}
        onAuthor={onAuthor}
      />
      {post.replyPreview ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Reply from ${post.replyPreview.authorName}. View conversation`}
          onPress={onOpen}
          style={{ gap: spacing.xs }}
        >
          <Text style={feedStyles.body} numberOfLines={2}>
            <Text style={feedStyles.name}>{post.replyPreview.authorName} </Text>
            {post.replyPreview.text}
          </Text>
          <Text style={feedStyles.meta}>
            {post.replyCount > 1
              ? `View all ${post.replyCount} comments`
              : "Reply"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
