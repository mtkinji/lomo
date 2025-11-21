import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { VStack, Text, HStack, Pressable } from '@gluestack-ui/themed';
import { useNavigation } from '@react-navigation/native';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { Icon } from '../../ui/Icon';
import { cardSurfaceStyle, colors, spacing, typography } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import type { ThumbnailStyle } from '../../domain/types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';

type ThumbnailStyleOption = {
  value: ThumbnailStyle;
  label: string;
  description: string;
};

const THUMBNAIL_STYLE_OPTIONS: ThumbnailStyleOption[] = [
  {
    value: 'topographyDots',
    label: 'Topography dots',
    description: 'Abstract 8×8 dot field that suggests terrain over a soft gradient.',
  },
  {
    value: 'geoMosaic',
    label: 'Geo mosaic',
    description: 'Bold geometric tiles inspired by modernist patterns.',
  },
  {
    value: 'contourRings',
    label: 'Contour rings',
    description: 'Concentric rings that feel like fingerprint meets topography.',
  },
  {
    value: 'pixelBlocks',
    label: 'Pixel blocks',
    description: 'Dense pixel clusters inspired by retro generative textures.',
  },
  {
    value: 'plainGradient',
    label: 'Plain gradient',
    description: 'Simple, clean gradient tile without additional pattern.',
  },
];

const STYLE_LABEL_LOOKUP = THUMBNAIL_STYLE_OPTIONS.reduce<Record<ThumbnailStyle, string>>(
  (acc, option) => {
    acc[option.value] = option.label;
    return acc;
  },
  {} as Record<ThumbnailStyle, string>
);

function ThumbnailPreview({ style }: { style: ThumbnailStyle }) {
  if (style === 'topographyDots') {
    return (
      <View style={styles.previewContainer}>
        <View style={styles.previewTopographyGrid}>
          {Array.from({ length: 4 }).map((_, row) => (
            <View
              // eslint-disable-next-line react/no-array-index-key
              key={`topo-row-${row}`}
              style={styles.previewRow}
            >
              {Array.from({ length: 4 }).map((_, col) => (
                // eslint-disable-next-line react/no-array-index-key
                <View key={`topo-dot-${row}-${col}`} style={styles.previewTopoDot} />
              ))}
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (style === 'geoMosaic') {
    return (
      <View style={[styles.previewContainer, { backgroundColor: colors.shellAlt }]}>
        <View style={styles.previewRow}>
          <View style={[styles.previewTile, { backgroundColor: '#F97373' }]} />
          <View style={[styles.previewTile, { backgroundColor: '#0F3C5D' }]} />
        </View>
        <View style={styles.previewRow}>
          <View style={[styles.previewTile, { backgroundColor: '#FACC15' }]} />
          <View style={[styles.previewTile, { backgroundColor: '#E5E7EB' }]} />
        </View>
      </View>
    );
  }

  if (style === 'contourRings') {
    return (
      <View style={[styles.previewContainer, { backgroundColor: colors.shellAlt }]}>
        {Array.from({ length: 4 }).map((_, index) => (
          // eslint-disable-next-line react/no-array-index-key
          <View
            key={`ring-${index}`}
            style={[
              styles.previewRing,
              {
                margin: 3 + index * 2,
                borderColor: `rgba(15,23,42,${0.18 + index * 0.07})`,
              },
            ]}
          />
        ))}
      </View>
    );
  }

  if (style === 'pixelBlocks') {
    return (
      <View style={[styles.previewContainer, { backgroundColor: '#111827' }]}>
        {Array.from({ length: 4 }).map((_, row) => (
          <View
            // eslint-disable-next-line react/no-array-index-key
            key={`pixel-row-${row}`}
            style={styles.previewRow}
          >
            {Array.from({ length: 4 }).map((_, col) => {
              const filled = (row + col) % 2 === 0;
              return (
                // eslint-disable-next-line react/no-array-index-key
                <View
                  key={`pixel-${row}-${col}`}
                  style={[
                    styles.previewPixel,
                    filled && { backgroundColor: '#1D4ED8' },
                  ]}
                />
              );
            })}
          </View>
        ))}
      </View>
    );
  }

  // plainGradient or unknown: simple accent block
  return <View style={[styles.previewContainer, { backgroundColor: colors.accent }]} />;
}

export function AppearanceSettingsScreen() {
  const userProfile = useAppStore((state) => state.userProfile);
  const updateUserProfile = useAppStore((state) => state.updateUserProfile);
  const navigation =
    useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();

  const selectedStyles: ThumbnailStyle[] = useMemo(() => {
    const visuals = userProfile?.visuals;
    if (visuals?.thumbnailStyles && visuals.thumbnailStyles.length > 0) {
      return visuals.thumbnailStyles;
    }
    if (visuals?.thumbnailStyle) {
      return [visuals.thumbnailStyle];
    }
    return ['topographyDots'];
  }, [userProfile?.visuals]);

  const handleToggleThumbnailStyle = (style: ThumbnailStyle) => {
    updateUserProfile((current) => {
      const visuals = current.visuals ?? {};
      const existing: ThumbnailStyle[] =
        visuals.thumbnailStyles && visuals.thumbnailStyles.length > 0
          ? visuals.thumbnailStyles
          : visuals.thumbnailStyle
          ? [visuals.thumbnailStyle]
          : ['topographyDots'];

      let next: ThumbnailStyle[];
      if (existing.includes(style)) {
        // Prevent unselecting the last remaining style.
        next = existing.length === 1 ? existing : existing.filter((item) => item !== style);
      } else {
        next = [...existing, style];
      }

      return {
        ...current,
        visuals: {
          ...visuals,
          thumbnailStyles: next,
          thumbnailStyle: next[0],
        },
      };
    });
  };

  const summaryLabel =
    selectedStyles.length === 1
      ? STYLE_LABEL_LOOKUP[selectedStyles[0]] ?? 'Topography dots'
      : `${selectedStyles.length} styles`;
  const summaryDetailLabels = selectedStyles
    .map((style) => STYLE_LABEL_LOOKUP[style])
    .filter(Boolean);
  let summaryDetail: string;
  if (summaryDetailLabels.length === 0) {
    summaryDetail = 'Tap to choose the patterns LOMO rotates through.';
  } else if (summaryDetailLabels.length > 3) {
    const visible = summaryDetailLabels.slice(0, 3).join(', ');
    const remaining = summaryDetailLabels.length - 3;
    summaryDetail = `${visible}, +${remaining} more`;
  } else {
    summaryDetail = summaryDetailLabels.join(', ');
  }

  return (
    <AppShell>
      <View style={styles.screen}>
        <PageHeader
          title="Appearance"
          onPressBack={() => navigation.goBack()}
        />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <Text style={styles.sectionBody}>
              Choose the patterns LOMO cycles through on every arc thumbnail.
            </Text>
          </View>

          <Text style={styles.summaryInline}>
            <Text style={styles.summaryInlineStrong}>Currently rotating:</Text> {summaryLabel}
            {summaryDetail ? ` · ${summaryDetail}` : ''}
          </Text>

          <VStack space="md">
            {THUMBNAIL_STYLE_OPTIONS.map((option) => {
              const isSelected = selectedStyles.includes(option.value);
              return (
                <Pressable
                  key={option.value}
                  onPress={() => handleToggleThumbnailStyle(option.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <View
                    style={[
                      styles.optionCard,
                      isSelected && styles.optionCardSelected,
                    ]}
                  >
                    <HStack justifyContent="space-between" alignItems="center" space="md">
                      <VStack space="xs" flex={1}>
                        <Text style={styles.optionLabel}>{option.label}</Text>
                        <Text style={styles.optionDescription}>{option.description}</Text>
                      </VStack>
                      <ThumbnailPreview style={option.value} />
                    </HStack>
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected ? <Icon name="check" size={12} color={colors.canvas} /> : null}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </VStack>

        </ScrollView>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing['2xl'],
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  sectionBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  summaryInline: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  summaryInlineStrong: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontFamily: typography.titleSm.fontFamily,
  },
  optionCard: {
    ...cardSurfaceStyle,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  optionCardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.shellAlt,
  },
  optionLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: typography.titleSm.fontFamily,
  },
  optionDescription: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  checkbox: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
  },
  checkboxSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  previewContainer: {
    height: 56,
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: colors.shellAlt,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTopographyGrid: {
    width: '80%',
    height: '80%',
    justifyContent: 'space-between',
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewTopoDot: {
    width: 4,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  previewTile: {
    width: 12,
    height: 12,
    borderRadius: 4,
  },
  previewRing: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 999,
    borderColor: colors.border,
  },
  previewPixel: {
    width: 6,
    height: 6,
    backgroundColor: '#111827',
  },
});


