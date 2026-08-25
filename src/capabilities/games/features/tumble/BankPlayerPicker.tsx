import { Pressable } from '@/src/ui/HapticPressable';
import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react-native';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BankGame } from '@/src/capabilities/games/domain/bank';
import { gamesTheme } from '@/src/capabilities/games/theme/gamesTheme';
import { GameButton } from '@/src/capabilities/games/ui/GameButton';

type Props = {
  game: BankGame;
  open: boolean;
  onClose: () => void;
  onBank: (playerIds: number[]) => void;
};

export function BankPlayerPicker({ game, open, onClose, onBank }: Props) {
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);
  const eligiblePlayers = game.players.filter((player) => !player.banked);

  useEffect(() => {
    if (open) setSelectedPlayerIds([]);
  }, [open]);

  const togglePlayer = (playerId: number) => {
    setSelectedPlayerIds((current) => current.includes(playerId)
      ? current.filter((id) => id !== playerId)
      : [...current, playerId]);
  };

  return <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={styles.backdrop} onPress={onClose}>
      <Pressable style={styles.sheet} onPress={() => undefined}>
        <View style={styles.heading}>
          <View><Text style={styles.title}>Who’s banking?</Text><Text style={styles.pot}>Select everyone banking {game.pot} points</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close player picker" onPress={onClose} style={styles.close}><X size={19} color={gamesTheme.colors.ink} /></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.players}>
          {eligiblePlayers.map((player) => {
            const selected = selectedPlayerIds.includes(player.id);
            return <Pressable key={player.id} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} accessibilityLabel={player.name} onPress={() => togglePlayer(player.id)} style={[styles.player, selected ? styles.playerSelected : null]}><Text numberOfLines={1} style={styles.name}>{player.name}</Text><View style={[styles.check, selected ? styles.checkSelected : null]}>{selected ? <Check size={16} strokeWidth={3} color={gamesTheme.colors.ink} /> : null}</View></Pressable>;
          })}
        </ScrollView>
        <GameButton disabled={selectedPlayerIds.length === 0} onPress={() => onBank(selectedPlayerIds)}>{selectedPlayerIds.length === 1 ? 'Bank me!' : 'Bank us!'}</GameButton>
      </Pressable>
    </Pressable>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,17,13,0.62)' },
  sheet: { maxHeight: '75%', borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: gamesTheme.colors.cream, padding: 22, paddingBottom: 34, gap: 14 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: gamesTheme.type.display, fontSize: 28, color: gamesTheme.colors.ink },
  pot: { fontFamily: gamesTheme.type.body, fontSize: 13, color: 'rgba(32,29,24,0.56)' },
  close: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(32,29,24,0.07)', alignItems: 'center', justifyContent: 'center' },
  players: { gap: 8, paddingBottom: 4 },
  player: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(32,29,24,0.16)', backgroundColor: gamesTheme.colors.paper, paddingHorizontal: 16 },
  playerSelected: { borderColor: gamesTheme.colors.ink, backgroundColor: 'rgba(248,207,82,0.2)' },
  name: { flex: 1, fontFamily: gamesTheme.type.display, fontSize: 17, color: gamesTheme.colors.ink },
  check: { width: 28, height: 28, borderRadius: 9, borderWidth: 1, borderColor: 'rgba(32,29,24,0.24)', backgroundColor: gamesTheme.colors.paper, alignItems: 'center', justifyContent: 'center' },
  checkSelected: { borderColor: gamesTheme.colors.ink, backgroundColor: gamesTheme.colors.turmeric },
});
