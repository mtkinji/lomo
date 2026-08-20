import { useMemo } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';

import { colors, spacing } from '../../../theme';
import { Heading, Text } from '../../../ui/Typography';
import type { RecipeEditorialEnrichment, RecipeOrigin } from '../data/recipeEditorialEnrichment';

export function recipeOriginMapRegion(origin: RecipeOrigin): Region {
  const [longitude, latitude] = origin.map.center;
  const latitudeDelta = Math.max(8, Math.min(24, 12_000 / origin.map.scale));
  const longitudeDelta = Math.min(50, latitudeDelta / Math.max(0.45, Math.cos((latitude * Math.PI) / 180)));
  return { latitude, longitude, latitudeDelta, longitudeDelta };
}

export function RecipeOriginStory({ enrichment }: { enrichment: RecipeEditorialEnrichment }) {
  const region = useMemo(() => recipeOriginMapRegion(enrichment.origin), [enrichment.origin]);

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Heading variant="md">Where this meal comes from</Heading>
        <Text>{enrichment.origin.label}</Text>
        <Text tone="secondary">{enrichment.origin.region}</Text>
      </View>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Map showing ${enrichment.origin.label}`}
        style={styles.mapFrame}
      >
        <MapView
          testID="recipe-origin-map"
          style={styles.map}
          mapType="standard"
          initialRegion={region}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          pointerEvents="none"
        >
          {enrichment.origin.markers.map((marker) => (
            <Marker
              key={`${marker.label}:${marker.latitude}:${marker.longitude}`}
              coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
              title={marker.label}
            />
          ))}
        </MapView>
      </View>
      <View style={styles.story}>
        {enrichment.history.paragraphs.map((paragraph) => (
          <Text key={paragraph}>{paragraph}</Text>
        ))}
      </View>
      <View style={styles.sources}>
        <Text variant="label" tone="secondary">Sources</Text>
        {enrichment.history.sources.map((source) => (
          <Pressable
            key={source.url}
            accessibilityRole="link"
            accessibilityLabel={`Open source: ${source.title}`}
            onPress={() => { void Linking.openURL(source.url).catch(() => undefined); }}
            style={({ pressed }) => [styles.source, pressed ? styles.sourcePressed : null]}
          >
            <Text>{source.title}</Text>
            <Text tone="secondary">{source.publisher}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  heading: { gap: spacing.xs },
  mapFrame: {
    height: 184,
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.cardMuted,
  },
  map: { width: '100%', height: '100%' },
  story: { gap: spacing.md },
  sources: { gap: spacing.xs },
  source: { minHeight: 44, justifyContent: 'center', paddingVertical: spacing.xs },
  sourcePressed: { opacity: 0.65 },
});
