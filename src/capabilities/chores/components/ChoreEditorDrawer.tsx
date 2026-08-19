import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../../theme';
import { BottomDrawer, BottomDrawerScrollView } from '../../../ui/BottomDrawer';
import { Button } from '../../../ui/Button';
import { FormField } from '../../../ui/FormField';
import { Input } from '../../../ui/Input';
import { KwiltLoader } from '../../../ui/KwiltLoader';
import { BottomDrawerFooter } from '../../../ui/layout/BottomDrawerFooter';
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
  onClose: () => void;
};

const REVIEW_OPTIONS: PickerFieldOption[] = [
  { value: 'trusted', label: 'Not required' },
  { value: 'caregiver_review', label: 'Caregiver approval' },
];

const PHOTO_OPTIONS: PickerFieldOption[] = [
  { value: 'optional', label: 'Optional' },
  { value: 'required', label: 'Required' },
];

const TOKEN_OPTIONS: PickerFieldOption[] = [
  { value: '1', label: '1 token' },
  { value: '2', label: '2 tokens' },
  { value: '3', label: '3 tokens' },
];

function PickerBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <FormField label={label}>
      {() => children}
    </FormField>
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
      bottomAccessory={(
        <BottomDrawerFooter showTopBorder>
          <Button
            fullWidth
            accessibilityLabel={isEditing ? 'Save chore' : 'Add chore'}
            disabled={!draft.title.trim()}
            onPress={onAdd}
          >
            {isEditing ? 'Save chore' : 'Add chore'}
          </Button>
        </BottomDrawerFooter>
      )}
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

        <PickerBlock label="For">
          <SmallSetPickerField
            title="For"
            value={draft.assignedMemberId ?? 'household'}
            options={childOptions}
            placeholder="Household"
            accessibilityLabel="Who is this chore for?"
            allowDeselect={false}
            onValueChange={(value) => onChange(
              'assignedMemberId',
              value === 'household' ? null : value,
            )}
          />
        </PickerBlock>

        <PickerBlock label="Repeats">
          <PickerFieldTrigger
            value="repeat"
            options={[{ value: 'repeat', label: repeatLabel === 'Off' ? 'One time' : repeatLabel }]}
            placeholder="One time"
            accessibilityLabel={`Edit repeat schedule, ${repeatLabel === 'Off' ? 'one time' : repeatLabel}`}
            leadingIcon="refresh"
            allowDeselect={false}
            onPress={() => setRepeatPresetVisible(true)}
          />
        </PickerBlock>

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

        <PickerBlock label="Photo">
          <SmallSetPickerField
            title="Photo"
            value={draft.photoPolicy}
            options={PHOTO_OPTIONS}
            placeholder="Optional"
            accessibilityLabel="Photo requirement"
            allowDeselect={false}
            onValueChange={(value) => onChange('photoPolicy', value as ChoreDraft['photoPolicy'])}
          />
        </PickerBlock>

        <PickerBlock label="Approval">
          <SmallSetPickerField
            title="Approval"
            value={draft.reviewPolicy}
            options={REVIEW_OPTIONS}
            placeholder="Not required"
            accessibilityLabel="Approval requirement"
            allowDeselect={false}
            onValueChange={(value) => onChange('reviewPolicy', value as ChoreDraft['reviewPolicy'])}
          />
        </PickerBlock>

        {tokensEnabled ? (
          <PickerBlock label="Reward">
            <SmallSetPickerField
              title="Reward"
              value={String(draft.tokenValue)}
              options={TOKEN_OPTIONS}
              placeholder="1 token"
              accessibilityLabel="Token reward"
              allowDeselect={false}
              onValueChange={(value) => onChange('tokenValue', Number(value) as ChoreDraft['tokenValue'])}
            />
          </PickerBlock>
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
});
