import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  searchUnsplashPhotos,
  trackUnsplashDownload,
  withUnsplashReferral,
  type UnsplashPhoto,
} from '../../../services/unsplash';
import { colors, fonts, spacing, typography } from '../../../theme';
import { BottomDrawer, BottomDrawerScrollView } from '../../../ui/BottomDrawer';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { BottomDrawerHeader } from '../../../ui/layout/BottomDrawerHeader';
import type { MoneyCategoryCover } from '../domain/moneyCategoryCover';

type Props = {
  categoryName: string;
  currentCover?: MoneyCategoryCover | null;
  onClose: () => void;
  onSave: (cover: MoneyCategoryCover | null) => Promise<void>;
  saving: boolean;
  visible: boolean;
};

export function buildMoneyCategoryCoverFromUnsplashPhoto(photo: UnsplashPhoto): MoneyCategoryCover {
  return {
    source: 'unsplash',
    photoId: photo.id,
    imageUrl: photo.urls.regular,
    photographerName: photo.user.name,
    photographerUrl: withUnsplashReferral(photo.user.links.html),
    sourceUrl: withUnsplashReferral(photo.links.html),
    color: photo.color ?? null,
  };
}

export function MoneyCategoryCoverDrawer({
  categoryName,
  currentCover,
  onClose,
  onSave,
  saving,
  visible,
}: Props) {
  const [query, setQuery] = useState(categoryName);
  const [photos, setPhotos] = useState<UnsplashPhoto[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setQuery(categoryName);
    setPhotos([]);
    setSearched(false);
    setError(null);
  }, [categoryName, visible]);

  const runSearch = async () => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery || searching) return;
    setSearching(true);
    setError(null);
    try {
      const results = await searchUnsplashPhotos(normalizedQuery, { perPage: 12, orientation: 'landscape' });
      setPhotos(results);
      setSearched(true);
    } catch {
      setPhotos([]);
      setSearched(false);
      setError('Cover search is unavailable. Try again.');
    } finally {
      setSearching(false);
    }
  };

  const choosePhoto = async (photo: UnsplashPhoto) => {
    if (saving) return;
    setError(null);
    try {
      await onSave(buildMoneyCategoryCoverFromUnsplashPhoto(photo));
      void trackUnsplashDownload(photo.id).catch(() => undefined);
      onClose();
    } catch {
      setError('The cover could not be saved. Try again.');
    }
  };

  const removeCover = async () => {
    if (saving) return;
    setError(null);
    try {
      await onSave(null);
      onClose();
    } catch {
      setError('The cover could not be removed. Try again.');
    }
  };

  return (
    <BottomDrawer visible={visible} onClose={onClose} snapPoints={['88%']} enableContentPanningGesture>
      <BottomDrawerScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <BottomDrawerHeader
          closeAccessibilityLabel="Close cover editor"
          onClose={onClose}
          title="Edit cover"
          titleVariant="lg"
          variant="withClose"
        />
        <Text style={styles.intro}>Choose a calm, useful visual for this category.</Text>
        <View style={styles.searchRow}>
          <Input
            autoCapitalize="none"
            containerStyle={styles.searchInput}
            editable={!searching && !saving}
            leadingIcon="search"
            onChangeText={setQuery}
            onSubmitEditing={() => void runSearch()}
            placeholder="Search Unsplash"
            returnKeyType="search"
            value={query}
          />
          <Button disabled={!query.trim() || searching || saving} onPress={() => void runSearch()} size="sm">
            {searching ? 'Searching…' : 'Search'}
          </Button>
        </View>
        {searching ? <ActivityIndicator accessibilityLabel="Searching covers" color={colors.pine700} /> : null}
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {searched && photos.length === 0 ? <Text style={styles.empty}>No covers found. Try a broader search.</Text> : null}
        {photos.length > 0 ? (
          <View style={styles.results}>
            {photos.map((photo) => (
              <Pressable
                accessibilityLabel={`Use cover by ${photo.user.name}`}
                accessibilityRole="button"
                disabled={saving}
                key={photo.id}
                onPress={() => void choosePhoto(photo)}
                style={({ pressed }) => [styles.result, pressed ? styles.pressed : null]}
              >
                <Image accessibilityIgnoresInvertColors resizeMode="cover" source={{ uri: photo.urls.small }} style={styles.thumbnail} />
                <Text numberOfLines={1} style={styles.photographer}>by {photo.user.name}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {currentCover ? (
          <Button disabled={saving} fullWidth onPress={() => void removeCover()} variant="outline">
            {saving ? 'Saving…' : 'Remove cover'}
          </Button>
        ) : null}
        <Text style={styles.footer}>Photos provided by Unsplash.</Text>
      </BottomDrawerScrollView>
    </BottomDrawer>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingHorizontal: spacing.xl, paddingBottom: 60 },
  intro: { ...typography.bodySm, color: colors.textSecondary },
  searchRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  searchInput: { flex: 1 },
  results: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  result: { width: '48%', gap: spacing.xs },
  pressed: { opacity: 0.72 },
  thumbnail: { width: '100%', aspectRatio: 1.5, borderRadius: 10, backgroundColor: colors.gray100 },
  photographer: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 11, lineHeight: 15 },
  error: { color: colors.destructive, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  empty: { ...typography.bodySm, color: colors.textSecondary },
  footer: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 11, lineHeight: 15, textAlign: 'center' },
});
