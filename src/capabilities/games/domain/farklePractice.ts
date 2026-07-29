import { analyzeFarkleRoll, scoreFarkleSelection } from './farkle';

export type FarklePracticePhase = 'selecting' | 'decision' | 'banked' | 'farkled';

export type FarklePractice = {
  phase: FarklePracticePhase;
  dice: number[];
  selectedIndexes: number[];
  points: number;
  diceRemaining: number;
};

const openingRoll = [1, 5, 2, 2, 3, 4];
const riskRoll = [2, 3, 4, 6];

export function createFarklePractice(): FarklePractice {
  return {
    phase: 'selecting',
    dice: [...openingRoll],
    selectedIndexes: [],
    points: 0,
    diceRemaining: 6,
  };
}

export function togglePracticeDie(practice: FarklePractice, index: number): FarklePractice {
  if (practice.phase !== 'selecting' || index < 0 || index >= practice.dice.length) return practice;
  const selectedIndexes = practice.selectedIndexes.includes(index)
    ? practice.selectedIndexes.filter((selected) => selected !== index)
    : [...practice.selectedIndexes, index].sort((left, right) => left - right);
  return { ...practice, selectedIndexes };
}

export function confirmPracticeSelection(practice: FarklePractice): FarklePractice {
  if (practice.phase !== 'selecting') return practice;
  const values = practice.selectedIndexes.map((index) => practice.dice[index]);
  const selection = scoreFarkleSelection(values);
  const teachesSingles = values.length === 2 && values.includes(1) && values.includes(5);
  if (!selection.valid || !teachesSingles) return practice;
  return {
    ...practice,
    phase: 'decision',
    points: selection.score,
    diceRemaining: practice.dice.length - values.length,
  };
}

export function bankPractice(practice: FarklePractice): FarklePractice {
  return practice.phase === 'decision' ? { ...practice, phase: 'banked' } : practice;
}

export function riskPractice(practice: FarklePractice): FarklePractice {
  if (practice.phase !== 'decision' || !analyzeFarkleRoll(riskRoll).farkle) return practice;
  return {
    ...practice,
    phase: 'farkled',
    dice: [...riskRoll],
    selectedIndexes: [],
    points: 0,
  };
}
