import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gamesTheme } from '@/src/capabilities/games/theme/gamesTheme';

export function GameBackdrop({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  const { colors } = gamesTheme;
  return (
    <View style={[styles.shell, { backgroundColor: dark ? colors.feltDark : colors.cream }]}>
      <LinearGradient
        colors={dark ? [colors.feltLight, colors.feltDark] : [colors.paper, colors.cream]}
        style={StyleSheet.absoluteFillObject}
      />
      <View pointerEvents="none" style={[styles.orb, styles.orbOne, { backgroundColor: dark ? colors.turmeric : colors.coral }]} />
      <View pointerEvents="none" style={[styles.orb, styles.orbTwo, { backgroundColor: dark ? colors.coral : colors.turmeric }]} />
      <View pointerEvents="none" style={styles.grain} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, overflow: 'hidden' },
  orb: { position: 'absolute', width: 190, height: 190, borderRadius: 95, opacity: 0.12 },
  orbOne: { top: -80, right: -64 },
  orbTwo: { bottom: -92, left: -70 },
  grain: { ...StyleSheet.absoluteFillObject, opacity: 0.04, backgroundColor: '#5A452D' },
});
