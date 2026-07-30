export const DOODLE_PASSES = 2;

export const doodleDares = [
  'Hide a tiny face.',
  'Turn an old line into something alive.',
  'Add something that could fly.',
  'Make one part ridiculously big.',
  'Hide a little heart.',
  'Add something nobody expects indoors.',
  'Turn two lines into a creature.',
  'Add a secret door.',
  'Make one detail look very sleepy.',
  'Add something making a funny sound.',
  'Hide the smallest possible hat.',
  'Make an earlier mark useful.',
] as const;

export const doodleSeeds = [
  { id: 'circle', invitation: 'Turn the circle into anything.' },
  { id: 'wave', invitation: 'Take this wandering line somewhere.' },
  { id: 'triangle', invitation: 'Make the triangle belong in a picture.' },
  { id: 'two-dots', invitation: 'Give these two dots a reason to be here.' },
] as const;

export type DoodleSeed = (typeof doodleSeeds)[number];

export type DoodleTurn = {
  playerIndex: number;
  pass: number;
  turnNumber: number;
  totalTurns: number;
  dare: string | null;
};

export function getDoodleTurn(playerCount: number, turnIndex: number, doodleIndex: number): DoodleTurn {
  if (playerCount <= 0) return { playerIndex: 0, pass: 1, turnNumber: 0, totalTurns: 0, dare: null };

  const totalTurns = playerCount * DOODLE_PASSES;
  const safeTurnIndex = Math.min(Math.max(0, turnIndex), totalTurns - 1);
  const playerIndex = safeTurnIndex % playerCount;
  const pass = Math.floor(safeTurnIndex / playerCount) + 1;
  const dareIndex = positiveModulo(doodleIndex * playerCount + playerIndex, doodleDares.length);

  return {
    playerIndex,
    pass,
    turnNumber: safeTurnIndex + 1,
    totalTurns,
    dare: pass === DOODLE_PASSES ? doodleDares[dareIndex] : null,
  };
}

export function advanceDoodleTurn(turnIndex: number, playerCount: number): { kind: 'handoff' | 'finished'; turnIndex: number } {
  const lastTurnIndex = Math.max(0, playerCount * DOODLE_PASSES - 1);
  if (playerCount <= 0 || turnIndex >= lastTurnIndex) return { kind: 'finished', turnIndex: lastTurnIndex };
  return { kind: 'handoff', turnIndex: turnIndex + 1 };
}

export function getDoodleSeed(doodleIndex: number): DoodleSeed {
  return doodleSeeds[positiveModulo(doodleIndex, doodleSeeds.length)];
}

function positiveModulo(value: number, length: number): number {
  return ((value % length) + length) % length;
}
