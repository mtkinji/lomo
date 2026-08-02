import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { NotificationService } from '../../../services/NotificationService';
import { SettingsGroup, SettingsRow } from '../../../ui/SettingsSurface';
import {
  createWeeklyMoneySavedCheck,
  updateMoneySavedCheck,
  type MoneySavedCheck,
} from '../domain/moneySavedCheck';
import { moneySavedCheckStorage } from '../runtime/moneySavedCheckStorage';

type Props = {
  userId: string;
  now?: () => Date;
  timezone?: string;
};

export function MoneyWeeklyCheckRow({
  userId,
  now = () => new Date(),
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
}: Props) {
  const [check, setCheck] = useState<MoneySavedCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void moneySavedCheckStorage.load(userId).then((value) => {
      if (active) setCheck(value);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [userId]);

  const enable = async (current: MoneySavedCheck | null) => {
    if (saving) return;
    setSaving(true);
    let scheduledId: string | null = null;
    try {
      const nowIso = now().toISOString();
      const candidate = current
        ? updateMoneySavedCheck(current, { active: true, updatedAtIso: nowIso })
        : createWeeklyMoneySavedCheck({ nowIso, timezone });
      scheduledId = await NotificationService.scheduleMoneyCheck(candidate);
      if (!scheduledId) return;
      const saved = updateMoneySavedCheck(candidate, { notificationId: scheduledId, updatedAtIso: nowIso });
      await moneySavedCheckStorage.save(userId, saved);
      setCheck(saved);
    } catch {
      if (scheduledId) await NotificationService.cancelMoneyCheck(scheduledId);
      Alert.alert('Weekly check not saved', 'Kwilt could not save this check. Nothing was scheduled.');
    } finally {
      setSaving(false);
    }
  };

  const pause = async () => {
    if (!check || saving) return;
    setSaving(true);
    try {
      await NotificationService.cancelMoneyCheck(check.notificationId);
      const next = await moneySavedCheckStorage.setActive(userId, false, now().toISOString());
      setCheck(next);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!check || saving) return;
    setSaving(true);
    try {
      await NotificationService.cancelMoneyCheck(check.notificationId);
      await moneySavedCheckStorage.remove(userId);
      setCheck(null);
    } finally {
      setSaving(false);
    }
  };

  const openActions = () => {
    if (loading || saving) return;
    if (!check) {
      Alert.alert(
        'Weekly Budget check',
        'Every Friday at 9:00 AM, Kwilt can privately remind you to open Budget. The notification will not show financial details.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Turn on', onPress: () => { void enable(null); } },
        ],
      );
      return;
    }
    if (check.active) {
      Alert.alert('Weekly Budget check', 'Kwilt will remind you every Friday at 9:00 AM without showing financial details.', [
        { text: 'Keep on', style: 'cancel' },
        { text: 'Pause', onPress: () => { void pause(); } },
        { text: 'Remove', style: 'destructive', onPress: () => { void remove(); } },
      ]);
      return;
    }
    Alert.alert('Weekly Budget check', 'This private reminder is paused.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Resume', onPress: () => { void enable(check); } },
      { text: 'Remove', style: 'destructive', onPress: () => { void remove(); } },
    ]);
  };

  const value = loading ? 'Loading…' : check?.active ? 'Friday · 9:00 AM' : check ? 'Paused' : 'Off';
  return (
    <SettingsGroup footer="The notification contains no financial details." title="Weekly check">
      <SettingsRow disabled={loading || saving} onPress={openActions} title="Weekly Budget check" value={value} />
    </SettingsGroup>
  );
}
