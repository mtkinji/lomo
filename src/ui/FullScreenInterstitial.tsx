import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Portal } from '@rn-primitives/portal';
import { colors, spacing } from '../theme';

type BrandBackgroundColor =
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
  | 'turmeric'
  | 'madder'
  | 'quiltBlue'
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
}: FullScreenInterstitialProps) {
  if (!visible) return null;

  const surfaceBackground = colors[backgroundColor] ?? colors.card;

  return (
    <Portal>
      <View
        style={[styles.overlay, { backgroundColor: surfaceBackground }]}
        // Block interaction with the underlying screen; callers control dismissal
        // via explicit buttons or links inside `children`.
        pointerEvents="auto"
      >
        <View style={styles.content}>{children}</View>
      </View>
    </Portal>
  );
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
