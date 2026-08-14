import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';

import { colors, spacing, typography } from '../../../theme';
import { BottomDrawer, BottomDrawerScrollView } from '../../../ui/BottomDrawer';
import { Button } from '../../../ui/Button';
import { Icon } from '../../../ui/Icon';
import { Input } from '../../../ui/Input';
import { BottomDrawerHeader } from '../../../ui/layout/BottomDrawerHeader';
import { HeaderActionPill, ObjectPageHeader } from '../../../ui/layout/ObjectPageHeader';
import { Heading, Text } from '../../../ui/Typography';
import type { KrogerLocation } from '../providers/krogerProvider';

const DEFAULT_STORE_REGION: Region = {
  latitude: 39.5,
  longitude: -98.35,
  latitudeDelta: 42,
  longitudeDelta: 42,
};

function regionForStores(
  locations: KrogerLocation[],
  center: { latitude: number; longitude: number } | null,
): Region {
  const points = locations.flatMap((location) =>
    typeof location.latitude === 'number' && typeof location.longitude === 'number'
      ? [{ latitude: location.latitude, longitude: location.longitude }]
      : [],
  );
  if (!points.length) {
    return center
      ? { ...center, latitudeDelta: 0.16, longitudeDelta: 0.16 }
      : DEFAULT_STORE_REGION;
  }
  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  return {
    latitude: (minLatitude + maxLatitude) / 2,
    longitude: (minLongitude + maxLongitude) / 2,
    latitudeDelta: Math.max(0.04, (maxLatitude - minLatitude) * 1.6),
    longitudeDelta: Math.max(0.04, (maxLongitude - minLongitude) * 1.6),
  };
}

function storeMapLabel(index: number): string {
  return index < 26 ? String.fromCharCode(65 + index) : String(index + 1);
}

type Props = {
  locations: KrogerLocation[];
  preferredLocation: KrogerLocation | null;
  query: string;
  busy: boolean;
  storeSearchMessage: string | null;
  mapCenter: { latitude: number; longitude: number } | null;
  showsUserLocation: boolean;
  bottomInset: number;
  backAccessibilityLabel?: string;
  chooseActionLabel?: string;
  onQueryChange(value: string): void;
  onBack(): void;
  onFindStores(): void;
  onFindCurrentLocation(): void;
  onChoose(location: KrogerLocation): void;
  onSetPreferred?(location: KrogerLocation): void;
};

export function KrogerStoreFinder({
  locations,
  preferredLocation,
  query,
  busy,
  storeSearchMessage,
  mapCenter,
  showsUserLocation,
  bottomInset,
  backAccessibilityLabel = 'Back to groceries',
  chooseActionLabel = 'Shop with this store',
  onQueryChange,
  onBack,
  onFindStores,
  onFindCurrentLocation,
  onChoose,
  onSetPreferred,
}: Props) {
  const [previewedLocationId, setPreviewedLocationId] = useState<string | null>(null);
  const locationLabels = useMemo(
    () => new Map(locations.map((location, index) => [location.id, storeMapLabel(index)])),
    [locations],
  );
  const previewedId = locations.some((location) => location.id === previewedLocationId)
    ? previewedLocationId
    : locations[0]?.id ?? null;
  const displayedLocations = useMemo(() => {
    if (!previewedId) return locations;
    const previewed = locations.find((location) => location.id === previewedId);
    return previewed
      ? [previewed, ...locations.filter((location) => location.id !== previewedId)]
      : locations;
  }, [locations, previewedId]);
  const drawerTitle = busy
    ? 'Finding stores…'
    : locations.length === 1
      ? '1 store nearby'
      : locations.length > 1
        ? `${locations.length} stores nearby`
        : 'Nearby stores';

  return (
    <View style={styles.storeFinder}>
      <MapView
        testID="store-finder-map"
        style={StyleSheet.absoluteFillObject}
        region={regionForStores(locations, mapCenter)}
        showsUserLocation={showsUserLocation}
        showsMyLocationButton={false}
      >
        {locations.flatMap((location) =>
          typeof location.latitude === 'number' && typeof location.longitude === 'number'
            ? [(
                <Marker
                  key={location.id}
                  coordinate={{ latitude: location.latitude, longitude: location.longitude }}
                  title={location.banner}
                  description={location.address}
                  accessibilityLabel={`${locationLabels.get(location.id)}. ${location.banner}. ${location.address}`}
                  onPress={() => setPreviewedLocationId(location.id)}
                >
                  <View style={[
                    styles.mapMarker,
                    location.id === previewedId && styles.mapMarkerPreviewed,
                  ]}>
                    <Text
                      style={styles.mapMarkerLabel}
                      tone={location.id === previewedId ? 'inverse' : 'default'}
                    >
                      {locationLabels.get(location.id)}
                    </Text>
                  </View>
                </Marker>
              )]
            : [],
        )}
      </MapView>
      <ObjectPageHeader
        barHeight={52}
        horizontalPadding={spacing.md}
        sideSlotWidth={48}
        showFullWidthBackground={false}
        left={(
          <HeaderActionPill
            accessibilityLabel={backAccessibilityLabel}
            materialVariant="floatingWhite"
            size={48}
            onPress={onBack}
          >
            <Icon name="arrowLeft" size={21} color={colors.textPrimary} />
          </HeaderActionPill>
        )}
        center={(
          <View style={styles.mapSearchField}>
            <Input
              accessibilityLabel="Search for nearby stores"
              value={query}
              onChangeText={onQueryChange}
              placeholder="City, address, or ZIP"
              leadingIcon="search"
              autoCapitalize="words"
              autoCorrect={false}
              onSubmitEditing={onFindStores}
              returnKeyType="search"
              containerStyle={styles.mapSearchInput}
            />
          </View>
        )}
        right={(
          <HeaderActionPill
            accessibilityLabel="Use my current location"
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            materialVariant="floatingWhite"
            size={48}
            onPress={onFindCurrentLocation}
          >
            <Icon name="locate" size={20} color={colors.textPrimary} />
          </HeaderActionPill>
        )}
      />
      <BottomDrawer
        visible
        onClose={() => undefined}
        dismissable={false}
        presentation="inline"
        hideBackdrop
        keyboardBehavior="extend"
        snapPoints={['30%', '68%']}
        initialSnapIndex={0}
        enableContentPanningGesture
        contentExtendsIntoBottomSafeArea
        sheetStyle={styles.storeDrawerSheet}
        handleContainerStyle={styles.storeDrawerHandleContainer}
      >
        <BottomDrawerScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.storeDrawerContent, { paddingBottom: bottomInset + spacing.lg }]}
        >
          <BottomDrawerHeader
            title={drawerTitle}
            variant="minimal"
            containerStyle={styles.storeDrawerHeader}
          />
          {storeSearchMessage ? (
            <Text tone="secondary" accessibilityLiveRegion="polite">{storeSearchMessage}</Text>
          ) : null}
          {!busy && !locations.length && !storeSearchMessage ? (
            <Text tone="secondary">Search an area or use your location.</Text>
          ) : null}
          <View>
            {displayedLocations.map((location) => {
              const preferred = preferredLocation?.id === location.id;
              const previewed = previewedId === location.id;
              const mapLabel = locationLabels.get(location.id);
              return (
                <View key={location.id} style={styles.storeRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: previewed }}
                    accessibilityLabel={`${mapLabel}. ${location.banner}. ${location.address}. ${chooseActionLabel}`}
                    onPress={() => onChoose(location)}
                    style={({ pressed }) => [
                      styles.storeChoice,
                      previewed && styles.previewedStore,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={[styles.storeMapLabel, previewed && styles.storeMapLabelPreviewed]}>
                      <Text tone={previewed ? 'inverse' : 'default'} style={styles.storeMapLabelText}>
                        {mapLabel}
                      </Text>
                    </View>
                    <View style={styles.grow}>
                      <Heading variant="sm">{location.banner}</Heading>
                      <Text
                        tone="secondary"
                        numberOfLines={2}
                        ellipsizeMode="tail"
                        style={styles.storeAddress}
                      >
                        {location.address}
                      </Text>
                    </View>
                    <Icon name="chevronRight" size={18} color={colors.textSecondary} />
                  </Pressable>
                  {onSetPreferred ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      iconButtonSize={44}
                      disabled={preferred || busy}
                      accessibilityLabel={preferred ? `${location.banner} is my store` : `Set ${location.banner} as my store`}
                      onPress={() => onSetPreferred(location)}
                    >
                      <Icon name={preferred ? 'starFilled' : 'star'} size={19} color={colors.textPrimary} />
                    </Button>
                  ) : null}
                </View>
              );
            })}
          </View>
        </BottomDrawerScrollView>
      </BottomDrawer>
    </View>
  );
}

const styles = StyleSheet.create({
  storeFinder: { flex: 1, overflow: 'hidden' },
  mapMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
    borderWidth: 2,
    borderColor: colors.textPrimary,
  },
  mapMarkerPreviewed: { backgroundColor: colors.textPrimary },
  mapMarkerLabel: { ...typography.bodySm, fontFamily: typography.bodyBold.fontFamily },
  mapSearchField: { width: '100%', paddingHorizontal: spacing.sm },
  mapSearchInput: { minHeight: 48, borderRadius: 24 },
  storeDrawerSheet: { paddingTop: 0 },
  storeDrawerHandleContainer: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  storeDrawerHeader: { paddingBottom: spacing.xs },
  storeDrawerContent: { paddingHorizontal: spacing.md, gap: spacing.sm },
  storeRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
  },
  storeChoice: {
    minHeight: 64,
    paddingHorizontal: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    borderRadius: 12,
  },
  storeMapLabel: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.border,
  },
  storeMapLabelPreviewed: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  storeMapLabelText: { ...typography.bodyXs, fontFamily: typography.bodyBold.fontFamily },
  previewedStore: { backgroundColor: colors.fieldFill },
  storeAddress: { ...typography.bodyXs },
  grow: { flex: 1, gap: 2 },
  pressed: { backgroundColor: colors.fieldFill },
});
