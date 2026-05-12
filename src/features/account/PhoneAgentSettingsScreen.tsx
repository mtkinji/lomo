import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { HStack, Text, VStack } from '../../ui/primitives';
import { colors, fonts, spacing, typography } from '../../theme';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import {
  getPhoneAgentStatus,
  requestPhoneAgentCode,
  revokePhoneAgentLink,
  updatePhoneAgentSettings,
  verifyPhoneAgentCode,
  type PhoneAgentLink,
  type PhoneAgentStatus,
} from '../../services/phoneAgent';

type PhoneAgentSettingsNavigationProp = NativeStackNavigationProp<
  SettingsStackParamList,
  'SettingsPhoneAgent'
>;

type PermissionRow = {
  key: string;
  title: string;
  description: string;
};

const PERMISSION_ROWS: PermissionRow[] = [
  {
    key: 'create_activities',
    title: 'Save texts as To-dos',
    description: 'Text Kwilt and create a normal Activity in your app canvas.',
  },
  {
    key: 'send_followups',
    title: 'Send follow-ups',
    description: 'Let Phone Agent send gentle right-time prompts.',
  },
  {
    key: 'log_done_replies',
    title: 'Close loops by text',
    description: 'Reply done to mark the latest Phone Agent follow-up complete.',
  },
  {
    key: 'offer_drafts',
    title: 'Offer drafts',
    description: 'Let Phone Agent suggest message drafts before you send them.',
  },
  {
    key: 'suggest_arc_alignment',
    title: 'Suggest Arc alignment',
    description: 'Let Phone Agent notice when a capture may belong to an Arc.',
  },
];

const EMPTY_STATUS: PhoneAgentStatus = {
  links: [],
  memorySummary: { peopleCount: 0, activeEventsCount: 0, activeCadencesCount: 0 },
  recentActions: [],
};

function firstLink(status: PhoneAgentStatus): PhoneAgentLink | null {
  return status.links[0] ?? null;
}

export function PhoneAgentSettingsScreen() {
  const navigation = useNavigation<PhoneAgentSettingsNavigationProp>();
  const [status, setStatus] = useState<PhoneAgentStatus>(EMPTY_STATUS);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [promptCapText, setPromptCapText] = useState('3');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const link = firstLink(status);

  const loadStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const next = await getPhoneAgentStatus();
      setStatus(next);
      const currentLink = firstLink(next);
      if (currentLink) {
        setPhone(currentLink.phone);
        setPromptCapText(String(currentLink.promptCapPerDay));
      }
    } catch (error) {
      Alert.alert('Phone Agent unavailable', error instanceof Error ? error.message : 'Unable to load Phone Agent settings.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const memorySummary = useMemo(() => {
    const { peopleCount, activeEventsCount, activeCadencesCount } = status.memorySummary;
    return `${peopleCount} remembered people · ${activeEventsCount} active events · ${activeCadencesCount} active cadences`;
  }, [status.memorySummary]);

  const currentPermissions = link?.permissions ?? {};

  const saveSettings = useCallback(async (permissions: Record<string, boolean>, promptCap = Number(promptCapText)) => {
    if (!link) return;
    setIsSaving(true);
    try {
      const next = await updatePhoneAgentSettings({
        phone: link.phone,
        permissions,
        promptCapPerDay: Number.isFinite(promptCap) ? promptCap : link.promptCapPerDay,
      });
      setStatus(next);
    } catch (error) {
      Alert.alert('Could not save Phone Agent settings', error instanceof Error ? error.message : 'Try again in a moment.');
    } finally {
      setIsSaving(false);
    }
  }, [link, promptCapText]);

  const handleRequestCode = async () => {
    setIsSaving(true);
    try {
      await requestPhoneAgentCode(phone);
      Alert.alert('Code sent', 'Check your phone for a Kwilt verification code.');
    } catch (error) {
      Alert.alert('Could not send code', error instanceof Error ? error.message : 'Check the phone number and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerifyCode = async () => {
    setIsSaving(true);
    try {
      await verifyPhoneAgentCode(phone, code);
      setCode('');
      await loadStatus();
      Alert.alert('Phone linked', 'Text Kwilt is ready. Choose which actions Phone Agent can take.');
    } catch (error) {
      Alert.alert('Could not verify code', error instanceof Error ? error.message : 'Check the code and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePermissionToggle = (key: string, enabled: boolean) => {
    void saveSettings({ ...currentPermissions, [key]: enabled });
  };

  const handlePromptCapSave = () => {
    void saveSettings(currentPermissions, Number(promptCapText));
  };

  const handlePauseAll = () => {
    void saveSettings({
      ...currentPermissions,
      send_followups: false,
      log_done_replies: false,
      offer_drafts: false,
    });
  };

  const handleRevoke = async () => {
    if (!link) return;
    setIsSaving(true);
    try {
      await revokePhoneAgentLink(link.phone);
      setStatus(EMPTY_STATUS);
      setPhone('');
      setCode('');
      Alert.alert('Phone revoked', 'This number is no longer linked to Phone Agent.');
    } catch (error) {
      Alert.alert('Could not revoke phone', error instanceof Error ? error.message : 'Try again in a moment.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppShell>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageHeader title="Phone Agent" onPressBack={() => navigation.goBack()}>
          <Text style={styles.body}>Text Kwilt to capture, follow up, and close loops from the moment life happens.</Text>
        </PageHeader>

        <Card style={styles.card}>
          <VStack space="md">
            <Text style={styles.sectionTitle}>Linked phone</Text>
            <Text style={styles.body}>
              {link ? `${link.phone} · ${link.status}${link.optedOutAt ? ' · opted out' : ''}` : 'No phone linked yet.'}
            </Text>
            <Input
              label="Phone number"
              value={phone}
              onChangeText={setPhone}
              placeholder="+1 415 555 1212"
              keyboardType="phone-pad"
              autoCapitalize="none"
              editable={!isSaving}
            />
            <HStack space="sm">
              <Button size="sm" variant="secondary" onPress={handleRequestCode} disabled={!phone || isSaving}>
                Request code
              </Button>
            </HStack>
            <Input
              label="Verification code"
              value={code}
              onChangeText={setCode}
              placeholder="123456"
              keyboardType="number-pad"
              editable={!isSaving}
            />
            <Button size="sm" variant="primary" onPress={handleVerifyCode} disabled={!phone || !code || isSaving}>
              Verify phone
            </Button>
          </VStack>
        </Card>

        <Card style={styles.card}>
          <VStack space="md">
            <Text style={styles.sectionTitle}>Relationship memory</Text>
            <Text style={styles.body}>{memorySummary}</Text>
            <Text style={styles.caption}>Internal only for this beta. There is no People list or CRM surface.</Text>
          </VStack>
        </Card>

        <Card style={styles.card}>
          <VStack space="md">
            <Text style={styles.sectionTitle}>Permissions</Text>
            {PERMISSION_ROWS.map((row) => (
              <HStack key={row.key} alignItems="center" justifyContent="space-between" space="md" style={styles.permissionRow}>
                <VStack flex={1} space="xs">
                  <Text style={styles.permissionTitle}>{row.title}</Text>
                  <Text style={styles.caption}>{row.description}</Text>
                </VStack>
                <Switch
                  value={currentPermissions[row.key] === true}
                  onValueChange={(enabled) => handlePermissionToggle(row.key, enabled)}
                  disabled={!link || isSaving}
                />
              </HStack>
            ))}
          </VStack>
        </Card>

        <Card style={styles.card}>
          <VStack space="md">
            <Text style={styles.sectionTitle}>Prompt cap</Text>
            <Text style={styles.body}>Limit how many Phone Agent prompts can be sent each day.</Text>
            <Input
              label="Prompts per day"
              value={promptCapText}
              onChangeText={setPromptCapText}
              keyboardType="number-pad"
              editable={Boolean(link) && !isSaving}
            />
            <Button size="sm" variant="secondary" onPress={handlePromptCapSave} disabled={!link || isSaving}>
              Save prompt cap
            </Button>
          </VStack>
        </Card>

        <Card style={styles.card}>
          <VStack space="md">
            <Text style={styles.sectionTitle}>Recent activity</Text>
            {status.recentActions.length === 0 ? (
              <Text style={styles.body}>No Phone Agent actions yet.</Text>
            ) : (
              status.recentActions.map((action) => (
                <View key={action.id} style={styles.actionRow}>
                  <Text style={styles.permissionTitle}>{action.actionType}</Text>
                  <Text style={styles.caption}>{new Date(action.createdAt).toLocaleString()}</Text>
                </View>
              ))
            )}
          </VStack>
        </Card>

        <HStack space="sm" style={styles.actions}>
          <Button size="sm" variant="secondary" onPress={loadStatus} disabled={isLoading || isSaving}>
            Refresh
          </Button>
          <Button size="sm" variant="outline" onPress={handlePauseAll} disabled={!link || isSaving}>
            Pause all
          </Button>
          <Button size="sm" variant="destructive" onPress={handleRevoke} disabled={!link || isSaving}>
            Revoke
          </Button>
        </HStack>
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  card: {
    padding: spacing.lg,
  },
  sectionTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  body: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  caption: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  permissionRow: {
    paddingVertical: spacing.xs,
  },
  permissionTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: fonts.medium,
  },
  actionRow: {
    borderRadius: 14,
    backgroundColor: colors.shell,
    padding: spacing.md,
    gap: spacing.xs,
  },
  actions: {
    paddingBottom: spacing.xl,
    flexWrap: 'wrap',
  },
});
