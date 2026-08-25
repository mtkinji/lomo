import { Pressable } from '@/src/ui/HapticPressable';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { gamesTheme } from '@/src/capabilities/games/theme/gamesTheme';
import { GameButton } from '@/src/capabilities/games/ui/GameButton';
import { KeyboardSafeFormSheet } from '@/src/capabilities/games/ui/KeyboardSafeFormSheet';
import {
  FAILURE_SOUNDS,
  normalizePlayerIdentity,
  PLAYER_COLORS,
  playerColor,
  SUCCESS_SOUNDS,
  type FailureSoundId,
  type PlayerIdentity,
  type SuccessSoundId,
} from './playerIdentity';

type Props = {
  visible: boolean;
  initial: { displayName: string; identity?: PlayerIdentity } | null;
  eyebrow: string;
  title: string;
  saveLabel: string;
  onClose: () => void;
  onSave: (name: string, identity: PlayerIdentity) => void;
  onRemove?: () => void;
  removeLabel?: string;
  onPreviewSuccess: (soundId: SuccessSoundId) => void;
  onPreviewFailure: (soundId: FailureSoundId) => void;
  secondaryLabel?: string;
  onSecondary?: (name: string, identity: PlayerIdentity) => void;
};

export function PlayerIdentityEditor({ visible, initial, eyebrow, title, saveLabel, onClose, onSave, onRemove, removeLabel, secondaryLabel, onSecondary, onPreviewSuccess, onPreviewFailure }: Props) {
  const [name, setName] = useState('');
  const [identity, setIdentity] = useState<PlayerIdentity>(() => normalizePlayerIdentity(initial?.identity));
  useEffect(() => {
    setName(initial?.displayName ?? '');
    setIdentity(normalizePlayerIdentity(initial?.identity));
  }, [initial?.displayName, initial?.identity]);

  const save = () => {
    if (!name.trim()) return;
    onSave(name, identity);
    onClose();
  };

  return <KeyboardSafeFormSheet
    visible={visible}
    eyebrow={eyebrow}
    title={title}
    onClose={onClose}
    primaryAction={{ label: saveLabel, disabled: !name.trim(), onPress: save }}
  >
        <TextInput
          accessibilityLabel="Player name"
          autoFocus
          maxLength={18}
          value={name}
          onChangeText={setName}
          returnKeyType="done"
          submitBehavior="blurAndSubmit"
          onSubmitEditing={save}
          style={styles.input}
        />
        <View style={styles.choiceGroup}>
          <Text style={styles.choiceLabel}>COLOR</Text>
          <View style={styles.colorChoices}>{PLAYER_COLORS.map((choice) => <Pressable
            key={choice.id}
            accessibilityRole="radio"
            accessibilityLabel={choice.label}
            accessibilityState={{ checked: identity.colorId === choice.id }}
            onPress={() => setIdentity((current) => ({ ...current, colorId: choice.id }))}
            style={[styles.colorChoice, { backgroundColor: playerColor(choice.id) }, identity.colorId === choice.id ? styles.colorChoiceSelected : null]}
          />)}</View>
        </View>
        <SoundChoices label="WIN SOUND" choices={SUCCESS_SOUNDS} selected={identity.successSoundId} onSelect={(successSoundId) => { setIdentity((current) => ({ ...current, successSoundId })); onPreviewSuccess(successSoundId); }} />
        <SoundChoices label="FAIL SOUND" choices={FAILURE_SOUNDS} selected={identity.failureSoundId} onSelect={(failureSoundId) => { setIdentity((current) => ({ ...current, failureSoundId })); onPreviewFailure(failureSoundId); }} />
        {onSecondary ? <GameButton tone="paper" disabled={!name.trim()} onPress={() => { onSecondary(name, identity); onClose(); }}>{secondaryLabel ?? 'Use for my player'}</GameButton> : null}
        {onRemove ? <GameButton tone="ghost" icon={<Trash2 size={18} color={gamesTheme.colors.danger} />} onPress={() => { onRemove(); onClose(); }}>{removeLabel ?? 'Remove player'}</GameButton> : null}
  </KeyboardSafeFormSheet>;
}

function SoundChoices<T extends string>({ label, choices, selected, onSelect }: { label: string; choices: readonly { id: T; label: string }[]; selected: T; onSelect: (id: T) => void }) {
  return <View style={styles.choiceGroup}>
    <Text style={styles.choiceLabel}>{label}</Text>
    <View style={styles.soundChoices}>{choices.map((choice) => <Pressable
      key={choice.id}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected === choice.id }}
      onPress={() => onSelect(choice.id)}
      style={[styles.soundChoice, selected === choice.id ? styles.soundChoiceSelected : null]}
    ><Text numberOfLines={1} adjustsFontSizeToFit style={[styles.soundChoiceText, selected === choice.id ? styles.soundChoiceTextSelected : null]}>{choice.label}</Text></Pressable>)}</View>
  </View>;
}

const styles = StyleSheet.create({
  input: { height: 52, paddingHorizontal: 14, borderWidth: 1, borderColor: 'rgba(32,29,24,0.22)', borderRadius: gamesTheme.radius.md, backgroundColor: gamesTheme.colors.white, color: gamesTheme.colors.ink, fontFamily: gamesTheme.type.utility, fontSize: 16 },
  choiceGroup: { gap: 7 },
  choiceLabel: { fontFamily: gamesTheme.type.utility, color: 'rgba(32,29,24,0.5)', fontSize: 9, letterSpacing: 1.2 },
  colorChoices: { flexDirection: 'row', gap: 10 },
  colorChoice: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: 'transparent' },
  colorChoiceSelected: { borderColor: gamesTheme.colors.ink, transform: [{ scale: 1.08 }] },
  soundChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  soundChoice: { flexGrow: 1, flexBasis: '30%', minHeight: 40, borderRadius: gamesTheme.radius.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(32,29,24,0.18)', backgroundColor: gamesTheme.colors.white },
  soundChoiceSelected: { borderColor: gamesTheme.colors.ink, backgroundColor: gamesTheme.colors.turmeric },
  soundChoiceText: { fontFamily: gamesTheme.type.utility, color: 'rgba(32,29,24,0.62)', fontSize: 11 },
  soundChoiceTextSelected: { color: gamesTheme.colors.ink },
});
