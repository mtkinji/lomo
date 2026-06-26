import React from 'react';
import { Pressable, View } from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { colors } from '../../theme';
import { HStack } from '../../ui/primitives';
import { Icon } from '../../ui/Icon';
import { Text } from '../../ui/Typography';
import type { ActivityTagHistoryIndex } from '../../store/useAppStore';
import { buildActivityTagVocabularyOptions } from '../../utils/activityTagVocabulary';

type TagPickerStyles = {
  tagPickerContainer: StyleProp<ViewStyle>;
  tagPickerRow: StyleProp<ViewStyle>;
  tagPickerRowPressed: StyleProp<ViewStyle>;
  tagPickerLabel: StyleProp<ViewStyle>;
  tagPickerText: StyleProp<TextStyle>;
  tagPickerCount: StyleProp<TextStyle>;
};

type Props = {
  visible: boolean;
  query: string;
  currentTags: unknown;
  activityTagHistory: ActivityTagHistoryIndex | null | undefined;
  styles: TagPickerStyles;
  onAddTag: (tag: string) => void;
  onPressInOption: () => void;
};

export function ActivityDetailTagPicker({
  visible,
  query,
  currentTags,
  activityTagHistory,
  styles,
  onAddTag,
  onPressInOption,
}: Props) {
  const options = React.useMemo(
    () =>
      buildActivityTagVocabularyOptions({
        query,
        excludeTags: currentTags,
        activityTagHistory,
        limit: query.trim() ? 8 : 5,
      }),
    [activityTagHistory, currentTags, query],
  );
  const trimmedQuery = query.trim();
  const matchesExisting = options.some((option) => option.label.toLowerCase() === trimmedQuery.toLowerCase());
  const selectedKeys = new Set(
    (Array.isArray(currentTags) ? currentTags : [])
      .filter((tag): tag is string => typeof tag === 'string')
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean),
  );
  const matchesSelected = selectedKeys.has(trimmedQuery.toLowerCase());

  if (!visible || (options.length === 0 && (trimmedQuery.length === 0 || matchesExisting || matchesSelected))) return null;

  return (
    <View style={styles.tagPickerContainer}>
      {options.map((option) => (
        <Pressable
          key={option.key}
          accessibilityRole="button"
          accessibilityLabel={`Add existing tag ${option.label}`}
          onPressIn={onPressInOption}
          onPress={() => onAddTag(option.label)}
          style={({ pressed }) => [styles.tagPickerRow, pressed ? styles.tagPickerRowPressed : null]}
        >
          <HStack alignItems="center" justifyContent="space-between" space="sm">
            <HStack alignItems="center" space="xs" style={styles.tagPickerLabel}>
              <Icon name="tag" size={14} color={colors.textSecondary} />
              <Text style={styles.tagPickerText} numberOfLines={1}>
                {option.label}
              </Text>
            </HStack>
            <Text style={styles.tagPickerCount}>{option.totalUses}</Text>
          </HStack>
        </Pressable>
      ))}
      {trimmedQuery.length > 0 && !matchesExisting && !matchesSelected ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Create tag ${trimmedQuery}`}
          onPressIn={onPressInOption}
          onPress={() => onAddTag(trimmedQuery)}
          style={({ pressed }) => [styles.tagPickerRow, pressed ? styles.tagPickerRowPressed : null]}
        >
          <HStack alignItems="center" space="xs">
            <Icon name="plus" size={14} color={colors.textSecondary} />
            <Text style={styles.tagPickerText} numberOfLines={1}>
              Use "{trimmedQuery}"
            </Text>
          </HStack>
        </Pressable>
      ) : null}
    </View>
  );
}
