import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { colors, spacing, typography } from '../theme';
import { Text } from './Typography';
import { Icon } from './Icon';
import type { AgeRange } from '../domain/types';
import {
  fetchCelebrationGif,
  type CelebrationKind,
  type CelebrationStylePreference,
  type MediaRole,
} from '../services/gifs';
import { useAppStore } from '../store/useAppStore';

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
  const showCelebrations =
    useAppStore((s) => s.userProfile?.preferences?.showCelebrationMedia) ?? true;

  if (!showCelebrations) {
    return null;
  }

  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [gifId, setGifId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const userAgeRange = useAppStore((s) => s.userProfile?.ageRange ?? ageRange);
  const blockCelebrationGif = useAppStore((s) => s.blockCelebrationGif);
  const likeCelebrationGif = useAppStore((s) => s.likeCelebrationGif);
  const likedCelebrationGifs = useAppStore((s) => s.likedCelebrationGifs ?? []);
  const isLiked = gifId ? likedCelebrationGifs.some((entry) => entry.id === gifId) : false;

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    const skipLikedCache = refreshKey > 0;
    void fetchCelebrationGif({
      role,
      kind,
      ageRange: userAgeRange,
      stylePreference,
      skipLikedCache,
    })
      .then((result) => {
        if (cancelled) return;
        const nextUrl = result?.url ?? null;
        const nextId = result?.id ?? null;
        setUrl(nextUrl);
        setGifId(nextId);

        if (nextUrl) {
          Image.getSize(
            nextUrl,
            (width, height) => {
              if (cancelled) return;
              if (width > 0 && height > 0) {
                setAspectRatio(width / height);
              }
            },
            () => {
              if (cancelled) return;
              setAspectRatio(null);
            }
          );
        } else {
          setAspectRatio(null);
        }
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [role, kind, userAgeRange, stylePreference, refreshKey]);

  useEffect(() => {
    if (!feedbackMessage) return;
    const timeoutId = setTimeout(() => {
      setFeedbackMessage(null);
    }, 2200);
    return () => clearTimeout(timeoutId);
  }, [feedbackMessage]);

  const handleNotQuiteRight = () => {
    if (!gifId) return;
    blockCelebrationGif(gifId);
    setGifId(null);
    setUrl(null);
    setAspectRatio(null);
    setRefreshKey((key) => key + 1);
    setFeedbackMessage("Got it — we'll avoid GIFs like this.");
  };

  const handleRefresh = () => {
    // Soft refresh without blocking the current GIF id so it can appear again
    // in the future if it passes filters.
    setGifId(null);
    setUrl(null);
    setAspectRatio(null);
    setRefreshKey((key) => key + 1);
  };

  const handleLike = () => {
    if (!gifId || !url) return;
    if (isLiked) {
      setFeedbackMessage('Already saved as a favorite.');
      return;
    }
    likeCelebrationGif({ id: gifId, url, role, kind });
    setFeedbackMessage('Saved as a favorite for future celebrations.');
  };

  const fallbackHeight = size === 'md' ? 180 : 140;

  return (
    <View>
      <View
        style={[
          styles.frame,
          aspectRatio ? { aspectRatio } : { height: fallbackHeight },
        ]}
      >
        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : url ? (
          <Image source={{ uri: url }} style={styles.image} resizeMode="contain" />
        ) : (
          <View style={styles.fallback}>
            {/* Simple fallback shimmer; hosts still provide the main copy. */}
          </View>
        )}
      </View>
      {url ? (
        <View>
          <View style={styles.attributionRow}>
            <View style={styles.iconsRow}>
              <TouchableOpacity
                onPress={handleRefresh}
                accessibilityRole="button"
                accessibilityLabel="Show a different GIF"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.iconButton}
              >
                <Icon name="refresh" size={12} color={colors.muted} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleLike}
                accessibilityRole="button"
                accessibilityLabel="Save this GIF as a favorite"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.iconButton}
              >
                <Icon
                  name="thumbsUp"
                  size={12}
                  color={isLiked ? colors.accent : colors.muted}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleNotQuiteRight}
                accessibilityRole="button"
                accessibilityLabel="This GIF is not quite right"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.iconButton}
              >
                <Icon name="thumbsDown" size={12} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.attributionText}>GIFS BY GIPHY</Text>
          </View>
          {feedbackMessage ? (
            <Text style={styles.feedbackMessage}>{feedbackMessage}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: spacing.xs,
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
  attributionRow: {
    marginTop: spacing.xs / 2,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    marginRight: spacing.md,
  },
  attributionText: {
    ...typography.label,
    color: colors.muted,
    fontSize: 10,
  },
  feedbackMessage: {
    marginTop: spacing.xs,
    ...typography.bodySm,
    color: colors.muted,
  },
});


