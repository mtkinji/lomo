export type StitchFiveCategoryId =
  | 'ones'
  | 'twos'
  | 'threes'
  | 'fours'
  | 'fives'
  | 'sixes'
  | 'three-piece'
  | 'four-piece'
  | 'house-block'
  | 'short-stitch'
  | 'long-stitch'
  | 'free-patch'
  | 'full-quilt';

export type StitchFiveTone = 'rose' | 'coral' | 'gold' | 'pine' | 'sky' | 'violet';

export type StitchFiveCategory = {
  id: StitchFiveCategoryId;
  label: string;
  rule: string;
  family: 'face' | 'pattern';
  tone: StitchFiveTone;
  mark: string;
};

export const stitchFiveScorecard: readonly StitchFiveCategory[] = [
  { id: 'ones', label: 'Ones', rule: 'Add every 1', family: 'face', tone: 'rose', mark: '1' },
  { id: 'twos', label: 'Twos', rule: 'Add every 2', family: 'face', tone: 'coral', mark: '2' },
  { id: 'threes', label: 'Threes', rule: 'Add every 3', family: 'face', tone: 'gold', mark: '3' },
  { id: 'fours', label: 'Fours', rule: 'Add every 4', family: 'face', tone: 'pine', mark: '4' },
  { id: 'fives', label: 'Fives', rule: 'Add every 5', family: 'face', tone: 'sky', mark: '5' },
  { id: 'sixes', label: 'Sixes', rule: 'Add every 6', family: 'face', tone: 'violet', mark: '6' },
  { id: 'three-piece', label: 'Three-piece set', rule: 'Three of a kind · add all dice', family: 'pattern', tone: 'rose', mark: '3×' },
  { id: 'four-piece', label: 'Four-piece set', rule: 'Four of a kind · add all dice', family: 'pattern', tone: 'coral', mark: '4×' },
  { id: 'house-block', label: 'House Block', rule: 'Three of one + two of another · 25', family: 'pattern', tone: 'gold', mark: '⌂' },
  { id: 'short-stitch', label: 'Short Stitch', rule: 'Four in sequence · 30', family: 'pattern', tone: 'pine', mark: '4↗' },
  { id: 'long-stitch', label: 'Long Stitch', rule: 'Five in sequence · 40', family: 'pattern', tone: 'sky', mark: '5↗' },
  { id: 'free-patch', label: 'Free Patch', rule: 'Add all dice', family: 'pattern', tone: 'violet', mark: '∑' },
  { id: 'full-quilt', label: 'Full Quilt', rule: 'Five of a kind · 50', family: 'pattern', tone: 'rose', mark: '5×' },
];

export type StitchFiveScores = Partial<Record<StitchFiveCategoryId, number>>;

export type StitchFivePlayer = {
  name: string;
  scores: StitchFiveScores;
};

export type StitchFiveGame = {
  players: StitchFivePlayer[];
  activePlayer: number;
  dice: [number, number, number, number, number];
  pinned: [boolean, boolean, boolean, boolean, boolean];
  rollsUsed: number;
  status: 'playing' | 'finished';
  lastAction: { playerName: string; category: StitchFiveCategoryId; score: number } | null;
};

const faceCategories: readonly StitchFiveCategoryId[] = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
const shareMarks: Record<StitchFiveTone, string> = {
  rose: '🟥',
  coral: '🟧',
  gold: '🟨',
  pine: '🟩',
  sky: '🟦',
  violet: '🟪',
};

function validateDice(dice: readonly number[], expected = 5) {
  if (dice.length !== expected || dice.some((die) => !Number.isInteger(die) || die < 1 || die > 6)) {
    throw new Error(`Expected ${expected} dice values from 1 to 6.`);
  }
}

function countsFor(dice: readonly number[]) {
  return Array.from({ length: 6 }, (_, index) => dice.filter((die) => die === index + 1).length);
}

function hasSequence(dice: readonly number[], length: number) {
  const values = new Set(dice);
  for (let start = 1; start <= 7 - length; start += 1) {
    if (Array.from({ length }, (_, index) => start + index).every((value) => values.has(value))) return true;
  }
  return false;
}

export function stitchFiveScore(category: StitchFiveCategoryId, dice: readonly number[]) {
  validateDice(dice);
  const counts = countsFor(dice);
  const total = dice.reduce((sum, die) => sum + die, 0);
  const faceIndex = faceCategories.indexOf(category);
  if (faceIndex >= 0) return counts[faceIndex] * (faceIndex + 1);
  if (category === 'three-piece') return counts.some((count) => count >= 3) ? total : 0;
  if (category === 'four-piece') return counts.some((count) => count >= 4) ? total : 0;
  if (category === 'house-block') return counts.includes(3) && counts.includes(2) ? 25 : 0;
  if (category === 'short-stitch') return hasSequence(dice, 4) ? 30 : 0;
  if (category === 'long-stitch') return hasSequence(dice, 5) ? 40 : 0;
  if (category === 'free-patch') return total;
  return counts.includes(5) ? 50 : 0;
}

export function stitchFiveTotals(scores: StitchFiveScores) {
  const faceSubtotal = faceCategories.reduce((sum, category) => sum + (scores[category] ?? 0), 0);
  const seamBonus = faceSubtotal >= 63 ? 35 : 0;
  const scoreTotal = stitchFiveScorecard.reduce((sum, category) => sum + (scores[category.id] ?? 0), 0);
  return { faceSubtotal, seamBonus, total: scoreTotal + seamBonus };
}

export function createStitchFiveGame(names: readonly string[]): StitchFiveGame {
  if (names.length < 2 || names.length > 4) throw new Error('Stitch Five requires 2 to 4 players.');
  return {
    players: names.map((name, index) => ({ name: name.trim() || `Player ${index + 1}`, scores: {} })),
    activePlayer: 0,
    dice: [1, 1, 1, 1, 1],
    pinned: [false, false, false, false, false],
    rollsUsed: 0,
    status: 'playing',
    lastAction: null,
  };
}

function assertPlaying(game: StitchFiveGame) {
  if (game.status === 'finished') throw new Error('This quilt is already finished.');
}

export function rollStitchFiveDice(game: StitchFiveGame, rolled: readonly number[]): StitchFiveGame {
  assertPlaying(game);
  if (game.rollsUsed >= 3) throw new Error('A stitch can only be rolled three times.');
  const expected = game.rollsUsed === 0 ? 5 : game.pinned.filter((pinned) => !pinned).length;
  validateDice(rolled, expected);
  let rolledIndex = 0;
  const dice = game.dice.map((die, index) => {
    if (game.rollsUsed > 0 && game.pinned[index]) return die;
    const next = rolled[rolledIndex];
    rolledIndex += 1;
    return next;
  }) as StitchFiveGame['dice'];
  return { ...game, dice, rollsUsed: game.rollsUsed + 1, lastAction: null };
}

export function toggleStitchFivePin(game: StitchFiveGame, index: number): StitchFiveGame {
  assertPlaying(game);
  if (game.rollsUsed === 0) throw new Error('Roll before pinning dice.');
  if (game.rollsUsed >= 3) throw new Error('Choose a patch after the third roll.');
  if (!Number.isInteger(index) || index < 0 || index >= 5) throw new Error('Unknown die.');
  const pinned = [...game.pinned] as StitchFiveGame['pinned'];
  pinned[index] = !pinned[index];
  return { ...game, pinned };
}

export function commitStitchFivePatch(game: StitchFiveGame, category: StitchFiveCategoryId): StitchFiveGame {
  assertPlaying(game);
  if (game.rollsUsed === 0) throw new Error('Roll before choosing a patch.');
  const player = game.players[game.activePlayer];
  if (player.scores[category] !== undefined) throw new Error('That patch is already stitched.');
  const score = stitchFiveScore(category, game.dice);
  const players = game.players.map((candidate, index) => index === game.activePlayer
    ? { ...candidate, scores: { ...candidate.scores, [category]: score } }
    : candidate);
  const finished = players.every((candidate) => stitchFiveScorecard.every(({ id }) => candidate.scores[id] !== undefined));
  return {
    ...game,
    players,
    activePlayer: finished ? game.activePlayer : (game.activePlayer + 1) % players.length,
    dice: [1, 1, 1, 1, 1],
    pinned: [false, false, false, false, false],
    rollsUsed: 0,
    status: finished ? 'finished' : 'playing',
    lastAction: { playerName: player.name, category, score },
  };
}

export function stitchFivePreviews(game: StitchFiveGame) {
  if (game.rollsUsed === 0) return {} as StitchFiveScores;
  const scores = game.players[game.activePlayer].scores;
  return Object.fromEntries(stitchFiveScorecard
    .filter(({ id }) => scores[id] === undefined)
    .map(({ id }) => [id, stitchFiveScore(id, game.dice)])) as StitchFiveScores;
}

export function stitchFiveWinners(game: StitchFiveGame) {
  if (game.status !== 'finished') return [];
  const highScore = Math.max(...game.players.map((player) => stitchFiveTotals(player.scores).total));
  return game.players.filter((player) => stitchFiveTotals(player.scores).total === highScore);
}

export function stitchFiveShareText(game: StitchFiveGame, playerIndex: number) {
  if (game.status !== 'finished') throw new Error('Finish the quilt before sharing it.');
  const player = game.players[playerIndex];
  if (!player) throw new Error('Unknown player.');
  const totals = stitchFiveTotals(player.scores);
  const patches = stitchFiveScorecard.map(({ tone }) => shareMarks[tone]);
  const quilt = [patches.slice(0, 5), patches.slice(5, 10), patches.slice(10)].map((row) => row.join('')).join('\n');
  return `🧵 ${player.name}'s finished quilt · ${totals.total}\n${quilt}\nSeam bonus · ${totals.seamBonus}\nMade with Kwilt Games`;
}
