import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Card, HStack, Text, VStack } from "../../ui/primitives";
import { ProfileAvatar, profileInitials } from "../../ui/ProfileAvatar";
import { Pressable } from "../../ui/HapticPressable";
import { withHapticPress } from "../../ui/haptics/withHapticPress";
import { Icon } from "../../ui/Icon";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../../ui/DropdownMenu";
import { colors, spacing, typography, radii } from "../../theme";
import { momentTime } from "./sharedLifePresentation";
export type FeedOption = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
};
/** Home-local candidate anatomy. Feed owns outer gutters/separators; these parts own inner rhythm. */
export function FeedItemMetadata({
  name,
  context,
  createdAt,
  now,
  onAuthor,
  caption,
  captionNumberOfLines,
  onCaptionTextLayout,
  captionFooter,
}: {
  name: string;
  context: string;
  createdAt: string;
  now?: number;
  onAuthor?: () => void;
  caption?: string;
  captionNumberOfLines?: number;
  onCaptionTextLayout?: React.ComponentProps<typeof Text>["onTextLayout"];
  captionFooter?: ReactNode;
}) {
  const authorPill = (
    <HStack space="xs" alignItems="center" style={feedStyles.authorPill}>
      <ProfileAvatar name={name} size={18} />
      <Text style={feedStyles.metadataName}>{name}</Text>
    </HStack>
  );
  return (
    <VStack space="xs" style={feedStyles.identity}>
      {caption ? (
        <Text
          style={feedStyles.body}
          numberOfLines={captionNumberOfLines}
          onTextLayout={onCaptionTextLayout}
        >
          <Text
            style={feedStyles.inlineAuthorPill}
            accessibilityRole={onAuthor ? "button" : undefined}
            accessibilityLabel={onAuthor ? `Moments from ${name}` : undefined}
            onPress={
              onAuthor
                ? withHapticPress(onAuthor, "canvas.selection")
                : undefined
            }
          >
            <Text style={feedStyles.inlineAvatar}>
              {` ${profileInitials(name)} `}
            </Text>
            {` ${name} `}
          </Text>
          {` ${caption}`}
        </Text>
      ) : onAuthor ? (
        <Pressable
          style={feedStyles.authorPillPressable}
          accessibilityRole="button"
          accessibilityLabel={`Moments from ${name}`}
          accessibilityHint={`${context} · ${momentTime(createdAt, now)}`}
          onPress={onAuthor}
        >
          {authorPill}
        </Pressable>
      ) : (
        authorPill
      )}
      {captionFooter}
      <Text style={feedStyles.meta}>
        {`${context} · ${momentTime(createdAt, now)}`}
      </Text>
    </VStack>
  );
}
/** One toolbar precedes every byline; optional source utilities belong in overflow. */
export function FeedItemActions({
  children,
  options = [],
  optionsLabel,
}: {
  children?: ReactNode;
  options?: FeedOption[];
  optionsLabel: string;
}) {
  if (!children && !options.length) return null;
  return (
    <HStack space="sm" alignItems="center" style={{ minHeight: 44 }}>
      <View style={feedStyles.grow}>{children}</View>
      {options.length ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              iconButtonSize={44}
              accessibilityLabel={optionsLabel}
            >
              <Icon name="more" size={20} color={colors.textSecondary} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {options.map((option) => (
              <DropdownMenuItem
                key={option.label}
                label={option.label}
                variant={option.destructive ? "destructive" : "default"}
                onPress={option.onPress}
              />
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </HStack>
  );
}

/** Content boundary; metadata deliberately belongs outside this surface. */
export function FeedItemSurface({
  children,
  padded = true,
  treatment = "moment",
}: {
  children: ReactNode;
  padded?: boolean;
  treatment?: "moment" | "contribution" | "message" | "invitation";
}) {
  return (
    <Card
      padding={padded ? "sm" : "none"}
      marginVertical={0}
      elevation="none"
      style={[
        feedStyles.surface,
        treatment === "message" && feedStyles.messageSurface,
        treatment === "contribution" && feedStyles.contributionSurface,
      ]}
    >
      {children}
    </Card>
  );
}
export function FeedItemContext({
  label,
  title,
  children,
}: {
  label: string;
  title?: string;
  children?: ReactNode;
}) {
  return (
    <VStack space="xs" style={feedStyles.context}>
      <Text style={feedStyles.meta}>{label}</Text>
      {title ? <Text style={feedStyles.name}>{title}</Text> : null}
      {children}
    </VStack>
  );
}
export function FeedItemResponses({
  kind = "cheer",
  selected,
  count,
  replyCount,
  onReact,
  onOpen,
  authorName,
}: {
  kind?: "cheer" | "thanks";
  selected: boolean;
  count?: number;
  replyCount?: number;
  onReact: () => void;
  onOpen: () => void;

  authorName: string;
}) {
  const thanks = kind === "thanks";
  return (
    <View style={feedStyles.responses}>
      <Pressable
        style={feedStyles.responseAction}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityValue={
          count
            ? { text: `${count} ${thanks ? "thanks" : "cheers"}` }
            : undefined
        }
        accessibilityLabel={
          thanks
            ? selected
              ? "Remove your thanks"
              : `Thank ${authorName}`
            : selected
              ? "Remove your cheer"
              : "Cheer this moment"
        }
        onPress={onReact}
      >
        <Icon
          name="heart"
          size={20}
          color={colors.textSecondary}
          fill={selected ? colors.textPrimary : "none"}
        />
        {count ? <Text style={feedStyles.actionCount}>{count}</Text> : null}
      </Pressable>
      <Pressable
        style={feedStyles.responseAction}
        accessibilityRole="button"
        accessibilityLabel="Comment"
        accessibilityValue={
          replyCount ? { text: `${replyCount} comments` } : undefined
        }
        onPress={onOpen}
      >
        <Icon name="messageCircle" size={20} color={colors.textSecondary} />
        {replyCount ? (
          <Text style={feedStyles.actionCount}>{replyCount}</Text>
        ) : null}
      </Pressable>
    </View>
  );
}
export const feedStyles = StyleSheet.create({
  canvas: { flex: 1, backgroundColor: colors.gray100 },
  item: { gap: spacing.sm },
  surface: {
    backgroundColor: colors.card,
    borderWidth: 0,
    borderColor: colors.border,
    borderRadius: radii.compactCard,
    overflow: "hidden",
  },
  messageSurface: { borderWidth: 0 },
  contributionSurface: {
    borderWidth: 0,
    paddingVertical: spacing.sm,
  },
  metadataName: {
    ...typography.bodySm,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  content: { padding: spacing.lg, gap: spacing.md },
  compact: { gap: spacing.sm },
  inset: { paddingHorizontal: spacing.lg },
  grow: { flex: 1 },
  identity: { minWidth: 0 },
  authorPillPressable: { alignSelf: "flex-start" },
  authorPill: {
    alignSelf: "flex-start",
    minHeight: 28,
    paddingLeft: spacing.xs,
    paddingRight: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.card,
  },
  inlineAuthorPill: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontWeight: "600",
    backgroundColor: colors.card,
    borderRadius: radii.pill,
  },
  inlineAvatar: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontWeight: "700",
    backgroundColor: colors.gray200,
    borderRadius: radii.pill,
  },
  name: { ...typography.bodyBold, color: colors.textPrimary },
  meta: { ...typography.bodySm, color: colors.textSecondary },
  body: { ...typography.body, color: colors.textPrimary },
  quotation: {
    ...typography.body,
    color: colors.textPrimary,
    fontStyle: "italic",
  },
  context: {
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
    paddingLeft: spacing.md,
    gap: spacing.xs,
  },
  responses: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.xs,
  },
  responseAction: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  actionCount: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  bookmark: { marginLeft: "auto" },
});
