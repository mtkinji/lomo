import type { ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SOUND_SCAPES, type SoundscapeId } from '../../services/soundscapeCatalog';
import { colors, spacing } from '../../theme';
import { BottomDrawerScrollView } from '../../ui/BottomDrawer';
import { Button } from '../../ui/Button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../../ui/DropdownMenu';
import { Icon } from '../../ui/Icon';
import { HStack, VStack } from '../../ui/primitives';
import { Text } from '../../ui/Typography';
import { DurationPicker } from './DurationPicker';
import { styles } from './activityDetailStyles';

export type FocusAudioSelection = SoundscapeId | 'none';

type FocusSetupContentProps = {
  minutes: number;
  presets: readonly number[];
  customOptions: number[];
  customExpanded: boolean;
  isCustomValue: boolean;
  onMinutesChange: (minutes: number) => void;
  onCustomExpandedChange: (expanded: boolean | ((current: boolean) => boolean)) => void;
  audio: FocusAudioSelection;
  onAudioChange: (audio: FocusAudioSelection) => void;
  allowNoAudio?: boolean;
  portalHostName: string;
  leadingContent?: ReactNode;
  onStart: () => void;
  starting?: boolean;
  startTestID?: string;
  scrollMode?: 'drawer' | 'page';
};

export function FocusSetupContent({
  minutes,
  presets,
  customOptions,
  customExpanded,
  isCustomValue,
  onMinutesChange,
  onCustomExpandedChange,
  audio,
  onAudioChange,
  allowNoAudio = false,
  portalHostName,
  leadingContent,
  onStart,
  starting = false,
  startTestID,
  scrollMode = 'page',
}: FocusSetupContentProps) {
  const audioOptions: Array<{ id: FocusAudioSelection; title: string }> = [
    ...(allowNoAudio ? [{ id: 'none' as const, title: 'No audio' }] : []),
    ...SOUND_SCAPES,
  ];
  const selectedAudioTitle = audioOptions.find((item) => item.id === audio)?.title ?? 'Soundscape';
  const fields = (
    <VStack space="md">
      {leadingContent}
      <View>
        <Text style={styles.estimateFieldLabel}>Minutes</Text>
        <HStack space="sm" alignItems="center" style={styles.focusPresetRow}>
          {presets.map((option) => {
            const selected = !customExpanded && minutes === option;
            return (
              <Pressable
                  key={option}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => {
                    onMinutesChange(option);
                    onCustomExpandedChange(false);
                  }}
                  style={({ pressed }) => [
                    styles.focusPresetChip,
                    selected && styles.focusPresetChipSelected,
                    pressed && styles.focusPresetChipPressed,
                  ]}
                >
                  <Text style={[styles.focusPresetChipText, selected && styles.focusPresetChipTextSelected]}>
                    {option}m
                  </Text>
                </Pressable>
            );
          })}
          <Pressable
            accessibilityLabel="Custom Focus duration"
            onPress={() => onCustomExpandedChange((current) => !current)}
            style={({ pressed }) => [
              styles.focusPresetChip,
              (customExpanded || isCustomValue) && styles.focusPresetChipSelected,
              pressed && styles.focusPresetChipPressed,
            ]}
          >
            <Text style={[
              styles.focusPresetChipText,
              (customExpanded || isCustomValue) && styles.focusPresetChipTextSelected,
            ]}>
              {customExpanded || isCustomValue ? `${minutes}m` : 'Custom'}
            </Text>
          </Pressable>
        </HStack>
        {customExpanded ? (
          <View style={{ marginTop: spacing.md }}>
            <DurationPicker
              valueMinutes={minutes}
              onChangeMinutes={onMinutesChange}
              optionsMinutes={customOptions}
              accessibilityLabel="Select custom focus duration"
              iosWheelHeight={160}
              showHelperText={false}
              iosUseEdgeFades={false}
            />
          </View>
        ) : null}
      </View>
      <View>
        <Text style={styles.estimateFieldLabel}>Soundscape</Text>
        <DropdownMenu>
          <DropdownMenuTrigger {...({ asChild: true } as any)} accessibilityLabel="Select soundscape">
            <Pressable style={({ pressed }) => [styles.focusSoundscapeTrigger, pressed && styles.focusPresetChipPressed]}>
              <HStack space="xs" alignItems="center">
                <Text style={styles.focusSoundscapeTriggerText}>{selectedAudioTitle}</Text>
                <Icon name="chevronDown" size={16} color={colors.textSecondary} />
              </HStack>
            </Pressable>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            portalHost={portalHostName}
            side={scrollMode === 'drawer' ? 'top' : 'bottom'}
            sideOffset={6}
            align="start"
          >
            {audioOptions.map((item) => (
              <DropdownMenuCheckboxItem
                key={item.id}
                checked={item.id === audio}
                onCheckedChange={(checked) => {
                  if (checked) onAudioChange(item.id);
                }}
              >
                <Text style={styles.menuRowText} numberOfLines={1}>{item.title}</Text>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </View>
    </VStack>
  );

  return (
    <View style={{ flex: 1 }}>
      {scrollMode === 'drawer' ? (
        <BottomDrawerScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.sheetContent}
          keyboardShouldPersistTaps="handled"
        >
          {fields}
        </BottomDrawerScrollView>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.sheetContent}
          keyboardShouldPersistTaps="handled"
        >
          {fields}
        </ScrollView>
      )}
      <View style={styles.focusSheetFooter}>
        <Button
          variant="primary"
          fullWidth
          disabled={starting}
          accessibilityLabel="Start Focus"
          testID={startTestID}
          onPress={onStart}
        >
          Start
        </Button>
      </View>
    </View>
  );
}
