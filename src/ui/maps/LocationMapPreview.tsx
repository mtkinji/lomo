import React from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../primitives';
import { colors, spacing, typography } from '../../theme';
import { StaticMapImage } from './StaticMapImage';
import MapView, { type Region } from 'react-native-maps';

type LocationLike = {
  label?: string;
  latitude: number;
  longitude: number;
};

async function openInMaps(params: { lat: number; lon: number; label?: string }) {
  const { lat, lon, label } = params;
  const encodedLabel = label ? encodeURIComponent(label) : '';
  const apple = `http://maps.apple.com/?ll=${lat},${lon}${label ? `&q=${encodedLabel}` : ''}`;
  const google = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
  const url = Platform.OS === 'ios' ? apple : google;
  try {
    await Linking.openURL(url);
  } catch {
    // Fallback to a universal URL.
    await Linking.openURL(google);
  }
}

export function LocationMapPreview({
  location,
  heightPx = 120,
  zoom = 15,
}: {
  location: LocationLike;
  heightPx?: number;
  zoom?: number;
}) {
  const lat = location.latitude;
  const lon = location.longitude;
  const label = location.label?.trim() || 'Location';

  const region: Region = React.useMemo(() => {
    // Approximate zoom -> delta. Keep a stable, pleasant default for previews.
    const deltaLat = Math.max(0.005, 0.15 / Math.pow(2, Math.max(0, zoom - 10)));
    const cos = Math.max(0.2, Math.cos((lat * Math.PI) / 180));
    const deltaLon = Math.max(0.005, deltaLat / cos);
    return { latitude: lat, longitude: lon, latitudeDelta: deltaLat, longitudeDelta: deltaLon };
  }, [lat, lon, zoom]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${label} in maps`}
      onPress={() => {
        void openInMaps({ lat, lon, label });
      }}
      style={({ pressed }) => [styles.root, pressed ? { opacity: 0.92 } : null]}
    >
      {Platform.OS === 'ios' ? (
        <MapView
          style={{ width: '100%', height: heightPx }}
          mapType="standard"
          initialRegion={region}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          pointerEvents="none"
        />
      ) : (
        <StaticMapImage latitude={lat} longitude={lon} heightPx={heightPx} zoom={zoom} />
      )}
      <View style={styles.footer}>
        <Text numberOfLines={1} style={styles.label}>
          {label}
        </Text>
        <Text numberOfLines={1} style={styles.hint}>
          Tap to open in Maps
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  image: {
    width: '100%',
    backgroundColor: colors.shellAlt,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 2,
    backgroundColor: colors.card,
  },
  label: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  hint: {
    ...typography.bodyXs,
    color: colors.textSecondary,
  },
});


