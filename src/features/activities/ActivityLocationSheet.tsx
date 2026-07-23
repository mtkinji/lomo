import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';
import { PortalHost } from '@rn-primitives/portal';
import MapView, { Circle, type Region } from 'react-native-maps';
import { colors, spacing, typography } from '../../theme';
import { BottomDrawer, BottomDrawerNativeGestureView, BottomDrawerScrollView } from '../../ui/BottomDrawer';
import { Button, IconButton } from '../../ui/Button';
import { Combobox, HStack, VStack } from '../../ui/primitives';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/DropdownMenu';
import { Icon } from '../../ui/Icon';
import { BottomDrawerFooter } from '../../ui/layout/BottomDrawerFooter';
import { BottomDrawerHeader } from '../../ui/layout/BottomDrawerHeader';
import { StaticMapImage } from '../../ui/maps/StaticMapImage';
import { Text } from '../../ui/Typography';
import { feetToMeters } from './activityLocationTriggers';
import { styles } from './activityDetailStyles';
import {
  LOCATION_RADIUS_FT_OPTIONS,
  type ActivityLocationEditorController,
  type Coordinates,
} from './useActivityLocationEditor';

type ActivityLocationSheetProps = {
  visible: boolean;
  controller: ActivityLocationEditorController;
  portalHostName: string;
};

const MAP_ZOOM = 15;

function regionForRadius(center: Coordinates, radiusM: number): Region {
  const safeRadius = Math.max(10, Math.min(5000, radiusM));
  const latitudeDelta = Math.max(0.005, (safeRadius * 6) / 111_000);
  const cosine = Math.max(0.2, Math.cos((center.latitude * Math.PI) / 180));
  return {
    ...center,
    latitudeDelta,
    longitudeDelta: Math.max(0.005, latitudeDelta / cosine),
  };
}

export function ActivityLocationSheet({
  visible,
  controller,
  portalHostName,
}: ActivityLocationSheetProps) {
  const { width } = useWindowDimensions();
  const mapHeight = Math.round(Math.max(200, Math.min(340, (Math.max(1, width - spacing.xl * 2) * 2) / 3)));
  const [mapCenter, setMapCenter] = useState<Coordinates | null>(null);
  const mapCenterRef = useRef<Coordinates | null>(null);
  const dragStartRef = useRef<Coordinates | null>(null);
  const mapRef = useRef<MapView | null>(null);
  const resolvedCenter = mapCenter ?? controller.previewLocation ?? controller.currentCoords;

  useEffect(() => {
    if (!visible) return;
    const center = controller.previewLocation ?? controller.currentCoords;
    setMapCenter(center);
    mapCenterRef.current = center;
    if (center) mapRef.current?.animateToRegion(regionForRadius(center, controller.radiusM), 250);
  }, [controller.currentCoords, controller.previewLocation, controller.radiusM, visible]);

  const panResponder = useMemo(() => {
    const worldSize = 256 * 2 ** MAP_ZOOM;
    const clampLatitude = (latitude: number) => Math.max(-85.05112878, Math.min(85.05112878, latitude));
    const longitudeToX = (longitude: number) => ((longitude + 180) / 360) * worldSize;
    const latitudeToY = (latitude: number) => {
      const radians = (clampLatitude(latitude) * Math.PI) / 180;
      const sine = Math.sin(radians);
      return (0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI)) * worldSize;
    };
    const xToLongitude = (x: number) => (x / worldSize) * 360 - 180;
    const yToLatitude = (y: number) => {
      const n = Math.PI - (2 * Math.PI * y) / worldSize;
      return (180 / Math.PI) * Math.atan(Math.sinh(n));
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => Boolean(resolvedCenter),
      onMoveShouldSetPanResponder: (_event, gesture) => Boolean(resolvedCenter) && Math.abs(gesture.dx) + Math.abs(gesture.dy) > 2,
      onPanResponderGrant: () => {
        if (resolvedCenter) dragStartRef.current = { ...resolvedCenter };
      },
      onPanResponderMove: (_event, gesture) => {
        const start = dragStartRef.current;
        if (!start) return;
        const next = {
          latitude: clampLatitude(yToLatitude(latitudeToY(start.latitude) - gesture.dy)),
          longitude: xToLongitude(longitudeToX(start.longitude) - gesture.dx),
        };
        mapCenterRef.current = next;
        setMapCenter(next);
      },
      onPanResponderRelease: () => {
        const center = mapCenterRef.current ?? resolvedCenter;
        if (!center) return;
        controller.setPreviewLocation({
          label: controller.previewLocation?.label ?? 'Pinned place',
          ...center,
        });
      },
    });
  }, [controller, resolvedCenter]);

  const centerMap = (center: Coordinates) => {
    setMapCenter(center);
    mapCenterRef.current = center;
    mapRef.current?.animateToRegion(regionForRadius(center, controller.radiusM), 250);
  };

  return (
    <BottomDrawer
      visible={visible}
      onClose={controller.close}
      snapPoints={Platform.OS === 'ios' ? ['92%'] : ['82%']}
      scrimToken="pineSubtle"
    >
      <View style={{ flex: 1 }}>
        {Platform.OS === 'ios' ? (
          <FullWindowOverlay><PortalHost name={portalHostName} /></FullWindowOverlay>
        ) : (
          <PortalHost name={portalHostName} />
        )}
        <BottomDrawerScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.sheetContent, { paddingBottom: spacing['2xl'] }]}
          keyboardShouldPersistTaps="handled"
        >
          <BottomDrawerHeader
            title="Location"
            variant="minimal"
            containerStyle={styles.sheetHeader}
            titleStyle={styles.sheetTitle}
          />
          {controller.statusHint ? (
            <Text style={[styles.sheetRowSubtext, { marginTop: spacing.xs }]}>{controller.statusHint}</Text>
          ) : null}

          <View style={{ marginTop: spacing.md }}>
            <View
              style={{ position: 'relative' }}
              {...(Platform.OS !== 'ios' ? panResponder.panHandlers : undefined)}
            >
              {resolvedCenter ? (
                Platform.OS === 'ios' ? (
                  <BottomDrawerNativeGestureView style={{ width: '100%', height: mapHeight, borderRadius: 12, overflow: 'hidden' }}>
                    <MapView
                      ref={mapRef}
                      style={{ width: '100%', height: '100%' }}
                      mapType="standard"
                      scrollEnabled
                      zoomEnabled
                      rotateEnabled={false}
                      pitchEnabled={false}
                      showsUserLocation={false}
                      showsMyLocationButton={false}
                      initialRegion={regionForRadius(resolvedCenter, controller.radiusM)}
                      onRegionChangeComplete={(region) => {
                        const center = { latitude: region.latitude, longitude: region.longitude };
                        centerMap(center);
                        controller.setPreviewLocation({
                          label: controller.previewLocation?.label ?? 'Pinned place',
                          ...center,
                        });
                      }}
                    >
                      {controller.trigger !== 'off' ? (
                        <Circle
                          center={resolvedCenter}
                          radius={controller.radiusM}
                          strokeWidth={2}
                          strokeColor={colors.accent}
                          fillColor="rgba(49,85,69,0.12)"
                        />
                      ) : null}
                    </MapView>
                  </BottomDrawerNativeGestureView>
                ) : (
                  <StaticMapImage
                    latitude={resolvedCenter.latitude}
                    longitude={resolvedCenter.longitude}
                    heightPx={mapHeight}
                    zoom={MAP_ZOOM}
                    radiusM={controller.trigger === 'off' ? undefined : controller.radiusM}
                  />
                )
              ) : (
                <View style={{ height: mapHeight, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.shellAlt }} />
              )}
              {resolvedCenter ? (
                <View pointerEvents="none" style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="pin" size={22} color={colors.accent} />
                </View>
              ) : null}
              <IconButton
                variant="secondary"
                accessibilityRole="button"
                accessibilityLabel="Center map on current location"
                onPress={() => controller.useCurrentLocation().then((location) => {
                  if (location) centerMap(location);
                })}
                style={{ position: 'absolute', right: spacing.sm, top: spacing.sm }}
              >
                <Icon name="locate" size={18} color={colors.sumi} />
              </IconButton>
            </View>
          </View>

          <VStack space="sm" style={{ marginTop: spacing.md }}>
            <HStack space="sm" alignItems="center" style={{ flexWrap: 'wrap' }}>
              <Text style={styles.sheetRowLabel}>Alert</Text>
              <DropdownMenu>
                <DropdownMenuTrigger {...({ asChild: true } as any)} accessibilityLabel="Select location alert">
                  <Pressable style={({ pressed }) => [styles.locationFormulaTrigger, pressed ? { opacity: 0.85 } : null]}>
                    <HStack space="xs" alignItems="center">
                      <Text style={styles.locationFormulaTriggerText}>
                        {controller.trigger === 'off'
                          ? 'Off'
                          : controller.trigger === 'leave'
                            ? 'When I leave'
                            : 'When I arrive'}
                      </Text>
                      <Icon name="chevronDown" size={16} color={colors.textSecondary} />
                    </HStack>
                  </Pressable>
                </DropdownMenuTrigger>
                <DropdownMenuContent portalHost={portalHostName} side="bottom" sideOffset={6} align="start">
                  <DropdownMenuItem onPress={() => controller.setTrigger('off')}><Text style={styles.menuRowText}>Off</Text></DropdownMenuItem>
                  <DropdownMenuItem onPress={() => controller.setTrigger('leave')}><Text style={styles.menuRowText}>When I leave</Text></DropdownMenuItem>
                  <DropdownMenuItem onPress={() => controller.setTrigger('arrive')}><Text style={styles.menuRowText}>When I arrive</Text></DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </HStack>

            {controller.trigger !== 'off' ? (
            <HStack space="sm" alignItems="center" style={{ flexWrap: 'wrap' }}>
              <Text style={styles.sheetRowLabel}>Boundary radius</Text>
              <DropdownMenu>
                <DropdownMenuTrigger {...({ asChild: true } as any)} accessibilityLabel="Select boundary radius">
                  <Pressable style={({ pressed }) => [styles.locationFormulaTrigger, pressed ? { opacity: 0.85 } : null]}>
                    <HStack space="xs" alignItems="center">
                      <Text style={styles.locationFormulaTriggerText}>{controller.radiusLabel}</Text>
                      <Icon name="chevronDown" size={16} color={colors.textSecondary} />
                    </HStack>
                  </Pressable>
                </DropdownMenuTrigger>
                <DropdownMenuContent portalHost={portalHostName} side="bottom" sideOffset={6} align="start">
                  {LOCATION_RADIUS_FT_OPTIONS.map((feet) => (
                    <DropdownMenuItem key={feet} onPress={() => controller.setRadiusM(feetToMeters(feet))}>
                      <Text style={styles.menuRowText}>{feet} feet</Text>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </HStack>
            ) : null}

            <HStack space="sm" alignItems="center" style={{ flexWrap: 'wrap' }}>
              <Text style={styles.sheetRowLabel}>from</Text>
              <View style={{ flexGrow: 1, flexShrink: 1, minWidth: 220 }}>
                <Combobox
                  open={controller.searchOpen}
                  onOpenChange={controller.setSearchOpen}
                  value={controller.selectedValue}
                  onValueChange={(value) => {
                    controller.setSelectedValue(value);
                    if (value === '__current_location__' && controller.currentCoords) {
                      const location = { label: 'Pinned place', ...controller.currentCoords };
                      controller.setPreviewLocation(location);
                      centerMap(location);
                      return;
                    }
                    const result = controller.results.find((item) => item.id === value);
                    if (result) {
                      controller.selectResult(result);
                      centerMap(result);
                    }
                  }}
                  options={[
                    ...(controller.isSearching ? [{ value: '__location_searching__', label: 'Searching...', disabled: true, leftElement: <ActivityIndicator size="small" color={colors.textSecondary} /> }] : []),
                    ...(controller.currentCoords ? [{ value: '__current_location__', label: 'Use current location', leftElement: <Icon name="locate" size={16} color={colors.textSecondary} /> }] : []),
                    ...controller.results.map((result) => ({ value: result.id, label: result.label, leftElement: <Icon name="pin" size={16} color={colors.textSecondary} /> })),
                  ]}
                  query={controller.query}
                  onQueryChange={controller.setQuery}
                  autoFilter={false}
                  searchPlaceholder="Enter a place or address"
                  emptyText={controller.isSearching ? 'Searching...' : controller.searchError ?? (controller.query.trim().length >= 2 ? 'No results found.' : 'Type to search.')}
                  presentation={Platform.OS === 'ios' ? 'drawer' : 'popover'}
                  portalHost={portalHostName}
                  allowDeselect={false}
                  trigger={
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Enter a place or address"
                      onPress={() => controller.setSearchOpen(true)}
                      style={({ pressed }) => [{ backgroundColor: colors.fieldFill, borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 }, pressed ? { opacity: 0.92 } : null]}
                    >
                      <Icon name="pin" size={16} color={colors.textSecondary} />
                      <Text numberOfLines={1} style={[typography.bodySm, { color: controller.previewLocation ? colors.textPrimary : colors.muted, flex: 1 }]}>
                        {controller.previewLocation?.label ?? 'Enter a place or address'}
                      </Text>
                      {controller.previewLocation ? (
                        <Pressable accessibilityRole="button" accessibilityLabel="Clear location" hitSlop={10} onPress={controller.clearSelection}>
                          <Icon name="close" size={16} color={colors.textSecondary} />
                        </Pressable>
                      ) : <Icon name="chevronDown" size={16} color={colors.textSecondary} />}
                    </Pressable>
                  }
                />
              </View>
            </HStack>
          </VStack>
        </BottomDrawerScrollView>
        <BottomDrawerFooter>
          <HStack space="sm">
            <Button variant="outline" style={{ flex: 1 }} onPress={controller.close}><Text style={styles.sheetRowLabel}>Cancel</Text></Button>
            <Button variant="primary" style={{ flex: 1 }} disabled={!controller.isDirty} onPress={controller.save}>
              <Text style={[styles.sheetRowLabel, { color: colors.primaryForeground }]}>Save</Text>
            </Button>
          </HStack>
        </BottomDrawerFooter>
      </View>
    </BottomDrawer>
  );
}
