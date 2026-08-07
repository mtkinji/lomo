import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { spacing } from '../../../theme';
import { Button } from '../../../ui/Button';
import { Text } from '../../../ui/Typography';
import type { CookCue, CookTimer } from '../domain/recipeCookContracts';

function duration(seconds: number) { const minutes = Math.floor(seconds / 60); const rest = seconds % 60; return minutes ? `${minutes}:${String(rest).padStart(2, '0')}` : `${rest}s`; }
function remaining(timer:CookTimer,now:number){return timer.status==='running'&&timer.firesAt?Math.max(0,Math.ceil((Date.parse(timer.firesAt)-now)/1000)):timer.remainingSeconds;}
export function CookTimerControl({ suggestions, timers, onStart, onPause, onResume, onCancel }: {
  suggestions: CookCue['timerSuggestions']; timers: CookTimer[]; onStart(suggestion: CookCue['timerSuggestions'][number]): void; onPause(id: string): void; onResume(id: string): void; onCancel(id: string): void;
}) {
  const[now,setNow]=useState(Date.now());useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(id);},[]);return <View style={styles.wrap}>{suggestions.map((item) => <Button key={`${item.label}:${item.durationSeconds}`} variant="outline" onPress={() => onStart(item)}>Start {item.label.toLowerCase()} timer · {duration(item.durationSeconds)}</Button>)}{timers.map((timer) => <View key={timer.id} style={styles.timer}><Text>{timer.label} · {duration(remaining(timer,now))}</Text><View style={styles.actions}>{timer.status === 'running' ? <Button size="sm" variant="ghost" onPress={() => onPause(timer.id)}>Pause</Button> : timer.status === 'paused' ? <Button size="sm" variant="ghost" onPress={() => onResume(timer.id)}>Resume</Button> : null}<Button size="sm" variant="ghost" onPress={() => onCancel(timer.id)}>Cancel</Button></View></View>)}</View>;
}
const styles = StyleSheet.create({ wrap: { gap: spacing.sm }, timer: { gap: spacing.xs }, actions: { flexDirection: 'row', gap: spacing.xs } });
