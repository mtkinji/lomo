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
import { ExploreAdventureRecap } from '../components/ExploreAdventureRecap';
import { buildAltitudeGradients } from '../domain/exploreElevation';
import {
  buildFogHole,
  buildFogRenderGeometry,
  coordinateDistanceM,
  EXPLORE_FEATHER_REFERENCE_RADIUS_M,
  EXPLORE_REVEAL_RADIUS_M,
  isCoordinateExplored,
} from '../domain/exploreGeometry';
import type { ExploreNearbyRadius, ExploreNearbyRecommendation } from '../domain/exploreNearby';
import {
  buildExplorePlaybackFrame,
  explorePlaybackDurationMs,
} from '../domain/explorePlayback';
import { displayPointsForExploreSession } from '../domain/explorePathReconstruction';
import { pendingExploreRecap, type ExploreRecap } from '../domain/exploreRecap';
import type { ExplorePoint, ExplorePreferences, ExploreSession, Place } from '../domain/types';
import type { ExploreStackParamList } from '../navigation/types';
import { useExploreRecorder } from '../runtime/useExploreRecorder';
import { useExploreNearbyPlaces } from '../runtime/useExploreNearbyPlaces';
import { useExploreRecapResolver } from '../runtime/useExploreRecapResolver';
import { useExploreStore } from '../runtime/useExploreStore';
import { reconstructExploreRecordedPath } from '../runtime/explorePathReconstruction';
import { NavigationDiscoveryDot } from '../../../ui/NavigationDiscoveryDot';
import { shouldShowCapabilityMenuDiscoveryDot } from '../../../navigation/capabilityDiscovery';
import { useCapabilityDiscoveryStore } from '../../../store/useCapabilityDiscoveryStore';

const DEFAULT_REGION: Region = {
  latitude: 39.5,
  longitude: -98.35,
  latitudeDelta: 42,
  longitudeDelta: 42,
};

export const EXPLORE_PLACE_REVEAL_RADIUS_M = EXPLORE_REVEAL_RADIUS_M * 3;

type PlacesCollection = 'nearby' | 'my-places';

function pointGroupsInDisplayOrder(
  sessions: ExploreSession[],
  active: ExploreSession | null,
  playback?: { sessionId: string; visiblePointCount: number } | null,
): ExplorePoint[][] {
  const completed = [...sessions].reverse().map((session) =>
    playback?.sessionId === session.id
      ? displayPointsForExploreSession(session).slice(0, playback.visiblePointCount)
      : displayPointsForExploreSession(session),
  );
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
  const showMenuDiscoveryDot = useCapabilityDiscoveryStore((state) =>
    shouldShowCapabilityMenuDiscoveryDot(state.discovery));
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
  const recap = useMemo(() => pendingExploreRecap({ sessions, places }), [places, sessions]);
  const recapAdventureSession = useMemo(() => {
    if (recap?.sessionIds.length !== 1) return null;
    const session = sessions.find((candidate) => candidate.id === recap.sessionIds[0]);
    return session?.trackingPolicy === 'adventure' && session.points.length >= 2 ? session : null;
  }, [recap, sessions]);
  const [searchVisible, setSearchVisible] = useState(false);
  const [placesCollection, setPlacesCollection] = useState<PlacesCollection>('nearby');
  const [selectedNearbyId, setSelectedNearbyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [collectingPlace, setCollectingPlace] = useState(false);
  const [placeName, setPlaceName] = useState('');
  const [reduceMotion, setReduceMotion] = useState(false);
  const [reviewRecap, setReviewRecap] = useState<ExploreRecap | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState(1);
  const [playbackPlaying, setPlaybackPlaying] = useState(false);
  const reconstructionSessionIdRef = useRef<string | null>(null);
  const reviewAdventureSession = useMemo(() => {
    if (reviewRecap?.sessionIds.length !== 1) return null;
    const session = sessions.find((candidate) => candidate.id === reviewRecap.sessionIds[0]);
    return session?.trackingPolicy === 'adventure' && session.points.length >= 2 ? session : null;
  }, [reviewRecap, sessions]);
  const reviewPlaces = useMemo(() => {
    if (!reviewRecap) return [];
    const selectedSessionIds = new Set(reviewRecap.sessionIds);
    const placeIds = sessions
      .filter((session) => selectedSessionIds.has(session.id))
      .flatMap((session) => session.discoveredPlaceIds);
    return [...new Map(placeIds
      .map((placeId) => places[placeId])
      .filter((place): place is Place => Boolean(place))
      .map((place) => [place.id, place])).values()];
  }, [places, reviewRecap, sessions]);
  const playbackSessionIdRef = useRef(reviewAdventureSession?.id ?? null);

  const pointGroups = useMemo(
    () => pointGroupsInDisplayOrder(sessions, activeSession),
    [activeSession, sessions],
  );
  const points = useMemo(() => pointGroups.flat(), [pointGroups]);
  const latestPoint = points[points.length - 1] ?? null;
  const recapRecordedPathPoints = useMemo(
    () => reviewAdventureSession ? displayPointsForExploreSession(reviewAdventureSession) : [],
    [reviewAdventureSession],
  );
  const playbackFrame = useMemo(
    () => reviewAdventureSession
      ? buildExplorePlaybackFrame(recapRecordedPathPoints, playbackProgress)
      : null,
    [playbackProgress, recapRecordedPathPoints, reviewAdventureSession],
  );
  const playbackActive = Boolean(reviewAdventureSession && playbackFrame && playbackProgress < 1);
  const displayedPointGroups = useMemo(
    () => pointGroupsInDisplayOrder(
      sessions,
      activeSession,
      playbackActive && reviewAdventureSession && playbackFrame
        ? { sessionId: reviewAdventureSession.id, visiblePointCount: playbackFrame.visiblePointCount }
        : null,
    ),
    [activeSession, playbackActive, playbackFrame, reviewAdventureSession, sessions],
  );
  const playbackCutoffMs = playbackActive && playbackFrame?.cutoffAt
    ? Date.parse(playbackFrame.cutoffAt)
    : null;
  const [visibleRegion, setVisibleRegion] = useState<Region>(() =>
    latestPoint ? regionAround(latestPoint) : DEFAULT_REGION,
  );
  const shouldRenderPolygonFog = Platform.OS !== 'ios' && preferences.showFog;
  const visibleCells = useMemo(() => {
    if (!shouldRenderPolygonFog) return [];
    const latitudeRadius = visibleRegion.latitudeDelta * 1.3;
    const longitudeRadius = visibleRegion.longitudeDelta * 1.3;
    return Object.values(exploredCells)
      .filter((cell) =>
        Math.abs(cell.center.latitude - visibleRegion.latitude) <= latitudeRadius &&
        Math.abs(cell.center.longitude - visibleRegion.longitude) <= longitudeRadius &&
        (playbackCutoffMs === null || Date.parse(cell.firstExploredAt) <= playbackCutoffMs),
      )
      .slice(-700);
  }, [exploredCells, playbackCutoffMs, shouldRenderPolygonFog, visibleRegion]);
  const fogRing = useMemo(
    () => shouldRenderPolygonFog ? fogRingForRegion(visibleRegion) : [],
    [shouldRenderPolygonFog, visibleRegion],
  );
  const createdPlaces = useMemo(() => [...new Map(Object.values(placeRelationships)
    .filter((relationship) => relationship.evidence === 'user-confirmed')
    .filter((relationship) => playbackCutoffMs === null || Date.parse(relationship.firstVisitedAt) <= playbackCutoffMs)
    .sort((left, right) => Date.parse(left.lastVisitedAt) - Date.parse(right.lastVisitedAt))
    .map((relationship) => places[relationship.placeId])
    .filter((place): place is Place => place?.source === 'user')
    .map((place) => [place.id, place] as const))
    .values()]
    .slice(-256), [placeRelationships, places, playbackCutoffMs]);
  const visibleCreatedPlaces = useMemo(() => {
    if (!shouldRenderPolygonFog) return [];
    const latitudeRadius = visibleRegion.latitudeDelta * 1.3;
    const longitudeRadius = visibleRegion.longitudeDelta * 1.3;
    return createdPlaces.filter((place) =>
      Math.abs(place.latitude - visibleRegion.latitude) <= latitudeRadius &&
      Math.abs(place.longitude - visibleRegion.longitude) <= longitudeRadius,
    );
  }, [createdPlaces, shouldRenderPolygonFog, visibleRegion]);
  const fogHoles = useMemo(() => {
    if (!shouldRenderPolygonFog) return { core: [], mist: [], veil: [] };
    return {
      core: [
        ...visibleCells.map((cell) => buildFogHole(cell.center, EXPLORE_REVEAL_RADIUS_M + 68)),
        ...visibleCreatedPlaces.map((place) => buildFogHole(place, EXPLORE_PLACE_REVEAL_RADIUS_M)),
      ],
      mist: visibleCells.map((cell) => buildFogHole(cell.center, EXPLORE_REVEAL_RADIUS_M + 30)),
      veil: visibleCells.map((cell) => buildFogHole(cell.center, EXPLORE_REVEAL_RADIUS_M)),
    };
  }, [shouldRenderPolygonFog, visibleCells, visibleCreatedPlaces]);
  const fogGeometry = useMemo(
    () => buildFogRenderGeometry([...displayedPointGroups].reverse()),
    [displayedPointGroups],
  );
  const altitudeGradients = useMemo(
    () => fogGeometry.traces.flatMap((trace) => buildAltitudeGradients(trace)),
    [fogGeometry],
  );
  const metalFogMapProps = useMemo(() => Platform.OS === 'ios' ? ({
      fogEnabled: preferences.showFog,
      fogCoordinates: preferences.showFog ? fogGeometry.points : [],
      fogSegmentStarts: preferences.showFog ? fogGeometry.segmentStarts : [],
      fogSegmentEnds: preferences.showFog ? fogGeometry.segmentEnds : [],
      fogPlaceCoordinates: preferences.showFog ? createdPlaces : [],
      fogClearRadiusMeters: EXPLORE_REVEAL_RADIUS_M,
      fogFeatherReferenceRadiusMeters: EXPLORE_FEATHER_REFERENCE_RADIUS_M,
      fogPlaceRevealRadiusMeters: EXPLORE_PLACE_REVEAL_RADIUS_M,
    } as unknown as ComponentProps<typeof MapView>) : {}, [createdPlaces, fogGeometry, preferences.showFog]);
  const exploredCellValues = useMemo(() => Object.values(exploredCells), [exploredCells]);
  const savedPlaces = useMemo(() => {
    const visitedIds = new Set(Object.values(placeRelationships).map((relationship) => relationship.placeId));
    return Object.values(places).filter((place) => visitedIds.has(place.id));
  }, [placeRelationships, places]);
  const nearby = useExploreNearbyPlaces(savedPlaces);
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
    const nextSessionId = reviewAdventureSession?.id ?? null;
    if (playbackSessionIdRef.current === nextSessionId) return;
    playbackSessionIdRef.current = nextSessionId;
    if (playbackProgress !== 1) setPlaybackProgress(1);
    if (playbackPlaying) setPlaybackPlaying(false);
  }, [playbackPlaying, playbackProgress, reviewAdventureSession?.id]);

  useEffect(() => {
    if (!playbackPlaying || !reviewAdventureSession || reduceMotion) return undefined;
    const tickMs = 80;
    const durationMs = explorePlaybackDurationMs(reviewAdventureSession.points.length);
    const timer = setInterval(() => {
      setPlaybackProgress((current) => Math.min(1, current + tickMs / durationMs));
    }, tickMs);
    return () => clearInterval(timer);
  }, [playbackPlaying, reduceMotion, reviewAdventureSession]);

  useEffect(() => {
    if (playbackProgress >= 1 && playbackPlaying) setPlaybackPlaying(false);
  }, [playbackPlaying, playbackProgress]);

  useEffect(() => {
    if (reduceMotion && playbackPlaying) {
      setPlaybackPlaying(false);
      setPlaybackProgress(1);
    }
  }, [playbackPlaying, reduceMotion]);

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

  const centerMap = (
    coordinate: Pick<ExplorePoint, 'latitude' | 'longitude'>,
    verticalOffsetRatio = 0,
  ) => {
    mapRef.current?.animateToRegion(regionAround(coordinate, verticalOffsetRatio), 450);
  };

  const centerOnCurrentLocation = async () => {
    const coordinate = await recorder.locate();
    if (coordinate) centerMap(coordinate);
  };

  const showPlaceOnMap = (place: Place) => {
    setSearchQuery('');
    centerMap(place, 0.28);
  };

  const visibleCenter = { latitude: visibleRegion.latitude, longitude: visibleRegion.longitude };
  const openPlaces = () => {
    setPlacesCollection('nearby');
    setSearchVisible(true);
    void nearby.search(visibleCenter);
  };

  const changePlacesCollection = (collection: PlacesCollection) => {
    setPlacesCollection(collection);
    if (collection === 'nearby' && nearby.status === 'idle') void nearby.search(visibleCenter);
  };

  const changeNearbyRadius = (radius: ExploreNearbyRadius) => {
    nearby.setRadius(radius);
    void nearby.search(visibleCenter, radius);
  };

  const showNearbyPlaceOnMap = (place: ExploreNearbyRecommendation) => {
    setSelectedNearbyId(place.id);
    centerMap(place, 0.28);
  };

  const mapMovedSinceNearbySearch = nearby.searchedCenter
    ? coordinateDistanceM(nearby.searchedCenter, visibleCenter) > 80
    : false;

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

  const toggleAdventurePlayback = () => {
    if (!reviewAdventureSession || reduceMotion) return;
    if (playbackPlaying) {
      setPlaybackPlaying(false);
      return;
    }
    if (playbackProgress >= 1) {
      mapRef.current?.fitToCoordinates(recapRecordedPathPoints, {
        edgePadding: { top: 120, right: 48, bottom: 360, left: 48 },
        animated: true,
      });
      setPlaybackProgress(0);
    }
    setPlaybackPlaying(true);
  };

  const scrubAdventurePlayback = (progress: number) => {
    setPlaybackPlaying(false);
    setPlaybackProgress(progress);
  };

  const openRecapReview = () => {
    if (!recap) return;
    const adventureSession = recapAdventureSession;
    setReviewRecap(recap);
    markRecapsSeen(recap.sessionIds);
    if (
      !adventureSession ||
      adventureSession.reconstructedSegments?.length ||
      reconstructionSessionIdRef.current === adventureSession.id
    ) return;
    reconstructionSessionIdRef.current = adventureSession.id;
    void reconstructExploreRecordedPath(adventureSession.points)
      .then((segments) => {
        if (segments.length) {
          useExploreStore.getState().setSessionPathReconstruction(adventureSession.id, segments);
        }
      })
      .finally(() => {
        if (reconstructionSessionIdRef.current === adventureSession.id) {
          reconstructionSessionIdRef.current = null;
        }
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
        onTouchStart={() => setPlaybackPlaying(false)}
        onPanDrag={() => setPlaybackPlaying(false)}
        onRegionChangeComplete={setVisibleRegion}
      >
        {shouldRenderPolygonFog ? <>
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
        {preferences.showMyPath ? <>
          {fogGeometry.traces.map((trace, index) => (
            <Polyline
              key={`path-casing-${index}`}
              testID="explore.path.casing"
              coordinates={trace}
              strokeColor="rgba(255, 255, 255, 0.92)"
              strokeWidth={8}
              lineCap="round"
              lineJoin="round"
            />
          ))}
          {altitudeGradients.map((gradient, index) => (
              <Polyline
                key={`altitude-gradient-${index}`}
                testID="explore.path.altitude"
                coordinates={gradient.coordinates}
                strokeColors={gradient.strokeColors}
                strokeWidth={4.5}
                lineCap="round"
                lineJoin="round"
              />
            ))}
        </> : null}
        {mapPlaces.map((place) => (
          <Marker
            key={place.id}
            coordinate={place}
            title={place.name}
            description="Collected Place"
            pinColor={colors.turmeric600}
          />
        ))}
        {playbackActive && playbackFrame?.cursor ? (
          <Marker
            testID="explore.playback.cursor"
            coordinate={playbackFrame.cursor}
            title="Replay position"
            pinColor={colors.turmeric600}
          />
        ) : null}
        {searchVisible && placesCollection === 'nearby' ? nearby.results.map((place) => (
          <Marker
            key={`nearby:${place.id}`}
            testID="explore.nearby.marker"
            coordinate={place}
            title={place.name}
            description="Nearby possibility"
            onPress={() => showNearbyPlaceOnMap(place)}
          >
            <View
              testID="explore.nearby.marker.glyph"
              style={[
                styles.nearbyMapMarker,
                selectedNearbyId === place.id ? styles.nearbyMapMarkerSelected : null,
              ]}
            >
              <View style={styles.nearbyMapMarkerCore} />
            </View>
          </Marker>
        )) : null}
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
                accessibilityLabel={showMenuDiscoveryDot
                  ? 'Open navigation menu, new destinations available'
                  : 'Open navigation menu'}
                materialVariant="floatingWhite"
                size={44}
                onPress={openMenu}
              >
                <View style={styles.menuToggleContent}>
                  <MenuToggleIcon open={false} />
                  {showMenuDiscoveryDot ? (
                    <NavigationDiscoveryDot
                      testID="nav.drawer.discovery"
                      style={styles.menuDiscoveryDot}
                    />
                  ) : null}
                </View>
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
              accessibilityLabel="Record a path"
              variant="primary"
              size="lg"
              disabled={recorder.status === 'requesting-permission' || recorder.status === 'locating'}
              onPress={recorder.beginOnboarding}
              style={styles.primaryAction}
            >
              {recorder.status === 'locating' ? 'Finding you…' : 'Record a Path'}
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
              : 'Your map stays private. Record a path to reveal the world around it.'}
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
          accessibilityLabel={recorder.active ? 'Stop recording' : 'Record a path'}
          variant={recorder.active ? 'inverse' : 'primary'}
          size="lg"
          disabled={recorder.status === 'requesting-permission' || recorder.status === 'locating'}
          onPress={recorder.active ? recorder.stop : recorder.start}
          style={styles.primaryAction}
        >
          {recorder.active ? 'Stop Recording' : recorder.status === 'locating' ? 'Finding you…' : 'Record a Path'}
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
            accessibilityLabel="Open Places"
            onPress={openPlaces}
            style={({ pressed }) => [styles.placeSearchControl, pressed ? styles.pressed : null]}
          >
            <BlurView
              pointerEvents="none"
              intensity={floatingControl.material.intensity}
              tint={floatingControl.material.tint}
              style={StyleSheet.absoluteFillObject}
            />
            <View pointerEvents="none" style={styles.floatingControlTint} />
            <Icon name="pin" size={20} color={colors.textPrimary} />
            <Text numberOfLines={1} style={styles.placeSearchLabel}>
              Places
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
            detail="Records paths only when you choose"
            selected={false}
            onPress={() => { void finishOnboarding('manual'); }}
          />
          <Text style={styles.familyNote}>Private until you choose to share.</Text>
        </BottomDrawerScrollView>
      </BottomDrawer>

      <BottomDrawer
        visible={searchVisible}
        onClose={() => setSearchVisible(false)}
        snapPoints={['58%']}
        presentation="inline"
        hideBackdrop
      >
        <BottomDrawerScrollView
          contentContainerStyle={[styles.searchDrawerContent, { paddingBottom: insets.bottom + spacing.xl }]}
          keyboardShouldPersistTaps="handled"
        >
          <BottomDrawerHeader title="Places" variant="minimal" />
          <SegmentedControl
            value={placesCollection}
            onChange={changePlacesCollection}
            options={[
              { value: 'nearby', label: 'Nearby' },
              { value: 'my-places', label: 'My Places' },
            ]}
            testIDPrefix="explore.places.segment"
          />
          {placesCollection === 'nearby' ? <>
            <View style={styles.nearbyToolbar}>
              <SegmentedControl
                value={nearby.radius}
                onChange={changeNearbyRadius}
                options={[
                  { value: 'quarter-mile', label: '¼ mi' },
                  { value: 'half-mile', label: '½ mi' },
                  { value: 'one-mile', label: '1 mi' },
                ]}
                size="compact"
                style={styles.nearbyRadiusControl}
                testIDPrefix="explore.nearby.radius"
              />
              {mapMovedSinceNearbySearch || nearby.status === 'error' ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => { void nearby.search(visibleCenter); }}
                >
                  {nearby.status === 'error' ? 'Try again' : 'Search this area'}
                </Button>
              ) : null}
            </View>
            {nearby.status === 'loading' ? (
              <Text style={styles.searchEmpty}>Finding a few places nearby…</Text>
            ) : nearby.status === 'unavailable' ? (
              <Text style={styles.searchEmpty}>Nearby suggestions are not available on this device yet.</Text>
            ) : nearby.status === 'error' ? (
              <Text style={styles.searchEmpty}>Nearby places could not load. Try this area again.</Text>
            ) : nearby.status === 'empty' ? (
              <Text style={styles.searchEmpty}>No strong suggestions in this area yet.</Text>
            ) : nearby.results.length ? (
              <View style={styles.searchResults}>
                {nearby.results.map((place) => (
                  <Pressable
                    key={place.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Suggestion: ${place.name}. ${place.reason}. ${formatNearbyDistance(place.distanceM)}. View on map`}
                    accessibilityState={{ selected: selectedNearbyId === place.id }}
                    onPress={() => showNearbyPlaceOnMap(place)}
                    style={({ pressed }) => [
                      styles.searchResultRow,
                      selectedNearbyId === place.id ? styles.nearbyResultSelected : null,
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <View style={styles.nearbyResultIcon}>
                      <Icon name="pin" size={18} color={colors.pine700} />
                    </View>
                    <View style={styles.nearbyResultCopy}>
                      <Text style={styles.searchResultName}>{place.name}</Text>
                      <View style={styles.nearbyResultMeta}>
                        <Text style={styles.nearbyResultDetail}>{place.reason}</Text>
                        <Text style={styles.nearbyResultDetail}>{formatNearbyDistance(place.distanceM)}</Text>
                      </View>
                    </View>
                    <Icon name="chevronRight" size={18} color={colors.textSecondary} />
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={styles.searchEmpty}>Search this area to find a few interesting places nearby.</Text>
            )}
          </> : <>
            <View style={styles.placeSearchField}>
              <Icon name="search" size={19} color={colors.textSecondary} />
              <TextInput
                accessibilityLabel="Search Places"
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
          </>}
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

      <BottomGuide
        visible={Boolean(recap)}
        onClose={() => recap && markRecapsSeen(recap.sessionIds)}
        scrim="none"
        dynamicSizing
      >
        {recap ? (
          <View testID="explore.recap.guide" style={styles.recapGuideContent}>
            <View style={styles.recapHero}>
              <Text style={styles.recapEyebrow}>Explore Recap</Text>
              <Text style={styles.recapTitle}>Path saved to your map.</Text>
              <Text style={styles.recapDetail}>{formatRecapDuration(recap.startedAt, recap.endedAt)}</Text>
            </View>
            <Text style={styles.recapStatus}>
              {recap.resolving
                ? 'Finding Places along your path…'
                : recap.places.length
                  ? formatRecapPlaces(recap.places)
                  : 'No confidently named Place was found along this path.'}
            </Text>
            <View style={styles.recapGuideActions}>
              {!recap.resolving && (recap.places.length > 0 || recapAdventureSession) ? (
                <Button variant="ghost" size="sm" onPress={openRecapReview}>Review</Button>
              ) : null}
              <Button testID="explore.recap.done" size="sm" onPress={() => markRecapsSeen(recap.sessionIds)}>Done</Button>
            </View>
          </View>
        ) : null}
      </BottomGuide>

      <BottomDrawer
        visible={Boolean(reviewRecap)}
        onClose={() => setReviewRecap(null)}
        snapPoints={['58%']}
      >
        {reviewRecap ? (
          <BottomDrawerScrollView
            contentContainerStyle={[styles.recapContent, { paddingBottom: insets.bottom + spacing.lg }]}
          >
            <BottomDrawerHeader title="Explore Recap" variant="minimal" />
            {reviewAdventureSession ? (
              <ExploreAdventureRecap
                points={recapRecordedPathPoints}
                progress={playbackProgress}
                playing={playbackPlaying}
                reduceMotion={reduceMotion}
                onTogglePlayback={toggleAdventurePlayback}
                onProgressChange={scrubAdventurePlayback}
              />
            ) : null}
            {reviewPlaces.length ? (
              <View style={styles.recapPlaces}>
                {reviewPlaces.map((place, index) => (
                  <View key={place.id} style={styles.recapPlaceRow}>
                    <View style={styles.recapPlaceNumber}><Text style={styles.recapPlaceNumberText}>{index + 1}</Text></View>
                    <Text style={styles.recapPlaceName}>{place.name}</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${place.name} from this recap`}
                      hitSlop={8}
                      onPress={() => removeDiscoveredPlaceFromRecaps(reviewRecap.sessionIds, place.id, localUserId)}
                      style={({ pressed }) => pressed ? styles.pressed : null}
                    >
                      <Icon name="close" size={18} color={colors.textSecondary} />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}
            <Button size="lg" onPress={() => setReviewRecap(null)}>Close</Button>
          </BottomDrawerScrollView>
        ) : null}
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

function formatRecapPlaces(places: Place[]): string {
  const visibleNames = places.slice(0, 3).map((place) => place.name);
  const remainingCount = places.length - visibleNames.length;
  return remainingCount > 0
    ? `${visibleNames.join(' · ')} · +${remainingCount} more`
    : visibleNames.join(' · ');
}

function formatNearbyDistance(distanceM: number): string {
  const miles = distanceM / 1609.344;
  if (miles < 0.1) return '<0.1 mi away';
  return `${miles.toFixed(1)} mi away`;
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
  menuToggleContent: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  menuDiscoveryDot: { position: 'absolute', top: -2, right: -3 },
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
  nearbyToolbar: { gap: spacing.sm, alignItems: 'stretch' },
  nearbyRadiusControl: { alignSelf: 'stretch' },
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
  nearbyResultSelected: { borderRadius: 16, backgroundColor: colors.pine50, paddingHorizontal: spacing.sm },
  nearbyResultIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.pine200, backgroundColor: colors.card },
  nearbyResultCopy: { flex: 1, gap: 2 },
  nearbyResultMeta: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.sm },
  nearbyResultDetail: { ...typography.bodyXs, color: colors.textSecondary },
  nearbyMapMarker: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: colors.pine700, backgroundColor: colors.gray50, shadowColor: colors.sumi900, shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  nearbyMapMarkerSelected: { borderWidth: 4, backgroundColor: colors.pine50, transform: [{ scale: 1.12 }] },
  nearbyMapMarkerCore: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.pine700 },
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
  recapContent: { paddingHorizontal: spacing.lg, gap: spacing.md },
  recapGuideContent: { gap: spacing.md, paddingBottom: spacing.lg },
  recapHero: { alignItems: 'flex-start' },
  recapEyebrow: { ...typography.bodyXs, fontFamily: fonts.medium, color: colors.textSecondary },
  recapTitle: { ...typography.titleSm, color: colors.textPrimary },
  recapDetail: { ...typography.bodySm, color: colors.textSecondary, marginTop: spacing.xs },
  recapStatus: { ...typography.bodySm, color: colors.textSecondary, lineHeight: 21 },
  recapGuideActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  recapPlaces: { gap: spacing.xs },
  recapPlaceRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  recapPlaceNumber: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.turmeric100 },
  recapPlaceNumberText: { ...typography.bodyXs, fontFamily: fonts.medium, color: colors.sumi900 },
  recapPlaceName: { ...typography.body, flex: 1, color: colors.textPrimary },
});
