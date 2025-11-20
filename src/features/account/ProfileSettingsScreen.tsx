import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Heading, Text, VStack } from '@gluestack-ui/themed';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { colors, spacing, typography, cardSurfaceStyle } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';

type SettingsNavigationProp = NativeStackNavigationProp<
  SettingsStackParamList,
  'SettingsProfile'
>;

export function ProfileSettingsScreen() {
  const navigation = useNavigation<SettingsNavigationProp>();
  const userProfile = useAppStore((state) => state.userProfile);
  const updateUserProfile = useAppStore((state) => state.updateUserProfile);

  const [fullName, setFullName] = useState(userProfile?.fullName ?? '');
  const [email, setEmail] = useState(userProfile?.email ?? '');

  useEffect(() => {
    setFullName(userProfile?.fullName ?? '');
    setEmail(userProfile?.email ?? '');
  }, [userProfile?.fullName, userProfile?.email]);

  const fullNameTrimmed = fullName.trim();
  const emailTrimmed = email.trim();
  const dirty =
    fullNameTrimmed !== (userProfile?.fullName ?? '') ||
    emailTrimmed !== (userProfile?.email ?? '');

  const handleSave = () => {
    updateUserProfile((current) => ({
      ...current,
      fullName: fullNameTrimmed || undefined,
      email: emailTrimmed || undefined,
    }));
    navigation.goBack();
  };

  return (
    <AppShell>
      <View style={styles.screen}>
        <PageHeader
          title="Profile details"
          onPressBack={() => navigation.goBack()}
        />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <VStack space="sm">
            <Text style={styles.metaLabel}>Account</Text>
            <Heading style={styles.title}>Tell LOMO who you are</Heading>
            <Text style={styles.description}>
              Your name and email stay on-device. We use them to personalize greetings and
              future shared-family features.
            </Text>
          </VStack>

          <View style={styles.card}>
            <Input
              label="Full name"
              placeholder="Add your name"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              variant="outline"
            />
            <Input
              label="Email"
              placeholder="name@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              variant="outline"
            />
            <Text style={styles.helper}>
              Email lets LOMO send optional summaries later. We never share it.
            </Text>
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <Button
            variant="ghost"
            onPress={() => navigation.goBack()}
            style={styles.footerButton}
          >
            <Text style={styles.footerGhostLabel}>Cancel</Text>
          </Button>
          <Button
            variant="accent"
            disabled={!dirty}
            onPress={handleSave}
            style={styles.footerButton}
          >
            <Text style={styles.footerAccentLabel}>Save</Text>
          </Button>
        </View>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing['2xl'],
    gap: spacing.lg,
  },
  metaLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  title: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  description: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  card: {
    ...cardSurfaceStyle,
    padding: spacing.lg,
    gap: spacing.md,
  },
  helper: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg + spacing.xs,
    paddingTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  footerButton: {
    flex: 1,
  },
  footerGhostLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  footerAccentLabel: {
    ...typography.bodySm,
    color: colors.canvas,
  },
});


