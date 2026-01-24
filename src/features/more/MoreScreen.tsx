import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { HStack, VStack, Text } from '../../ui/primitives';
import { Icon, type IconName } from '../../ui/Icon';
import { colors, spacing, typography, fonts } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import { useEntitlementsStore } from '../../store/useEntitlementsStore';
import type { RootDrawerParamList, MoreStackParamList } from '../../navigation/RootNavigator';

type MoreNavigation = NavigationProp<MoreStackParamList> & NavigationProp<RootDrawerParamList>;

type MoreRowProps = {
  title: string;
  subtitle?: string;
  icon: IconName;
  onPress?: () => void;
};

function MoreRow({ title, subtitle, icon, onPress }: MoreRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.rowPressable, pressed && styles.rowPressablePressed]}
    >
      <View style={styles.row}>
        <HStack alignItems="center" justifyContent="space-between" space="sm">
          <HStack alignItems="center" space="sm" style={styles.rowLeft}>
            <View style={styles.rowIcon}>
              <Icon name={icon} size={22} color={colors.textPrimary} />
            </View>
            <VStack space="xs" style={styles.rowText}>
              <Text style={styles.rowTitle}>{title}</Text>
              {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
            </VStack>
          </HStack>
          <Icon name="chevronRight" size={20} color={colors.textSecondary} />
        </HStack>
      </View>
    </Pressable>
  );
}

export function MoreScreen() {
  const navigation = useNavigation<MoreNavigation>();
  const insets = useSafeAreaInsets();
  const isPro = useEntitlementsStore((state) => state.isPro);

  return (
    <AppShell>
      <PageHeader title="More" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: spacing['2xl'] + insets.bottom,
          },
        ]}
      >
        <View style={styles.list}>
          <MoreRow
            title="Arcs"
            subtitle="Your long-term arcs and narratives."
            icon="arcs"
            onPress={() => navigation.navigate('MoreArcs', { screen: 'ArcsList' })}
          />
          <View style={styles.divider} />
          <MoreRow
            title="Chapters"
            subtitle="Weekly recap of your accomplishments."
            icon="chapters"
            onPress={() => navigation.navigate('MoreChapters')}
          />
          <View style={styles.divider} />
          <MoreRow
            title="Settings"
            subtitle="Profile, notifications, and preferences."
            icon="settings"
            onPress={() => navigation.navigate('Settings', { screen: 'SettingsHome' })}
          />
          {!isPro ? (
            <>
              <View style={styles.divider} />
              <MoreRow
                title="Upgrade to Kwilt Pro"
                subtitle="Unlock more planning power, custom AI, and advanced workflows."
                icon="sparkles"
                onPress={() => {
                  navigation.navigate('Settings', {
                    screen: 'SettingsManageSubscription',
                    params: {
                      openPricingDrawer: true,
                      openPricingDrawerNonce: Date.now(),
                    },
                  });
                }}
              />
            </>
          ) : null}
        </View>

        {!isPro ? (
          // Upgrade row is included above in the list.
          null
        ) : null}
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.xs,
  },
  list: {
    marginTop: spacing.xs,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  rowPressable: {
    borderRadius: 0,
  },
  rowPressablePressed: {
    backgroundColor: colors.gray100,
  },
  row: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  rowLeft: {
    flex: 1,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.shellAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    ...typography.body,
    fontFamily: fonts.semibold,
    color: colors.textPrimary,
  },
  rowSubtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 0,
  },
});

