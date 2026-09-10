import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Card, HStack, Text, VStack } from "../../ui/primitives";
import { ProfileAvatar } from "../../ui/ProfileAvatar";
import { Pressable } from "../../ui/HapticPressable";
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
}: {
  name: string;
  context: string;
  createdAt: string;
  now?: number;
  onAuthor?: () => void;
}) {
  const identity = (
    <VStack space="xs" style={feedStyles.identity}>
      <HStack space="sm" alignItems="center">
        <ProfileAvatar name={name} size={20} />
        <Text style={[feedStyles.metadataName, feedStyles.grow]}>
          {name}
          <Text
            style={feedStyles.meta}
          >{` · ${momentTime(createdAt, now)}`}</Text>
        </Text>
      </HStack>
      <Text style={[feedStyles.meta, { paddingLeft: 20 + spacing.sm }]}>
        {context}
      </Text>
    </VStack>
  );
  return (
    <HStack space="sm" alignItems="center">
      {onAuthor ? (
        <Pressable
          style={feedStyles.grow}
          accessibilityRole="button"
          accessibilityLabel={`Moments from ${name}`}
          accessibilityHint={`${context} · ${momentTime(createdAt, now)}`}
          onPress={onAuthor}
        >
          {identity}
        </Pressable>
      ) : (
        identity
      )}
    </HStack>
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
  onReact,
  onOpen,
  authorName,
}: {
  kind?: "cheer" | "thanks";
  selected: boolean;
  count?: number;
  onReact: () => void;
  onOpen: () => void;

  authorName: string;
}) {
  const thanks = kind === "thanks";
  return (
    <View style={feedStyles.responses}>
      <Button
        variant="ghost"
        size="icon"
        iconButtonSize={44}
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
      </Button>
      <Button
        variant="ghost"
        size="icon"
        iconButtonSize={44}
        accessibilityLabel="Comment"
        onPress={onOpen}
      >
        <Icon name="messageCircle" size={20} color={colors.textSecondary} />
      </Button>
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
  identity: { flex: 1, minWidth: 0, minHeight: 44 },
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
  bookmark: { marginLeft: "auto" },
});
