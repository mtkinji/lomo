export type SlanguageEra = 'now' | 'throwback';

export type SlanguageTile = {
  id: string;
  text: string;
  gloss: string;
  era: SlanguageEra;
  value: 1 | 2 | 3;
  compatibleTargets: string[];
};

export type SlanguageTarget = {
  id: string;
  source: string;
  options: SlanguageTile[];
};

export type SlanguagePrompt = {
  id: string;
  template: string;
  plain: string;
  targets: [SlanguageTarget, SlanguageTarget, SlanguageTarget];
  curveballs: SlanguageTile[];
};

export type SlanguagePlacements = Record<string, string>;

export type SlanguageSentencePart =
  | { kind: 'text'; text: string }
  | { kind: 'slot'; slotId: string; source: string; text: string; optional: boolean; filled: boolean };

export type SlanguageState = {
  phase: 'build' | 'reveal' | 'vote' | 'result' | 'finished';
  status: 'playing' | 'finished';
  roundIndex: number;
  totalRounds: number;
  crowns: Record<string, number>;
  crownScores: Record<string, number>;
  winnerIds: string[];
};

const fit = (id: string, text: string, gloss: string, era: SlanguageEra, value: 1 | 2 | 3, target: string): SlanguageTile => ({
  id, text, gloss, era, value, compatibleTargets: [target],
});

const curve = (id: string, text: string, gloss: string, era: SlanguageEra, value: 1 | 2 | 3): SlanguageTile => ({
  id, text, gloss, era, value, compatibleTargets: ['opening', 'closing'],
});

const target = (id: string, source: string, options: SlanguageTile[]): SlanguageTarget => ({ id, source, options });

const prompt = (
  id: string,
  plain: string,
  template: string,
  targets: [SlanguageTarget, SlanguageTarget, SlanguageTarget],
  curveballs: SlanguageTile[],
): SlanguagePrompt => ({ id, plain, template, targets, curveballs });

const partyCurveballs = [
  curve('no-cap', 'No cap,', 'honestly', 'now', 1),
  curve('listen-here', 'Listen here,', 'pay attention', 'throwback', 2),
  curve('fr-fr', 'for real for real', 'seriously', 'now', 2),
  curve('cats-pajamas', "the cat's pajamas", 'excellent', 'throwback', 2),
  curve('low-key', 'low-key', 'quietly or somewhat', 'now', 1),
  curve('honest-to-pete', 'honest to Pete', 'truly', 'throwback', 1),
  curve('its-giving', "it's giving", 'it feels like', 'now', 1),
  curve('bee-knees', "the bee's knees", 'the very best', 'throwback', 3),
];

export const SLANGUAGE_PROMPTS: SlanguagePrompt[] = [
  prompt(
    'party-exit',
    'I was excited about the party, but I needed to leave early.',
    '{{opening}} I {{energy}} about {{event}}, but {{exit}} {{closing}}.',
    [
      target('energy', 'was excited', [
        fit('energy-hyped', 'was hyped', 'was excited', 'now', 1, 'energy'),
        fit('energy-jazzed', 'was jazzed', 'was excited', 'throwback', 2, 'energy'),
        fit('energy-stoked', 'was stoked', 'was excited', 'now', 1, 'energy'),
        fit('energy-tickled-pink', 'was tickled pink', 'was delighted', 'throwback', 2, 'energy'),
      ]),
      target('event', 'the party', [
        fit('event-function', 'the function', 'the gathering', 'now', 1, 'event'),
        fit('event-shindig', 'the shindig', 'the party', 'throwback', 2, 'event'),
        fit('event-linkup', 'the link-up', 'the gathering', 'now', 1, 'event'),
        fit('event-hootenanny', 'the hootenanny', 'the lively party', 'throwback', 2, 'event'),
      ]),
      target('exit', 'I needed to leave early', [
        fit('exit-bounce', 'I had to bounce', 'I had to leave', 'now', 1, 'exit'),
        fit('exit-skedaddle', 'I had to skedaddle', 'I had to leave quickly', 'throwback', 2, 'exit'),
        fit('exit-dip', 'I had to dip', 'I had to leave', 'now', 1, 'exit'),
        fit('exit-split', 'I had to split', 'I had to leave', 'throwback', 2, 'exit'),
      ]),
    ],
    partyCurveballs,
  ),
  prompt(
    'dad-dancing',
    'I was embarrassed when my dad started dancing in the kitchen.',
    '{{opening}} I {{reaction}} when {{person}} {{action}} in the kitchen {{closing}}.',
    [
      target('reaction', 'was embarrassed', [
        fit('reaction-cringing', 'was cringing', 'felt embarrassed', 'now', 1, 'reaction'),
        fit('reaction-mortified', 'was simply mortified', 'was very embarrassed', 'throwback', 2, 'reaction'),
        fit('reaction-couldnt', "couldn't even", 'was overwhelmed', 'now', 1, 'reaction'),
        fit('reaction-red-faced', 'was red-faced', 'was embarrassed', 'throwback', 2, 'reaction'),
      ]),
      target('person', 'my dad', [
        fit('person-pops', 'my pops', 'my dad', 'now', 1, 'person'),
        fit('person-old-man', 'my old man', 'my dad', 'throwback', 2, 'person'),
        fit('person-fam', 'the fam legend', 'the family star', 'now', 1, 'person'),
        fit('person-father-dear', 'father dear', 'my father', 'throwback', 2, 'person'),
      ]),
      target('action', 'started dancing', [
        fit('action-hit-griddy', 'hit the griddy', 'did a dance', 'now', 1, 'action'),
        fit('action-cut-rug', 'started cutting a rug', 'started dancing', 'throwback', 2, 'action'),
        fit('action-busted-move', 'busted a move', 'started dancing', 'now', 1, 'action'),
        fit('action-shook-leg', 'shook a leg', 'started dancing', 'throwback', 2, 'action'),
      ]),
    ],
    partyCurveballs,
  ),
  prompt(
    'late-homework',
    'I forgot my homework because I stayed up watching videos.',
    '{{opening}} I {{forgot}} because I {{stayed}} {{watching}} {{closing}}.',
    [
      target('forgot', 'forgot my homework', [
        fit('forgot-fumbled', 'fumbled the homework', 'messed up the homework', 'now', 1, 'forgot'),
        fit('forgot-dropped-ball', 'dropped the ball on my homework', 'made a mistake', 'throwback', 2, 'forgot'),
        fit('forgot-blanked', 'totally blanked on the homework', 'forgot it', 'now', 1, 'forgot'),
        fit('forgot-goofed', 'goofed on the homework', 'made a mistake', 'throwback', 2, 'forgot'),
      ]),
      target('stayed', 'stayed up', [
        fit('stayed-locked-in', 'was locked in all night', 'was intensely focused', 'now', 1, 'stayed'),
        fit('stayed-burned-oil', 'burned the midnight oil', 'stayed up late', 'throwback', 2, 'stayed'),
        fit('stayed-no-sleep', 'was on no-sleep mode', 'did not sleep', 'now', 1, 'stayed'),
        fit('stayed-night-owl', 'played night owl', 'stayed up late', 'throwback', 2, 'stayed'),
      ]),
      target('watching', 'watching videos', [
        fit('watching-doomscroll', 'doomscrolling clips', 'watching endlessly', 'now', 1, 'watching'),
        fit('watching-boob-tube', 'glued to the boob tube', 'watching television', 'throwback', 2, 'watching'),
        fit('watching-binging', 'bingeing edits', 'watching many videos', 'now', 1, 'watching'),
        fit('watching-moving-pictures', 'watching the moving pictures', 'watching videos', 'throwback', 2, 'watching'),
      ]),
    ],
    partyCurveballs,
  ),
  prompt(
    'outfit-shoes',
    'I like your outfit, but your shoes look very old.',
    '{{opening}} Your {{outfit}} is {{praise}}, but those {{shoes}} {{closing}}.',
    [
      target('outfit', 'outfit', [
        fit('outfit-fit', 'fit', 'outfit', 'now', 1, 'outfit'),
        fit('outfit-getup', 'getup', 'outfit', 'throwback', 2, 'outfit'),
        fit('outfit-drip', 'drip', 'stylish outfit', 'now', 1, 'outfit'),
        fit('outfit-threads', 'threads', 'clothes', 'throwback', 2, 'outfit'),
      ]),
      target('praise', 'nice', [
        fit('praise-fire', 'fire', 'excellent', 'now', 1, 'praise'),
        fit('praise-groovy', 'groovy', 'excellent', 'throwback', 2, 'praise'),
        fit('praise-ate', 'absolutely eating', 'looking excellent', 'now', 1, 'praise'),
        fit('praise-dandy', 'just dandy', 'very good', 'throwback', 2, 'praise'),
      ]),
      target('shoes', 'shoes look very old', [
        fit('shoes-ancient', 'kicks are ancient', 'shoes are very old', 'now', 1, 'shoes'),
        fit('shoes-dogs-tired', 'dogs look tired', 'shoes look worn', 'throwback', 2, 'shoes'),
        fit('shoes-cooked', 'sneakers are cooked', 'shoes are worn out', 'now', 1, 'shoes'),
        fit('shoes-seen-miles', 'clodhoppers have seen some miles', 'shoes are worn', 'throwback', 2, 'shoes'),
      ]),
    ],
    partyCurveballs,
  ),
  prompt(
    'snack-sharing',
    'Please share your snack because I am extremely hungry.',
    '{{opening}} {{request}} that {{snack}} because I am {{hungry}} {{closing}}.',
    [
      target('request', 'Please share', [
        fit('request-slide', 'Slide me', 'please pass me', 'now', 1, 'request'),
        fit('request-be-pal', 'Be a pal and pass', 'please share', 'throwback', 2, 'request'),
        fit('request-hook-up', 'Hook me up with', 'please give me', 'now', 1, 'request'),
        fit('request-oblige', 'Kindly oblige me with', 'please give me', 'throwback', 2, 'request'),
      ]),
      target('snack', 'snack', [
        fit('snack-munchies', 'munchies', 'snacks', 'now', 1, 'snack'),
        fit('snack-grub', 'grub', 'food', 'throwback', 2, 'snack'),
        fit('snack-goods', 'goods', 'snacks', 'now', 1, 'snack'),
        fit('snack-vittles', 'vittles', 'food', 'throwback', 2, 'snack'),
      ]),
      target('hungry', 'extremely hungry', [
        fit('hungry-starving-fr', 'starving for real', 'extremely hungry', 'now', 1, 'hungry'),
        fit('hungry-peckish', 'mighty peckish', 'quite hungry', 'throwback', 2, 'hungry'),
        fit('hungry-famished', 'straight-up famished', 'extremely hungry', 'now', 1, 'hungry'),
        fit('hungry-eat-horse', 'hungry enough to eat a horse', 'extremely hungry', 'throwback', 2, 'hungry'),
      ]),
    ],
    partyCurveballs,
  ),
];

export function validateSlanguagePrompt(value: SlanguagePrompt) {
  const errors: string[] = [];
  if (value.targets.length !== 3) errors.push('three_targets_required');
  const ids = new Set<string>();
  for (const item of [...value.targets.flatMap((entry) => entry.options), ...value.curveballs]) {
    if (ids.has(item.id)) errors.push(`duplicate_tile:${item.id}`);
    ids.add(item.id);
    if (item.value < 1 || item.value > 3) errors.push(`invalid_value:${item.id}`);
  }
  for (const entry of value.targets) {
    if (!value.template.includes(`{{${entry.id}}}`)) errors.push(`missing_token:${entry.id}`);
    if (entry.options.length < 3) errors.push(`thin_target:${entry.id}`);
    if (entry.options.some((item) => !item.compatibleTargets.includes(entry.id))) errors.push(`invalid_compatibility:${entry.id}`);
  }
  if (!value.template.includes('{{opening}}') || !value.template.includes('{{closing}}')) errors.push('flourish_slots_required');
  if (value.curveballs.length < 4) errors.push('curveballs_required');
  return errors;
}

function rotateTake<T>(values: T[], start: number, count: number) {
  return Array.from({ length: count }, (_, index) => values[(start + index) % values.length]);
}

export function dealSlanguageHand(value: SlanguagePrompt, playerIndex: number): SlanguageTile[] {
  const counts = [3, 3, 2];
  const fits = value.targets.flatMap((entry, targetIndex) => rotateTake(entry.options, playerIndex + targetIndex, counts[targetIndex]));
  const curveballs = rotateTake(value.curveballs, playerIndex, 4);
  return [...fits, ...curveballs];
}

export function slanguageScore(tiles: SlanguageTile[]) {
  const eras = new Set(tiles.map((tile) => tile.era));
  return tiles.reduce((sum, tile) => sum + tile.value, 0) + (eras.size > 1 ? 2 : 0);
}

export function buildSlanguageTranslation(promptValue: SlanguagePrompt, hand: SlanguageTile[], placements: SlanguagePlacements) {
  const selected = Object.entries(placements).filter(([, tileId]) => !!tileId);
  if (selected.length > 5) throw new Error('too_many_tiles');
  if (new Set(selected.map(([, tileId]) => tileId)).size !== selected.length) throw new Error('tile_already_used');
  const handById = new Map(hand.map((tile) => [tile.id, tile]));
  const usedTiles = selected.map(([slot, tileId]) => {
    const tile = handById.get(tileId);
    if (!tile) throw new Error('tile_not_in_hand');
    if (!tile.compatibleTargets.includes(slot)) throw new Error('tile_not_compatible');
    return tile;
  });
  const source = Object.fromEntries(promptValue.targets.map((entry) => [entry.id, entry.source]));
  const replacements: Record<string, string> = { opening: '', closing: '', ...source };
  for (const [slot, tileId] of selected) replacements[slot] = handById.get(tileId)!.text;
  const text = promptValue.template.replace(/{{([a-z-]+)}}/g, (_, key: string) => replacements[key] ?? '')
    .replace(/\s+([,.!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return { text, usedTiles, slangScore: slanguageScore(usedTiles) };
}

export function slanguageSentenceParts(promptValue: SlanguagePrompt, hand: SlanguageTile[], placements: SlanguagePlacements): SlanguageSentencePart[] {
  buildSlanguageTranslation(promptValue, hand, placements);
  const targets = new Map(promptValue.targets.map((entry) => [entry.id, entry]));
  const handById = new Map(hand.map((tile) => [tile.id, tile]));
  const slots: Extract<SlanguageSentencePart, { kind: 'slot' }>[] = [];
  const marked = promptValue.template.replace(/{{([a-z-]+)}}/g, (_, slotId: string) => {
    const target = targets.get(slotId);
    const optional = slotId === 'opening' || slotId === 'closing';
    const tileId = placements[slotId];
    if (optional && !tileId) return '';
    const tile = tileId ? handById.get(tileId) : undefined;
    const source = target?.source ?? (slotId === 'opening' ? 'opener' : 'closer');
    slots.push({ kind: 'slot', slotId, source, text: tile?.text ?? source, optional, filled: !!tile });
    return `\uE000${slots.length - 1}\uE001`;
  }).replace(/\s+([,.!?])/g, '$1').replace(/\s{2,}/g, ' ').trim();

  return marked.split(/(\uE000\d+\uE001)/g).filter(Boolean).map((part) => {
    const match = part.match(/^\uE000(\d+)\uE001$/);
    return match ? slots[Number(match[1])] : { kind: 'text' as const, text: part };
  });
}

export function nextSlanguageSlot(promptValue: SlanguagePrompt, placements: SlanguagePlacements, fallback: string) {
  const order = [...promptValue.targets.map((target) => target.id), 'opening', 'closing'];
  return order.find((slotId) => !placements[slotId]) ?? fallback;
}

export function resolveSlanguageRound(entries: { participantId: string; votes: number; slangScore: number }[]) {
  if (entries.length === 0) return [];
  const mostVotes = Math.max(...entries.map((entry) => entry.votes));
  if (mostVotes === 0) return [];
  const voteLeaders = entries.filter((entry) => entry.votes === mostVotes);
  const bestScore = Math.max(...voteLeaders.map((entry) => entry.slangScore));
  return voteLeaders.filter((entry) => entry.slangScore === bestScore).map((entry) => entry.participantId);
}

export function createSlanguageState(totalRounds = 5): SlanguageState {
  return { phase: 'build', status: 'playing', roundIndex: 0, totalRounds, crowns: {}, crownScores: {}, winnerIds: [] };
}

export function advanceSlanguageRound(state: SlanguageState, winnerIds: string[], winnerScores: Record<string, number>): SlanguageState {
  const crowns = { ...state.crowns };
  const crownScores = { ...state.crownScores };
  for (const participantId of winnerIds) {
    crowns[participantId] = (crowns[participantId] ?? 0) + 1;
    crownScores[participantId] = (crownScores[participantId] ?? 0) + (winnerScores[participantId] ?? 0);
  }
  const finished = state.roundIndex + 1 >= state.totalRounds;
  if (!finished) return { ...state, phase: 'build', roundIndex: state.roundIndex + 1, crowns, crownScores, winnerIds: [] };
  const highestCrowns = Math.max(0, ...Object.values(crowns));
  const crownLeaders = Object.keys(crowns).filter((id) => crowns[id] === highestCrowns);
  const highestScore = Math.max(0, ...crownLeaders.map((id) => crownScores[id] ?? 0));
  const gameWinners = crownLeaders.filter((id) => (crownScores[id] ?? 0) === highestScore);
  return { ...state, phase: 'finished', status: 'finished', crowns, crownScores, winnerIds: gameWinners };
}
