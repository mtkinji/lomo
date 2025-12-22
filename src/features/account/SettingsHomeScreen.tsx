import { useMemo, useState } from 'react';
import { Alert, Pressable as RNPressable, ScrollView, StyleSheet, TouchableOpacity, View, Pressable } from 'react-native';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { useDrawerStatus } from '@react-navigation/drawer';
import * as ImagePicker from 'expo-image-picker';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { Icon, IconName } from '../../ui/Icon';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { colors, spacing, typography } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import { useEntitlementsStore } from '../../store/useEntitlementsStore';
import { VStack, Heading, Text, HStack } from '../../ui/primitives';
import type {
  RootDrawerParamList,
  SettingsStackParamList,
} from '../../navigation/RootNavigator';
import { ProfileAvatar } from '../../ui/ProfileAvatar';
import { openPaywallInterstitial } from '../../services/paywall';
import { getMonthKey } from '../../domain/generativeCredits';
import { FREE_GENERATIVE_CREDITS_PER_MONTH, PRO_GENERATIVE_CREDITS_PER_MONTH } from '../../domain/generativeCredits';
import { Card } from '../../ui/Card';
import { LinearGradient } from 'expo-linear-gradient';
import { paywallTheme } from '../paywall/paywallTheme';
import { openManageSubscription } from '../../services/entitlements';

type SettingsNavigationProp = NativeStackNavigationProp<
  SettingsStackParamList,
  'SettingsHome'
>;

type SettingsItem = {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  // This screen is a flat menu of direct navigations; exclude routes that require params.
  route?: Exclude<keyof SettingsStackParamList, 'SettingsPaywall'>;
  disabled?: boolean;
  status?: 'new' | 'soon';
  tags?: string[];
};

type SettingsGroup = {
  id: string;
  title: string;
  description: string;
  items: SettingsItem[];
};

const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    id: 'personalization',
    title: 'Personalization',
    description: 'Visual identity, tone, and how the app feels.',
    items: [
      {
        id: 'notifications',
        title: 'Notifications',
        description: 'Plan gentle reminders from Kwilt.',
        icon: 'activities',
        route: 'SettingsNotifications',
        tags: ['reminders', 'nudges', 'alerts'],
      },
    ],
  },
];

export function SettingsHomeScreen() {
  const userProfile = useAppStore((state) => state.userProfile);
  const arcs = useAppStore((state) => state.arcs);
  const updateUserProfile = useAppStore((state) => state.updateUserProfile);
  const navigation = useNavigation<SettingsNavigationProp>();
  const drawerNavigation = navigation.getParent<DrawerNavigationProp<RootDrawerParamList>>();
  const drawerStatus = useDrawerStatus();
  const menuOpen = drawerStatus === 'open';
  const [avatarSheetVisible, setAvatarSheetVisible] = useState(false);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const generativeCredits = useAppStore((state) => state.generativeCredits);
  const isPro = useEntitlementsStore((state) => state.isPro);
  const restore = useEntitlementsStore((state) => state.restore);
  const refreshEntitlements = useEntitlementsStore((state) => state.refreshEntitlements);

  const settingsItems = useMemo(() => SETTINGS_GROUPS.flatMap((group) => group.items), []);
  const hasMatches = settingsItems.length > 0;

  const handleNavigate = (item: SettingsItem) => {
    if (item.disabled || !item.route) {
      return;
    }
    navigation.navigate(item.route);
  };

  const handleOpenMenu = () => {
    if (drawerNavigation) {
      drawerNavigation.dispatch(DrawerActions.openDrawer());
    }
  };

  const generatedNameFromFirstArc = (() => {
    let firstArcName: string | null = null;
    let firstArcCreatedAt: string | null = null;
    for (const arc of arcs) {
      const arcName = arc?.name?.trim();
      if (!arcName) continue;
      if (!firstArcCreatedAt || arc.createdAt < firstArcCreatedAt) {
        firstArcCreatedAt = arc.createdAt;
        firstArcName = arcName;
      }
    }
    return firstArcName;
  })();

  const displayName = userProfile?.fullName?.trim() || generatedNameFromFirstArc || 'Kwilter';
  const profileSubtitle = userProfile?.email?.trim() || 'Add your email address';
  const avatarSource = userProfile?.avatarUrl ? { uri: userProfile.avatarUrl } : null;

  const monthlyLimit = isPro ? PRO_GENERATIVE_CREDITS_PER_MONTH : FREE_GENERATIVE_CREDITS_PER_MONTH;
  const currentKey = getMonthKey(new Date());
  const usedThisMonth =
    generativeCredits?.monthKey === currentKey ? Math.max(0, generativeCredits.usedThisMonth ?? 0) : 0;
  const remainingCredits = Math.max(0, monthlyLimit - usedThisMonth);

  const updateAvatar = (uri?: string) => {
    updateUserProfile((current) => ({
      ...current,
      avatarUrl: uri,
    }));
  };

  const handleImageResult = (result: ImagePicker.ImagePickerResult) => {
    if ('canceled' in result && result.canceled) {
      return;
    }
    const asset = result.assets?.[0];
    if (asset?.uri) {
      updateAvatar(asset.uri);
    }
  };

  const ensurePermission = async (type: 'camera' | 'library') => {
    if (type === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      return permission.granted;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return permission.granted;
  };

  const handlePick = async (type: 'camera' | 'library') => {
    if (isUpdatingAvatar) {
      return;
    }
    const hasPermission = await ensurePermission(type);
    if (!hasPermission) {
      Alert.alert(
        'Permission needed',
        type === 'camera'
          ? 'Allow camera access in Settings to take a new photo.'
          : 'Allow photo library access in Settings to choose an image.'
      );
      return;
    }

    try {
      setIsUpdatingAvatar(true);
      let result: ImagePicker.ImagePickerResult;
      const pickerOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      };
      if (type === 'camera') {
        result = await ImagePicker.launchCameraAsync(pickerOptions);
      } else {
        result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
      }
      handleImageResult(result);
    } catch (error) {
      console.error('Failed to update avatar', error);
      Alert.alert('Unable to update photo', 'Something went wrong. Please try again.');
    } finally {
      setIsUpdatingAvatar(false);
      setAvatarSheetVisible(false);
    }
  };

  const handleRemoveAvatar = () => {
    updateAvatar(undefined);
    setAvatarSheetVisible(false);
  };

  return (
    <AppShell>
      <View style={styles.screen}>
        <PageHeader
          title="Settings"
          menuOpen={menuOpen}
          onPressMenu={handleOpenMenu}
        />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Pro upsell (Free only). Keep this as a single, clear "Get Kwilt Pro" card. */}
          {!isPro ? (
            <View style={styles.proCardSection}>
              <LinearGradient colors={paywallTheme.gradientColors} style={styles.proCardGradient}>
                <VStack space="sm">
                  <Text style={styles.proCardKicker}>Get Kwilt Pro</Text>
                  <Text style={styles.proCardTitle}>Unlimited arcs + goals</Text>
                  <Text style={styles.proCardBody}>
                    Unlock family plans, longer focus sessions, Unsplash banners, and a much larger monthly AI budget.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Get Kwilt Pro"
                    onPress={() =>
                      openPaywallInterstitial({ reason: 'limit_arcs_total', source: 'settings' })
                    }
                    style={styles.proCardCta}
                  >
                    <Text style={styles.proCardCtaLabel}>Get Kwilt Pro</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Already subscribed? Restore purchases"
                    onPress={() => {
                      restore()
                        .then(() => {
                          Alert.alert('Restored', 'We refreshed your subscription status.');
                        })
                        .catch(() => {
                          Alert.alert(
                            'Restore failed',
                            'We could not restore purchases right now. Please try again.',
                          );
                        })
                        .finally(() => {
                          refreshEntitlements({ force: true }).catch(() => undefined);
                        });
                    }}
                    style={styles.proCardLink}
                  >
                    <Text style={styles.proCardLinkLabel}>Already subscribed? Restore purchases</Text>
                  </Pressable>
                </VStack>
              </LinearGradient>
            </View>
          ) : null}

          <View style={styles.profileRow}>
            <RNPressable
              style={styles.profileAvatarButton}
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
              accessibilityState={{ busy: isUpdatingAvatar }}
              hitSlop={8}
              disabled={isUpdatingAvatar}
              onPress={() => {
                if (isUpdatingAvatar) {
                  return;
                }
                setAvatarSheetVisible(true);
              }}
            >
              <ProfileAvatar
                name={userProfile?.fullName}
                avatarUrl={userProfile?.avatarUrl}
                size={64}
                borderRadius={16}
              />
            </RNPressable>
            <TouchableOpacity
              style={styles.profileInfoButton}
              accessibilityRole="button"
              accessibilityLabel="Edit your profile information"
              onPress={() => navigation.navigate('SettingsProfile')}
              activeOpacity={0.9}
            >
              <VStack flex={1} space="xs" style={styles.profileInfo}>
                <Text style={styles.profileTitle}>{displayName}</Text>
                {profileSubtitle ? (
                  <Text style={styles.profileSubtitle}>{profileSubtitle}</Text>
                ) : null}
              </VStack>
              <Icon name="chevronRight" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {/* Hide category labels; render a single flat list of settings items. */}
          {settingsItems.length > 0 && (
            <View style={styles.groupSection}>
              <VStack space="xs">
                {settingsItems.map((item) => {
                  const disabled = item.disabled || !item.route;
                  return (
                    <Pressable
                      key={item.id}
                      accessibilityRole={disabled ? undefined : 'button'}
                      accessibilityState={{ disabled }}
                      onPress={() => handleNavigate(item)}
                      disabled={disabled}
                    >
                      <HStack style={styles.itemRow} alignItems="center" space="md">
                        <View style={styles.itemIcon}>
                          <Icon
                            name={item.icon}
                            size={18}
                            color={disabled ? colors.textSecondary : colors.accent}
                          />
                        </View>
                        <VStack flex={1}>
                          <Text style={styles.itemTitle}>{item.title}</Text>
                        </VStack>
                        <HStack alignItems="center" space="xs">
                          {item.status === 'soon' && (
                            <View style={styles.badge}>
                              <Text style={styles.badgeLabel}>Soon</Text>
                            </View>
                          )}
                          {!disabled ? (
                            <Icon
                              name="chevronRight"
                              size={18}
                              color={colors.textSecondary}
                            />
                          ) : null}
                        </HStack>
                      </HStack>
                    </Pressable>
                  );
                })}
              </VStack>
            </View>
          )}
          {!hasMatches && (
            <View style={styles.emptyState}>
              <Heading style={styles.emptyTitle}>No settings yet</Heading>
              <Text style={styles.emptyBody}>
                Settings categories will appear here as they unlock.
              </Text>
            </View>
          )}

          {/* Subscriptions entry (moved to bottom of the list). */}
          <View style={styles.groupSection}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isPro ? 'Manage subscription' : 'View subscription plans'}
              onPress={() => {
                if (isPro) {
                  openManageSubscription().catch(() =>
                    navigation.navigate('SettingsManageSubscription')
                  );
                  return;
                }
                navigation.navigate('SettingsManageSubscription');
              }}
            >
              <HStack style={styles.itemRow} alignItems="center" space="md">
                <View style={styles.itemIcon}>
                  <Icon name="dot" size={18} color={colors.accent} />
                </View>
                <VStack flex={1}>
                  <Text style={styles.itemTitle}>Subscriptions</Text>
                  <Text style={styles.itemSubtitle}>
                    {`${isPro ? 'Manage in App Store' : 'See plans and pricing'} • AI credits: ${remainingCredits}/${monthlyLimit}`}
                  </Text>
                </VStack>
                <Icon name="chevronRight" size={18} color={colors.textSecondary} />
              </HStack>
            </Pressable>
          </View>
        </ScrollView>
        <BottomDrawer
          visible={avatarSheetVisible}
          onClose={() => {
            if (!isUpdatingAvatar) {
              setAvatarSheetVisible(false);
            }
          }}
          snapPoints={['45%']}
        >
          <View style={styles.sheetContent}>
            <Heading style={styles.sheetTitle}>Update photo</Heading>
            <Text style={styles.sheetSubtitle}>Make Kwilt feel unmistakably yours.</Text>
            <VStack space="sm">
              <Pressable
                style={styles.sheetOption}
                accessibilityRole="button"
                onPress={() => handlePick('camera')}
                disabled={isUpdatingAvatar}
              >
                <VStack>
                  <Text style={styles.sheetOptionTitle}>Take photo</Text>
                  <Text style={styles.sheetOptionDescription}>Open your camera</Text>
                </VStack>
              </Pressable>
              <Pressable
                style={styles.sheetOption}
                accessibilityRole="button"
                onPress={() => handlePick('library')}
                disabled={isUpdatingAvatar}
              >
                <VStack>
                  <Text style={styles.sheetOptionTitle}>Choose from library</Text>
                  <Text style={styles.sheetOptionDescription}>Pick an existing photo</Text>
                </VStack>
              </Pressable>
              {avatarSource ? (
                <Pressable
                  style={[styles.sheetOption, styles.sheetOptionDanger]}
                  accessibilityRole="button"
                  onPress={handleRemoveAvatar}
                  disabled={isUpdatingAvatar}
                >
                  <VStack>
                    <Text style={styles.sheetOptionTitleDanger}>Remove photo</Text>
                    <Text style={styles.sheetOptionDescription}>Use initials instead</Text>
                  </VStack>
                </Pressable>
              ) : null}
            </VStack>
          </View>
        </BottomDrawer>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing['2xl'],
    // Keep global spacing tight; we handle larger separations with section wrappers.
    gap: spacing.xs,
  },
  proCardSection: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  profileRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.canvas,
  },
  profileAvatarButton: {
    padding: spacing.xs,
    borderRadius: 24,
  },
  profileInfoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  profileInfo: {
    flex: 1,
  },
  profileTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: typography.titleSm.fontFamily,
  },
  profileSubtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  groupSection: {
    // Don't introduce extra vertical spacing; let the parent ScrollView `gap`
    // control spacing between adjacent blocks (XS).
    marginTop: 0,
    gap: 0,
  },
  proCard: {
    borderRadius: 18,
    backgroundColor: colors.shellAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  proCardGradient: {
    borderRadius: paywallTheme.cornerRadius,
    padding: paywallTheme.padding,
  },
  proCardKicker: {
    ...typography.bodySm,
    color: paywallTheme.foreground,
    opacity: 0.9,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  proCardTitle: {
    ...typography.titleLg,
    color: paywallTheme.foreground,
  },
  proCardBody: {
    ...typography.bodySm,
    color: paywallTheme.foreground,
    opacity: 0.92,
  },
  proCardCta: {
    marginTop: spacing.xs,
    backgroundColor: paywallTheme.ctaBackground,
    paddingVertical: spacing.sm,
    borderRadius: 14,
    alignItems: 'center',
  },
  proCardCtaLabel: {
    ...typography.body,
    color: paywallTheme.ctaForeground,
    fontFamily: typography.titleSm.fontFamily,
  },
  proCardLink: {
    alignSelf: 'center',
    paddingVertical: spacing.xs,
  },
  proCardLinkLabel: {
    ...typography.bodySm,
    color: paywallTheme.foreground,
    opacity: 0.92,
    textDecorationLine: 'underline',
  },
  itemRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.canvas,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.shellAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: typography.titleSm.fontFamily,
  },
  itemSubtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    backgroundColor: colors.shellAlt,
  },
  badgeLabel: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    fontSize: 10,
    letterSpacing: 1,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptyTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptyBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  sheetContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['2xl'],
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  sheetTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  sheetSubtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  sheetOption: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
  },
  sheetOptionDanger: {
    borderColor: colors.accentRoseStrong,
  },
  sheetOptionTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: typography.titleSm.fontFamily,
  },
  sheetOptionTitleDanger: {
    ...typography.body,
    color: colors.accentRoseStrong,
    fontFamily: typography.titleSm.fontFamily,
  },
  sheetOptionDescription: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
});


