import { Pressable, StyleSheet, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';

import { colors, spacing } from '../../../theme';
import { BottomDrawer, BottomDrawerScrollView } from '../../../ui/BottomDrawer';
import { Button } from '../../../ui/Button';
import { Icon } from '../../../ui/Icon';
import { Input } from '../../../ui/Input';
import { BottomDrawerHeader } from '../../../ui/layout/BottomDrawerHeader';
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

type Props = {
  locations: KrogerLocation[];
  preferredLocation: KrogerLocation | null;
  zip: string;
  busy: boolean;
  searchOpen: boolean;
  storeSearchMessage: string | null;
  mapCenter: { latitude: number; longitude: number } | null;
  showsUserLocation: boolean;
  bottomInset: number;
  onZipChange(value: string): void;
  onOpenSearch(): void;
  onFindStores(): void;
  onFindCurrentLocation(): void;
  onChoose(location: KrogerLocation): void;
  onSetPreferred(location: KrogerLocation): void;
};

export function KrogerStoreFinder({
  locations,
  preferredLocation,
  zip,
  busy,
  searchOpen,
  storeSearchMessage,
  mapCenter,
  showsUserLocation,
  bottomInset,
  onZipChange,
  onOpenSearch,
  onFindStores,
  onFindCurrentLocation,
  onChoose,
  onSetPreferred,
}: Props) {
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
                  onPress={() => onChoose(location)}
                />
              )]
            : [],
        )}
      </MapView>
      <View style={styles.mapTools} pointerEvents="box-none">
        {searchOpen ? (
          <View style={styles.mapSearchField}>
            <Input
              autoFocus
              accessibilityLabel="Search stores by ZIP code"
              keyboardType="number-pad"
              value={zip}
              onChangeText={onZipChange}
              placeholder="ZIP code"
              leadingIcon="search"
              trailingIcon="search"
              trailingIconAccessibilityLabel="Find stores"
              onPressTrailingIcon={onFindStores}
              onSubmitEditing={onFindStores}
              returnKeyType="search"
              containerStyle={styles.mapSearchInput}
            />
          </View>
        ) : (
          <Button
            variant="secondary"
            size="icon"
            iconButtonSize={48}
            accessibilityLabel="Search stores by ZIP code"
            onPress={onOpenSearch}
          >
            <Icon name="search" size={19} color={colors.textPrimary} />
          </Button>
        )}
        <Button
          variant="secondary"
          size="icon"
          iconButtonSize={48}
          accessibilityLabel="Use my current location"
          disabled={busy}
          onPress={onFindCurrentLocation}
        >
          <Icon name="locate" size={20} color={colors.textPrimary} />
        </Button>
      </View>
      <BottomDrawer
        visible
        onClose={() => undefined}
        dismissable={false}
        presentation="inline"
        hideBackdrop
        snapPoints={['38%', '68%']}
        initialSnapIndex={0}
      >
        <BottomDrawerScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.storeDrawerContent, { paddingBottom: bottomInset + spacing.lg }]}
        >
          <BottomDrawerHeader title="Stores near you" variant="minimal" />
          {busy ? <Text tone="secondary">Finding stores…</Text> : null}
          {storeSearchMessage ? (
            <Text tone="secondary" accessibilityLiveRegion="polite">{storeSearchMessage}</Text>
          ) : null}
          {!busy && !locations.length && !storeSearchMessage ? (
            <Text tone="secondary">Use your location or search by ZIP to find a store.</Text>
          ) : null}
          <View>
            {locations.map((location) => {
              const preferred = preferredLocation?.id === location.id;
              return (
                <View key={location.id} style={styles.storeRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${location.banner}. ${location.address}. Shop with this store`}
                    onPress={() => onChoose(location)}
                    style={({ pressed }) => [styles.storeChoice, pressed && styles.pressed]}
                  >
                    <View style={styles.grow}>
                      <Heading variant="sm">{location.banner}</Heading>
                      <Text tone="secondary">{location.address}</Text>
                    </View>
                    <Icon name="chevronRight" size={18} color={colors.textSecondary} />
                  </Pressable>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={preferred || busy}
                    accessibilityLabel={preferred ? `${location.banner} is my store` : `Set ${location.banner} as my store`}
                    onPress={() => onSetPreferred(location)}
                  >
                    <View style={styles.preferredAction}>
                      <Icon name={preferred ? 'starFilled' : 'star'} size={16} color={colors.textPrimary} />
                      <Text>{preferred ? 'My store' : 'Set as my store'}</Text>
                    </View>
                  </Button>
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
  mapTools: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.md,
    right: spacing.md,
    zIndex: 30,
    elevation: 30,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mapSearchField: { flex: 1 },
  mapSearchInput: { borderRadius: 24 },
  storeDrawerContent: { paddingHorizontal: spacing.md, gap: spacing.sm },
  storeRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  storeChoice: {
    minHeight: 64,
    paddingHorizontal: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  preferredAction: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  grow: { flex: 1, gap: 2 },
  pressed: { backgroundColor: colors.muted },
});
