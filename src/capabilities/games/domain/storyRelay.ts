export const MAX_STORY_CHAPTERS = 3;

export type StoryContribution = {
  chapterIndex: number;
  player: string;
  text: string;
  spark?: string;
};

export type StoryTurn = {
  player: string;
  purpose: string;
  prompt: string;
  allowsSpark: boolean;
  sparks: string[];
};

const middlePurposes = [
  { purpose: 'Make trouble.', prompt: 'What suddenly goes wrong?' },
  { purpose: 'Make it matter.', prompt: 'Bring back something we already heard.' },
  { purpose: 'Choose bravely.', prompt: 'Give someone a brave or ridiculous decision.' },
  { purpose: 'Move the story.', prompt: 'Send everyone somewhere unexpected.' },
];

const sparks = [
  'a suspicious pancake',
  'something under the couch',
  'a sound nobody recognizes',
  'the tiniest possible key',
  'a backwards map',
  'an animal with a secret',
  'a message meant for someone else',
  'the last thing anyone expected',
  'a door that was not there before',
  'an object from breakfast',
  'a promise someone forgot',
  'a surprisingly brave mistake',
];

export function chapterTurnOrder(players: string[], chapterIndex: number) {
  if (!players.length) return [];
  const starter = chapterIndex % players.length;
  return [...players.slice(starter), ...players.slice(0, starter)];
}

function purposeFor(turnIndex: number, playerCount: number) {
  if (turnIndex === 0) return { purpose: 'Open the scene.', prompt: 'Begin with one vivid thing happening now.' };
  if (turnIndex === playerCount - 1) return { purpose: 'Land the surprise.', prompt: 'End this chapter with a delightful surprise.' };
  const middleIndex = Math.min(
    middlePurposes.length - 1,
    Math.floor(((turnIndex - 1) * middlePurposes.length) / Math.max(1, playerCount - 2)),
  );
  return middlePurposes[middleIndex];
}

export function getStoryTurn(players: string[], chapterIndex: number, turnIndex: number, premiseIndex: number): StoryTurn {
  const order = chapterTurnOrder(players, chapterIndex);
  const purpose = purposeFor(turnIndex, order.length);
  const start = (premiseIndex * 3 + chapterIndex * 2 + Math.max(0, turnIndex - 1) * 3) % sparks.length;
  return {
    player: order[turnIndex] ?? '',
    ...purpose,
    allowsSpark: turnIndex > 0,
    sparks: [sparks[start], sparks[(start + 4) % sparks.length], sparks[(start + 8) % sparks.length]],
  };
}

export function nextStoryStep({
  chapterIndex,
  turnIndex,
  playerCount,
  continueStory = false,
}: {
  chapterIndex: number;
  turnIndex: number;
  playerCount: number;
  continueStory?: boolean;
}) {
  const chapterComplete = turnIndex >= playerCount - 1;
  if (!chapterComplete) return { kind: 'turn' as const, chapterIndex, turnIndex: turnIndex + 1 };
  if (chapterIndex >= MAX_STORY_CHAPTERS - 1) return { kind: 'finished' as const, chapterIndex };
  if (continueStory) return { kind: 'turn' as const, chapterIndex: chapterIndex + 1, turnIndex: 0 };
  return { kind: 'reveal' as const, chapterIndex };
}

export function storySoFar(contributions: StoryContribution[]) {
  return contributions.map(({ text }) => text.trim()).filter(Boolean).join(' ');
}
