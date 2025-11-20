import { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable as RNPressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  GestureResponderEvent,
} from 'react-native';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { useDrawerStatus } from '@react-navigation/drawer';
import { HStack, Heading, Pressable, Text, VStack } from '@gluestack-ui/themed';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import * as ImagePicker from 'expo-image-picker';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { Icon, IconName } from '../../ui/Icon';
import { LomoBottomSheet } from '../../ui/BottomSheet';
import { colors, spacing, typography } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import type {
  RootDrawerParamList,
  SettingsStackParamList,
} from '../../navigation/RootNavigator';

type SettingsNavigationProp = NativeStackNavigationProp<
  SettingsStackParamList,
  'SettingsHome'
>;

type SettingsItem = {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  route?: keyof SettingsStackParamList;
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
        id: 'appearance',
        title: 'Appearance',
        description: 'Choose thumbnail treatments and visual accents.',
        icon: 'image',
        route: 'SettingsAppearance',
        tags: ['visuals', 'thumbnail', 'theme'],
      },
      {
        id: 'notifications',
        title: 'Notifications',
        description: 'Plan gentle reminders from LOMO.',
        icon: 'activities',
        disabled: true,
        status: 'soon',
        tags: ['reminders', 'nudges', 'alerts'],
      },
    ],
  },
  {
    id: 'account',
    title: 'Account & trust',
    description: 'Privacy, supervision, and data sharing preferences.',
    items: [
      {
        id: 'profile',
        title: 'Profile & family',
        description: 'Update who is connected to this account.',
        icon: 'goals',
        disabled: true,
        status: 'soon',
        tags: ['family', 'profile', 'household'],
      },
    ],
  },
];

const getInitials = (name?: string) => {
  if (!name) {
    return 'YW';
  }
  const parts = name.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '');
  return initials.join('') || 'YW';
};

export function SettingsHomeScreen() {
  const userProfile = useAppStore((state) => state.userProfile);
  const updateUserProfile = useAppStore((state) => state.updateUserProfile);
  const navigation = useNavigation<SettingsNavigationProp>();
  const drawerNavigation = navigation.getParent<DrawerNavigationProp<RootDrawerParamList>>();
  const drawerStatus = useDrawerStatus();
  const menuOpen = drawerStatus === 'open';
  const [avatarSheetVisible, setAvatarSheetVisible] = useState(false);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);

  const filteredGroups = useMemo(() => {
    return SETTINGS_GROUPS;
  }, []);

  const hasMatches =
    filteredGroups.length > 0 &&
    filteredGroups.some((group) => group.items.length > 0);

  const handleNavigate = (item: SettingsItem) => {
    if (item.disabled || !item.route) {
      return;
    }
    navigation.navigate(item.route);
  };

  const displayName = userProfile?.fullName?.trim() || 'Your profile';
  const profileSubtitle = userProfile?.email?.trim() || 'Add your email address';
  const avatarSource = userProfile?.avatarUrl ? { uri: userProfile.avatarUrl } : null;
  const avatarInitials = getInitials(userProfile?.fullName);

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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
          onPressMenu={() => drawerNavigation?.dispatch(DrawerActions.openDrawer())}
        />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.profileRow}
            accessibilityRole="button"
            accessibilityLabel="Edit your profile information"
            onPress={() => navigation.navigate('SettingsProfile')}
            activeOpacity={0.9}
          >
            <RNPressable
              style={styles.profileAvatarButton}
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
              onPress={(event: GestureResponderEvent) => {
                event.stopPropagation();
                setAvatarSheetVisible(true);
              }}
            >
              <View style={styles.profileAvatar}>
                {avatarSource ? (
                  <Image source={avatarSource} style={styles.profileAvatarImage} />
                ) : (
                  <Text style={styles.profileAvatarInitials}>{avatarInitials}</Text>
                )}
              </View>
            </RNPressable>
            <VStack flex={1} space="xs" style={styles.profileInfo}>
              <Text style={styles.profileTitle}>{displayName}</Text>
              {profileSubtitle ? (
                <Text style={styles.profileSubtitle}>{profileSubtitle}</Text>
              ) : null}
            </VStack>
            <Icon name="chevronRight" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          {filteredGroups.map((group) => (
            <View key={group.id} style={styles.groupSection}>
              <VStack space="xs" style={styles.groupHeader}>
                <Heading style={styles.groupTitle}>{group.title}</Heading>
                <Text style={styles.groupDescription}>{group.description}</Text>
              </VStack>
              <VStack space="sm">
                {group.items.map((item) => {
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
                        <VStack flex={1} space="xs">
                          <Text style={styles.itemTitle}>{item.title}</Text>
                          <Text style={styles.itemDescription}>{item.description}</Text>
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
          ))}
          {!hasMatches && (
            <View style={styles.emptyState}>
              <Heading style={styles.emptyTitle}>No settings yet</Heading>
              <Text style={styles.emptyBody}>
                Settings categories will appear here as they unlock.
              </Text>
            </View>
          )}
        </ScrollView>
        <LomoBottomSheet
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
            <Text style={styles.sheetSubtitle}>Make LOMO feel unmistakably yours.</Text>
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
        </LomoBottomSheet>
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
    gap: spacing.lg,
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
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.shellAlt,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profileAvatarImage: {
    width: '100%',
    height: '100%',
  },
  profileAvatarInitials: {
    ...typography.titleSm,
    color: colors.textPrimary,
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
    gap: spacing.md,
  },
  groupHeader: {
    marginBottom: spacing.xs,
  },
  groupTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  groupDescription: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  itemRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
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
  itemDescription: {
    ...typography.bodySm,
    color: colors.textSecondary,
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


