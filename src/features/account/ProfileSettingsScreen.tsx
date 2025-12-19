import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { spacing, cardSurfaceStyle } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { Input, KeyboardAwareScrollView } from '../../ui/primitives';

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
  const [birthdate, setBirthdate] = useState(userProfile?.birthdate ?? '');
  const [isBirthdatePickerVisible, setIsBirthdatePickerVisible] = useState(false);

  const commitProfile = (override?: { birthdate?: string }) => {
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedBirthdate = (override?.birthdate ?? birthdate).trim();
    const nextName = trimmedName || undefined;
    const nextEmail = trimmedEmail || undefined;
    const nextBirthdate = trimmedBirthdate || undefined;

    if (
      nextName === (userProfile?.fullName ?? undefined) &&
      nextEmail === (userProfile?.email ?? undefined) &&
      nextBirthdate === (userProfile?.birthdate ?? undefined)
    ) {
      return;
    }

    updateUserProfile((current) => ({
      ...current,
      fullName: nextName,
      email: nextEmail,
      birthdate: nextBirthdate,
    }));
  };

  useEffect(() => {
    setFullName(userProfile?.fullName ?? '');
    setEmail(userProfile?.email ?? '');
    setBirthdate(userProfile?.birthdate ?? '');
  }, [userProfile?.fullName, userProfile?.email, userProfile?.birthdate]);

  const getInitialBirthdateForPicker = () => {
    if (birthdate) {
      const parsed = new Date(birthdate);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    // Reasonable default if none is set: 25 years ago from today.
    const today = new Date();
    return new Date(today.getFullYear() - 25, today.getMonth(), today.getDate());
  };

  const handleBirthdateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS !== 'ios') {
      setIsBirthdatePickerVisible(false);
    }

    if (!date || event.type === 'dismissed') {
      return;
    }

    // Use local calendar date instead of UTC to avoid off-by-one issues when
    // converting to ISO strings.
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const formatted = `${year}-${month}-${day}`;

    setBirthdate(formatted);
    commitProfile({ birthdate: formatted });
  };

  return (
    <AppShell>
      <View style={styles.screen}>
        <PageHeader
          title="Profile"
          onPressBack={() => navigation.goBack()}
        />
        <KeyboardAwareScrollView
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
              onBlur={() => commitProfile()}
              autoCapitalize="words"
              variant="outline"
            />
            <Input
              label="Birthday"
              placeholder="YYYY-MM-DD"
              value={birthdate}
              onChangeText={() => {}}
              onFocus={() => setIsBirthdatePickerVisible(true)}
              showSoftInputOnFocus={false}
              variant="outline"
            />
            <Input
              label="Email"
              placeholder="name@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              onBlur={() => commitProfile()}
              variant="outline"
            />
          </View>
          {isBirthdatePickerVisible && (
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                value={getInitialBirthdateForPicker()}
                onChange={handleBirthdateChange}
                maximumDate={new Date()}
              />
            </View>
          )}
        </KeyboardAwareScrollView>
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
  datePickerContainer: {
    marginTop: spacing.md,
  },
});


