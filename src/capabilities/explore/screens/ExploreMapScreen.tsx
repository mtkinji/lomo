import { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import MapView, { Marker, Polygon, Polyline, type Region } from 'react-native-maps';
import { useCapabilityShell } from '../../../navigation/CapabilityShellContext';
import type { RootDrawerParamList } from '../../../navigation/RootNavigator';
import { useAppStore } from '../../../store/useAppStore';
import { colors, fonts, spacing, typography } from '../../../theme';
import { floatingControl } from '../../../theme/overlays';
import { BottomDrawer, BottomDrawerScrollView } from '../../../ui/BottomDrawer';
import { BottomGuide } from '../../../ui/BottomGuide';
import { Button } from '../../../ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../ui/DropdownMenu';
import { Icon } from '../../../ui/Icon';
import { KwiltSwitch } from '../../../ui/KwiltSwitch';
import { SegmentedControl } from '../../../ui/SegmentedControl';
import { BottomDrawerHeader } from '../../../ui/layout/BottomDrawerHeader';
import { HeaderActionPill, ObjectPageHeader } from '../../../ui/layout/ObjectPageHeader';
import { MenuToggleIcon } from '../../../ui/layout/PageHeader';
import {
  RESTING_COMPOSER_HEIGHT_PX,
  RESTING_COMPOSER_HORIZONTAL_INSET_PX,
} from '../../../ui/layout/restingComposerMetrics';
import { Text } from '../../../ui/Typography';
import { buildAltitudeSegments } from '../domain/exploreElevation';
import {
  buildFogHole,
  EXPLORE_FEATHER_REFERENCE_RADIUS_M,
  EXPLORE_REVEAL_RADIUS_M,
  isCoordinateExplored,
} from '../domain/exploreGeometry';
import { pendingExploreRecap } from '../domain/exploreRecap';
import type { ExplorePoint, ExplorePreferences, Place } from '../domain/types';
import type { ExploreStackParamList } from '../navigation/types';
import { useExploreRecorder } from '../runtime/useExploreRecorder';
import { useExploreRecapResolver } from '../runtime/useExploreRecapResolver';
import { useExploreStore } from '../runtime/useExploreStore';

const DEFAULT_REGION: Region = {
  latitude: 39.5,
  longitude: -98.35,
  latitudeDelta: 42,
  longitudeDelta: 42,
};

function pointGroupsInDisplayOrder(
  sessions: ReturnType<typeof useExploreStore.getState>['sessions'],
  active: ReturnType<typeof useExploreStore.getState>['activeSession'],
): ExplorePoint[][] {
  const completed = [...sessions].reverse().map((session) => session.points);
  return active ? [...completed, active.points] : completed;
}

function regionAround(
  point: Pick<ExplorePoint, 'latitude' | 'longitude'>,
  verticalOffsetRatio = 0,
): Region {
  const latitudeDelta = 0.0045;
  return {
    latitude: point.latitude - latitudeDelta * verticalOffsetRatio,
    longitude: point.longitude,
    latitudeDelta,
    longitudeDelta: 0.0045,
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

export function ExploreMapScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);
  const navigation = useNavigation<NavigationProp<ExploreStackParamList>>();
  const { openMenu } = useCapabilityShell();
  const authIdentity = useAppStore((state) => state.authIdentity);
  const localUserId = authIdentity?.userId?.trim() || 'local-user';
  const sessions = useExploreStore((state) => state.sessions);
  const activeSession = useExploreStore((state) => state.activeSession);
  const exploredCells = useExploreStore((state) => state.exploredCells);
  const places = useExploreStore((state) => state.places);
  const placeRelationships = useExploreStore((state) => state.placeRelationships);
  const preferences = useExploreStore((state) => state.preferences);
  const updatePreferences = useExploreStore((state) => state.updatePreferences);
  const addPlaceVisit = useExploreStore((state) => state.addPlaceVisit);
  const markRecapsSeen = useExploreStore((state) => state.markRecapsSeen);
  const removeDiscoveredPlaceFromRecaps = useExploreStore((state) => state.removeDiscoveredPlaceFromRecaps);
  const recorder = useExploreRecorder();
  useExploreRecapResolver(localUserId);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [collectingPlace, setCollectingPlace] = useState(false);
  const [placeName, setPlaceName] = useState('');
  const [reduceMotion, setReduceMotion] = useState(false);

  const pointGroups = useMemo(
    () => pointGroupsInDisplayOrder(sessions, activeSession),
    [activeSession, sessions],
  );
  const points = useMemo(() => pointGroups.flat(), [pointGroups]);
  const latestPoint = points[points.length - 1] ?? null;
  const [visibleRegion, setVisibleRegion] = useState<Region>(() =>
    latestPoint ? regionAround(latestPoint) : DEFAULT_REGION,
  );
  const altitudeSegments = useMemo(
    () => pointGroups.flatMap((group) => buildAltitudeSegments(group)),
    [pointGroups],
  );
  const visibleCells = useMemo(() => {
    const latitudeRadius = visibleRegion.latitudeDelta * 1.3;
    const longitudeRadius = visibleRegion.longitudeDelta * 1.3;
    return Object.values(exploredCells)
      .filter((cell) =>
        Math.abs(cell.center.latitude - visibleRegion.latitude) <= latitudeRadius &&
        Math.abs(cell.center.longitude - visibleRegion.longitude) <= longitudeRadius,
      )
      .slice(-700);
  }, [exploredCells, visibleRegion]);
  const fogRing = useMemo(() => fogRingForRegion(visibleRegion), [visibleRegion]);
  const fogHoles = useMemo(() => {
    return {
      core: visibleCells.map((cell) => buildFogHole(cell.center, EXPLORE_REVEAL_RADIUS_M + 68)),
      mist: visibleCells.map((cell) => buildFogHole(cell.center, EXPLORE_REVEAL_RADIUS_M + 30)),
      veil: visibleCells.map((cell) => buildFogHole(cell.center, EXPLORE_REVEAL_RADIUS_M)),
    };
  }, [visibleCells]);
  const metalFogMapProps = useMemo(() => Platform.OS === 'ios' ? ({
      fogEnabled: preferences.showFog,
      fogCoordinates: preferences.showFog ? visibleCells.map((cell) => cell.center) : [],
      fogClearRadiusMeters: EXPLORE_REVEAL_RADIUS_M,
      fogFeatherReferenceRadiusMeters: EXPLORE_FEATHER_REFERENCE_RADIUS_M,
    } as unknown as ComponentProps<typeof MapView>) : {}, [preferences.showFog, visibleCells]);
  const exploredCellValues = useMemo(() => Object.values(exploredCells), [exploredCells]);
  const savedPlaces = useMemo(() => {
    const visitedIds = new Set(Object.values(placeRelationships).map((relationship) => relationship.placeId));
    return Object.values(places).filter((place) => visitedIds.has(place.id));
  }, [placeRelationships, places]);
  const mapPlaces = useMemo(
    () => preferences.showPlaces
      ? savedPlaces.filter((place) => isCoordinateExplored(place, exploredCellValues))
      : [],
    [exploredCellValues, preferences.showPlaces, savedPlaces],
  );
  const filteredPlaces = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    if (!query) return savedPlaces;
    return savedPlaces.filter((place) => place.name.toLocaleLowerCase().includes(query));
  }, [savedPlaces, searchQuery]);
  const recap = useMemo(() => pendingExploreRecap({
    sessions,
    places,
  }), [places, sessions]);
  const resolvingSession = sessions.find((session) => session.recapStatus === 'resolving') ?? null;
  const needsOnboarding = !preferences.onboardingCompleted;
  const hasFirstClearing = points.length > 0;
  const showWelcome = needsOnboarding && !hasFirstClearing;
  const awaitingOnboardingChoice = needsOnboarding && hasFirstClearing;
  const showFirstPlaceGuide = preferences.onboardingCompleted &&
    hasFirstClearing &&
    !preferences.firstPlaceGuideDismissed &&
    savedPlaces.length === 0 &&
    !collectingPlace &&
    !searchVisible &&
    !recap &&
    !resolvingSession;
  const controlsProgress = useRef(new Animated.Value(needsOnboarding ? 0 : 1)).current;

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted && enabled) setReduceMotion(true);
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (needsOnboarding) {
      controlsProgress.setValue(0);
      return;
    }
    Animated.timing(controlsProgress, {
      toValue: 1,
      duration: reduceMotion ? 0 : 320,
      useNativeDriver: true,
    }).start();
  }, [controlsProgress, needsOnboarding, reduceMotion]);

  useEffect(() => {
    if (!latestPoint) return;
    mapRef.current?.animateToRegion(regionAround(latestPoint, needsOnboarding ? 0.18 : 0), 450);
  }, [latestPoint, needsOnboarding]);

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
      userId: localUserId,
      visitedAt: latestPoint.recordedAt,
    });
    setPlaceName('');
    setCollectingPlace(false);
  };

  const dismissFirstPlaceGuide = () => {
    updatePreferences({ firstPlaceGuideDismissed: true });
  };

  const openPlaceNaming = () => {
    dismissFirstPlaceGuide();
    setCollectingPlace(true);
  };

  const closePlaceNaming = () => {
    setPlaceName('');
    setCollectingPlace(false);
  };

  const centerMap = (coordinate: Pick<ExplorePoint, 'latitude' | 'longitude'>) => {
    mapRef.current?.animateToRegion(regionAround(coordinate), 450);
  };

  const centerOnCurrentLocation = async () => {
    const coordinate = await recorder.locate();
    if (coordinate) centerMap(coordinate);
  };

  const showPlaceOnMap = (place: Place) => {
    setSearchVisible(false);
    setSearchQuery('');
    centerMap(place);
  };

  const finishOnboarding = async (mode: ExplorePreferences['recording']) => {
    const changed = await recorder.setRecordingMode(mode);
    if (!changed) return;
    updatePreferences({ onboardingCompleted: true });
  };

  const openExploreSettings = () => {
    navigation.getParent<NavigationProp<RootDrawerParamList>>()?.navigate('Settings', {
      screen: 'SettingsExplore',
      params: { entrySurface: 'explore-map' },
    });
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <MapView
        ref={mapRef}
        testID="explore.map"
        style={StyleSheet.absoluteFill}
        mapType={preferences.mapStyle}
        initialRegion={latestPoint ? regionAround(latestPoint, needsOnboarding ? 0.18 : 0) : DEFAULT_REGION}
        showsUserLocation={recorder.status === 'recording'}
        showsMyLocationButton={false}
        rotateEnabled={false}
        pitchEnabled={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        {...metalFogMapProps}
        onRegionChangeComplete={setVisibleRegion}
      >
        {Platform.OS !== 'ios' && preferences.showFog ? <>
        <Polygon
          testID="explore.fog.veil"
          accessible={false}
          zIndex={1000}
          coordinates={fogRing}
          holes={fogHoles.veil}
          fillColor="rgba(232, 237, 233, 0.35)"
          strokeColor="rgba(18, 25, 22, 0)"
          strokeWidth={0}
        />
        <Polygon
          testID="explore.fog.mist"
          accessible={false}
          zIndex={1000}
          coordinates={fogRing}
          holes={fogHoles.mist}
          fillColor="rgba(208, 216, 211, 0.62)"
          strokeColor="rgba(18, 25, 22, 0)"
          strokeWidth={0}
        />
        <Polygon
          testID="explore.fog.core"
          accessible={false}
          zIndex={1000}
          coordinates={fogRing}
          holes={fogHoles.core}
          fillColor="#D8DEDA"
          strokeColor="rgba(18, 25, 22, 0)"
          strokeWidth={0}
        />
        </> : null}
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
        {mapPlaces.map((place) => (
          <Marker
            key={place.id}
            coordinate={place}
            title={place.name}
            description="Collected Place"
            pinColor={colors.turmeric600}
          />
        ))}
      </MapView>

      {!needsOnboarding ? (
        <Animated.View
          testID="explore.topControls"
          pointerEvents="box-none"
          style={{
            ...StyleSheet.absoluteFillObject,
            opacity: controlsProgress,
            transform: [{
              translateY: controlsProgress.interpolate({ inputRange: [0, 1], outputRange: [-28, 0] }),
            }],
          }}
        >
          <ObjectPageHeader
            barHeight={56}
            showFullWidthBackground={false}
            horizontalPadding={spacing.lg}
            left={
              <HeaderActionPill
                accessibilityLabel="Open navigation menu"
                materialVariant="floatingWhite"
                size={44}
                onPress={openMenu}
              >
                <MenuToggleIcon open={false} />
              </HeaderActionPill>
            }
            right={
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Explore options"
                    style={({ pressed }) => [styles.mapMenuButton, pressed ? styles.pressed : null]}
                  >
                    <BlurView
                      pointerEvents="none"
                      intensity={floatingControl.material.intensity}
                      tint={floatingControl.material.tint}
                      style={StyleSheet.absoluteFillObject}
                    >
                      <View pointerEvents="none" style={styles.floatingControlTint} />
                    </BlurView>
                    <Icon testID="explore.actions.icon" name="more" size={22} color={colors.textPrimary} />
                  </Pressable>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="bottom" sideOffset={6}>
                  <DropdownMenuLabel>Map style</DropdownMenuLabel>
                  <SegmentedControl
                    value={preferences.mapStyle}
                    onChange={(mapStyle) => updatePreferences({ mapStyle })}
                    options={[
                      { value: 'standard', label: 'Standard' },
                      { value: 'hybrid', label: 'Hybrid' },
                      { value: 'satellite', label: 'Satellite' },
                    ]}
                    size="compact"
                    style={styles.mapStyleControl}
                    testIDPrefix="explore.mapStyle"
                  />
                  <DropdownMenuSeparator />
                  <MapToggleMenuItem
                    label="Places"
                    selected={preferences.showPlaces}
                    onPress={() => updatePreferences({ showPlaces: !preferences.showPlaces })}
                  />
                  <MapToggleMenuItem
                    label="Fog"
                    selected={preferences.showFog}
                    onPress={() => updatePreferences({ showFog: !preferences.showFog })}
                  />
                  <MapToggleMenuItem
                    label="My path"
                    selected={preferences.showMyPath}
                    onPress={() => updatePreferences({ showMyPath: !preferences.showMyPath })}
                  />
                  <MapToggleMenuItem
                    label="Family territory"
                    selected={preferences.showFamilyTerritory}
                    onPress={() => updatePreferences({ showFamilyTerritory: !preferences.showFamilyTerritory })}
                  />
                  <DropdownMenuSeparator />
                  <DropdownMenuItem accessibilityLabel="Explore settings" onPress={openExploreSettings}>
                    <Icon name="settings" size={18} color={colors.textPrimary} />
                    <Text style={styles.mapMenuLabel}>Explore Settings</Text>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            }
          />
        </Animated.View>
      ) : null}

      {showWelcome ? (
        <View
          testID="explore.onboarding.introduction"
          accessibilityViewIsModal
          style={[
            styles.onboardingStage,
            { paddingTop: insets.top + 92, paddingBottom: insets.bottom + 52 },
          ]}
        >
          <View style={styles.onboardingWelcomeCopy}>
            <Text style={styles.onboardingWelcomeTitle}>See where you’ve been. Explore where you haven’t.</Text>
            <Text style={styles.onboardingWelcomeBody}>Build a private history of the places and paths you travel.</Text>
          </View>
          <View style={styles.onboardingWelcomeAction}>
            {recorder.message ? <Text style={styles.message}>{recorder.message}</Text> : null}
            <Button
              testID="explore.recording.toggle"
              accessibilityLabel="Begin exploring"
              variant="primary"
              size="lg"
              disabled={recorder.status === 'requesting-permission' || recorder.status === 'locating'}
              onPress={recorder.beginOnboarding}
              style={styles.primaryAction}
            >
              {recorder.status === 'locating' ? 'Finding you…' : 'Begin Exploring'}
            </Button>
          </View>
        </View>
      ) : preferences.onboardingCompleted && points.length === 0 ? (
        <View pointerEvents="none" style={styles.emptyCard}>
          <Icon name="map" size={22} color={colors.pine700} />
          <Text style={styles.emptyTitle}>The world is still waiting.</Text>
          <Text style={styles.emptyCopy}>
            {preferences.recording === 'automatic'
              ? 'Your map stays private. Move through the world to clear a path through the fog.'
              : 'Your map stays private. Start exploring to clear a path through the fog.'}
          </Text>
        </View>
      ) : null}

      {!needsOnboarding ? <Animated.View
        testID="explore.actionDock"
        style={[
          styles.actionDock,
          {
            paddingBottom: insets.bottom,
            opacity: controlsProgress,
            transform: [{
              translateY: controlsProgress.interpolate({ inputRange: [0, 1], outputRange: [32, 0] }),
            }],
          },
        ]}
      >
        {recorder.message ? <Text style={styles.message}>{recorder.message}</Text> : null}
        {preferences.recording === 'manual' ? <Button
          testID="explore.recording.toggle"
          accessibilityLabel={recorder.active ? 'Stop exploring' : 'Start exploring'}
          variant={recorder.active ? 'inverse' : 'primary'}
          size="lg"
          disabled={recorder.status === 'requesting-permission' || recorder.status === 'locating'}
          onPress={recorder.active ? recorder.stop : recorder.start}
          style={styles.primaryAction}
        >
          {recorder.active ? 'Stop' : recorder.status === 'locating' ? 'Finding you…' : 'Start Exploring'}
        </Button> : null}
        <View style={styles.hereControlsAnchor}>
          <View testID="explore.hereControls" style={styles.hereControls}>
            <BlurView
              pointerEvents="none"
              intensity={floatingControl.material.intensity}
              tint={floatingControl.material.tint}
              style={StyleSheet.absoluteFillObject}
            />
            <View pointerEvents="none" style={styles.floatingControlTint} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Name current Place"
              accessibilityState={{ disabled: !latestPoint }}
              disabled={!latestPoint}
              onPress={openPlaceNaming}
              style={({ pressed }) => [
                styles.hereControlButton,
                !latestPoint ? styles.controlDisabled : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <Icon name="pin" size={22} color={colors.pine700} />
              <View pointerEvents="none" style={styles.pinPlusBadge}>
                <Icon name="plus" size={10} color={colors.pine800} />
              </View>
            </Pressable>
            <View style={styles.hereControlDivider} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Center on current location"
              accessibilityState={{ disabled: recorder.status === 'locating' }}
              disabled={recorder.status === 'locating'}
              onPress={() => { void centerOnCurrentLocation(); }}
              style={({ pressed }) => [styles.hereControlButton, pressed ? styles.pressed : null]}
            >
              <Icon name="navigation" size={22} color={colors.pine700} />
            </Pressable>
          </View>
        </View>
        <View testID="explore.mapToolsRow" style={styles.mapToolsRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search visited Places"
            onPress={() => setSearchVisible(true)}
            style={({ pressed }) => [styles.placeSearchControl, pressed ? styles.pressed : null]}
          >
            <BlurView
              pointerEvents="none"
              intensity={floatingControl.material.intensity}
              tint={floatingControl.material.tint}
              style={StyleSheet.absoluteFillObject}
            />
            <View pointerEvents="none" style={styles.floatingControlTint} />
            <Icon name="search" size={20} color={colors.textPrimary} />
            <Text numberOfLines={1} style={styles.placeSearchLabel}>
              {savedPlaces.length ? 'Search visited Places' : 'Visited Places'}
            </Text>
          </Pressable>
        </View>
      </Animated.View> : null}

      <BottomGuide
        visible={showFirstPlaceGuide}
        onClose={dismissFirstPlaceGuide}
        scrim="none"
        dynamicSizing
      >
        <View style={styles.firstPlaceGuideContent}>
          <View style={styles.firstPlaceGuideCopy}>
            <Text style={styles.firstPlaceGuideTitle}>Start with this Place</Text>
            <Text style={styles.firstPlaceGuideBody}>
              Give this clearing a name—Home, a park, anywhere worth finding again. Use ••• to show or hide map layers.
            </Text>
          </View>
          <View style={styles.firstPlaceGuideActions}>
            <Button variant="ghost" size="sm" onPress={dismissFirstPlaceGuide}>Not now</Button>
            <Button size="sm" onPress={openPlaceNaming}>Name this Place</Button>
          </View>
        </View>
      </BottomGuide>

      <BottomDrawer
        visible={awaitingOnboardingChoice}
        onClose={() => undefined}
        dismissable={false}
        snapPoints={['43%']}
      >
        <BottomDrawerScrollView
          contentContainerStyle={[styles.onboardingContent, { paddingBottom: insets.bottom + spacing.xl }]}
        >
          <BottomDrawerHeader title="How should Explore remember your travels?" variant="minimal" />
          {recorder.message ? <Text style={styles.onboardingMessage}>{recorder.message}</Text> : null}
          <RecordingModeOption
            label="Explore automatically"
            detail="Recommended · Works while the app is closed"
            selected={false}
            onPress={() => { void finishOnboarding('automatic'); }}
          />
          <RecordingModeOption
            label="Only when I start"
            detail="Only records outings you begin"
            selected={false}
            onPress={() => { void finishOnboarding('manual'); }}
          />
          <Text style={styles.familyNote}>Private until you choose to share.</Text>
        </BottomDrawerScrollView>
      </BottomDrawer>

      <BottomDrawer visible={searchVisible} onClose={() => setSearchVisible(false)} snapPoints={['48%']}>
        <BottomDrawerScrollView
          contentContainerStyle={[styles.searchDrawerContent, { paddingBottom: insets.bottom + spacing.xl }]}
          keyboardShouldPersistTaps="handled"
        >
          <BottomDrawerHeader title="Visited Places" variant="minimal" />
          <View style={styles.placeSearchField}>
            <Icon name="search" size={19} color={colors.textSecondary} />
            <TextInput
              accessibilityLabel="Search Places"
              autoFocus
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search places you’ve visited"
              placeholderTextColor={colors.textSecondary}
              returnKeyType="search"
              style={styles.placeSearchInput}
            />
          </View>
          {filteredPlaces.length ? (
            <View style={styles.searchResults}>
              {filteredPlaces.map((place) => (
                <Pressable
                  key={place.id}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${place.name} on map`}
                  onPress={() => showPlaceOnMap(place)}
                  style={({ pressed }) => [styles.searchResultRow, pressed ? styles.pressed : null]}
                >
                  <View style={styles.searchResultIcon}>
                    <Icon name="pin" size={18} color={colors.pine700} />
                  </View>
                  <Text style={styles.searchResultName}>{place.name}</Text>
                  <Icon name="chevronRight" size={18} color={colors.textSecondary} />
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={styles.searchEmpty}>
              {savedPlaces.length ? 'No visited Places match that search.' : 'Places will appear here after you discover or collect them.'}
            </Text>
          )}
        </BottomDrawerScrollView>
      </BottomDrawer>

      <BottomDrawer visible={collectingPlace} onClose={closePlaceNaming} snapPoints={['34%']}>
        <BottomDrawerScrollView
          contentContainerStyle={[styles.placeNamingContent, { paddingBottom: insets.bottom + spacing.xl }]}
          keyboardShouldPersistTaps="handled"
        >
          <BottomDrawerHeader title="Name this Place" variant="minimal" />
          <TextInput
            accessibilityLabel="Place name"
            autoFocus
            value={placeName}
            onChangeText={setPlaceName}
            placeholder="Home, park, trail…"
            placeholderTextColor={colors.textSecondary}
            returnKeyType="done"
            onSubmitEditing={collectCurrentPlace}
            style={styles.placeInput}
          />
          <View style={styles.collectActions}>
            <Button variant="ghost" size="sm" onPress={closePlaceNaming}>Cancel</Button>
            <Button size="sm" disabled={!placeName.trim() || !latestPoint} onPress={collectCurrentPlace}>Save Place</Button>
          </View>
        </BottomDrawerScrollView>
      </BottomDrawer>

      <BottomDrawer
        visible={Boolean(recap)}
        onClose={() => recap && markRecapsSeen(recap.sessionIds)}
        snapPoints={['58%']}
      >
        {recap ? (
          <BottomDrawerScrollView
            contentContainerStyle={[styles.recapContent, { paddingBottom: insets.bottom + spacing.lg }]}
          >
            <BottomDrawerHeader title="Exploration Recap" variant="minimal" />
            <View style={styles.recapHero}>
              <View style={styles.recapIcon}>
                <Icon name="map" size={24} color={colors.pine800} />
              </View>
              <Text style={styles.recapTitle}>
                {recap.places.length
                  ? `You uncovered ${recap.places.length} new ${recap.places.length === 1 ? 'Place' : 'Places'}.`
                  : 'Your path is part of the map.'}
              </Text>
              <Text style={styles.recapDetail}>
                {recap.pointCount} route points · {formatRecapDuration(recap.startedAt, recap.endedAt)}
              </Text>
            </View>
            {recap.places.length ? (
              <View style={styles.recapPlaces}>
                {recap.places.map((place, index) => (
                  <View key={place.id} style={styles.recapPlaceRow}>
                    <View style={styles.recapPlaceNumber}><Text style={styles.recapPlaceNumberText}>{index + 1}</Text></View>
                    <Text style={styles.recapPlaceName}>{place.name}</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${place.name} from this recap`}
                      hitSlop={8}
                      onPress={() => removeDiscoveredPlaceFromRecaps(recap.sessionIds, place.id, localUserId)}
                      style={({ pressed }) => pressed ? styles.pressed : null}
                    >
                      <Icon name="close" size={18} color={colors.textSecondary} />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.recapEmpty}>No confidently named Place was found, so Kwilt kept the route without guessing.</Text>
            )}
            <Button testID="explore.recap.done" size="lg" onPress={() => markRecapsSeen(recap.sessionIds)}>Done</Button>
          </BottomDrawerScrollView>
        ) : null}
      </BottomDrawer>

      <BottomDrawer visible={Boolean(resolvingSession) && !recap} onClose={() => undefined} snapPoints={['32%']}>
        <View style={[styles.resolvingContent, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.recapIcon}>
            <Icon name="pin" size={24} color={colors.pine800} />
          </View>
          <Text style={styles.recapTitle}>Finishing your recap…</Text>
          <Text style={styles.recapEmpty}>Checking a few points on your route for confidently named Places.</Text>
        </View>
      </BottomDrawer>
    </View>
  );
}

function formatRecapDuration(startedAt: string, endedAt: string): string {
  const minutes = Math.max(1, Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
}

function MapToggleMenuItem({ label, onPress, selected }: {
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <DropdownMenuItem
      accessibilityLabel={label}
      accessibilityRole="switch"
      accessibilityState={{ checked: selected }}
      closeOnPress={false}
      onPress={onPress}
    >
      <Text style={[styles.mapMenuLabel, styles.mapMenuToggleLabel]}>{label}</Text>
      <View pointerEvents="none">
        <KwiltSwitch accessible={false} value={selected} onPress={onPress} />
      </View>
    </DropdownMenuItem>
  );
}

function RecordingModeOption({
  label,
  detail,
  selected,
  onPress,
}: {
  label: string;
  detail: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.recordingMode,
        selected ? styles.recordingModeSelected : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={[styles.recordingDot, selected ? styles.recordingDotSelected : null]} />
      <View style={styles.settingCopy}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingDetail}>{detail}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.sumi900 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  onboardingStage: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
  },
  onboardingWelcomeCopy: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  onboardingWelcomeTitle: {
    ...typography.titleSm,
    color: colors.sumi900,
    textAlign: 'center',
  },
  onboardingWelcomeBody: {
    ...typography.bodySm,
    maxWidth: 310,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  onboardingWelcomeAction: { gap: spacing.sm },
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
  onboardingContent: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  onboardingMessage: { ...typography.bodyXs, color: colors.turmeric800, lineHeight: 18 },
  actionDock: {
    position: 'absolute',
    left: RESTING_COMPOSER_HORIZONTAL_INSET_PX,
    right: RESTING_COMPOSER_HORIZONTAL_INSET_PX,
    bottom: 0,
    gap: spacing.sm,
  },
  mapToolsRow: {
    height: RESTING_COMPOSER_HEIGHT_PX,
    alignItems: 'center',
  },
  hereControlsAnchor: {
    alignItems: 'flex-end',
  },
  hereControls: {
    width: RESTING_COMPOSER_HEIGHT_PX,
    height: RESTING_COMPOSER_HEIGHT_PX * 2,
    borderRadius: RESTING_COMPOSER_HEIGHT_PX / 2,
    overflow: 'hidden',
    alignItems: 'center',
    borderWidth: floatingControl.material.borderWidth,
    borderColor: floatingControl.material.borderColor,
    backgroundColor: floatingControl.material.backgroundColor,
    shadowColor: colors.sumi900,
    shadowOpacity: 0.24,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  hereControlButton: {
    width: RESTING_COMPOSER_HEIGHT_PX,
    height: RESTING_COMPOSER_HEIGHT_PX,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hereControlDivider: {
    width: 28,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  controlDisabled: { opacity: 0.42 },
  pinPlusBadge: {
    position: 'absolute',
    right: 8,
    top: 7,
    width: 15,
    height: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray50,
  },
  placeSearchControl: {
    width: '100%',
    height: RESTING_COMPOSER_HEIGHT_PX,
    borderRadius: RESTING_COMPOSER_HEIGHT_PX / 2,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: floatingControl.material.borderWidth,
    borderColor: floatingControl.material.borderColor,
    backgroundColor: floatingControl.material.backgroundColor,
    shadowColor: colors.sumi900,
    shadowOpacity: 0.24,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  floatingControlTint: { ...StyleSheet.absoluteFillObject, backgroundColor: floatingControl.material.overlayColor },
  placeSearchLabel: { ...typography.bodySm, flex: 1, color: colors.textPrimary },
  mapMenuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: floatingControl.material.borderWidth,
    borderColor: floatingControl.material.borderColor,
    backgroundColor: floatingControl.material.backgroundColor,
    shadowColor: colors.sumi900,
    shadowOpacity: 0.24,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  primaryAction: { width: '100%', shadowColor: colors.sumi900, shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  message: {
    ...typography.bodyXs,
    alignSelf: 'center',
    maxWidth: '92%',
    color: colors.gray50,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 14,
    backgroundColor: 'rgba(20, 25, 22, 0.76)',
  },
  searchDrawerContent: { paddingHorizontal: spacing.lg, gap: spacing.md },
  placeSearchField: {
    minHeight: 48,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.fieldFill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  placeSearchInput: { ...typography.body, flex: 1, color: colors.textPrimary, paddingVertical: spacing.sm },
  searchResults: { gap: spacing.xs },
  searchResultRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  searchResultIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.pine50 },
  searchResultName: { ...typography.body, flex: 1, color: colors.textPrimary },
  searchEmpty: { ...typography.bodySm, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.xl },
  mapMenuLabel: { ...typography.bodySm, color: colors.textPrimary },
  mapStyleControl: {
    alignSelf: 'stretch',
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  mapMenuToggleLabel: { flex: 1 },
  settingCopy: { flex: 1 },
  settingLabel: { ...typography.bodySm, fontFamily: fonts.medium, color: colors.textPrimary },
  settingDetail: { ...typography.bodyXs, color: colors.textSecondary, marginTop: 2 },
  recordingMode: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  recordingModeSelected: { borderColor: colors.pine700, backgroundColor: colors.pine50 },
  recordingDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.gray400 },
  recordingDotSelected: { borderWidth: 5, borderColor: colors.pine700, backgroundColor: colors.gray50 },
  familyNote: { ...typography.bodyXs, color: colors.textSecondary, lineHeight: 18 },
  firstPlaceGuideContent: { gap: spacing.lg, paddingBottom: spacing.lg },
  firstPlaceGuideCopy: { gap: spacing.xs },
  firstPlaceGuideTitle: { ...typography.titleSm, color: colors.textPrimary },
  firstPlaceGuideBody: { ...typography.bodySm, color: colors.textSecondary, lineHeight: 21 },
  firstPlaceGuideActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  placeNamingContent: { paddingHorizontal: spacing.lg, gap: spacing.md },
  placeInput: { minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.fieldFill, color: colors.textPrimary, paddingHorizontal: spacing.md, ...typography.bodySm },
  collectActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  recapContent: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  recapHero: { alignItems: 'center' },
  recapIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.pine50 },
  recapTitle: { ...typography.titleSm, color: colors.textPrimary, textAlign: 'center', marginTop: spacing.md },
  recapDetail: { ...typography.bodySm, color: colors.textSecondary, marginTop: spacing.xs },
  recapPlaces: { gap: spacing.xs },
  recapPlaceRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  recapPlaceNumber: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.turmeric100 },
  recapPlaceNumberText: { ...typography.bodyXs, fontFamily: fonts.medium, color: colors.sumi900 },
  recapPlaceName: { ...typography.body, flex: 1, color: colors.textPrimary },
  recapEmpty: { ...typography.bodySm, color: colors.textSecondary, textAlign: 'center', lineHeight: 21 },
  resolvingContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, alignItems: 'center', gap: spacing.sm },
});
