import { Image, StyleSheet, type ImageSourcePropType } from 'react-native';
import { colors, radii } from '../../../theme';

const TIDY_SHOES_FIXTURE = require('../assets/tidy-shoes-proof.png') as ImageSourcePropType;

function resolveEvidenceSource(uri: string): ImageSourcePropType {
  return uri === 'fixture://tidy-shoes' ? TIDY_SHOES_FIXTURE : { uri };
}

export function ChoreEvidencePhoto({
  uri,
  childName,
  compact = false,
}: {
  uri: string;
  childName: string;
  compact?: boolean;
}) {
  return (
    <Image
      accessibilityLabel={`${childName}'s chore photo`}
      source={resolveEvidenceSource(uri)}
      resizeMode={compact ? 'contain' : 'cover'}
      style={[styles.image, compact ? styles.compactImage : styles.standardImage]}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.gray100,
  },
  compactImage: {
    aspectRatio: 16 / 9,
  },
  standardImage: {
    aspectRatio: 4 / 3,
  },
});
