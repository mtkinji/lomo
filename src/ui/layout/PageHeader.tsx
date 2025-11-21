import { ReactNode, useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { HStack, VStack, Heading, Pressable } from '@gluestack-ui/themed';
import { Icon, IconName } from '../Icon';
import { colors, spacing, typography, fonts } from '../../theme';

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
    <VStack space="md" style={styles.container}>
      <HStack alignItems="center" style={styles.topRow}>
        <View style={styles.sideColumn}>
          {onPressBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Go back from ${title}`}
              hitSlop={8}
              onPress={onPressBack}
            >
              <Icon name="arrowLeft" size={24} color={colors.textPrimary} />
            </Pressable>
          ) : onPressMenu ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open navigation menu"
              hitSlop={8}
              onPress={onPressMenu}
            >
              <MenuToggleIcon open={menuOpen} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.centerColumn}>
          <HStack alignItems="center" space="sm" justifyContent="center">
            {iconName ? (
              <View style={styles.iconContainer}>
                <Icon name={iconName} size={24} color={colors.textPrimary} />
              </View>
            ) : null}
            <Heading style={styles.title}>{title}</Heading>
            {onPressInfo ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Learn about ${title.toLowerCase()}`}
                hitSlop={8}
                onPress={onPressInfo}
              >
                <Icon name="info" size={22} color={colors.textSecondary} />
              </Pressable>
            ) : null}
          </HStack>
        </View>

        <View style={styles.sideColumnRight}>
          {rightElement ? <View style={styles.rightElement}>{rightElement}</View> : null}
        </View>
      </HStack>
      {children}
    </VStack>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  topRow: {
    width: '100%',
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
  centerColumn: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideColumn: {
    flex: 1,
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


