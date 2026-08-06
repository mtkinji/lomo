export const STORY_TROUBLE_MAX = 4;

export type StoryFlavor = 'wonder' | 'mystery' | 'wild';
export type StorySceneKind = 'find-a-way' | 'hold-together' | 'finale';

export type StoryChoice = {
  id: string;
  number: 1 | 2 | 3;
  label: string;
  hint: string;
};

export type StoryScene = {
  kind: StorySceneKind;
  title: string;
  frame: string;
  commitments: [StoryChoice, StoryChoice, StoryChoice];
  cleanResult: string;
  strainedResult: string;
  dangerousResult: string;
};

export type StoryAdventurePlan = {
  id: string;
  source: 'included' | 'generated';
  flavor: StoryFlavor;
  title: string;
  goal: string;
  promise: string;
  opening: string;
  twist: string;
  scenes: [StoryScene, StoryScene, StoryScene];
  endings: {
    bright: string;
    costly: string;
    heroic: string;
  };
};

export type StoryCharacter = {
  seatIndex: number;
  playerName: string;
  title: string;
  trait: string;
  power: { id: string; label: string; description: string };
  keepsake: { id: string; label: string };
};

export type StoryCommitment = {
  seatIndex: number;
  choiceId: string;
  usePower?: boolean;
};

export type StorySceneResult = {
  sceneIndex: number;
  commitments: StoryCommitment[];
  coverage: number;
  troubleBefore: number;
  troubleAdded: number;
  nextTrouble: number;
  newlySpentPowerSeatIndexes: number[];
};

export type StoryOutcome = {
  kind: 'bright-victory' | 'costly-victory' | 'heroic-failure';
  title: string;
  summary: string;
};

const sharedScenes: Record<StoryFlavor, [StoryScene, StoryScene, StoryScene]> = {
  wonder: [
    {
      kind: 'find-a-way',
      title: 'Find a way',
      frame: 'The silver river has risen over the only road. On the far bank, the lost star is already beginning to dim.',
      commitments: [
        { id: 'scout', number: 1, label: 'Scout', hint: 'Look for a hidden crossing.' },
        { id: 'build', number: 2, label: 'Build', hint: 'Make a way across.' },
        { id: 'protect', number: 3, label: 'Protect', hint: 'Keep the light safe.' },
      ],
      cleanResult: 'You cover every danger and cross before the river notices.',
      strainedResult: 'You make it across, but the river carries one warning downstream.',
      dangerousResult: 'You force a way through together, and the shadow gains ground.',
    },
    {
      kind: 'hold-together',
      title: 'Hold together',
      frame: 'The lantern orchard wakes around you. One path leads toward the star; another voice calls for help from the dark.',
      commitments: [
        { id: 'star', number: 1, label: 'Follow the star', hint: 'Keep moving toward the Goal.' },
        { id: 'voice', number: 2, label: 'Help the voice', hint: 'Keep the Promise.' },
        { id: 'lanterns', number: 3, label: 'Guard the lanterns', hint: 'Hold the safe path open.' },
      ],
      cleanResult: 'The group divides perfectly, and nobody is left in the dark.',
      strainedResult: 'You save what matters, but something bright goes quiet behind you.',
      dangerousResult: 'You stay together, though the orchard opens a door for the shadow.',
    },
    {
      kind: 'finale',
      title: 'Bring it home',
      frame: 'The lost star rests inside the shadow tower. The village lights flicker below as the final door begins to close.',
      commitments: [
        { id: 'distract', number: 1, label: 'Distract', hint: 'Turn the shadow away.' },
        { id: 'carry', number: 2, label: 'Carry', hint: 'Bring the star home.' },
        { id: 'promise', number: 3, label: 'Keep the promise', hint: 'Protect what you vowed to save.' },
      ],
      cleanResult: 'Every part of the plan lands at once. The tower cannot hold you.',
      strainedResult: 'The plan works, but the tower takes one last thing as it falls.',
      dangerousResult: 'You choose what matters most and leap as the tower closes.',
    },
  ],
  mystery: [
    {
      kind: 'find-a-way',
      title: 'Find the first clue',
      frame: 'At midnight, every clock in Bellweather stops—except one hidden somewhere inside the locked museum.',
      commitments: [
        { id: 'windows', number: 1, label: 'Check the windows', hint: 'Find a quiet entrance.' },
        { id: 'guard', number: 2, label: 'Question the guard', hint: 'Learn what changed.' },
        { id: 'tracks', number: 3, label: 'Follow the tracks', hint: 'Chase the freshest clue.' },
      ],
      cleanResult: 'Three clues click together and reveal a path no single clue could show.',
      strainedResult: 'You find the way in, but whoever stopped the clocks knows you are coming.',
      dangerousResult: 'You catch the trail just before it vanishes, and a bell rings behind you.',
    },
    {
      kind: 'hold-together',
      title: 'Trust the right clue',
      frame: 'Inside the museum, three portraits give three different warnings. One protects the truth; the others protect themselves.',
      commitments: [
        { id: 'portrait', number: 1, label: 'Trust the portrait', hint: 'Follow its secret direction.' },
        { id: 'evidence', number: 2, label: 'Trust the evidence', hint: 'Test what you already know.' },
        { id: 'each-other', number: 3, label: 'Trust each other', hint: "Protect the group's plan." },
      ],
      cleanResult: 'You test every warning and expose the lie without losing the trail.',
      strainedResult: 'You keep the true clue, but the false one costs precious time.',
      dangerousResult: 'You refuse to split up, even as the museum rearranges around you.',
    },
    {
      kind: 'finale',
      title: 'Restart the city',
      frame: 'The missing minute is trapped inside the clockmaker’s impossible machine. Taking it back will reveal who stole it—and why.',
      commitments: [
        { id: 'machine', number: 1, label: 'Stop the machine', hint: 'End the danger.' },
        { id: 'minute', number: 2, label: 'Free the minute', hint: 'Restore the city.' },
        { id: 'truth', number: 3, label: 'Reveal the truth', hint: 'Keep your promise to Bellweather.' },
      ],
      cleanResult: 'The machine, minute, and truth all break free together.',
      strainedResult: 'The clocks restart, but the truth changes Bellweather forever.',
      dangerousResult: 'The final bell rings while you choose what the city gets to keep.',
    },
  ],
  wild: [
    {
      kind: 'find-a-way',
      title: 'Catch the impossible bus',
      frame: 'A flying bus full of runaway birthday cakes is leaving the moon in sixty seconds—and your invitation is onboard.',
      commitments: [
        { id: 'bounce', number: 1, label: 'Bounce', hint: 'Use the trampoline clouds.' },
        { id: 'bargain', number: 2, label: 'Bargain', hint: 'Convince the moon pigeons.' },
        { id: 'invent', number: 3, label: 'Invent', hint: 'Build something ridiculous.' },
      ],
      cleanResult: 'Your plans collide into one magnificent launch.',
      strainedResult: 'You catch the bumper, but several cakes declare independence.',
      dangerousResult: 'You board through the emergency frosting hatch as the bus rockets away.',
    },
    {
      kind: 'hold-together',
      title: 'Survive snack space',
      frame: 'The bus enters snack space, where enormous crackers mistake passengers for toppings and the driver has forgotten gravity.',
      commitments: [
        { id: 'driver', number: 1, label: 'Help the driver', hint: 'Point the bus home.' },
        { id: 'crackers', number: 2, label: 'Confuse the crackers', hint: 'Protect the passengers.' },
        { id: 'cakes', number: 3, label: 'Catch the cakes', hint: 'Keep the party together.' },
      ],
      cleanResult: 'You restore gravity, rescue dessert, and leave the crackers applauding.',
      strainedResult: 'The bus escapes, although something crunchy follows close behind.',
      dangerousResult: 'Everyone holds on while snack space takes a bite out of the plan.',
    },
    {
      kind: 'finale',
      title: 'Deliver the party',
      frame: 'The birthday planet is directly below, guarded by the Supreme Party Pooper and one extremely serious goose.',
      commitments: [
        { id: 'goose', number: 1, label: 'Distract the goose', hint: 'Open the landing path.' },
        { id: 'cakes', number: 2, label: 'Deliver the cakes', hint: 'Complete the mission.' },
        { id: 'party', number: 3, label: 'Start the party', hint: 'Make everyone welcome.' },
      ],
      cleanResult: 'The goose dances, the cakes land, and the whole planet shouts your names.',
      strainedResult: 'The party begins with one spectacularly expensive crash.',
      dangerousResult: 'You save the celebration by choosing the wildest possible ending.',
    },
  ],
};

const includedVariants: Record<StoryFlavor, Array<Omit<StoryAdventurePlan, 'id' | 'source' | 'flavor' | 'scenes'>>> = {
  wonder: [
    {
      title: 'The Lost Star',
      goal: 'Bring the lost star home before the shadow reaches the village.',
      promise: 'No one who asks for help will be left behind.',
      opening: 'Tonight, the smallest star in the sky falls into the silver hills and calls your names.',
      twist: 'The voice you helped in the orchard knows a secret entrance to the shadow tower.',
      endings: {
        bright: 'The star rises over the village, and every light answers it.',
        costly: 'The star comes home, but the silver hills keep one piece of your journey.',
        heroic: 'The star cannot return tonight, but your promise becomes a new light the shadow cannot cross.',
      },
    },
    {
      title: 'The Sleeping Sky',
      goal: 'Wake the sleeping sky before morning forgets how to arrive.',
      promise: 'Carry the last lantern safely through the dark.',
      opening: 'The sun fails to rise, and one tiny lantern begins walking toward your door.',
      twist: 'The path you protected has become a bright bridge into the sky.',
      endings: {
        bright: 'Morning remembers every color and arrives all at once.',
        costly: 'Morning returns softly, leaving one constellation asleep.',
        heroic: 'The sky remains dark, but your lantern gives the village a morning of its own.',
      },
    },
  ],
  mystery: [
    {
      title: 'The Missing Minute',
      goal: 'Return Bellweather’s missing minute before the city freezes at midnight.',
      promise: 'Reveal the truth without abandoning anyone inside the stopped hour.',
      opening: 'At 11:59, every clock stops and a folded clue slides beneath your door.',
      twist: 'The warning you almost ignored contains the clockmaker’s real name.',
      endings: {
        bright: 'The clocks move, the truth rings out, and nobody loses a single moment.',
        costly: 'Bellweather moves again, but everyone remembers the minute that vanished.',
        heroic: 'The city remains still, yet you free everyone trapped inside its final minute.',
      },
    },
    {
      title: 'The House That Moved',
      goal: 'Find Number Seven before the wandering street leaves town forever.',
      promise: 'Bring home everyone who entered the impossible house.',
      opening: 'A whole street appears in the park, but every front door has the same number.',
      twist: 'The clue you protected is actually a key remembering its original door.',
      endings: {
        bright: 'Number Seven settles home exactly where it belongs.',
        costly: 'The missing house returns, while the wandering street keeps one new address.',
        heroic: 'The street disappears, but every lost visitor steps safely into the park.',
      },
    },
  ],
  wild: [
    {
      title: 'The Moon Cake Express',
      goal: 'Deliver the runaway birthday cakes before the birthday planet blows out its last candle.',
      promise: 'Every passenger—and every cake—gets to the party.',
      opening: 'A flying bus honks outside, trailing frosting, moon pigeons, and one urgent invitation.',
      twist: 'The cake you caught earlier has secretly learned to drive.',
      endings: {
        bright: 'The biggest party in the galaxy begins exactly on time.',
        costly: 'The party is saved, although the moon now has a permanent frosting ring.',
        heroic: 'The cakes never arrive, so you turn the rescue itself into the greatest party anyone remembers.',
      },
    },
    {
      title: 'Volcano Talent Show',
      goal: 'Finish the volcano talent show before the mountain performs its explosive finale.',
      promise: 'Every ridiculous contestant gets one chance onstage.',
      opening: 'A tap-dancing boulder arrives with backstage passes and terrible news.',
      twist: 'The act you protected is the only one the volcano wants to see twice.',
      endings: {
        bright: 'The volcano gives you a standing ovation instead of an eruption.',
        costly: 'The show succeeds, but the stage becomes a brand-new island.',
        heroic: 'The finale erupts, and you carry every performer to the safest encore in history.',
      },
    },
  ],
};

const characterTitles = ['Pathfinder', 'Keeper', 'Tinkerer', 'Listener', 'Spark', 'Wayfinder'];
const characterTraits = ['notices what others miss', 'stays calm when plans wobble', 'can make almost anything useful', 'hears the truth inside strange noises', 'turns mistakes into openings', 'always finds one more path'];
const powers = [
  { id: 'discover', label: 'Discover', description: 'Reveal one missing approach.' },
  { id: 'protect', label: 'Protect', description: 'Cover one missing approach.' },
  { id: 'transform', label: 'Transform', description: 'Turn one problem into a missing approach.' },
  { id: 'connect', label: 'Connect', description: 'Join two plans and cover one missing approach.' },
  { id: 'redirect', label: 'Redirect', description: 'Send danger away from one missing approach.' },
  { id: 'inspire', label: 'Inspire', description: 'Help the group cover one missing approach.' },
];
const keepsakes = ['a tiny compass', 'a brass button', 'a folded paper star', 'a blue ribbon', 'a smooth red stone', 'a key with no lock'];

function normalizedIndex(value: number, length: number) {
  return ((Math.floor(value) % length) + length) % length;
}

export function createIncludedStoryPlan(flavor: StoryFlavor, seed: number): StoryAdventurePlan {
  const variantIndex = normalizedIndex(seed, includedVariants[flavor].length);
  const variant = includedVariants[flavor][variantIndex];
  return {
    id: `included-${flavor}-${variantIndex}`,
    source: 'included',
    flavor,
    ...variant,
    scenes: sharedScenes[flavor],
  };
}

export function createStoryCharacters(players: string[], seed: number): StoryCharacter[] {
  return players.slice(0, 6).map((playerName, seatIndex) => {
    const index = normalizedIndex(seed + seatIndex, characterTitles.length);
    return {
      seatIndex,
      playerName,
      title: characterTitles[index],
      trait: characterTraits[index],
      power: powers[index],
      keepsake: { id: `keepsake-${index}`, label: keepsakes[index] },
    };
  });
}

function clampTrouble(value: number) {
  return Math.max(0, Math.min(STORY_TROUBLE_MAX, Math.floor(value)));
}

export function resolveStoryScene({
  sceneIndex,
  currentTrouble,
  commitments,
  characters,
  spentPowerSeatIndexes,
}: {
  sceneIndex: number;
  currentTrouble: number;
  commitments: StoryCommitment[];
  characters: StoryCharacter[];
  spentPowerSeatIndexes: number[];
}): StorySceneResult {
  const validSeats = new Set(characters.map(({ seatIndex }) => seatIndex));
  const spentPowers = new Set(spentPowerSeatIndexes);
  const validCommitments = commitments.filter((commitment) => validSeats.has(commitment.seatIndex) && commitment.choiceId.trim());
  const uniqueChoices = new Set(validCommitments.map(({ choiceId }) => choiceId));
  const newlySpentPowerSeatIndexes = validCommitments
    .filter((commitment) => commitment.usePower && !spentPowers.has(commitment.seatIndex))
    .map(({ seatIndex }) => seatIndex)
    .filter((seatIndex, index, all) => all.indexOf(seatIndex) === index)
    .sort((a, b) => a - b);
  const coverage = Math.min(3, uniqueChoices.size + (newlySpentPowerSeatIndexes.length ? 1 : 0));
  const troubleAdded = Math.max(0, 3 - coverage);
  const troubleBefore = clampTrouble(currentTrouble);

  return {
    sceneIndex,
    commitments: validCommitments,
    coverage,
    troubleBefore,
    troubleAdded,
    nextTrouble: clampTrouble(troubleBefore + troubleAdded),
    newlySpentPowerSeatIndexes,
  };
}

export function applyStoryKeepsake(
  result: StorySceneResult,
  seatIndex: number,
  spentKeepsakeSeatIndexes: number[],
): {
  applied: boolean;
  result: StorySceneResult;
  spentKeepsakeSeatIndexes: number[];
} {
  if (result.troubleAdded <= 0 || spentKeepsakeSeatIndexes.includes(seatIndex)) {
    return { applied: false, result, spentKeepsakeSeatIndexes };
  }

  return {
    applied: true,
    result: {
      ...result,
      troubleAdded: result.troubleAdded - 1,
      nextTrouble: clampTrouble(result.nextTrouble - 1),
    },
    spentKeepsakeSeatIndexes: [...spentKeepsakeSeatIndexes, seatIndex].sort((a, b) => a - b),
  };
}

export function getStoryOutcome(trouble: number): StoryOutcome {
  const safeTrouble = clampTrouble(trouble);
  if (safeTrouble <= 1) {
    return {
      kind: 'bright-victory',
      title: 'Bright victory',
      summary: 'You reached the Goal and kept the Promise.',
    };
  }
  if (safeTrouble <= 3) {
    return {
      kind: 'costly-victory',
      title: 'Costly victory',
      summary: 'You reached the Goal, and the journey changed something along the way.',
    };
  }
  return {
    kind: 'heroic-failure',
    title: 'Heroic ending',
    summary: 'The Goal slipped away, but your Promise saved what mattered most.',
  };
}
