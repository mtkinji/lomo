import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Portal } from '@rn-primitives/portal';
import { colors, spacing } from '../theme';

export type BrandBackgroundColor =
  | 'shell'
  | 'shellAlt'
  | 'canvas'
  | 'card'
  | 'cardMuted'
  | 'accent'
  | 'pine300'
  | 'pine400'
  | 'accentRose'
  | 'accentRoseStrong'
  | 'indigo'
  | 'turmeric50'
  | 'turmeric100'
  | 'turmeric200'
  | 'turmeric300'
  | 'turmeric400'
  | 'turmeric500'
  | 'turmeric600'
  | 'turmeric700'
  | 'turmeric800'
  | 'turmeric900'
  | 'turmeric'
  | 'madder'
  | 'quiltBlue'
  | 'quiltBlue50'
  | 'quiltBlue100'
  | 'quiltBlue200'
  | 'quiltBlue300'
  | 'quiltBlue400'
  | 'quiltBlue500'
  | 'quiltBlue600'
  | 'quiltBlue700'
  | 'quiltBlue800'
  | 'quiltBlue900'
  | 'clay'
  | 'moss'
  | 'sumi';

interface FullScreenInterstitialProps {
  visible: boolean;
  onDismiss?: () => void;
  /**
   * Interstitial body content. Hosts are responsible for providing title,
   * copy, and any inline media.
   */
  children: ReactNode;
  /**
   * Background color for the interstitial card surface, mapped directly from
   * the tokenized `colors` palette. Defaults to `card`.
   */
  backgroundColor?: BrandBackgroundColor;
  /**
   * Optional style override for the inner content container (where `children` are rendered).
   * Useful when a caller wants full control over vertical spacing (e.g. pinned CTAs).
   */
  contentStyle?: StyleProp<ViewStyle>;
  /**
   * Progression model for how this moment should advance:
   * - 'button' – caller controls dismissal via explicit actions (default).
   * - a number – automatically calls `onDismiss` after N milliseconds when
   *   `visible` becomes true.
   */
  progression?: 'button' | number;
  /**
   * When true, renders inline instead of using the global Portal host.
   * Useful for displaying the interstitial inside a React Native `Modal`
   * where portal content would otherwise appear behind the modal layer.
   */
  withinModal?: boolean;
}

/**
 * Generic full-screen interstitial overlay that sits on top of the current
 * app shell. Use this for one-off celebration or guidance moments that should
 * temporarily take over the main canvas.
 */
export function FullScreenInterstitial({
  visible,
  onDismiss,
  children,
  backgroundColor = 'card',
  contentStyle,
  progression = 'button',
  withinModal = false,
}: FullScreenInterstitialProps) {
  const surfaceBackground = colors[backgroundColor] ?? colors.card;

  useEffect(() => {
    if (!visible) return;
    if (typeof progression !== 'number') return;
    if (!onDismiss) return;

    const timeoutId = setTimeout(() => {
      onDismiss();
    }, progression);

    return () => clearTimeout(timeoutId);
  }, [visible, progression, onDismiss]);

  if (!visible) return null;

  const body = (
    <View
      style={[styles.overlay, { backgroundColor: surfaceBackground }]}
      // Block interaction with the underlying screen; callers control dismissal
      // via explicit buttons or links inside `children`.
      pointerEvents="auto"
    >
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );

  if (withinModal) {
    return body;
  }

  return <Portal name="full-screen-interstitial">{body}</Portal>;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'stretch',
    paddingHorizontal: 0,
    paddingVertical: 0,
    zIndex: 10,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing['2xl'],
  },
});
