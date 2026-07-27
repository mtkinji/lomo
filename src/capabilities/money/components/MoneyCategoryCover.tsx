import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing } from '../../../theme';
import type { MoneyCategoryCover as MoneyCategoryCoverValue } from '../domain/moneyCategoryCover';

export function MoneyCategoryCover({ cover }: { cover?: MoneyCategoryCoverValue | null }) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => setImageFailed(false), [cover?.imageUrl]);

  const openLink = (url: string) => {
    void Linking.openURL(url).catch(() => undefined);
  };

  return (
    <View
      accessibilityLabel={cover && imageFailed ? 'Cover image unavailable' : undefined}
      accessible={Boolean(cover && imageFailed)}
      style={styles.cover}
    >
      <LinearGradient
        colors={[cover?.color ?? colors.pine50, colors.pine200, colors.pine700]}
        style={StyleSheet.absoluteFillObject}
      />
      {cover && !imageFailed ? (
        <Image
          accessibilityIgnoresInvertColors
          accessibilityLabel={`${cover.photographerName} category cover`}
          onError={() => setImageFailed(true)}
          resizeMode="cover"
          source={{ uri: cover.imageUrl }}
          style={StyleSheet.absoluteFillObject}
        />
      ) : null}
      <View pointerEvents="none" style={styles.scrim} />
      {cover && !imageFailed ? (
        <View style={styles.attribution}>
          <Text style={styles.attributionText}>Photo by </Text>
          <Pressable accessibilityRole="link" onPress={() => openLink(cover.photographerUrl)}>
            <Text style={styles.attributionLink}>{cover.photographerName}</Text>
          </Pressable>
          <Text style={styles.attributionText}> on </Text>
          <Pressable accessibilityRole="link" onPress={() => openLink(cover.sourceUrl)}>
            <Text style={styles.attributionLink}>Unsplash</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    height: 124,
    marginHorizontal: -spacing.xl,
    overflow: 'hidden',
    backgroundColor: colors.pine100,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(21,40,32,0.08)',
  },
  attribution: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,20,0.66)',
  },
  attributionText: {
    color: '#FFFFFF',
    fontFamily: fonts.regular,
    fontSize: 10,
    lineHeight: 14,
  },
  attributionLink: {
    color: '#FFFFFF',
    fontFamily: fonts.semibold,
    fontSize: 10,
    lineHeight: 14,
    textDecorationLine: 'underline',
  },
});
