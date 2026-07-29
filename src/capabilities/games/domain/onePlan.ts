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

export type OnePlanOutcome =
  | { kind: 'bridge'; optionIndex: number; vote: 'first' | 'final' }
  | { kind: 'chaos' };

export type OnePlanGame = {
  phase: 'choice' | 'first-reveal' | 'pitch' | 'final-reveal' | 'consequence' | 'finished';
  bridges: number;
  chaos: number;
  roundIndex: number;
  scenarioIndex: number;
  outcome: OnePlanOutcome | null;
  winner: 'bridges' | 'chaos' | null;
};

export function createOnePlanGame(scenarioIndex = 0): OnePlanGame {
  return { phase: 'choice', bridges: 0, chaos: 0, roundIndex: 0, scenarioIndex, outcome: null, winner: null };
}

export function beginOnePlanReveal(game: OnePlanGame): OnePlanGame {
  if (game.phase === 'choice') return { ...game, phase: 'first-reveal' };
  if (game.phase === 'pitch') return { ...game, phase: 'final-reveal' };
  return game;
}

export function reportOnePlanConsensus(game: OnePlanGame, optionIndex: number): OnePlanGame {
  if ((game.phase !== 'first-reveal' && game.phase !== 'final-reveal') || optionIndex < 0 || optionIndex > 2) return game;
  return {
    ...game,
    phase: 'consequence',
    bridges: game.bridges + 1,
    outcome: { kind: 'bridge', optionIndex, vote: game.phase === 'first-reveal' ? 'first' : 'final' },
  };
}

export function reportOnePlanSplit(game: OnePlanGame): OnePlanGame {
  if (game.phase === 'first-reveal') return { ...game, phase: 'pitch' };
  if (game.phase === 'final-reveal') {
    return { ...game, phase: 'consequence', chaos: game.chaos + 1, outcome: { kind: 'chaos' } };
  }
  return game;
}

export function advanceOnePlan(game: OnePlanGame): OnePlanGame {
  if (game.phase !== 'consequence') return game;
  if (game.bridges >= 3) return { ...game, phase: 'finished', winner: 'bridges' };
  if (game.chaos >= 3) return { ...game, phase: 'finished', winner: 'chaos' };
  return {
    ...game,
    phase: 'choice',
    roundIndex: game.roundIndex + 1,
    scenarioIndex: (game.scenarioIndex + 1) % onePlanScenarios.length,
    outcome: null,
  };
}
