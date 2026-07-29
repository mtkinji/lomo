export type ServerPatternBeatId = 'coral' | 'pine' | 'gold' | 'sky' | 'violet' | 'rose';
export type ServerPassPatternGame = {
  difficulty: 'gentle' | 'classic' | 'challenge';
  playerCount: number;
  playerIndex: number;
  phase: 'handoff' | 'watch' | 'repeat' | 'add' | 'result';
  pattern: ServerPatternBeatId[];
  answer: ServerPatternBeatId[];
  success: boolean | null;
  watchSequence: number;
};

export type ServerPassPatternAction =
  | { actionType: 'ready' | 'replay_watch' | 'finish_watch' | 'next_player' | 'restart' }
  | { actionType: 'submit_beat'; beatId: ServerPatternBeatId };

const beatIds = {
  gentle: ['coral', 'pine', 'gold'],
  classic: ['coral', 'pine', 'gold', 'sky'],
  challenge: ['coral', 'pine', 'gold', 'sky', 'violet', 'rose'],
} as const;

const startingPattern = (difficulty: ServerPassPatternGame['difficulty']): ServerPatternBeatId[] => difficulty === 'challenge'
  ? ['coral', 'pine', 'gold']
  : ['coral', 'pine'];

export function applyRemotePassPatternCommand(game: ServerPassPatternGame, participantSeatIndex: number, action: ServerPassPatternAction): ServerPassPatternGame {
  if (participantSeatIndex !== game.playerIndex) throw new Error('not_your_turn');
  if (action.actionType === 'ready') {
    if (game.phase !== 'handoff') throw new Error('wrong_phase');
    return { ...game, phase: 'watch', watchSequence: game.watchSequence + 1 };
  }
  if (action.actionType === 'replay_watch') {
    if (game.phase !== 'watch') throw new Error('wrong_phase');
    return { ...game, watchSequence: game.watchSequence + 1 };
  }
  if (action.actionType === 'finish_watch') {
    if (game.phase !== 'watch') throw new Error('wrong_phase');
    return { ...game, phase: 'repeat', answer: [] };
  }
  if (action.actionType === 'submit_beat') {
    if (!(beatIds[game.difficulty] as readonly ServerPatternBeatId[]).includes(action.beatId)) throw new Error('invalid_beat');
    if (game.phase === 'add') return { ...game, pattern: [...game.pattern, action.beatId], phase: 'result', success: true };
    if (game.phase !== 'repeat') throw new Error('wrong_phase');
    const answer = [...game.answer, action.beatId];
    if (action.beatId !== game.pattern[answer.length - 1]) return { ...game, answer, phase: 'result', success: false };
    return { ...game, answer, phase: answer.length === game.pattern.length ? 'add' : 'repeat' };
  }
  if (action.actionType === 'next_player') {
    if (game.phase !== 'result' || !game.success) throw new Error('wrong_phase');
    return { ...game, playerIndex: (game.playerIndex + 1) % game.playerCount, phase: 'handoff', answer: [], success: null };
  }
  if (game.phase !== 'result' || game.success !== false) throw new Error('wrong_phase');
  return { ...game, playerIndex: 0, phase: 'handoff', pattern: startingPattern(game.difficulty), answer: [], success: null, watchSequence: 0 };
}
