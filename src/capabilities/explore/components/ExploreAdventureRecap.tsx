import { useMemo, useState } from 'react';
import {
  PanResponder,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
  type NativeTouchEvent,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, fonts, spacing, typography } from '../../../theme';
import { Button } from '../../../ui/Button';
import { Text } from '../../../ui/Typography';
import {
  buildExploreElevationProfile,
  buildExplorePlaybackFrame,
  type ExploreElevationSample,
} from '../domain/explorePlayback';
import { altitudeColor } from '../domain/exploreElevation';
import type { ExplorePoint } from '../domain/types';

const CHART_HEIGHT = 112;
const CHART_INSET = 8;

type Props = {
  points: ExplorePoint[];
  progress: number;
  playing: boolean;
  reduceMotion: boolean;
  onTogglePlayback: () => void;
  onProgressChange: (progress: number) => void;
};

function formatAltitude(altitudeM: number): string {
  return `${Math.round(altitudeM * 3.28084).toLocaleString()} ft`;
}

function chartCoordinate(
  sample: ExploreElevationSample,
  width: number,
  totalDistanceM: number,
  minAltitudeM: number,
  maxAltitudeM: number,
) {
  const drawableWidth = Math.max(1, width - CHART_INSET * 2);
  const drawableHeight = CHART_HEIGHT - CHART_INSET * 2;
  const altitudeRange = Math.max(1, maxAltitudeM - minAltitudeM);
  return {
    x: CHART_INSET + (sample.distanceM / Math.max(1, totalDistanceM)) * drawableWidth,
    y: CHART_INSET + ((maxAltitudeM - sample.altitudeM) / altitudeRange) * drawableHeight,
  };
}

export function ExploreAdventureRecap({
  points,
  progress,
  playing,
  reduceMotion,
  onTogglePlayback,
  onProgressChange,
}: Props) {
  const [chartWidth, setChartWidth] = useState(300);
  const profile = useMemo(() => buildExploreElevationProfile(points), [points]);
  const frame = useMemo(() => buildExplorePlaybackFrame(points, progress), [points, progress]);
  const paths = useMemo(() => profile?.segments.flatMap((segment) =>
    segment.samples.slice(1).map((sample, index) => {
      const previous = segment.samples[index];
      const from = chartCoordinate(
        previous,
        chartWidth,
        profile.totalDistanceM,
        profile.minAltitudeM,
        profile.maxAltitudeM,
      );
      const to = chartCoordinate(
        sample,
        chartWidth,
        profile.totalDistanceM,
        profile.minAltitudeM,
        profile.maxAltitudeM,
      );
      return {
        d: `M${from.x.toFixed(1)} ${from.y.toFixed(1)} L${to.x.toFixed(1)} ${to.y.toFixed(1)}`,
        color: altitudeColor((previous.altitudeM + sample.altitudeM) / 2),
      };
    })) ?? [], [chartWidth, profile]);
  const selectedSample = useMemo(() => {
    if (!profile || !frame.cursor) return null;
    const samples = profile.segments.flatMap((segment) => segment.samples);
    const cursorIndex = Math.max(0, frame.visiblePointCount - 1);
    return samples.reduce((closest, sample) =>
      Math.abs(sample.pointIndex - cursorIndex) < Math.abs(closest.pointIndex - cursorIndex)
        ? sample
        : closest,
    );
  }, [frame.cursor, frame.visiblePointCount, profile]);
  const cursorCoordinate = profile && selectedSample
    ? chartCoordinate(
      selectedSample,
      chartWidth,
      profile.totalDistanceM,
      profile.minAltitudeM,
      profile.maxAltitudeM,
    )
    : null;

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (event) => {
      onProgressChange(Math.max(0, Math.min(1, event.nativeEvent.locationX / Math.max(1, chartWidth))));
    },
    onPanResponderMove: (event) => {
      onProgressChange(Math.max(0, Math.min(1, event.nativeEvent.locationX / Math.max(1, chartWidth))));
    },
  }), [chartWidth, onProgressChange]);
  const onLayout = (event: LayoutChangeEvent) => {
    setChartWidth(Math.max(1, event.nativeEvent.layout.width));
  };
  const onTouchStart = (event: NativeSyntheticEvent<NativeTouchEvent>) => {
    onProgressChange(Math.max(0, Math.min(1, event.nativeEvent.locationX / Math.max(1, chartWidth))));
  };
  const adjustProgress = (direction: -1 | 1) => {
    onProgressChange(Math.max(0, Math.min(1, progress + direction * 0.05)));
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Elevation</Text>
        {selectedSample ? <Text style={styles.current}>{formatAltitude(selectedSample.altitudeM)}</Text> : null}
      </View>
      {profile ? <>
        <View
          testID="explore.recap.elevation.scrubber"
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Recorded path elevation profile"
          accessibilityHint="Swipe up or down, or drag across the profile, to revisit the route"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'increment') adjustProgress(1);
            if (event.nativeEvent.actionName === 'decrement') adjustProgress(-1);
          }}
          onLayout={onLayout}
          onTouchStart={onTouchStart}
          style={styles.chart}
          {...panResponder.panHandlers}
        >
          <Svg width={chartWidth} height={CHART_HEIGHT} pointerEvents="none">
            {paths.map((path, index) => (
              <Path
                key={`elevation-segment-${index}`}
                testID="explore.recap.elevation.segment"
                d={path.d}
                fill="none"
                stroke={path.color}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {cursorCoordinate ? (
              <Circle
                cx={cursorCoordinate.x}
                cy={cursorCoordinate.y}
                r={5}
                fill={colors.turmeric600}
                stroke={colors.card}
                strokeWidth={2}
              />
            ) : null}
          </Svg>
        </View>
        <View style={styles.labels}>
          <Text style={styles.label}>Low {formatAltitude(profile.minAltitudeM)}</Text>
          <Text style={styles.label}>High {formatAltitude(profile.maxAltitudeM)}</Text>
        </View>
      </> : (
        <Text style={styles.unavailable}>Elevation wasn’t clear enough for a trustworthy profile.</Text>
      )}
      <View style={styles.footer}>
        <Text style={styles.helper}>
          {profile ? 'Drag the profile to revisit the route.' : 'The recorded route can still be replayed.'}
        </Text>
        {!reduceMotion ? (
          <Button
            testID="explore.recap.playback.toggle"
            accessibilityLabel={playing ? 'Pause path replay' : 'Replay recorded path'}
            variant="outline"
            size="sm"
            onPress={onTogglePlayback}
          >
            {playing ? 'Pause' : progress < 1 ? 'Resume' : 'Replay'}
          </Button>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    paddingVertical: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...typography.titleSm, color: colors.textPrimary },
  current: { ...typography.bodySm, fontFamily: fonts.medium, color: colors.pine700 },
  chart: { height: CHART_HEIGHT, borderRadius: 12, backgroundColor: colors.pine50, overflow: 'hidden' },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { ...typography.bodyXs, color: colors.textSecondary },
  unavailable: { ...typography.bodySm, color: colors.textSecondary, lineHeight: 21, paddingVertical: spacing.md },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  helper: { ...typography.bodyXs, color: colors.textSecondary, flex: 1 },
});
