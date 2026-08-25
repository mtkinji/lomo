import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Pressable } from '../../../ui/HapticPressable';
import { colors, spacing, typography } from '../../../theme';
import { BottomDrawer, BottomDrawerScrollView } from '../../../ui/BottomDrawer';
import { Input } from '../../../ui/Input';
import { KwiltLoader } from '../../../ui/KwiltLoader';
import { KwiltSwitch } from '../../../ui/KwiltSwitch';
import { BottomDrawerHeader } from '../../../ui/layout/BottomDrawerHeader';
import {
  PickerFieldTrigger,
  SmallSetPickerField,
  type PickerFieldOption,
} from '../../../ui/PickerFields';
import { Text } from '../../../ui/primitives';
import type { ChoreMember } from '../domain/choreLearning';
import type { ChoreDraft, ChoreDraftField } from '../domain/choreCreation';
import { ActivityRepeatSheets } from '../../../features/activities/ActivityRepeatSheets';
import type { ActivityRepeatEditorController } from '../../../features/activities/useActivityRepeatEditor';
import {
  buildActivityCustomRepeatPayload,
  resolveActivityCustomRepeatDraft,
} from '../../../features/activities/activityCustomRepeat';
import { formatActivityRepeatLabel } from '../../../features/activities/activityRepeatLabels';

type Props = {
  visible: boolean;
  draft: ChoreDraft | null;
  members: ChoreMember[];
  tokensEnabled: boolean;
  enriching: boolean;
  mode: 'create' | 'edit';
  onChange: <Field extends ChoreDraftField>(field: Field, value: ChoreDraft[Field]) => void;
  onAdd: () => void;
  onDelete?: () => void;
  onClose: () => void;
};

const MISSED_OPTIONS: PickerFieldOption[] = [
  { value: 'scheduled', label: 'Start fresh next time' },
  { value: 'after_completion', label: 'Keep open until done' },
];

const TOKEN_OPTIONS: PickerFieldOption[] = [
  { value: '1', label: '1 token' },
  { value: '2', label: '2 tokens' },
  { value: '3', label: '3 tokens' },
];

function CompactFieldRow({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <View style={styles.compactFieldRow}>
      <Text style={styles.compactFieldLabel}>{label}</Text>
      <View style={styles.compactFieldControl}>
        {children}
      </View>
    </View>
  );
}

function CompactToggleRow({
  enabled,
  label,
  onPress,
}: {
  enabled: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: enabled }}
      onPress={onPress}
      style={({ pressed }) => [styles.compactToggleRow, pressed ? styles.pressed : null]}
    >
      <Text style={styles.compactToggleLabel}>{label}</Text>
      <View pointerEvents="none">
        <KwiltSwitch accessible={false} value={enabled} onPress={onPress} />
      </View>
    </Pressable>
  );
}

export function ChoreEditorDrawer({
  visible,
  draft,
  members,
  tokensEnabled,
  enriching,
  mode,
  onChange,
  onAdd,
  onDelete,
  onClose,
}: Props) {
  const isEditing = mode === 'edit';
  const [repeatPresetVisible, setRepeatPresetVisible] = useState(false);
  const [repeatCustomVisible, setRepeatCustomVisible] = useState(false);
  const initialRepeat = resolveActivityCustomRepeatDraft({
    repeatRule: draft?.repeatRule,
    repeatCustom: draft?.repeatCustom,
    fallbackWeekday: new Date().getDay(),
  });
  const [repeatCadence, setRepeatCadence] = useState(initialRepeat.cadence);
  const [repeatInterval, setRepeatInterval] = useState(initialRepeat.interval);
  const [repeatWeekdays, setRepeatWeekdays] = useState(initialRepeat.weekdays);

  if (!draft) return null;
  const childOptions: PickerFieldOption[] = [
    { value: 'household', label: 'Household' },
    ...members
      .filter((member) => member.role === 'child')
      .map((member) => ({ value: member.id, label: member.displayName })),
  ];
  const hydrateCustomRepeat = () => {
    const next = resolveActivityCustomRepeatDraft({
      repeatRule: draft.repeatRule,
      repeatCustom: draft.repeatCustom,
      fallbackWeekday: new Date().getDay(),
    });
    setRepeatCadence(next.cadence);
    setRepeatInterval(next.interval);
    setRepeatWeekdays(next.weekdays);
  };
  const closeRepeatSheets = () => {
    setRepeatPresetVisible(false);
    setRepeatCustomVisible(false);
  };
  const repeatLabel = formatActivityRepeatLabel({
    repeatRule: draft.repeatRule,
    repeatCustom: draft.repeatCustom,
  });
  const repeatController: ActivityRepeatEditorController = {
    repeatLabel,
    cadence: repeatCadence,
    interval: repeatInterval,
    weekdays: repeatWeekdays,
    hydrateCustom: hydrateCustomRepeat,
    openCustom: () => {
      hydrateCustomRepeat();
      setRepeatPresetVisible(false);
      setRepeatCustomVisible(true);
    },
    returnToPresets: () => {
      setRepeatCustomVisible(false);
      setRepeatPresetVisible(true);
    },
    selectPreset: (rule) => {
      onChange('repeatRule', rule);
      onChange('repeatCustom', undefined);
      setRepeatPresetVisible(false);
    },
    clear: () => {
      onChange('repeatRule', undefined);
      onChange('repeatCustom', undefined);
      setRepeatPresetVisible(false);
    },
    setCadence: setRepeatCadence,
    setInterval: setRepeatInterval,
    toggleWeekday: (weekday) => setRepeatWeekdays((current) => {
      if (!current.includes(weekday)) return [...current, weekday];
      const next = current.filter((value) => value !== weekday);
      return next.length > 0 ? next : current;
    }),
    commitCustom: () => {
      onChange('repeatRule', 'custom');
      onChange('repeatCustom', buildActivityCustomRepeatPayload({
        cadence: repeatCadence,
        interval: repeatInterval,
        weekdays: repeatWeekdays,
        fallbackWeekday: new Date().getDay(),
      }));
      setRepeatCustomVisible(false);
    },
    close: closeRepeatSheets,
  };

  return (
    <BottomDrawer
      visible={visible}
      onClose={onClose}
      snapPoints={['100%']}
      initialSnapIndex={0}
      keyboardBehavior="resize"
      footer={{
        secondaryAction: isEditing && onDelete ? {
          label: 'Delete',
          accessibilityLabel: 'Delete chore',
          haptic: false,
          onPress: onDelete,
          tone: 'destructive',
        } : undefined,
        primaryAction: {
          label: isEditing ? 'Save chore' : 'Add chore',
          disabled: !draft.title.trim(),
          onPress: onAdd,
        },
      }}
    >
      <BottomDrawerScrollView
        testID="chores.editor.drawer"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <BottomDrawerHeader
          variant="withClose"
          title={isEditing ? 'Edit chore' : 'New chore'}
          onClose={onClose}
          closeAccessibilityLabel={isEditing ? 'Close chore editor' : 'Close new chore'}
        />

        {enriching ? (
          <View
            accessible
            accessibilityLabel="Adding details"
            accessibilityLiveRegion="polite"
            style={styles.enrichmentStatus}
          >
            <KwiltLoader size="small" />
            <Text tone="secondary">Adding details…</Text>
          </View>
        ) : null}

        <Input
          label="Chore"
          value={draft.title}
          onChangeText={(value) => onChange('title', value)}
          variant="outline"
          elevation="flat"
          accentLabelOnFocus={false}
          autoFocus={!isEditing}
        />

        <CompactFieldRow label="For">
          <SmallSetPickerField
            title="For"
            value={draft.assignedMemberId ?? 'household'}
            options={childOptions}
            placeholder="Household"
            accessibilityLabel="Who is this chore for?"
            allowDeselect={false}
            size="compact"
            onValueChange={(value) => onChange(
              'assignedMemberId',
              value === 'household' ? null : value,
            )}
          />
        </CompactFieldRow>

        <CompactFieldRow label="Repeats">
          <PickerFieldTrigger
            value="repeat"
            options={[{ value: 'repeat', label: repeatLabel === 'Off' ? 'One time' : repeatLabel }]}
            placeholder="One time"
            accessibilityLabel={`Edit repeat schedule, ${repeatLabel === 'Off' ? 'one time' : repeatLabel}`}
            leadingIcon="refresh"
            allowDeselect={false}
            size="compact"
            onPress={() => setRepeatPresetVisible(true)}
          />
        </CompactFieldRow>

        {draft.repeatRule ? (
          <CompactFieldRow label="If missed">
            <SmallSetPickerField
              title="If missed"
              value={draft.repeatBasis}
              options={MISSED_OPTIONS}
              placeholder="Start fresh next time"
              accessibilityLabel="What happens if this chore is missed?"
              allowDeselect={false}
              size="compact"
              onValueChange={(value) => onChange(
                'repeatBasis',
                value as ChoreDraft['repeatBasis'],
              )}
            />
          </CompactFieldRow>
        ) : null}

        <Input
          label="What done looks like"
          placeholder="A short, clear finish line"
          value={draft.definitionOfDone}
          onChangeText={(value) => onChange('definitionOfDone', value)}
          multiline
          multilineMinHeight={92}
          multilineMaxHeight={150}
          variant="outline"
          elevation="flat"
          accentLabelOnFocus={false}
        />

        <CompactToggleRow
          label="Require a photo"
          enabled={draft.photoPolicy === 'required'}
          onPress={() => onChange(
            'photoPolicy',
            draft.photoPolicy === 'required' ? 'optional' : 'required',
          )}
        />

        <CompactToggleRow
          label="Require approval"
          enabled={draft.reviewPolicy === 'caregiver_review'}
          onPress={() => onChange(
            'reviewPolicy',
            draft.reviewPolicy === 'caregiver_review' ? 'trusted' : 'caregiver_review',
          )}
        />

        {tokensEnabled ? (
          <CompactFieldRow label="Reward">
            <SmallSetPickerField
              title="Reward"
              value={String(draft.tokenValue)}
              options={TOKEN_OPTIONS}
              placeholder="1 token"
              accessibilityLabel="Token reward"
              allowDeselect={false}
              size="compact"
              onValueChange={(value) => onChange('tokenValue', Number(value) as ChoreDraft['tokenValue'])}
            />
          </CompactFieldRow>
        ) : null}

      </BottomDrawerScrollView>

      <ActivityRepeatSheets
        presetVisible={repeatPresetVisible}
        customVisible={repeatCustomVisible}
        controller={repeatController}
      />
    </BottomDrawer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  enrichmentStatus: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.gray100,
  },
  compactFieldRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  compactFieldLabel: {
    ...typography.bodySm,
    width: 104,
    flexShrink: 0,
    color: colors.textSecondary,
  },
  compactFieldControl: {
    flex: 1,
    minWidth: 0,
  },
  compactToggleRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  compactToggleLabel: {
    ...typography.bodySm,
    flex: 1,
    minWidth: 0,
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.72,
  },
});
