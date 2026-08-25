import { Pressable } from '@/src/ui/HapticPressable';
import { StyleSheet, Text, View } from 'react-native';
import { gamesTheme } from '@/src/capabilities/games/theme/gamesTheme';
import { gameModeLabel, gameModes, type GameMode } from './gameModes';

export function GameModePicker({ value, onChange }: { value: GameMode; onChange: (mode: GameMode) => void }) {
  return <View accessibilityRole="tablist" style={styles.picker}>{gameModes.map((mode) => (
    <Pressable key={mode} accessibilityRole="tab" accessibilityState={{ selected: value === mode }} onPress={() => onChange(mode)} style={[styles.option, value === mode && styles.active]}>
      <Text style={[styles.label, value === mode && styles.activeLabel]}>{gameModeLabel(mode)}</Text>
    </Pressable>
  ))}</View>;
}

const styles = StyleSheet.create({
  picker: { flexDirection: 'row', padding: 4, borderRadius: 999, backgroundColor: 'rgba(32,29,24,0.07)' },
  option: { flex: 1, alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999 },
  active: { backgroundColor: gamesTheme.colors.ink },
  label: { fontFamily: gamesTheme.type.utility, color: 'rgba(32,29,24,0.52)', fontSize: 12 },
  activeLabel: { color: gamesTheme.colors.white },
});
