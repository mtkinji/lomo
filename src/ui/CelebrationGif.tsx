import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../theme';
import type { AgeRange } from '../domain/types';
import {
  fetchCelebrationGif,
  type CelebrationKind,
  type CelebrationStylePreference,
  type MediaRole,
} from '../services/gifs';

type CelebrationGifProps = {
  role?: MediaRole;
  kind: CelebrationKind;
  ageRange?: AgeRange;
  size?: 'sm' | 'md';
  stylePreference?: CelebrationStylePreference;
};

/**
 * Small, inline celebratory GIF tile for moments like "first Arc created".
 *
 * Hosts should treat this as optional flair: when no GIF is available or
 * fetching fails, the component falls back to a simple shimmer tile so the
 * layout remains stable.
 */
export function CelebrationGif({
  role = 'celebration',
  kind,
  ageRange,
  size = 'sm',
  stylePreference,
}: CelebrationGifProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    void fetchCelebrationGif({ role, kind, ageRange, stylePreference })
      .then((result) => {
        if (cancelled) return;
        setUrl(result?.url ?? null);
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [role, kind, ageRange, stylePreference]);

  const height = size === 'md' ? 180 : 140;

  return (
    <View style={[styles.frame, { height }]}>
      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : url ? (
        <Image
          source={{ uri: url }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.fallback}>
          {/* Simple fallback shimmer; hosts still provide the main copy. */}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: spacing.md,
    backgroundColor: colors.shellAlt,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    flex: 1,
    backgroundColor: colors.shell,
  },
});


