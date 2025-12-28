import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, spacing, typography } from '../theme';
import { HStack } from './primitives';
import { Icon } from './Icon';

type Props = {
  title: string;
  /**
   * Controls title typography. Default preserves the existing "uppercase, label-like"
   * style used in list-style collapsible cards.
   *
   * Use "section" to match the stronger section headers used on object detail pages.
   */
  titleVariant?: 'default' | 'section';
  /**
   * When true, hides the rendered title text inside the collapsible header.
   * Useful when a stronger page-level section header is rendered outside the card.
   *
   * Note: `title` is still used for accessibility labeling.
   */
  hideTitle?: boolean;
  summary?: string | null;
  defaultExpanded?: boolean;
  /**
   * Optional controlled expansion state. When provided, `defaultExpanded` is ignored.
   */
  expanded?: boolean;
  onExpandedChange?: (next: boolean) => void;
  /**
   * Controls initial render density in lists; when true, adds a subtle divider.
   */
  bordered?: boolean;
  style?: StyleProp<ViewStyle>;
  headerTestID?: string;
  children: React.ReactNode;
};

export function CollapsibleSection({
  title,
  titleVariant = 'default',
  hideTitle = false,
  summary,
  defaultExpanded = false,
  expanded,
  onExpandedChange,
  bordered = true,
  style,
  headerTestID,
  children,
}: Props) {
  const isControlled = typeof expanded === 'boolean';
  const [uncontrolledExpanded, setUncontrolledExpanded] = useState(defaultExpanded);
  const isExpanded = isControlled ? (expanded as boolean) : uncontrolledExpanded;

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    // Enable LayoutAnimation on Android (no-op on newer RN versions where it's enabled).
    try {
      UIManager.setLayoutAnimationEnabledExperimental?.(true);
    } catch {
      // no-op
    }
  }, []);

  const chevron = isExpanded ? 'chevronUp' : 'chevronDown';

  const resolvedSummary = useMemo(() => {
    const trimmed = typeof summary === 'string' ? summary.trim() : '';
    return trimmed.length ? trimmed : null;
  }, [summary]);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const next = !isExpanded;
    if (!isControlled) setUncontrolledExpanded(next);
    onExpandedChange?.(next);
  };

  return (
    <View style={[styles.container, bordered && styles.bordered, style]}>
      <Pressable
        testID={headerTestID}
        accessibilityRole="button"
        accessibilityLabel={`${title}${isExpanded ? ', expanded' : ', collapsed'}`}
        accessibilityState={{ expanded: isExpanded }}
        onPress={toggle}
        style={({ pressed }) => [styles.header, pressed && styles.headerPressed]}
      >
        <HStack alignItems="center" justifyContent="space-between" style={{ width: '100%' }}>
          <View style={{ flex: 1, paddingRight: spacing.md }}>
            {!hideTitle && title.trim().length > 0 ? (
              <Text
                style={[
                  styles.title,
                  titleVariant === 'section' ? styles.titleSection : undefined,
                ]}
              >
                {title}
              </Text>
            ) : null}
            {resolvedSummary ? (
              <Text
                style={[styles.summary, hideTitle ? styles.summaryNoTitle : undefined]}
                numberOfLines={2}
              >
                {resolvedSummary}
              </Text>
            ) : null}
          </View>
          <Icon name={chevron} size={18} color={colors.textSecondary} />
        </HStack>
      </Pressable>
      {isExpanded ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  bordered: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
    borderRadius: 16,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerPressed: {
    backgroundColor: colors.gray100,
  },
  title: {
    ...typography.bodySm,
    color: colors.textSecondary,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  titleSection: {
    ...typography.titleSm,
    color: colors.textPrimary,
    letterSpacing: 0,
    textTransform: 'none',
  },
  summary: {
    marginTop: spacing.xs,
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  summaryNoTitle: {
    marginTop: 0,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
});


