import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View, type TextInput, type TextInputProps } from 'react-native';
import { Pressable } from './HapticPressable';
import { Input } from './Input';
import { InputFrame } from './InputFrame';
import { resolveInputAppearance } from './inputAppearance';
import { Badge } from './Badge';
import { Icon } from './Icon';
import { Text } from './Typography';
import { colors, spacing, typography } from '../theme';

type Props = Omit<TextInputProps, 'style' | 'multiline' | 'children' | 'placeholderTextColor'> & {
  tags: readonly string[];
  value: string;
  accessibilityLabel: string;
  onRemoveTag: (tag: string) => void;
  onPressField?: () => void;
  fieldTestID?: string;
  /** Reserved host affordance width; material padding remains owned here. */
  reservedTrailingWidth?: number;
  stretchInput?: boolean;
};

/** Owns chip/input material and focus; parsing, commits and persistence stay with the caller. */
export const TagEntryField = forwardRef<TextInput, Props>(function TagEntryField({
  tags, value, accessibilityLabel, onRemoveTag, onPressField, fieldTestID,
  reservedTrailingWidth = 0, stretchInput = false, onFocus, onBlur, editable = true, ...inputProps
}, forwardedRef) {
  const inputRef = useRef<TextInput>(null);
  useImperativeHandle(forwardedRef, () => inputRef.current!, []);
  const [focused, setFocused] = useState(false);
  const empty = tags.length === 0 && value.trim().length === 0;
  const appearance = resolveInputAppearance({ size: 'sm' });
  return <Pressable accessible={false} testID={fieldTestID} disabled={!editable} onPress={() => {
    onPressField?.();
    inputRef.current?.focus();
  }}>
    <InputFrame focused={focused} error={false} onFooterHeight={() => {}} style={[
      appearance.frameStyle,
      reservedTrailingWidth > 0 ? { paddingRight: spacing.md + reservedTrailingWidth } : undefined,
    ]}>
      <View style={[styles.row, empty && styles.emptyRow]}>
        {tags.map(tag => <Pressable key={tag} style={styles.chipTarget} accessibilityRole="button" accessibilityLabel={`Remove tag ${tag}`} disabled={!editable} onPress={event => {
          event.stopPropagation();
          onRemoveTag(tag);
        }}>
          <Badge variant="outline" style={styles.chipBadge}><View style={styles.chip}><Text style={styles.chipText}>{tag}</Text><View style={styles.chipIcon}><Icon name="close" size={14} color={colors.textSecondary} /></View></View></Badge>
        </Pressable>)}
        <Input
          {...inputProps}
          variant="plain"
          size="sm"
          ref={inputRef}
          value={value}
          accessibilityLabel={accessibilityLabel}
          editable={editable}
          multiline={false}
          containerStyle={[styles.entry, stretchInput && styles.stretch, empty && styles.emptyEntry]}
          onFocus={event => { setFocused(true); onFocus?.(event); }}
          onBlur={event => { setFocused(false); onBlur?.(event); }}
        />
      </View>
    </InputFrame>
  </Pressable>;
});

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  emptyRow: { flexWrap: 'nowrap', minHeight: 28 },
  entry: { flexShrink: 1, flexBasis: 40, minWidth: 40, width: 150 },
  stretch: { flexGrow: 1 },
  emptyEntry: { flex: 1, flexBasis: 'auto', minWidth: 0, width: '100%' },
  chipTarget: { maxWidth: '100%', minWidth: 44, minHeight: 44, justifyContent: 'center' },
  chipBadge: { maxWidth: '100%' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 },
  chipIcon: { width: 14, height: 14, flexShrink: 0 },
  chipText: { ...typography.bodySm, color: colors.textSecondary, flexShrink: 1 },
});
