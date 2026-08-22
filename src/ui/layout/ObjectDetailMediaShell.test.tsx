import { render } from '@testing-library/react-native';
import { Animated, View } from 'react-native';

import {
  buildObjectDetailMediaMotionRange,
  ObjectDetailMediaShell,
  resolveObjectDetailMediaGeometry,
} from './ObjectDetailMediaShell';

const accessibility = {
  reduceMotionEnabled: false,
  screenReaderEnabled: false,
};

jest.mock('../hooks/useAccessibilityPreferences', () => ({
  useAccessibilityPreferences: () => accessibility,
}));

describe('ObjectDetailMediaShell', () => {
  beforeEach(() => {
    accessibility.reduceMotionEnabled = false;
  });

  it('provides one bounded geometry contract for every supported detail scale', () => {
    expect(resolveObjectDetailMediaGeometry('immersive')).toMatchObject({
      heroHeight: 320,
      overlap: 28,
      sheetRadius: 44,
      parallaxFactor: 0.5,
    });
    expect(resolveObjectDetailMediaGeometry('standard')).toMatchObject({
      heroHeight: 240,
      overlap: 20,
      sheetRadius: 44,
      parallaxFactor: 0.5,
    });
    expect(resolveObjectDetailMediaGeometry('compact')).toMatchObject({
      heroHeight: 168,
      overlap: 16,
      sheetRadius: 44,
      parallaxFactor: 0.35,
    });
  });

  it('holds the hero before fading it at the sheet-to-header threshold', () => {
    expect(
      buildObjectDetailMediaMotionRange({
        heroHeight: 320,
        overlap: 28,
        headerBoundary: 96,
        fadeHold: 60,
        fadeLead: 180,
      }),
    ).toEqual({ start: 60, end: 196 });
  });

  it('renders the shared hero and rounded sheet structure', () => {
    const screen = render(
      <ObjectDetailMediaShell
        variant="standard"
        scrollY={new Animated.Value(0)}
        headerBoundary={88}
        hero={<View testID="hero-content" />}
      >
        <View testID="sheet-content" />
      </ObjectDetailMediaShell>,
    );

    expect(screen.getByTestId('object-detail-media-hero').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ height: 240 })]),
    );
    expect(screen.getByTestId('object-detail-media-sheet')).toBeTruthy();
    expect(screen.getByTestId('hero-content')).toBeTruthy();
    expect(screen.getByTestId('sheet-content')).toBeTruthy();
  });

  it('paints artwork through the rounded sheet corners without moving the sheet', () => {
    const screen = render(
      <ObjectDetailMediaShell
        extendArtworkBehindSheetCorners
        variant="compact"
        scrollY={new Animated.Value(0)}
        headerBoundary={80}
        hero={<View />}
      >
        <View />
      </ObjectDetailMediaShell>,
    );

    expect(screen.getByTestId('object-detail-media-hero').props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          height: 196,
          marginBottom: -28,
        }),
      ]),
    );
    expect(screen.getByTestId('object-detail-media-sheet').props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          marginTop: -16,
          borderTopLeftRadius: 44,
          borderTopRightRadius: 44,
        }),
      ]),
    );
  });

  it('removes scroll-linked translation when Reduce Motion is enabled', () => {
    accessibility.reduceMotionEnabled = true;
    const screen = render(
      <ObjectDetailMediaShell
        variant="compact"
        scrollY={new Animated.Value(20)}
        headerBoundary={80}
        hero={<View />}
      >
        <View />
      </ObjectDetailMediaShell>,
    );

    const animatedHero = screen.getByTestId('object-detail-media-animated-hero');
    expect(animatedHero.props.style).toEqual(expect.objectContaining({ opacity: 1 }));
    expect(animatedHero.props.style.transform).toBeUndefined();
  });
});
