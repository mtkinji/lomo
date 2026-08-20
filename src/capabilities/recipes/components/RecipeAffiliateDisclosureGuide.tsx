import { Image, StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '../../../theme';
import { BottomGuide } from '../../../ui/BottomGuide';
import { Button } from '../../../ui/Button';
import { Portal } from '../../../ui/Portal';
import { Heading, Text } from '../../../ui/Typography';
import type {
  RecipeEditorialPick,
  RecipeEditorialPickThumbnail,
} from '../domain/recipeEditorialPicks';

const THUMBNAILS: Record<RecipeEditorialPickThumbnail, number> = {
  'food-processor': require('../../../../assets/recipes/equipment/kwilt-pick-food-processor.png'),
};

export function RecipeAffiliateDisclosureGuide({
  visible,
  affiliate,
  pick,
  onClose,
  onContinue,
}: {
  visible: boolean;
  affiliate: boolean;
  pick: RecipeEditorialPick | null;
  onClose(): void;
  onContinue(): void;
}) {
  if (!pick) return null;
  const thumbnail = pick.thumbnailUrl
    ? { uri: pick.thumbnailUrl }
    : THUMBNAILS[pick.thumbnailAsset];

  return (
    <Portal name="recipe-affiliate-disclosure-guide">
      <BottomGuide
        visible={visible}
        onClose={onClose}
        snapPoints={['70%']}
        dynamicSizing
        scrim="light"
        layout="floating"
      >
        <View style={styles.content}>
          <View style={styles.product}>
            <Image source={thumbnail} accessibilityIgnoresInvertColors style={styles.thumbnail} />
            <View style={styles.productCopy}>
              <Heading variant="md">Opening Amazon</Heading>
              <Text tone="secondary" numberOfLines={2}>{pick.title}</Text>
            </View>
          </View>
          <View style={styles.guidance}>
            <Text variant="label">You may not need it</Text>
            <Text tone="secondary">{pick.substituteSummary}</Text>
          </View>
          <View style={styles.guidance}>
            <Text variant="label">Worth knowing</Text>
            <Text tone="secondary">{pick.tradeoff}</Text>
          </View>
          <Text>
            {affiliate
              ? 'As an Amazon Associate, Kwilt earns from qualifying purchases.'
              : 'You’re about to open Amazon. This testing link is not an affiliate link.'}
          </Text>
          <View style={styles.actions}>
            <Button fullWidth onPress={onContinue}>Continue to Amazon</Button>
            <Button fullWidth variant="ghost" onPress={onClose}>Not now</Button>
          </View>
        </View>
      </BottomGuide>
    </Portal>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  product: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  productCopy: { flex: 1, gap: spacing.xs },
  guidance: { gap: spacing.xs },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: radii.card,
    backgroundColor: colors.cardMuted,
  },
  actions: { gap: spacing.xs },
});
