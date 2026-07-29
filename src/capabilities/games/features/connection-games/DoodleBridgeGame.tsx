import { useMemo, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { gamesTheme } from '@/src/capabilities/games/theme/gamesTheme';
import { GameButton } from '@/src/capabilities/games/ui/GameButton';
import { advanceDoodleTurn, getDoodleSeed, getDoodleTurn } from '@/src/capabilities/games/domain/doodleBridge';
import {
  appendDoodlePoint,
  beginDoodleStroke,
  commitDoodleStroke,
  DOODLE_CANVAS_HEIGHT,
  DOODLE_CANVAS_WIDTH,
  doodlePointsToPath,
  mapDoodlePointToCanvas,
  undoCurrentTurnStroke,
  type DoodleCanvasBounds,
  type DoodlePoint,
  type DoodleStroke,
} from '@/src/capabilities/games/domain/doodleStroke';
import { PlayCard } from './ConnectionGameFrame';

type Phase = 'drawing' | 'handoff' | 'finished';

const colors = [gamesTheme.colors.coral, gamesTheme.colors.turmericDark, gamesTheme.colors.feltLight, '#528BC4', '#A45AA8', gamesTheme.colors.wood];

export function DoodleBridgeGame({ players }: { players: string[] }) {
  const [doodleIndex, setDoodleIndex] = useState(0);
  const [turnIndex, setTurnIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('drawing');
  const [strokes, setStrokes] = useState<DoodleStroke[]>([]);
  const [current, setCurrent] = useState<DoodlePoint[]>([]);
  const [canvasBounds, setCanvasBounds] = useState<DoodleCanvasBounds>({ width: DOODLE_CANVAS_WIDTH, height: DOODLE_CANVAS_HEIGHT });
  const turn = getDoodleTurn(players.length, turnIndex, doodleIndex);
  const seed = getDoodleSeed(doodleIndex);
  const activeColor = colors[turn.playerIndex % colors.length];
  const hasCurrentTurnStroke = strokes.some((stroke) => stroke.turn === turnIndex);

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: (event) => phase === 'drawing' && event.nativeEvent.touches.length === 1,
    onMoveShouldSetPanResponder: (event) => phase === 'drawing' && event.nativeEvent.touches.length === 1,
    onPanResponderGrant: (event) => {
      const point = mapDoodlePointToCanvas({ x: event.nativeEvent.locationX, y: event.nativeEvent.locationY }, canvasBounds);
      setCurrent(point ? beginDoodleStroke(point) : []);
    },
    onPanResponderMove: (event) => {
      if (event.nativeEvent.touches.length !== 1) {
        setCurrent([]);
        return;
      }
      const point = mapDoodlePointToCanvas({ x: event.nativeEvent.locationX, y: event.nativeEvent.locationY }, canvasBounds);
      if (point) setCurrent((points) => appendDoodlePoint(points, point));
    },
    onPanResponderRelease: () => setCurrent((points) => {
      if (points.length > 1) setStrokes((items) => commitDoodleStroke(items, { points, color: activeColor, player: turn.playerIndex, turn: turnIndex }));
      return [];
    }),
    onPanResponderTerminate: () => setCurrent([]),
    onShouldBlockNativeResponder: () => true,
  }), [activeColor, canvasBounds, phase, turn.playerIndex, turnIndex]);

  const pass = () => {
    setCurrent([]);
    const next = advanceDoodleTurn(turnIndex, players.length);
    if (next.kind === 'finished') setPhase('finished');
    else {
      setTurnIndex(next.turnIndex);
      setPhase('handoff');
    }
  };

  const startAnother = () => {
    setDoodleIndex((value) => value + 1);
    setTurnIndex(0);
    setPhase('drawing');
    setStrokes([]);
    setCurrent([]);
  };

  if (phase === 'handoff') {
    return <>
      <PlayCard eyebrow="PASS THE PHONE" title={`Hand it to ${players[turn.playerIndex]}.`} copy={turn.dare ? 'Their next instruction is private.' : 'Their turn starts when they’re ready.'} />
      <GameButton onPress={() => setPhase('drawing')}>{turn.dare ? 'Show my dare' : 'Show my turn'}</GameButton>
    </>;
  }

  if (phase === 'finished') {
    return <>
      <PlayCard tone="paper" eyebrow="YOUR SHARED DOODLE" title="What did it become?" copy="Find how each secret dare changed the picture." />
      <DoodleCanvas seedId={seed.id} strokes={strokes} />
      <View style={styles.dareList}>
        {players.map((player, playerIndex) => {
          const dare = getDoodleTurn(players.length, players.length + playerIndex, doodleIndex).dare;
          return <View key={`${player}-${playerIndex}`} accessible accessibilityLabel={`${player}'s secret dare: ${dare}`} style={styles.dareRow}>
            <View style={[styles.dot, { backgroundColor: colors[playerIndex % colors.length] }]} />
            <View style={styles.dareCopy}><Text style={styles.darePlayer}>{player}</Text><Text style={styles.dareText}>{dare}</Text></View>
          </View>;
        })}
      </View>
      <GameButton onPress={startAnother}>Start another doodle</GameButton>
    </>;
  }

  const next = advanceDoodleTurn(turnIndex, players.length);
  const nextPlayer = next.kind === 'handoff' ? players[getDoodleTurn(players.length, next.turnIndex, doodleIndex).playerIndex] : null;
  const passLabel = next.kind === 'finished'
    ? 'Reveal our doodle'
    : hasCurrentTurnStroke ? `Pass to ${nextPlayer}` : 'Pass without drawing';

  return <>
    <PlayCard
      tone="paper"
      eyebrow={`TURN ${turn.turnNumber} OF ${turn.totalTurns} · ${players[turn.playerIndex].toUpperCase()}`}
      title={turn.dare ?? seed.invitation}
      copy={turn.dare ? 'Keep it secret. Add a few lines, then pass it on.' : 'Add anything you like. You’ll get a secret dare next time around.'}
    />
    <View
      accessibilityLabel="Shared doodle canvas"
      style={styles.canvas}
      onLayout={(event) => setCanvasBounds(event.nativeEvent.layout)}
      {...responder.panHandlers}
    >
      <DoodleSvg seedId={seed.id} strokes={strokes} current={current} activeColor={activeColor} />
    </View>
    <View style={styles.actions}>
      {hasCurrentTurnStroke ? <GameButton tone="ghost" onPress={() => setStrokes((items) => undoCurrentTurnStroke(items, turnIndex))}>Undo my last line</GameButton> : null}
      <GameButton onPress={pass}>{passLabel}</GameButton>
    </View>
  </>;
}

function DoodleCanvas({ seedId, strokes }: { seedId: string; strokes: DoodleStroke[] }) {
  return <View accessibilityLabel="Finished shared doodle" style={styles.canvas}><DoodleSvg seedId={seedId} strokes={strokes} current={[]} activeColor={gamesTheme.colors.ink} /></View>;
}

function DoodleSvg({ seedId, strokes, current, activeColor }: { seedId: string; strokes: DoodleStroke[]; current: DoodlePoint[]; activeColor: string }) {
  return <Svg width="100%" height="100%" viewBox={`0 0 ${DOODLE_CANVAS_WIDTH} ${DOODLE_CANVAS_HEIGHT}`}>
    <DoodleSeedMark seedId={seedId} />
    {strokes.map((stroke, index) => <Path key={`${stroke.turn}-${index}`} d={doodlePointsToPath(stroke.points)} fill="none" stroke={stroke.color} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />)}
    {current.length > 1 ? <Path d={doodlePointsToPath(current)} fill="none" stroke={activeColor} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" /> : null}
  </Svg>;
}

function DoodleSeedMark({ seedId }: { seedId: string }) {
  const seedStroke = 'rgba(32,29,24,0.22)';
  const shared = { fill: 'none', stroke: seedStroke, strokeWidth: 4, strokeDasharray: '7 8', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (seedId === 'wave') return <Path d="M 42 166 C 82 88 128 224 174 148 S 258 82 300 164" {...shared} />;
  if (seedId === 'triangle') return <Path d="M 170 62 L 264 222 L 76 222 Z" {...shared} />;
  if (seedId === 'two-dots') return <><Circle cx="120" cy="150" r="13" fill={seedStroke} /><Circle cx="220" cy="150" r="13" fill={seedStroke} /></>;
  return <Circle cx="170" cy="150" r="38" {...shared} />;
}

const styles = StyleSheet.create({
  canvas: { height: 300, overflow: 'hidden', borderRadius: 24, backgroundColor: gamesTheme.colors.paper, borderWidth: 1, borderColor: 'rgba(32,29,24,0.16)' },
  actions: { gap: 8 },
  dareList: { gap: 8 },
  dareRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 17, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: 'rgba(255,249,237,0.72)', borderWidth: 1, borderColor: 'rgba(32,29,24,0.12)' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  dareCopy: { flex: 1 },
  darePlayer: { fontFamily: gamesTheme.type.utility, fontSize: 12, color: gamesTheme.colors.ink },
  dareText: { fontFamily: gamesTheme.type.body, fontSize: 14, lineHeight: 19, color: 'rgba(32,29,24,0.72)' },
});
