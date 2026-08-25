import { Pressable } from '@/src/ui/HapticPressable';
import type { ReactNode } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
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
  portalHostName,
  leadingContent,
  onStart,
  starting = false,
  startTestID,
  scrollMode = 'page',
}: FocusSetupContentProps) {
  const { height: windowHeight } = useWindowDimensions();
  const soundscapeMenuMaxHeight = Math.max(240, Math.min(560, Math.floor(windowHeight * 0.55)));
  const selectedAudioTitle = audio === 'none'
    ? 'Quiet'
    : SOUND_SCAPES.find((item) => item.id === audio)?.title ?? 'Environment';
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
        <Text style={styles.estimateFieldLabel}>Environment</Text>
        <DropdownMenu>
          <DropdownMenuTrigger {...({ asChild: true } as any)} accessibilityLabel="Select Focus environment">
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
            <ScrollView
              testID="focus-soundscape-menu-scroll"
              style={{ maxHeight: soundscapeMenuMaxHeight }}
              showsVerticalScrollIndicator
              nestedScrollEnabled
              bounces={false}
              overScrollMode="never"
              keyboardShouldPersistTaps="handled"
            >
              <DropdownMenuCheckboxItem
                testID="focus-soundscape-option-none"
                style={styles.focusSoundscapeMenuItem}
                checked={audio === 'none'}
                onCheckedChange={(checked) => {
                  if (checked) onAudioChange('none');
                }}
              >
                <Text style={styles.focusSoundscapeMenuItemText} numberOfLines={1}>Quiet</Text>
              </DropdownMenuCheckboxItem>
              {SOUND_SCAPES.map((item) => (
                <DropdownMenuCheckboxItem
                  key={item.id}
                  testID={`focus-soundscape-option-${item.id}`}
                  accessibilityLabel={item.id === 'canyonSpring' ? 'Canyon Spring, video environment' : undefined}
                  style={styles.focusSoundscapeMenuItem}
                  checked={item.id === audio}
                  onCheckedChange={(checked) => {
                    if (checked) onAudioChange(item.id);
                  }}
                >
                  <HStack alignItems="center" style={styles.focusSoundscapeMenuItemContent}>
                    <Text style={styles.focusSoundscapeMenuItemText} numberOfLines={1}>{item.title}</Text>
                    {item.id === 'canyonSpring' ? <Icon name="video" size={16} color={colors.textSecondary} /> : null}
                  </HStack>
                </DropdownMenuCheckboxItem>
              ))}
            </ScrollView>
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
          contentContainerStyle={[styles.sheetContent, styles.focusDrawerSheetContent]}
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
      <View style={[styles.focusSheetFooter, scrollMode === 'drawer' && styles.focusDrawerSheetFooter]}>
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
