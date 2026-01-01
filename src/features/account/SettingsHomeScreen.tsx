import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable as RNPressable, ScrollView, StyleSheet, View, Pressable, Share } from 'react-native';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { useDrawerStatus } from '@react-navigation/drawer';
import * as ImagePicker from 'expo-image-picker';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { Icon, IconName } from '../../ui/Icon';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { colors, fonts, spacing, typography } from '../../theme';
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
import { LinearGradient } from 'expo-linear-gradient';
import { paywallTheme } from '../paywall/paywallTheme';
import { openManageSubscription } from '../../services/entitlements';
import { createReferralCode } from '../../services/referrals';
import { getAdminProCodesStatus } from '../../services/proCodes';
import { signOut } from '../../services/backend/auth';
import { withHapticPress } from '../../ui/haptics/withHapticPress';

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
        id: 'haptics',
        title: 'Haptics',
        description: 'Make key moments feel more immersive.',
        icon: 'haptics',
        route: 'SettingsHaptics',
        tags: ['feedback', 'touch', 'immersion'],
      },
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
  const authIdentity = useAppStore((state) => state.authIdentity);
  const userProfile = useAppStore((state) => state.userProfile);
  const updateUserProfile = useAppStore((state) => state.updateUserProfile);
  const navigation = useNavigation<SettingsNavigationProp>();
  const drawerNavigation = navigation.getParent<DrawerNavigationProp<RootDrawerParamList>>();
  const drawerStatus = useDrawerStatus();
  const menuOpen = drawerStatus === 'open';
  const [avatarSheetVisible, setAvatarSheetVisible] = useState(false);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const generativeCredits = useAppStore((state) => state.generativeCredits);
  const bonusGenerativeCredits = useAppStore((state) => state.bonusGenerativeCredits);
  const isPro = useEntitlementsStore((state) => state.isPro);
  const restore = useEntitlementsStore((state) => state.restore);
  const refreshEntitlements = useEntitlementsStore((state) => state.refreshEntitlements);
  const [showAdmin, setShowAdmin] = useState(false);

  const settingsItems = useMemo(() => SETTINGS_GROUPS.flatMap((group) => group.items), []);

  useEffect(() => {
    // Best-effort: only show Admin entry if the signed-in user is allowlisted server-side.
    // Fail closed (hidden) to avoid confusing non-admin users.
    getAdminProCodesStatus()
      .then((s) => setShowAdmin(Boolean(s.isAdmin)))
      .catch(() => setShowAdmin(false));
  }, []);

  const handleNavigate = (item: SettingsItem) => {
    if (item.disabled || !item.route) {
      return;
    }
    navigation.navigate(item.route);
  };

  type RowAction = {
    id: string;
    title: string;
    icon: IconName;
    onPress?: () => void;
    disabled?: boolean;
    status?: 'new' | 'soon';
    variant?: 'default' | 'destructive';
    showChevron?: boolean;
  };

  const renderRow = (row: RowAction, { isLast }: { isLast: boolean }) => {
    const disabled = Boolean(row.disabled) || !row.onPress;
    const showChevron = row.showChevron ?? (!disabled && row.variant !== 'destructive');
    const iconColor =
      row.variant === 'destructive'
        ? colors.accentRoseStrong
        : disabled
          ? colors.textSecondary
          : colors.textPrimary;
    const titleColor =
      row.variant === 'destructive'
        ? colors.accentRoseStrong
        : disabled
          ? colors.textSecondary
          : colors.textPrimary;

    return (
      <Pressable
        key={row.id}
        accessibilityRole={disabled ? undefined : 'button'}
        accessibilityState={{ disabled }}
        onPress={withHapticPress(row.onPress, 'canvas.selection')}
        disabled={disabled}
        style={({ pressed }) => [
          styles.listRow,
          pressed && !disabled ? styles.listRowPressed : null,
          !isLast && styles.listRowGap,
        ]}
      >
        <View style={styles.listRowIcon}>
          <Icon name={row.icon} size={18} color={iconColor} />
        </View>
        <VStack flex={1} space={0}>
          <Text style={[styles.listRowTitle, { color: titleColor }]}>{row.title}</Text>
        </VStack>
        <HStack alignItems="center" space="xs">
          {row.status === 'soon' ? (
            <View style={styles.badge}>
              <Text style={styles.badgeLabel}>Soon</Text>
            </View>
          ) : null}
          {showChevron ? <Icon name="chevronRight" size={18} color={colors.textSecondary} /> : null}
        </HStack>
      </Pressable>
    );
  };

  const handleOpenMenu = () => {
    if (drawerNavigation) {
      drawerNavigation.dispatch(DrawerActions.openDrawer());
    }
  };

  const displayName = authIdentity?.name?.trim() || userProfile?.fullName?.trim() || 'Kwilter';
  const profileSubtitle = authIdentity?.email?.trim() || userProfile?.email?.trim() || 'Not signed in';
  const avatarUrl = authIdentity?.avatarUrl || userProfile?.avatarUrl;
  const avatarSource = avatarUrl ? { uri: avatarUrl } : null;

  const baseMonthlyLimit = isPro ? PRO_GENERATIVE_CREDITS_PER_MONTH : FREE_GENERATIVE_CREDITS_PER_MONTH;
  const currentKey = getMonthKey(new Date());
  const bonusRaw =
    bonusGenerativeCredits?.monthKey === currentKey ? Number(bonusGenerativeCredits.bonusThisMonth ?? 0) : 0;
  const bonusThisMonth = Number.isFinite(bonusRaw) ? Math.max(0, Math.floor(bonusRaw)) : 0;
  const monthlyLimit = baseMonthlyLimit + bonusThisMonth;
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

  const accountRows: RowAction[] = [
    {
      id: 'accountSettings',
      title: 'Account settings',
      icon: 'identity',
      onPress: () => navigation.navigate('SettingsProfile'),
      showChevron: true,
    },
    {
      id: 'subscriptions',
      title: 'Subscriptions',
      icon: 'cart',
      onPress: () => {
        if (isPro) {
          openManageSubscription().catch(() => navigation.navigate('SettingsManageSubscription'));
          return;
        }
        navigation.navigate('SettingsManageSubscription');
      },
      showChevron: true,
    },
    {
      id: 'inviteFriend',
      title: 'Invite a friend',
      icon: 'share',
      onPress: async () => {
        try {
          const code = await createReferralCode();
          const link = `kwilt://referral?code=${encodeURIComponent(code)}`;
          await Share.share({
            message: `Try Kwilt — it’s helping me turn motivation into a real plan.\n\nOpen this link after you install: ${link}`,
          });
        } catch (err: any) {
          Alert.alert(
            'Unable to create invite',
            typeof err?.message === 'string' ? err.message : 'Please try again in a moment.',
          );
        }
      },
      showChevron: true,
    },
  ];

  const personalizationRows: RowAction[] = settingsItems.map((item) => ({
    id: item.id,
    title: item.title,
    icon: item.icon,
    onPress: item.disabled || !item.route ? undefined : () => handleNavigate(item),
    disabled: item.disabled || !item.route,
    status: item.status,
    showChevron: true,
  }));

  const utilityRows: RowAction[] = [
    ...(!isPro
      ? ([
          {
            id: 'redeemProCode',
            title: 'Redeem Pro code',
            icon: 'sparkles',
            onPress: () => navigation.navigate('SettingsRedeemProCode'),
            showChevron: true,
          },
        ] satisfies RowAction[])
      : []),
    ...(showAdmin
      ? ([
          {
            id: 'admin',
            title: 'Admin',
            icon: 'dev',
            onPress: () => navigation.navigate('SettingsAdminProCodes'),
            showChevron: true,
          },
        ] satisfies RowAction[])
      : []),
    ...(authIdentity
      ? ([
          {
            id: 'logout',
            title: 'Log out',
            icon: 'lock',
            showChevron: false,
            onPress: () => {
              Alert.alert('Log out?', 'You can sign back in anytime.', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Log out',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await signOut();
                    } catch (err: any) {
                      Alert.alert(
                        'Unable to log out',
                        typeof err?.message === 'string' ? err.message : 'Please try again.',
                      );
                    }
                  },
                },
              ]);
            },
          },
        ] satisfies RowAction[])
      : []),
  ];

  const allRows: RowAction[] = [...accountRows, ...personalizationRows, ...utilityRows];

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
          <View style={styles.profileHeader}>
            <RNPressable
              style={styles.profileAvatarPressable}
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
              accessibilityState={{ busy: isUpdatingAvatar }}
              hitSlop={8}
              disabled={isUpdatingAvatar}
              onPress={() => {
                if (isUpdatingAvatar) return;
                setAvatarSheetVisible(true);
              }}
            >
              <View style={styles.profileAvatarWrap}>
                <ProfileAvatar name={displayName} avatarUrl={avatarUrl} size={96} />
                <View style={styles.profileAvatarBadge}>
                  <Icon name="camera" size={16} color={colors.canvas} />
                </View>
              </View>
            </RNPressable>
            <Text style={styles.profileHeaderTitle} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.profileHeaderSubtitle} numberOfLines={1}>
              {profileSubtitle}
            </Text>
          </View>

          {/* Pro upsell (Free only). Keep this as a single, clear "Get Kwilt Pro" card. */}
          {!isPro ? (
            <View style={styles.proCardSection}>
              <LinearGradient colors={paywallTheme.gradientColors} style={styles.proCardGradient}>
                <VStack space="sm">
                  <Text style={styles.proCardKicker}>Get Kwilt Pro</Text>
                  <Text style={styles.proCardTitle}>Unlimited arcs + goals</Text>
                  <Text style={styles.proCardBody}>
                    Unlock family plans, longer focus sessions, searchable banner images, and a much larger monthly AI budget.
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

          {allRows.length > 0 ? (
            <View>
              {allRows.map((row, idx) => renderRow(row, { isLast: idx === allRows.length - 1 }))}
            </View>
          ) : null}
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
    gap: spacing.md,
  },
  proCardSection: {
    marginTop: 0,
    marginBottom: 0,
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  profileAvatarPressable: {
    borderRadius: 999,
  },
  profileAvatarWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.canvas,
  },
  profileHeaderTitle: {
    ...typography.titleMd,
    fontFamily: fonts.semibold,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  profileHeaderSubtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
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
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 12,
  },
  listRowPressed: {
    backgroundColor: colors.shellAlt,
  },
  listRowGap: {
    marginBottom: spacing.sm,
  },
  listRowIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listRowTitle: {
    ...typography.body,
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


