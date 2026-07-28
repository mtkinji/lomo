import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Polygon, Polyline, type Region } from 'react-native-maps';
import { useCapabilityShell } from '../../../navigation/CapabilityShellContext';
import { useAppStore } from '../../../store/useAppStore';
import { colors, fonts, spacing, typography } from '../../../theme';
import { BottomDrawer, BottomDrawerScrollView } from '../../../ui/BottomDrawer';
import { Button } from '../../../ui/Button';
import { Icon } from '../../../ui/Icon';
import { BottomDrawerHeader } from '../../../ui/layout/BottomDrawerHeader';
import { Text } from '../../../ui/Typography';
import { buildAltitudeSegments } from '../domain/exploreElevation';
import { buildFogHole } from '../domain/exploreGeometry';
import type { ExplorePoint, ExploreSharingLevel, Place } from '../domain/types';
import { useExploreRecorder } from '../runtime/useExploreRecorder';
import { useExploreStore } from '../runtime/useExploreStore';

const DEFAULT_REGION: Region = {
  latitude: 39.5,
  longitude: -98.35,
  latitudeDelta: 42,
  longitudeDelta: 42,
};

const SHARING_OPTIONS: Array<{ value: ExploreSharingLevel; label: string; detail: string }> = [
  { value: 'private', label: 'Private', detail: 'Only you' },
  { value: 'territory', label: 'Territory', detail: 'Cleared areas' },
  { value: 'completed-paths', label: 'Paths', detail: 'Finished adventures' },
  { value: 'live', label: 'Live', detail: 'Current location' },
];

function pointsInDisplayOrder(sessions: ReturnType<typeof useExploreStore.getState>['sessions'], active: ReturnType<typeof useExploreStore.getState>['activeSession']): ExplorePoint[] {
  const completed = [...sessions].reverse().flatMap((session) => session.points);
  return active ? [...completed, ...active.points] : completed;
}

function regionAround(point: ExplorePoint): Region {
  return {
    latitude: point.latitude,
    longitude: point.longitude,
    latitudeDelta: 0.018,
    longitudeDelta: 0.018,
  };
}

function fogRingForRegion(region: Region) {
  const latitudeRadius = Math.max(0.02, region.latitudeDelta * 1.2);
  const longitudeRadius = Math.max(0.02, region.longitudeDelta * 1.2);
  const north = Math.min(85, region.latitude + latitudeRadius);
  const south = Math.max(-85, region.latitude - latitudeRadius);
  const east = Math.min(179, region.longitude + longitudeRadius);
  const west = Math.max(-179, region.longitude - longitudeRadius);
  return [
    { latitude: north, longitude: west },
    { latitude: north, longitude: east },
    { latitude: south, longitude: east },
    { latitude: south, longitude: west },
    { latitude: north, longitude: west },
  ];
}

function recorderLabel(status: ReturnType<typeof useExploreRecorder>['status']): string {
  switch (status) {
    case 'requesting-permission':
      return 'Asking for location…';
    case 'locating':
      return 'Finding your path…';
    case 'recording':
      return 'Exploring now';
    case 'permission-denied':
      return 'Location is off';
    case 'unavailable':
      return 'Location unavailable';
    default:
      return 'Private until you start';
  }
}

export function ExploreMapScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);
  const { openMenu } = useCapabilityShell();
  const authIdentity = useAppStore((state) => state.authIdentity);
  const sessions = useExploreStore((state) => state.sessions);
  const activeSession = useExploreStore((state) => state.activeSession);
  const exploredCells = useExploreStore((state) => state.exploredCells);
  const places = useExploreStore((state) => state.places);
  const placeRelationships = useExploreStore((state) => state.placeRelationships);
  const preferences = useExploreStore((state) => state.preferences);
  const updatePreferences = useExploreStore((state) => state.updatePreferences);
  const addPlaceVisit = useExploreStore((state) => state.addPlaceVisit);
  const clearHistory = useExploreStore((state) => state.clearHistory);
  const loadPreviewAdventure = useExploreStore((state) => state.loadPreviewAdventure);
  const recorder = useExploreRecorder();
  const [layersVisible, setLayersVisible] = useState(false);
  const [collectingPlace, setCollectingPlace] = useState(false);
  const [placeName, setPlaceName] = useState('');

  const points = useMemo(() => pointsInDisplayOrder(sessions, activeSession), [activeSession, sessions]);
  const latestPoint = points[points.length - 1] ?? null;
  const [visibleRegion, setVisibleRegion] = useState<Region>(() =>
    latestPoint ? regionAround(latestPoint) : DEFAULT_REGION,
  );
  const altitudeSegments = useMemo(() => buildAltitudeSegments(points), [points]);
  const fogRing = useMemo(() => fogRingForRegion(visibleRegion), [visibleRegion]);
  const fogHoles = useMemo(() => {
    const latitudeRadius = visibleRegion.latitudeDelta * 1.3;
    const longitudeRadius = visibleRegion.longitudeDelta * 1.3;
    return Object.values(exploredCells)
      .filter((cell) =>
        Math.abs(cell.center.latitude - visibleRegion.latitude) <= latitudeRadius &&
        Math.abs(cell.center.longitude - visibleRegion.longitude) <= longitudeRadius,
      )
      .slice(-700)
      .map((cell) => buildFogHole(cell.center));
  }, [exploredCells, visibleRegion]);
  const savedPlaces = useMemo(() => {
    const visitedIds = new Set(Object.values(placeRelationships).map((relationship) => relationship.placeId));
    return Object.values(places).filter((place) => visitedIds.has(place.id));
  }, [placeRelationships, places]);

  useEffect(() => {
    if (!latestPoint) return;
    mapRef.current?.animateToRegion(regionAround(latestPoint), 450);
  }, [latestPoint]);

  const collectCurrentPlace = () => {
    const name = placeName.trim();
    if (!latestPoint || !name) return;
    const place: Place = {
      id: `user:${latestPoint.latitude.toFixed(5)}:${latestPoint.longitude.toFixed(5)}:${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      name,
      kind: 'place',
      latitude: latestPoint.latitude,
      longitude: latestPoint.longitude,
      source: 'user',
    };
    addPlaceVisit({
      place,
      userId: authIdentity?.userId?.trim() || 'local-user',
      visitedAt: latestPoint.recordedAt,
    });
    setPlaceName('');
    setCollectingPlace(false);
  };

  const confirmClear = () => {
    Alert.alert(
      'Clear Explore history?',
      'This removes local adventures, explored territory, and collected Place visits from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear history', style: 'destructive', onPress: clearHistory },
      ],
    );
  };

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        testID="explore.map"
        style={StyleSheet.absoluteFill}
        mapType="standard"
        initialRegion={latestPoint ? regionAround(latestPoint) : DEFAULT_REGION}
        showsUserLocation={recorder.status === 'recording'}
        showsMyLocationButton={false}
        rotateEnabled={false}
        pitchEnabled={false}
        onRegionChangeComplete={setVisibleRegion}
      >
        <Polygon
          coordinates={fogRing}
          holes={fogHoles}
          fillColor="rgba(18, 25, 22, 0.78)"
          strokeColor="rgba(18, 25, 22, 0)"
          strokeWidth={0}
        />
        {preferences.showMyPath
          ? altitudeSegments.map((segment, index) => (
              <Polyline
                key={`altitude-segment-${index}`}
                coordinates={segment.coordinates}
                strokeColor={segment.color}
                strokeWidth={5}
                lineCap="round"
                lineJoin="round"
              />
            ))
          : null}
        {savedPlaces.map((place) => (
          <Marker
            key={place.id}
            coordinate={place}
            title={place.name}
            description="Collected Place"
            pinColor={colors.turmeric600}
          />
        ))}
      </MapView>

      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open navigation menu"
          onPress={openMenu}
          style={({ pressed }) => [styles.roundButton, pressed ? styles.pressed : null]}
        >
          <Icon name="menu" size={20} color={colors.sumi900} />
        </Pressable>
        <View style={styles.titlePill}>
          <Text style={styles.title}>Explore</Text>
          <Text style={styles.status}>{recorderLabel(recorder.status)}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Explore layers and privacy"
          onPress={() => setLayersVisible(true)}
          style={({ pressed }) => [styles.roundButton, pressed ? styles.pressed : null]}
        >
          <Icon name="layers" size={20} color={colors.sumi900} />
        </Pressable>
      </View>

      {points.length === 0 ? (
        <View pointerEvents="none" style={styles.emptyCard}>
          <Icon name="map" size={22} color={colors.pine700} />
          <Text style={styles.emptyTitle}>The world is still waiting.</Text>
          <Text style={styles.emptyCopy}>Start exploring to clear a 100-foot path through the fog.</Text>
        </View>
      ) : null}

      <View style={[styles.actionDock, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        {recorder.message ? <Text style={styles.message}>{recorder.message}</Text> : null}
        <Button
          testID="explore.recording.toggle"
          accessibilityLabel={recorder.active ? 'Stop exploring' : 'Start exploring'}
          variant={recorder.active ? 'inverse' : 'primary'}
          size="lg"
          disabled={recorder.status === 'requesting-permission' || recorder.status === 'locating'}
          onPress={recorder.active ? recorder.stop : recorder.start}
          style={styles.primaryAction}
        >
          {recorder.active ? 'Stop' : recorder.status === 'locating' ? 'Finding you…' : 'Start Exploring'}
        </Button>
      </View>

      <BottomDrawer visible={layersVisible} onClose={() => setLayersVisible(false)} snapPoints={['78%']}>
        <BottomDrawerScrollView contentContainerStyle={[styles.drawerContent, { paddingBottom: insets.bottom + spacing.xl }]} keyboardShouldPersistTaps="handled">
          <BottomDrawerHeader title="Explore" variant="minimal" />

          <Text style={styles.sectionLabel}>ON THIS MAP</Text>
          <SettingRow
            label="My path"
            detail="Your exact altitude-colored trail"
            value={preferences.showMyPath}
            onValueChange={(showMyPath) => updatePreferences({ showMyPath })}
          />
          <SettingRow
            label="Family territory"
            detail="Areas contributed by opted-in family members"
            value={preferences.showFamilyTerritory}
            onValueChange={(showFamilyTerritory) => updatePreferences({ showFamilyTerritory })}
          />
          {preferences.showFamilyTerritory ? (
            <Text style={styles.familyNote}>No family exploration has been synced. Nothing is shared from this build.</Text>
          ) : null}

          <Text style={styles.sectionLabel}>WHAT I SHARE</Text>
          <View style={styles.sharingGrid}>
            {SHARING_OPTIONS.map((option) => {
              const selected = preferences.sharing === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityLabel={`Share ${option.label}`}
                  accessibilityState={{ selected }}
                  onPress={() => updatePreferences({ sharing: option.value })}
                  style={({ pressed }) => [
                    styles.sharingOption,
                    selected ? styles.sharingOptionSelected : null,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <Text style={[styles.sharingLabel, selected ? styles.sharingLabelSelected : null]}>{option.label}</Text>
                  <Text style={styles.sharingDetail}>{option.detail}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.familyNote}>Your choice is saved locally. Family delivery is not enabled yet.</Text>

          <Text style={styles.sectionLabel}>PLACES</Text>
          {savedPlaces.length ? savedPlaces.map((place) => (
            <View key={place.id} style={styles.placeRow}>
              <Icon name="pin" size={17} color={colors.pine700} />
              <Text style={styles.placeName}>{place.name}</Text>
            </View>
          )) : <Text style={styles.familyNote}>Places you confirm here will remain part of the same Places system.</Text>}
          {collectingPlace ? (
            <View style={styles.collectForm}>
              <TextInput
                accessibilityLabel="Place name"
                autoFocus
                value={placeName}
                onChangeText={setPlaceName}
                placeholder="Park, trail, overlook…"
                placeholderTextColor={colors.textSecondary}
                style={styles.placeInput}
              />
              <View style={styles.collectActions}>
                <Button variant="ghost" size="sm" onPress={() => setCollectingPlace(false)}>Cancel</Button>
                <Button size="sm" disabled={!placeName.trim() || !latestPoint} onPress={collectCurrentPlace}>Collect Place</Button>
              </View>
            </View>
          ) : (
            <Button variant="secondary" size="sm" disabled={!latestPoint} onPress={() => setCollectingPlace(true)}>
              Collect current Place
            </Button>
          )}

          {__DEV__ ? (
            <Button variant="secondary" size="sm" onPress={loadPreviewAdventure}>Load preview walk</Button>
          ) : null}
          {points.length || savedPlaces.length ? (
            <Button variant="destructive" size="sm" onPress={confirmClear}>Clear Explore history</Button>
          ) : null}
        </BottomDrawerScrollView>
      </BottomDrawer>
    </View>
  );
}

function SettingRow({
  label,
  detail,
  value,
  onValueChange,
}: {
  label: string;
  detail: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingCopy}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingDetail}>{detail}</Text>
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.gray300, true: colors.pine300 }}
        thumbColor={value ? colors.pine800 : colors.gray50}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.sumi900 },
  header: {
    position: 'absolute',
    top: 0,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(250,249,245,0.94)',
    shadowColor: colors.sumi900,
    shadowOpacity: 0.16,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  titlePill: {
    flex: 1,
    maxWidth: 220,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(250,249,245,0.94)',
  },
  title: { ...typography.body, fontFamily: fonts.medium, color: colors.sumi900 },
  status: { ...typography.bodyXs, color: colors.textSecondary, marginTop: 1 },
  emptyCard: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    top: '42%',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: 18,
    backgroundColor: 'rgba(250,249,245,0.94)',
  },
  emptyTitle: { ...typography.body, fontFamily: fonts.medium, color: colors.sumi900, marginTop: spacing.sm },
  emptyCopy: { ...typography.bodySm, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs },
  actionDock: { position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: 0 },
  primaryAction: { width: '100%', shadowColor: colors.sumi900, shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  message: { ...typography.bodyXs, color: colors.gray50, textAlign: 'center', marginBottom: spacing.sm, textShadowColor: colors.sumi900, textShadowRadius: 4 },
  drawerContent: { paddingHorizontal: spacing.lg, gap: spacing.md },
  sectionLabel: { ...typography.label, color: colors.textSecondary, marginTop: spacing.sm },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, minHeight: 58 },
  settingCopy: { flex: 1 },
  settingLabel: { ...typography.bodySm, fontFamily: fonts.medium, color: colors.textPrimary },
  settingDetail: { ...typography.bodyXs, color: colors.textSecondary, marginTop: 2 },
  familyNote: { ...typography.bodyXs, color: colors.textSecondary, lineHeight: 18 },
  sharingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sharingOption: { width: '48%', padding: spacing.md, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  sharingOptionSelected: { borderColor: colors.pine700, backgroundColor: colors.pine50 },
  sharingLabel: { ...typography.bodySm, fontFamily: fonts.medium, color: colors.textPrimary },
  sharingLabelSelected: { color: colors.pine900 },
  sharingDetail: { ...typography.bodyXs, color: colors.textSecondary, marginTop: 2 },
  placeRow: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  placeName: { ...typography.bodySm, color: colors.textPrimary },
  collectForm: { gap: spacing.sm },
  placeInput: { minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.fieldFill, color: colors.textPrimary, paddingHorizontal: spacing.md, ...typography.bodySm },
  collectActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
});
