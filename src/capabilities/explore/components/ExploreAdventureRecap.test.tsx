import { fireEvent, render } from '@testing-library/react-native';
import { ExploreAdventureRecap } from './ExploreAdventureRecap';
import type { ExplorePoint } from '../domain/types';

function point(index: number, altitudeM: number | null = 1500 + index * 20): ExplorePoint {
  return {
    id: `point-${index}`,
    latitude: 40 + index * 0.0001,
    longitude: -105,
    altitudeM,
    horizontalAccuracyM: 6,
    altitudeAccuracyM: altitudeM === null ? 80 : 5,
    speedMps: 2,
    courseDeg: 0,
    recordedAt: new Date(Date.parse('2026-08-02T12:00:00.000Z') + index * 10_000).toISOString(),
  };
}

describe('Explore recorded path recap playback controls', () => {
  it('shows one elevation profile and toggles Replay', () => {
    const onTogglePlayback = jest.fn();
    const screen = render(
      <ExploreAdventureRecap
        points={[point(0), point(1), point(2)]}
        progress={1}
        playing={false}
        reduceMotion={false}
        onTogglePlayback={onTogglePlayback}
        onProgressChange={jest.fn()}
      />,
    );

    expect(screen.getByText('Elevation')).toBeTruthy();
    expect(screen.getByLabelText('Recorded path elevation profile')).toBeTruthy();
    const gradientSegments = screen.getAllByTestId('explore.recap.elevation.segment');
    expect(gradientSegments).toHaveLength(2);
    expect(gradientSegments[0].props.stroke).not.toBe(gradientSegments[1].props.stroke);
    fireEvent.press(screen.getByText('Replay'));
    expect(onTogglePlayback).toHaveBeenCalledTimes(1);
  });

  it('uses the profile as a direct playback scrubber', () => {
    const onProgressChange = jest.fn();
    const screen = render(
      <ExploreAdventureRecap
        points={[point(0), point(1), point(2)]}
        progress={1}
        playing={false}
        reduceMotion={false}
        onTogglePlayback={jest.fn()}
        onProgressChange={onProgressChange}
      />,
    );

    fireEvent(screen.getByTestId('explore.recap.elevation.scrubber'), 'layout', {
      nativeEvent: { layout: { width: 300, height: 112, x: 0, y: 0 } },
    });
    fireEvent(screen.getByTestId('explore.recap.elevation.scrubber'), 'touchStart', {
      nativeEvent: { locationX: 75 },
    });
    expect(onProgressChange).toHaveBeenCalledWith(0.25);

    fireEvent(screen.getByLabelText('Recorded path elevation profile'), 'accessibilityAction', {
      nativeEvent: { actionName: 'increment' },
    });
    expect(onProgressChange).toHaveBeenCalledWith(1);
  });

  it('keeps route replay while explaining unavailable elevation honestly', () => {
    const screen = render(
      <ExploreAdventureRecap
        points={[point(0, null), point(1, null)]}
        progress={1}
        playing={false}
        reduceMotion={false}
        onTogglePlayback={jest.fn()}
        onProgressChange={jest.fn()}
      />,
    );

    expect(screen.getByText('Elevation wasn’t clear enough for a trustworthy profile.')).toBeTruthy();
    expect(screen.getByText('Replay')).toBeTruthy();
  });

  it('uses direct inspection instead of timed animation when Reduce Motion is enabled', () => {
    const screen = render(
      <ExploreAdventureRecap
        points={[point(0), point(1)]}
        progress={1}
        playing={false}
        reduceMotion
        onTogglePlayback={jest.fn()}
        onProgressChange={jest.fn()}
      />,
    );

    expect(screen.queryByText('Replay')).toBeNull();
    expect(screen.getByText('Drag the profile to revisit the route.')).toBeTruthy();
  });
});
