import { Fragment, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import type { RootDrawerParamList, SettingsStackParamList } from '../../navigation/RootNavigator';
import { getAdminProCodesStatus } from '../../services/proCodes';
import { ensureSignedInWithPrompt, signOut } from '../../services/backend/auth';
import { clearAdminEntitlementsOverrideTier } from '../../services/entitlements';
import { unregisterPushToken } from '../../services/pushTokenService';
import { useAppStore } from '../../store/useAppStore';
import { useEntitlementsStore } from '../../store/useEntitlementsStore';
import { colors, fonts, spacing, typography } from '../../theme';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { Icon } from '../../ui/Icon';
import { ProfileAvatar } from '../../ui/ProfileAvatar';
import {
  SettingsDivider,
  SettingsGroup,
  SettingsRow,
} from '../../ui/SettingsSurface';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { Heading, Text, VStack } from '../../ui/primitives';
import { persistImageUri } from '../../utils/persistImageUri';

type SettingsNavigationProp = NativeStackNavigationProp<SettingsStackParamList, 'SettingsHome'>;
type SettingsRoute = Exclude<keyof SettingsStackParamList, 'SettingsPaywall'>;

type SettingsEntry = {
  id: string;
  title: string;
  route: SettingsRoute;
};

type SettingsSection = {
  id: string;
  title: string;
  entries: readonly SettingsEntry[];
};

const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  {
    id: 'planning',
    title: 'Planning',
    entries: [
      { id: 'activity_areas', title: 'Areas', route: 'SettingsActivityAreas' },
      { id: 'plan_availability', title: 'Availability', route: 'SettingsPlanAvailability' },
      { id: 'plan_calendars', title: 'Calendars', route: 'SettingsPlanCalendars' },
    ],
  },
  {
    id: 'people',
    title: 'People',
    entries: [
      { id: 'household', title: 'Household', route: 'SettingsHousehold' },
      { id: 'sharing', title: 'Sharing', route: 'SettingsSharing' },
    ],
  },
  {
    id: 'integrations',
    title: 'Integrations',
    entries: [
      { id: 'connected_tools', title: 'Apps & connections', route: 'SettingsConnectedTools' },
      { id: 'money_privacy', title: 'Money privacy', route: 'SettingsMoneyPrivacy' },
      { id: 'money_household', title: 'Money household', route: 'SettingsMoneyHousehold' },
    ],
  },
  {
    id: 'personalization',
    title: 'Personalization',
    entries: [
      { id: 'explore', title: 'Explore', route: 'SettingsExplore' },
      { id: 'games', title: 'Games', route: 'SettingsGames' },
      { id: 'notifications', title: 'Notifications', route: 'SettingsNotifications' },
      {
        id: 'screen_time_protection',
        title: 'Screen Time',
        route: 'SettingsScreenTimeProtection',
      },
      { id: 'weekly_chapters', title: 'Weekly Chapters', route: 'SettingsWeeklyChapters' },
    ],
  },
];

export function SettingsHomeScreen() {
  const authIdentity = useAppStore((state) => state.authIdentity);
  const userProfile = useAppStore((state) => state.userProfile);
  const updateUserProfile = useAppStore((state) => state.updateUserProfile);
  const isPro = useEntitlementsStore((state) => state.isPro);
  const navigation = useNavigation<SettingsNavigationProp>();
  const rootNavigation = navigation.getParent<NavigationProp<RootDrawerParamList>>();
  const [avatarSheetVisible, setAvatarSheetVisible] = useState(false);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [showSuperAdmin, setShowSuperAdmin] = useState(false);

  useEffect(() => {
    if (!authIdentity?.userId) {
      setShowSuperAdmin(false);
      clearAdminEntitlementsOverrideTier().catch(() => undefined);
      return;
    }

    getAdminProCodesStatus({ requireAuth: true })
      .then((status) => {
        setShowSuperAdmin(status.role === 'super_admin');
        if (status.httpStatus === 200 && status.role !== 'super_admin') {
          clearAdminEntitlementsOverrideTier().catch(() => undefined);
        }
      })
      .catch(() => setShowSuperAdmin(false));
  }, [authIdentity?.userId]);

  const handleBack = () => {
    if (rootNavigation?.canGoBack?.()) {
      rootNavigation.goBack();
      return;
    }
    if (navigation.canGoBack?.()) {
      navigation.goBack();
      return;
    }
    rootNavigation?.navigate('MainTabs', {
      screen: 'MoreTab',
      params: { screen: 'MoreHome' },
    });
  };

  const displayName = authIdentity?.name?.trim() || userProfile?.fullName?.trim() || 'Kwilter';
  const profileSubtitle = authIdentity?.email?.trim() || userProfile?.email?.trim() || 'Not signed in';
  const avatarUrl = authIdentity?.avatarUrl || userProfile?.avatarUrl;
  const avatarSource = avatarUrl ? { uri: avatarUrl } : null;
  const authEmailLower = (authIdentity?.email ?? '').trim().toLowerCase();
  const isDevKnownSuperAdminEmail =
    __DEV__ && (authEmailLower === 'mtkinji@gmail.com' || authEmailLower === 'andy@kwilt.app');

  const updateAvatar = (uri?: string) => {
    updateUserProfile((current) => ({ ...current, avatarUrl: uri }));
  };

  const handleImageResult = async (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.uri) return;
    const stableUri = await persistImageUri({
      uri: asset.uri,
      subdir: 'avatars',
      namePrefix: 'avatar',
    });
    updateAvatar(stableUri);
  };

  const ensurePermission = async (type: 'camera' | 'library') => {
    const permission = type === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    return permission.granted;
  };

  const handlePick = async (type: 'camera' | 'library') => {
    if (isUpdatingAvatar) return;
    if (!(await ensurePermission(type))) {
      Alert.alert(
        'Permission needed',
        type === 'camera'
          ? 'Allow camera access in Settings to take a new photo.'
          : 'Allow photo library access in Settings to choose an image.',
      );
      return;
    }

    try {
      setIsUpdatingAvatar(true);
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      };
      const result = type === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      await handleImageResult(result);
    } catch (error) {
      console.error('Failed to update avatar', error);
      Alert.alert('Unable to update photo', 'Something went wrong. Please try again.');
    } finally {
      setIsUpdatingAvatar(false);
      setAvatarSheetVisible(false);
    }
  };

  const handleSignIn = async () => {
    try {
      await ensureSignedInWithPrompt('settings');
      const status = await getAdminProCodesStatus();
      setShowSuperAdmin(status.role === 'super_admin');
    } catch {
      // Cancellation leaves Settings unchanged.
    }
  };

  const handleLogOut = () => {
    Alert.alert('Log out?', 'You can sign back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          try {
            await unregisterPushToken().catch(() => undefined);
            await signOut();
            await clearAdminEntitlementsOverrideTier().catch(() => undefined);
          } catch (error) {
            Alert.alert(
              'Unable to log out',
              error instanceof Error && error.message ? error.message : 'Please try again.',
            );
          }
        },
      },
    ]);
  };

  const renderRows = (
    entries: readonly {
      id: string;
      title: string;
      value?: string;
      destructive?: boolean;
      onPress: () => void;
    }[],
  ) => entries.map((entry, index) => (
    <Fragment key={entry.id}>
      <SettingsRow
        destructive={entry.destructive}
        onPress={entry.onPress}
        title={entry.title}
        value={entry.value}
      />
      {index < entries.length - 1 ? <SettingsDivider /> : null}
    </Fragment>
  ));

  const accountRows = [
    {
      id: 'accountSettings',
      title: 'Account settings',
      onPress: () => navigation.navigate('SettingsProfile'),
    },
    {
      id: 'subscriptions',
      title: 'Subscriptions',
      value: isPro ? 'Kwilt Pro' : 'Free',
      onPress: () => navigation.navigate('SettingsManageSubscription'),
    },
    {
      id: 'legalPrivacy',
      title: 'Legal & privacy',
      onPress: () => navigation.navigate('SettingsLegalPrivacy'),
    },
    authIdentity
      ? { id: 'logout', title: 'Log out', destructive: true, onPress: handleLogOut }
      : { id: 'signIn', title: 'Sign in', onPress: () => void handleSignIn() },
  ];

  const internalRows = [
    ...(__DEV__
      ? [{
          id: 'developerTools',
          title: 'Developer tools',
          onPress: () => rootNavigation?.navigate('DevTools'),
        }]
      : []),
    ...(showSuperAdmin || isDevKnownSuperAdminEmail
      ? [{
          id: 'superAdminTools',
          title: 'Admin Tools',
          onPress: () => navigation.navigate('SettingsSuperAdminTools'),
        }]
      : []),
  ];

  return (
    <AppShell backgroundVariant="shellAlt">
      <View style={styles.screen}>
        <PageHeader title="Settings" onPressBack={handleBack} />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.profileHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
              accessibilityState={{ busy: isUpdatingAvatar }}
              disabled={isUpdatingAvatar}
              hitSlop={8}
              onPress={() => setAvatarSheetVisible(true)}
              style={styles.profileAvatarPressable}
            >
              <View style={styles.profileAvatarWrap}>
                <ProfileAvatar name={displayName} avatarUrl={avatarUrl} size={96} />
                <View style={styles.profileAvatarBadge}>
                  <Icon name="camera" size={16} color={colors.canvas} />
                </View>
              </View>
            </Pressable>
            <Text style={styles.profileHeaderTitle} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.profileHeaderSubtitle} numberOfLines={1}>{profileSubtitle}</Text>
          </View>

          {SETTINGS_SECTIONS.map((section) => (
            <SettingsGroup key={section.id} title={section.title}>
              {renderRows(section.entries.map((entry) => ({
                ...entry,
                onPress: () => (navigation.navigate as (route: SettingsRoute) => void)(entry.route),
              })))}
            </SettingsGroup>
          ))}

          <SettingsGroup title="Account">
            {renderRows(accountRows)}
          </SettingsGroup>

          {internalRows.length > 0 ? (
            <SettingsGroup title="Internal">
              {renderRows(internalRows)}
            </SettingsGroup>
          ) : null}
        </ScrollView>

        <BottomDrawer
          visible={avatarSheetVisible}
          onClose={() => {
            if (!isUpdatingAvatar) setAvatarSheetVisible(false);
          }}
          snapPoints={['55%', '78%']}
        >
          <View style={styles.sheetContent}>
            <Heading style={styles.sheetTitle}>Update photo</Heading>
            <Text style={styles.sheetSubtitle}>Make Kwilt feel unmistakably yours.</Text>
            <VStack space="sm">
              <Pressable
                accessibilityRole="button"
                disabled={isUpdatingAvatar}
                onPress={() => void handlePick('camera')}
                style={styles.sheetOption}
              >
                <Text style={styles.sheetOptionTitle}>Take photo</Text>
                <Text style={styles.sheetOptionDescription}>Open your camera</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={isUpdatingAvatar}
                onPress={() => void handlePick('library')}
                style={styles.sheetOption}
              >
                <Text style={styles.sheetOptionTitle}>Choose from library</Text>
                <Text style={styles.sheetOptionDescription}>Pick an existing photo</Text>
              </Pressable>
              {avatarSource ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={isUpdatingAvatar}
                  onPress={() => {
                    updateAvatar(undefined);
                    setAvatarSheetVisible(false);
                  }}
                  style={[styles.sheetOption, styles.sheetOptionDanger]}
                >
                  <Text style={styles.sheetOptionTitleDanger}>Remove photo</Text>
                  <Text style={styles.sheetOptionDescription}>Use initials instead</Text>
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
    gap: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingBottom: 152,
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
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.canvas,
    borderRadius: 14,
    backgroundColor: colors.textPrimary,
  },
  profileHeaderTitle: {
    ...typography.titleMd,
    marginTop: spacing.md,
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
  },
  profileHeaderSubtitle: {
    ...typography.bodySm,
    marginTop: spacing.xs,
    color: colors.textSecondary,
  },
  sheetContent: {
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing['2xl'],
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
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
  },
  sheetOptionDanger: {
    borderColor: colors.destructive,
    backgroundColor: colors.destructiveForeground,
  },
  sheetOptionTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
  },
  sheetOptionTitleDanger: {
    ...typography.body,
    color: colors.destructive,
    fontFamily: fonts.semibold,
  },
  sheetOptionDescription: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
});
