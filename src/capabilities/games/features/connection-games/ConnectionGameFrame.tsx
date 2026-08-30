import { Pressable } from '@/src/ui/HapticPressable';
import type { ReactNode } from 'react';
import { ArrowLeft, RotateCcw, Volume2, VolumeX } from 'lucide-react-native';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from '@/src/capabilities/games/navigation/gamesRouter';
import { gamesTheme } from '@/src/capabilities/games/theme/gamesTheme';
import { GameBackdrop } from '@/src/capabilities/games/ui/GameBackdrop';
import { KwiltGamesLockup } from '@/src/capabilities/games/ui/KwiltGamesLockup';
import { KeyboardSafeScrollView } from '@/src/capabilities/games/ui/KeyboardSafeScrollView';
import { backToGames } from '@/src/capabilities/games/navigation/backToGames';

export function ConnectionGameFrame({ title, promise, children, onRestart, soundEnabled, onToggleSound, playing = false, compactPlayChrome = false, showHeading = true, gameHeader = false, gameMark, scrollEnabled = true }: { title: string; promise: string; children: ReactNode; onRestart?: () => void; soundEnabled?: boolean; onToggleSound?: () => void; playing?: boolean; compactPlayChrome?: boolean; showHeading?: boolean; gameHeader?: boolean; gameMark?: string; scrollEnabled?: boolean }) {
  const { width, height } = useWindowDimensions();
  const presenting = playing && width > height;
  const compact = presenting || compactPlayChrome;
  return <GameBackdrop>
    <SafeAreaView accessibilityViewIsModal style={[styles.safe, compact ? styles.safePresenting : null]}>
      <View style={[styles.topbar, compact ? styles.topbarPresenting : null]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to games" onPress={() => backToGames(router)} style={styles.iconButton}><ArrowLeft size={22} color={gamesTheme.colors.ink} /></Pressable>
        <View pointerEvents="none" style={styles.centerTitle}>{compact || gameHeader ? <View accessible accessibilityRole="header" accessibilityLabel={`${title} game`} style={styles.gameTitleLockup}>{gameMark ? <Text style={styles.gameMark}>{gameMark}</Text> : null}<Text style={styles.presentingTitle}>{title}</Text></View> : <KwiltGamesLockup compact />}</View>
        <View style={styles.topActions}>
          {onToggleSound && soundEnabled != null ? <Pressable accessibilityRole="button" accessibilityLabel={soundEnabled ? 'Turn sound off' : 'Turn sound on'} onPress={onToggleSound} style={styles.iconButton}>{soundEnabled ? <Volume2 size={20} color={gamesTheme.colors.ink} /> : <VolumeX size={20} color={gamesTheme.colors.ink} />}</Pressable> : null}
          {onRestart ? <Pressable accessibilityRole="button" accessibilityLabel={`Restart ${title}`} onPress={onRestart} style={styles.iconButton}><RotateCcw size={20} color={gamesTheme.colors.ink} /></Pressable> : null}
          {!onRestart && !onToggleSound ? <View style={styles.iconButton} /> : null}
        </View>
      </View>
      {!compact && showHeading ? <View style={styles.heading}><Text style={styles.title}>{title}</Text><Text style={styles.promise}>{promise}</Text></View> : null}
      <KeyboardSafeScrollView scrollEnabled={scrollEnabled} style={styles.scroll} contentContainerStyle={[styles.content, compact ? styles.contentPresenting : null]}>{children}</KeyboardSafeScrollView>
    </SafeAreaView>
  </GameBackdrop>;
}

export function PlayCard({ eyebrow, title, copy, children, tone = 'felt' }: { eyebrow?: string; title?: string; copy?: string; children?: ReactNode; tone?: 'felt' | 'paper' }) {
  return <View style={[styles.card, tone === 'paper' ? styles.cardPaper : styles.cardFelt]}>
    {eyebrow ? <Text style={[styles.eyebrow, tone === 'paper' ? styles.inkMuted : null]}>{eyebrow}</Text> : null}
    {title ? <Text style={[styles.cardTitle, tone === 'paper' ? styles.ink : null]}>{title}</Text> : null}
    {copy ? <Text style={[styles.cardCopy, tone === 'paper' ? styles.inkMuted : null]}>{copy}</Text> : null}
    {children}
  </View>;
}

export const connectionStyles = StyleSheet.create({
  actionStack: { gap: 11 },
  row: { flexDirection: 'row', gap: 10 },
  choice: { flex: 1, minHeight: 86, borderRadius: 20, padding: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(32,29,24,0.16)', backgroundColor: gamesTheme.colors.paper },
  choiceSelected: { borderColor: gamesTheme.colors.ink, backgroundColor: gamesTheme.colors.turmeric },
  choiceText: { textAlign: 'center', fontFamily: gamesTheme.type.display, fontSize: 17, color: gamesTheme.colors.ink },
  label: { fontFamily: gamesTheme.type.utility, fontSize: 10, letterSpacing: 1.2, color: 'rgba(32,29,24,0.48)' },
  body: { fontFamily: gamesTheme.type.body, fontSize: 15, lineHeight: 21, color: 'rgba(32,29,24,0.64)' },
  input: { minHeight: 52, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(32,29,24,0.2)', backgroundColor: 'rgba(255,255,255,0.72)', paddingHorizontal: 15, fontFamily: gamesTheme.type.utility, fontSize: 15, color: gamesTheme.colors.ink },
  multiline: { minHeight: 92, paddingTop: 14, textAlignVertical: 'top' },
  center: { alignItems: 'center', gap: 10 },
  big: { textAlign: 'center', fontFamily: gamesTheme.type.display, fontSize: 36, lineHeight: 40, color: gamesTheme.colors.ink },
});

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 16, paddingBottom: 14 },
  safePresenting: { paddingHorizontal: 10, paddingBottom: 8 },
  topbar: { position: 'relative', minHeight: 54, flexDirection: 'row', alignItems: 'center' },
  topbarPresenting: { minHeight: 44 },
  presentingTitle: { fontFamily: gamesTheme.type.display, color: gamesTheme.colors.ink, fontSize: 18 },
  centerTitle: { position: 'absolute', left: 52, right: 52, alignItems: 'center', justifyContent: 'center' },
  gameTitleLockup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gameMark: { fontFamily: gamesTheme.type.utility, color: gamesTheme.colors.ink, fontSize: 14 },
  iconButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  topActions: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center' },
  heading: { paddingHorizontal: 4, paddingTop: 8, paddingBottom: 12 },
  title: { fontFamily: gamesTheme.type.display, color: gamesTheme.colors.ink, fontSize: 30, letterSpacing: -1 },
  promise: { marginTop: 2, fontFamily: gamesTheme.type.body, color: 'rgba(32,29,24,0.56)', fontSize: 13 },
  scroll: { flex: 1 },
  content: { flexGrow: 1, gap: 12, padding: 4, paddingBottom: 24, justifyContent: 'center' },
  contentPresenting: { padding: 2, paddingBottom: 6 },
  card: { borderRadius: 28, padding: 22, gap: 12, overflow: 'hidden' },
  cardFelt: { backgroundColor: gamesTheme.colors.felt, borderWidth: 5, borderColor: gamesTheme.colors.wood },
  cardPaper: { backgroundColor: gamesTheme.colors.paper, borderWidth: 1, borderColor: 'rgba(32,29,24,0.12)' },
  eyebrow: { fontFamily: gamesTheme.type.utility, fontSize: 10, letterSpacing: 1.5, color: 'rgba(255,255,255,0.58)' },
  cardTitle: { fontFamily: gamesTheme.type.display, fontSize: 28, lineHeight: 32, color: gamesTheme.colors.white },
  cardCopy: { fontFamily: gamesTheme.type.body, fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.68)' },
  ink: { color: gamesTheme.colors.ink },
  inkMuted: { color: 'rgba(32,29,24,0.58)' },
});
