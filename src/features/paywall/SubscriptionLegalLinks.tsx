import { Linking, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '../../ui/primitives';
import { colors, spacing, typography } from '../../theme';

export const KWILT_TERMS_URL = 'https://go.kwilt.app/terms';
export const KWILT_PRIVACY_URL = 'https://go.kwilt.app/privacy';

type SubscriptionLegalLinksTone = 'default' | 'inverse';
type SubscriptionLegalLinksVariant = 'sentence' | 'footer';

export function openSubscriptionLegalUrl(url: string) {
  return Linking.openURL(url).catch(() => undefined);
}

export function SubscriptionLegalLinks({
  variant = 'sentence',
  tone = 'default',
  style,
}: {
  variant?: SubscriptionLegalLinksVariant;
  tone?: SubscriptionLegalLinksTone;
  style?: StyleProp<ViewStyle>;
}) {
  const isInverse = tone === 'inverse';
  const copyStyle = isInverse ? styles.copyInverse : styles.copyDefault;
  const linkStyle = isInverse ? styles.linkInverse : styles.linkDefault;

  if (variant === 'footer') {
    return (
      <View style={[styles.footerContainer, style]}>
        <Text style={styles.footerCopy}>
          <Text
            accessibilityRole="link"
            accessibilityLabel="Open Terms of Use EULA"
            onPress={() => {
              openSubscriptionLegalUrl(KWILT_TERMS_URL);
            }}
            style={styles.footerLink}
          >
            Terms of Use (EULA)
          </Text>
          <Text style={styles.footerSeparator}>  •  </Text>
          <Text
            accessibilityRole="link"
            accessibilityLabel="Open Privacy Policy"
            onPress={() => {
              openSubscriptionLegalUrl(KWILT_PRIVACY_URL);
            }}
            style={styles.footerLink}
          >
            Privacy Policy
          </Text>
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.copy, copyStyle]}>
        By subscribing, you agree to Kwilt's{' '}
        <Text
          accessibilityRole="link"
          accessibilityLabel="Open Terms of Use EULA"
          onPress={() => {
            openSubscriptionLegalUrl(KWILT_TERMS_URL);
          }}
          style={[styles.link, linkStyle]}
        >
          Terms of Use (EULA)
        </Text>{' '}
        and{' '}
        <Text
          accessibilityRole="link"
          accessibilityLabel="Open Privacy Policy"
          onPress={() => {
            openSubscriptionLegalUrl(KWILT_PRIVACY_URL);
          }}
          style={[styles.link, linkStyle]}
        >
          Privacy Policy
        </Text>
        .
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
  },
  footerContainer: {
    marginTop: 2,
  },
  footerCopy: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  footerLink: {
    ...typography.bodySm,
    color: colors.accent,
    textDecorationLine: 'underline',
  },
  footerSeparator: {
    ...typography.bodySm,
    color: colors.muted,
  },
  copy: {
    ...typography.caption,
    textAlign: 'center',
  },
  copyDefault: {
    color: colors.textSecondary,
  },
  copyInverse: {
    color: 'rgba(255,255,255,0.82)',
  },
  link: {
    ...typography.caption,
    textDecorationLine: 'underline',
  },
  linkDefault: {
    color: colors.accent,
  },
  linkInverse: {
    color: colors.canvas,
  },
});
