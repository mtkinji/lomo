import { useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { Pressable } from "../../ui/HapticPressable";
import { Text } from "../../ui/Typography";
import { Icon } from "../../ui/Icon";
import { colors, radii, spacing, typography } from "../../theme";
import { RecipeArtwork } from "../../capabilities/recipes/components/RecipeArtwork";
import type { MomentSuggestion } from "./sharedLifeSuggestions";
/** Source identity stays visual without turning source metadata into an action. */
export function MomentSuggestionRow({
  suggestion,
  onPress,
  disabled,
}: {
  suggestion: MomentSuggestion;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={suggestion.title}
      accessibilityHint={suggestion.context}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={styles.row}
    >
      <MomentSourceSummary suggestion={suggestion} />
      <Icon name="chevronRight" size={18} color={colors.textSecondary} />
    </Pressable>
  );
}

export function MomentSourceSummary({
  suggestion,
}: {
  suggestion: Pick<MomentSuggestion, "title" | "context" | "artwork" | "kind">;
}) {
  const [failed, setFailed] = useState(false);
  const art = suggestion.artwork;
  return (
    <View style={[styles.row, styles.summary]}>
      <View
        style={styles.thumbnail}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        {art?.kind === "recipe" ? (
          <RecipeArtwork
            storageRef={art.uri}
            accessibilityLabel=""
            style={styles.image}
          />
        ) : art && !failed ? (
          <Image
            source={{ uri: art.uri }}
            style={styles.image}
            onError={() => setFailed(true)}
          />
        ) : (
          <Icon
            name={
              suggestion.kind === "place"
                ? "mapPinHouse"
                : suggestion.kind === "meal"
                  ? "cookingPot"
                  : "target"
            }
            size={26}
            color={colors.textSecondary}
          />
        )}
      </View>
      <View style={styles.words}>
        <Text style={typography.bodySm} numberOfLines={2}>
          {suggestion.title}
        </Text>
        <Text tone="secondary" style={typography.caption}>
          {suggestion.context}
        </Text>
      </View>
    </View>
  );
}

/** Review treatment: real source artwork leads; missing artwork stays honestly compact. */
export function MomentSourcePreview({
  suggestion,
}: {
  suggestion: Pick<MomentSuggestion, "title" | "context" | "artwork" | "kind">;
}) {
  const [failed, setFailed] = useState(false);
  const art = suggestion.artwork;
  if (!art || failed) return <MomentSourceSummary suggestion={suggestion} />;
  return (
    <View style={styles.preview}>
      <View
        style={styles.previewArtwork}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        {art.kind === "recipe" ? (
          <RecipeArtwork
            storageRef={art.uri}
            accessibilityLabel=""
            style={styles.previewImage}
          />
        ) : (
          <Image
            source={{ uri: art.uri }}
            style={styles.previewImage}
            resizeMode="cover"
            onError={() => setFailed(true)}
          />
        )}
      </View>
      <View style={styles.previewWords}>
        <Text style={typography.bodyBold}>{suggestion.title}</Text>
        <Text tone="secondary" style={typography.caption}>
          {suggestion.context}
        </Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  summary: {
    flex: 1,
    paddingVertical: 0,
    borderBottomWidth: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 80,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: radii.input,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.gray100,
  },
  image: { width: 64, height: 64 },
  words: { flex: 1, minWidth: 0, gap: spacing.xs },
  preview: { gap: spacing.sm },
  previewArtwork: {
    width: "100%",
    aspectRatio: 16 / 10,
    borderRadius: radii.card,
    overflow: "hidden",
    backgroundColor: colors.gray100,
  },
  previewImage: { width: "100%", height: "100%" },
  previewWords: { gap: spacing.xs },
});
