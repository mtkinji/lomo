import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { VStack } from '@gluestack-ui/themed';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { Input } from '../../ui/Input';
import { spacing, cardSurfaceStyle } from '../../theme';
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

  useEffect(() => {
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const nextName = trimmedName || undefined;
    const nextEmail = trimmedEmail || undefined;

    if (
      nextName === (userProfile?.fullName ?? undefined) &&
      nextEmail === (userProfile?.email ?? undefined)
    ) {
      return;
    }

    const timeout = setTimeout(() => {
      updateUserProfile((current) => ({
        ...current,
        fullName: nextName,
        email: nextEmail,
      }));
    }, 300);

    return () => clearTimeout(timeout);
  }, [fullName, email, updateUserProfile, userProfile?.fullName, userProfile?.email]);

  return (
    <AppShell>
      <View style={styles.screen}>
        <PageHeader
          title="Profile"
          onPressBack={() => navigation.goBack()}
        />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
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
          </View>
        </ScrollView>
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
  card: {
    ...cardSurfaceStyle,
    padding: spacing.lg,
    gap: spacing.md,
  },
});


