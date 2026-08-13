export type ConnectionGameId =
  | 'same-page'
  | 'common-thread'
  | 'object-quest'
  | 'story-relay'
  | 'family-forecast'
  | 'pass-pattern'
  | 'doodle-bridge'
  | 'clue-circle'
  | 'slanguage';

export type CatalogGameId = 'bank' | 'farkle' | 'stitch-five' | ConnectionGameId;

export type GameRoute =
  | { kind: 'tumble'; mode: 'bank' | 'farkle' | 'roller' }
  | { kind: 'stitch-five' }
  | { kind: 'connection'; gameId: ConnectionGameId };

export type GameDefinition = {
  id: CatalogGameId;
  title: string;
  promise: string;
  minPlayers: number;
  maxPlayers: number;
  accent: string;
  mark: string;
  route: Exclude<GameRoute, { kind: 'tumble'; mode: 'roller' }>;
  remotePath: string;
  durationMinutes: readonly [number, number];
  energy: 'warm' | 'creative' | 'lively';
  releaseStatus: 'ready' | 'playtest' | 'learning';
};

const acceptedGameCatalog: GameDefinition[] = [
  { id: 'bank', title: 'Bank', promise: 'Build the pot together. Know when to stop.', minPlayers: 2, maxPlayers: 6, accent: '#F8CF52', mark: '7', route: { kind: 'tumble', mode: 'bank' }, remotePath: 'Private room with server-authoritative rolls and shared turn state.', durationMinutes: [15, 25], energy: 'lively', releaseStatus: 'ready' },
  { id: 'farkle', title: 'Farkle', promise: 'Press your luck and cheer the hot dice.', minPlayers: 2, maxPlayers: 6, accent: '#76BBA0', mark: '6', route: { kind: 'tumble', mode: 'farkle' }, remotePath: 'Private room using the Bank command protocol after it is proven.', durationMinutes: [20, 35], energy: 'lively', releaseStatus: 'ready' },
  { id: 'same-page', title: 'Oddball', promise: 'Match the biggest group. Don’t stand alone.', minPlayers: 3, maxPlayers: 8, accent: '#FF8F78', mark: '●', route: { kind: 'connection', gameId: 'same-page' }, remotePath: 'Shared/cast board with host-scored reveals; synchronized private voting is deferred.', durationMinutes: [5, 10], energy: 'lively', releaseStatus: 'ready' },
  { id: 'common-thread', title: 'Common Thread', promise: 'Find one surprising link between two ideas.', minPlayers: 2, maxPlayers: 6, accent: '#D6A7E8', mark: '∞', route: { kind: 'connection', gameId: 'common-thread' }, remotePath: 'Shared prompt and answer surface with one household submitting.', durationMinutes: [5, 10], energy: 'creative', releaseStatus: 'playtest' },
  { id: 'object-quest', title: 'Object Quest', promise: 'Find it nearby. Come back with a story.', minPlayers: 2, maxPlayers: 6, accent: '#7CC7B7', mark: '◇', route: { kind: 'connection', gameId: 'object-quest' }, remotePath: 'Each household searches independently and rejoins for the reveal.', durationMinutes: [10, 15], energy: 'lively', releaseStatus: 'playtest' },
  { id: 'story-relay', title: 'Story Relay', promise: 'Face one wild story together.', minPlayers: 2, maxPlayers: 6, accent: '#F0A75E', mark: '✦', route: { kind: 'connection', gameId: 'story-relay' }, remotePath: 'Local/cast-first adventure; optional claimed controllers and remote rooms are deferred.', durationMinutes: [15, 25], energy: 'creative', releaseStatus: 'playtest' },
  { id: 'family-forecast', title: 'Family Forecast', promise: 'Predict what someone you love will choose.', minPlayers: 2, maxPlayers: 6, accent: '#8AB4E8', mark: '?', route: { kind: 'connection', gameId: 'family-forecast' }, remotePath: 'Private predictions with a subject-controlled reveal.', durationMinutes: [10, 15], energy: 'warm', releaseStatus: 'ready' },
  { id: 'pass-pattern', title: 'Pass the Pattern', promise: 'Remember the rhythm. Add one more beat.', minPlayers: 2, maxPlayers: 6, accent: '#F29AAB', mark: '••', route: { kind: 'connection', gameId: 'pass-pattern' }, remotePath: 'Versioned event sequence delivered to the active player.', durationMinutes: [5, 10], energy: 'lively', releaseStatus: 'ready' },
  { id: 'doodle-bridge', title: 'Doodle Bridge', promise: 'Add a few lines. Make one picture together.', minPlayers: 2, maxPlayers: 6, accent: '#E5C957', mark: '〰', route: { kind: 'connection', gameId: 'doodle-bridge' }, remotePath: 'Turn-based synchronized vector strokes in a private room.', durationMinutes: [10, 15], energy: 'creative', releaseStatus: 'ready' },
  { id: 'clue-circle', title: 'Clue Circle', promise: 'Wear the clue. Race the clock together.', minPlayers: 2, maxPlayers: 6, accent: '#66B8D0', mark: '◎', route: { kind: 'connection', gameId: 'clue-circle' }, remotePath: 'Timed finder turns with motion events and private targets.', durationMinutes: [5, 10], energy: 'lively', releaseStatus: 'playtest' },
];

export const slanguageLearningReleaseEnabled = __DEV__ || process.env.EXPO_PUBLIC_SLANGUAGE_LEARNING_RELEASE === '1';
export const stitchFiveLearningReleaseEnabled = __DEV__ || process.env.EXPO_PUBLIC_STITCH_FIVE_LEARNING_RELEASE === '1';
const slanguageLearningGame: GameDefinition = {
  id: 'slanguage', title: 'Slanguage', promise: 'Remix one sentence. Funniest wins.', minPlayers: 3, maxPlayers: 8, accent: '#B8D96B', mark: 'Aa', route: { kind: 'connection', gameId: 'slanguage' }, remotePath: 'Every player composes privately in one canonical open table, then reveals and votes together.', durationMinutes: [20, 30], energy: 'lively', releaseStatus: 'learning',
};
const stitchFiveLearningGame: GameDefinition = {
  id: 'stitch-five', title: 'Stitch Five', promise: 'Build a quilt, one roll at a time.', minPlayers: 2, maxPlayers: 4, accent: '#D88E78', mark: '▦', route: { kind: 'stitch-five' }, remotePath: 'Local pass-and-play learning release; remote play is intentionally excluded.', durationMinutes: [15, 30], energy: 'warm', releaseStatus: 'learning',
};
export const gameCatalog: GameDefinition[] = [
  ...acceptedGameCatalog,
  ...(slanguageLearningReleaseEnabled ? [slanguageLearningGame] : []),
  ...(stitchFiveLearningReleaseEnabled ? [stitchFiveLearningGame] : []),
];

export function catalogForRelease(includeWorkshop: boolean) {
  return includeWorkshop ? gameCatalog : gameCatalog.filter((game) => game.releaseStatus === 'ready');
}

export const basicDiceUtility = {
  title: 'Basic Dice Roller',
  promise: 'One to eight dice for any game at the table.',
  route: { kind: 'tumble', mode: 'roller' } as const,
};

export function findConnectionGame(value: unknown) {
  return gameCatalog.find((game): game is GameDefinition & { id: ConnectionGameId; route: { kind: 'connection'; gameId: ConnectionGameId } } => game.route.kind === 'connection' && game.id === value);
}
