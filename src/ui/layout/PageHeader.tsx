import { ReactNode, useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, IconName } from '../Icon';
import { colors, spacing, typography, fonts } from '../../theme';
import { IconButton } from '../Button';

type PageHeaderProps = {
  title: string;
  /**
   * Optional leading icon that visually anchors the page.
   * For main tab screens we currently avoid this to reduce redundancy
   * with the bottom navigation icon.
   */
  iconName?: IconName;
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
   * Optional content rendered below the main header row
   * (filters, tabs, meta, etc).
   */
  children?: ReactNode;
};

export function PageHeader({
  title,
  iconName,
  onPressMenu,
  onPressBack,
  menuOpen = false,
  onPressInfo,
  rightElement,
  children,
}: PageHeaderProps) {
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
              <Icon name="arrowLeft" size={18} color={colors.canvas} />
            </IconButton>
          ) : onPressMenu ? (
            <IconButton
              accessibilityLabel="Open navigation menu"
              onPress={onPressMenu}
              style={[styles.headerIconButton, styles.headerIconButtonGhost]}
            >
              <MenuToggleIcon open={menuOpen} />
            </IconButton>
          ) : null}
        </View>

        <View style={styles.centerColumn}>
          <View style={styles.titleRow}>
            {iconName ? (
              <View style={styles.iconContainer}>
                <Icon name={iconName} size={24} color={colors.textPrimary} />
              </View>
            ) : null}
            <Text style={styles.title}>{title}</Text>
            {onPressInfo ? (
              <IconButton
                accessibilityLabel={`Learn about ${title.toLowerCase()}`}
                onPress={onPressInfo}
                style={styles.headerIconButton}
              >
                <Icon name="info" size={18} color={colors.canvas} />
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
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


