import { ReactNode, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Icon, IconName } from '../Icon';
import { colors, spacing, typography, fonts } from '../../theme';
import { IconButton } from '../Button';
import { ObjectTypeIconBadge } from '../ObjectTypeIconBadge';
import { getObjectTypeBadgeColors, type ObjectTypeTone } from '../../theme/objectTypeBadges';

type PageHeaderProps = {
  title: string;
  /**
   * Visual style for the header content.
   * - default: standard canvas header styling.
   * - inverse: white/bright text and icons for use on dark/gradient surfaces (paywall, change plan, etc.).
   */
  variant?: 'default' | 'inverse';
  /**
   * Optional leading icon that visually anchors the page.
   * For main tab screens we currently avoid this to reduce redundancy
   * with the bottom navigation icon.
   */
  iconName?: IconName;
  /**
   * Optional tone that determines the icon badge color when `iconName` is provided.
   * Use this to give each object type a consistent, recognizable header treatment.
   */
  iconTone?: ObjectTypeTone;
  /**
   * Optional menu handler; when provided, a hamburger icon appears to the left
   * of the title. Intended for global navigation drawers.
   */
  onPressMenu?: () => void;
  /**
   * Optional back handler; when provided, shows a chevron/arrow button on the
   * left edge. Intended for stacked subpages.
   */
  onPressBack?: () => void;
  /**
   * When true, the menu icon is visually treated as "open" (rotated 180deg).
   * Typically wired to the drawer's open/closed state.
   */
  menuOpen?: boolean;
  /**
   * When provided, shows an info icon button to the right of the title.
   */
  onPressInfo?: () => void;
  /**
   * Optional right-aligned element (e.g. primary action button).
   */
  rightElement?: ReactNode;
  /**
   * When true (and `iconName` is provided), the icon + title are rendered inside
   * a single "object type badge" container instead of only boxing the icon.
   * Keeps the overall header height stable by locking the badge height and
   * clamping the title to a single line.
   */
  boxedTitle?: boolean;
  /**
   * Optional content rendered below the main header row
   * (filters, tabs, meta, etc).
   */
  children?: ReactNode;
};

export function PageHeader({
  title,
  variant = 'default',
  iconName,
  iconTone = 'default',
  onPressMenu,
  onPressBack,
  menuOpen = false,
  onPressInfo,
  rightElement,
  boxedTitle = false,
  children,
}: PageHeaderProps) {
  const headerBadgeSize = 30;
  const headerBadgeRadius = Math.round(headerBadgeSize * 0.32);
  const badgeColors = getObjectTypeBadgeColors(iconTone);

  const iconColor = variant === 'inverse' ? colors.aiForeground : colors.canvas;
  const titleColor = variant === 'inverse' ? colors.aiForeground : colors.textPrimary;

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.sideColumn}>
          {onPressBack ? (
            <IconButton
              accessibilityLabel={`Go back from ${title}`}
              onPress={onPressBack}
              style={styles.headerIconButton}
            >
              <Icon name="arrowLeft" size={18} color={iconColor} />
            </IconButton>
          ) : onPressMenu ? (
            <IconButton
              accessibilityLabel="Open navigation menu"
              testID="nav.drawer.toggle"
              onPress={onPressMenu}
              style={[styles.headerIconButton, styles.headerIconButtonGhost]}
            >
              <MenuToggleIcon open={menuOpen} />
            </IconButton>
          ) : null}
        </View>

        <View style={styles.centerColumn}>
          <View style={styles.titleRow}>
            {iconName && boxedTitle ? (
              <View
                style={[
                  styles.titleBadge,
                  {
                    height: headerBadgeSize,
                    borderRadius: headerBadgeRadius,
                    backgroundColor: badgeColors.backgroundColor,
                  },
                ]}
              >
                <Icon name={iconName} size={18} color={badgeColors.iconColor} />
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={[styles.title, styles.titleInBadge, { color: badgeColors.iconColor }]}
                >
                  {title}
                </Text>
              </View>
            ) : (
              <>
                {iconName ? (
                  <ObjectTypeIconBadge
                    iconName={iconName}
                    tone={iconTone}
                    size={18}
                    badgeSize={headerBadgeSize}
                  />
                ) : null}
                <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.title, { color: titleColor }]}>
                  {title}
                </Text>
              </>
            )}
            {onPressInfo ? (
              <IconButton
                accessibilityLabel={`Learn about ${title.toLowerCase()}`}
                onPress={onPressInfo}
                style={styles.headerIconButton}
              >
                <Icon name="info" size={18} color={iconColor} />
              </IconButton>
            ) : null}
          </View>
        </View>

        <View style={styles.sideColumnRight}>
          {rightElement ? <View style={styles.rightElement}>{rightElement}</View> : null}
        </View>
      </View>
      {children ? <View style={styles.childrenContainer}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
  },
  headerIconButton: {
    width: 32,
    height: 32,
  },
  headerIconButtonGhost: {
    // Menu toggle should appear as a bare icon (no filled background).
    backgroundColor: 'transparent',
  },
  childrenContainer: {
    marginTop: spacing.md,
  },
  topRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    ...typography.titleMd,
    color: colors.textPrimary,
    fontFamily: fonts.black,
  },
  titleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  titleInBadge: {
    // Badge height is constrained; keep the title visually centered and prevent
    // extra vertical space from changing header height.
    lineHeight: typography.titleMd.lineHeight,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: spacing.sm,
  },
  centerColumn: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideColumn: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  sideColumnRight: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  rightElement: {},
  menuIconBox: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLine: {
    position: 'absolute',
    width: 18,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.textPrimary,
  },
});

function MenuToggleIcon({ open }: { open: boolean }) {
  const progress = useRef(new Animated.Value(open ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: open ? 1 : 0,
      useNativeDriver: true,
      damping: 15,
      stiffness: 180,
      mass: 0.8,
    }).start();
  }, [open, progress]);

  const topStyle = {
    transform: [
      {
        translateY: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [-4, 0],
        }),
      },
      {
        rotate: progress.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '45deg'],
        }),
      },
    ],
  };

  const bottomStyle = {
    transform: [
      {
        translateY: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [4, 0],
        }),
      },
      {
        rotate: progress.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '-45deg'],
        }),
      },
    ],
  };

  return (
    <View style={styles.menuIconBox}>
      <Animated.View style={[styles.menuLine, topStyle]} />
      <Animated.View style={[styles.menuLine, bottomStyle]} />
    </View>
  );
}


