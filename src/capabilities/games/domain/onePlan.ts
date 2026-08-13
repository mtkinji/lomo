export type OnePlanOption = {
  label: string;
  consequence: string;
};

export type OnePlanScenario = {
  id: string;
  problem: string;
  options: [OnePlanOption, OnePlanOption, OnePlanOption];
  chaosConsequence: string;
};

export const onePlanScenarios: OnePlanScenario[] = [
  {
    id: 'dragon-roommate',
    problem: 'A dragon moved into your house. Where does it sleep?',
    options: [
      { label: 'The garage', consequence: 'The dragon turns the garage into a toast-powered workshop.' },
      { label: 'On the roof', consequence: 'The dragon curls around the chimney and keeps the whole house warm.' },
      { label: 'The guest room', consequence: 'The dragon claims the guest room and leaves tiny chocolates on every pillow.' },
    ],
    chaosConsequence: 'While everyone argued, the dragon chose the bathtub and now nobody can shower.',
  },
  {
    id: 'falling-moon',
    problem: 'The moon is falling. How do you put it back?',
    options: [
      { label: 'A giant trampoline', consequence: 'The moon bounces perfectly into place, but Tuesday now has two tides.' },
      { label: 'A rocket made of sofas', consequence: 'The sofa rocket works, and the moon gets one extremely comfy crater.' },
      { label: 'Ask every bird to help', consequence: 'A billion birds lift together and demand unlimited breadcrumbs as payment.' },
    ],
    chaosConsequence: 'The moon lands in a parking lot and the group has to feed the meter forever.',
  },
  {
    id: 'talking-dog-mayor',
    problem: 'A talking dog has been elected mayor. What is its first law?',
    options: [
      { label: 'Mandatory belly rubs', consequence: 'Productivity falls, but civic happiness reaches an all-time high.' },
      { label: 'Squirrels need permits', consequence: 'The squirrels form an underground resistance with excellent posters.' },
      { label: 'Every park gets a fountain', consequence: 'The city becomes famous for hydration and very muddy paws.' },
    ],
    chaosConsequence: 'The mayor chases the vote counter and accidentally declares every day Saturday.',
  },
  {
    id: 'tiny-island',
    problem: 'Your couch is now a tiny island. What do you build first?',
    options: [
      { label: 'A snack lighthouse', consequence: 'Ships arrive safely, guided by the glow of a giant cheese puff.' },
      { label: 'A blanket castle', consequence: 'The new kingdom is cozy, defensible, and strict about shoes.' },
      { label: 'A remote-control raft', consequence: 'The raft works, though it only sails toward whichever cushion ate the remote.' },
    ],
    chaosConsequence: 'The cushions drift apart and everyone must negotiate a very small peace treaty.',
  },
  {
    id: 'invisible-elephant',
    problem: 'An invisible elephant follows you everywhere. How do you prove it?',
    options: [
      { label: 'Cover it in glitter', consequence: 'The elephant sparkles magnificently and glitter remains in town for decades.' },
      { label: 'Give it roller skates', consequence: 'Everyone hears eight wheels approaching and politely clears the sidewalk.' },
      { label: 'Enter a talent show', consequence: 'The invisible elephant wins with a trumpet solo and a suspiciously bent stage.' },
    ],
    chaosConsequence: 'Nobody agrees, so the elephant sits on the evidence and makes it flatter.',
  },
  {
    id: 'cloud-pet',
    problem: 'You are allowed to keep one cloud as a pet. What kind do you choose?',
    options: [
      { label: 'A thundercloud', consequence: 'It guards the house and growls whenever a salesperson approaches.' },
      { label: 'A tiny rain cloud', consequence: 'The garden thrives, but the cloud follows whoever forgot an umbrella.' },
      { label: 'A sunset cloud', consequence: 'Every evening becomes spectacular and the neighbors start selling tickets.' },
    ],
    chaosConsequence: 'The unchosen clouds merge into fog and hide every matching sock in town.',
  },
  {
    id: 'pancake-planet',
    problem: 'You discover a planet made entirely of pancakes. What do you take?',
    options: [
      { label: 'A syrup waterfall', consequence: 'Breakfast improves forever, but every kitchen floor becomes dangerously sticky.' },
      { label: 'One pancake mountain', consequence: 'The mountain fits in the backyard and blocks the neighbor’s satellite dish.' },
      { label: 'The butter moon', consequence: 'The butter moon follows you home and melts slightly every summer.' },
    ],
    chaosConsequence: 'The planet flips itself while you debate, launching everyone into the jam nebula.',
  },
  {
    id: 'time-machine',
    problem: 'Your time machine has enough power for one trip. Where do you go?',
    options: [
      { label: 'Meet a dinosaur', consequence: 'The dinosaur is friendly and insists on coming back as the family pet.' },
      { label: 'Visit your future house', consequence: 'The future house is wonderful, except the refrigerator now gives homework.' },
      { label: 'See breakfast tomorrow', consequence: 'You return with a crucial warning: someone burns the toast.' },
    ],
    chaosConsequence: 'The machine leaves without you and returns wearing a tiny souvenir hat.',
  },
  {
    id: 'giant-birthday',
    problem: 'A friendly giant comes to dinner. What can everyone possibly serve?',
    options: [
      { label: 'A swimming-pool soup', consequence: 'The giant loves it, and the diving board makes an excellent spoon rest.' },
      { label: 'One mile of spaghetti', consequence: 'Dinner is delicious until the giant slurps up a nearby bicycle.' },
      { label: 'A truck-sized taco', consequence: 'The taco holds together and becomes a new form of public transit.' },
    ],
    chaosConsequence: 'Dinner takes too long, so the giant politely eats the tablecloth instead.',
  },
  {
    id: 'robot-school',
    problem: 'Robots take over your school for a day. Which class do they teach?',
    options: [
      { label: 'Competitive beeping', consequence: 'The final exam is loud, confusing, and somehow everyone passes.' },
      { label: 'Advanced snack repair', consequence: 'Broken crackers are restored with lasers and questionable amounts of glue.' },
      { label: 'Dancing in squares', consequence: 'The robots invent a dance that becomes fashionable for exactly nine minutes.' },
    ],
    chaosConsequence: 'The robots cannot agree on a bell schedule and recess lasts until midnight.',
  },
  {
    id: 'castle-door',
    problem: 'A mysterious door appears in the kitchen. What is behind it?',
    options: [
      { label: 'A miniature kingdom', consequence: 'The tiny king appoints everyone Royal Keepers of the Enormous Spoon.' },
      { label: 'A room full of kittens', consequence: 'The kittens pour out and immediately occupy every comfortable chair.' },
      { label: 'Next year’s kitchen', consequence: 'The future kitchen has self-washing dishes but refuses to explain how.' },
    ],
    chaosConsequence: 'The door gets bored waiting and relocates behind the refrigerator.',
  },
  {
    id: 'underwater-town',
    problem: 'Your town moves underwater tomorrow. How will everyone get around?',
    options: [
      { label: 'Ride giant seahorses', consequence: 'Traffic improves, although parking requires enormous seaweed posts.' },
      { label: 'Bubble submarines', consequence: 'Every commute is beautiful and every sharp object becomes highly suspicious.' },
      { label: 'Trains pulled by whales', consequence: 'The trains run on time unless the whales spot something interesting.' },
    ],
    chaosConsequence: 'Nobody chooses, so the morning bus arrives wearing flippers and looks embarrassed.',
  },
];

export const ODDBALL_QUESTION_COUNT = 6;

export type OddballPlayer = {
  id: string;
  name: string;
  score: number;
};

export type OddballOutcome =
  | {
    kind: 'scored';
    winningOptionIndex: number;
    scorerIds: string[];
    oddballPlayerId: string | null;
    markerChanged: boolean;
  }
  | { kind: 'tie' };

export type OddballGame = {
  phase: 'teaching' | 'choosing' | 'recording' | 'result' | 'finished';
  players: OddballPlayer[];
  roundIndex: number;
  scenarioIndex: number;
  oddballPlayerId: string | null;
  outcome: OddballOutcome | null;
  winnerIds: string[];
};

export type OddballRoundReport = {
  winningOptionIndex: number | null;
  scorerIds: string[];
  oddballPlayerId: string | null;
};

export function createOddballGame(names: string[], scenarioIndex = 0): OddballGame {
  return {
    phase: 'teaching',
    players: names.map((name, index) => ({ id: `player-${index + 1}`, name, score: 0 })),
    roundIndex: 0,
    scenarioIndex,
    oddballPlayerId: null,
    outcome: null,
    winnerIds: [],
  };
}

export function startOddballRound(game: OddballGame): OddballGame {
  if (game.phase !== 'teaching' && game.phase !== 'result') return game;
  return { ...game, phase: 'choosing', outcome: null };
}

export function beginOddballReveal(game: OddballGame): OddballGame {
  return game.phase === 'choosing' ? { ...game, phase: 'recording' } : game;
}

function eligibleWinners(players: OddballPlayer[], oddballPlayerId: string | null) {
  const eligible = players.filter((player) => player.id !== oddballPlayerId);
  const highScore = Math.max(...eligible.map((player) => player.score));
  return eligible.filter((player) => player.score === highScore).map((player) => player.id);
}

export function scoreOddballRound(game: OddballGame, report: OddballRoundReport): OddballGame {
  if (game.phase !== 'recording') return game;
  if (report.winningOptionIndex === null) {
    if (report.scorerIds.length || report.oddballPlayerId) return game;
    return {
      ...game,
      phase: 'result',
      outcome: { kind: 'tie' },
      winnerIds: game.roundIndex === ODDBALL_QUESTION_COUNT - 1
        ? eligibleWinners(game.players, game.oddballPlayerId)
        : [],
    };
  }

  const validPlayerIds = new Set(game.players.map((player) => player.id));
  const scorerIds = [...new Set(report.scorerIds)];
  const validOption = Number.isInteger(report.winningOptionIndex) && report.winningOptionIndex >= 0 && report.winningOptionIndex < 3;
  const validScorers = scorerIds.length >= 2 && scorerIds.every((id) => validPlayerIds.has(id));
  const validOddball = report.oddballPlayerId === null
    || (validPlayerIds.has(report.oddballPlayerId) && !scorerIds.includes(report.oddballPlayerId));
  if (!validOption || !validScorers || !validOddball) return game;

  const scorerSet = new Set(scorerIds);
  const players = game.players.map((player) => scorerSet.has(player.id) ? { ...player, score: player.score + 1 } : player);
  const oddballPlayerId = report.oddballPlayerId ?? game.oddballPlayerId;
  return {
    ...game,
    phase: 'result',
    players,
    oddballPlayerId,
    outcome: {
      kind: 'scored',
      winningOptionIndex: report.winningOptionIndex,
      scorerIds,
      oddballPlayerId: report.oddballPlayerId,
      markerChanged: report.oddballPlayerId !== null && report.oddballPlayerId !== game.oddballPlayerId,
    },
    winnerIds: game.roundIndex === ODDBALL_QUESTION_COUNT - 1
      ? eligibleWinners(players, oddballPlayerId)
      : [],
  };
}

export function advanceOddballGame(game: OddballGame): OddballGame {
  if (game.phase !== 'result') return game;
  if (game.roundIndex === ODDBALL_QUESTION_COUNT - 1) return { ...game, phase: 'finished' };
  return {
    ...game,
    phase: 'choosing',
    roundIndex: game.roundIndex + 1,
    scenarioIndex: (game.scenarioIndex + 1) % onePlanScenarios.length,
    outcome: null,
  };
}
