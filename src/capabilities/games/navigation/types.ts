export type GamesMode = 'bank' | 'farkle' | 'roller';

export type GamesStackParamList = {
  GamesShelf: undefined;
  GamesHourglass: undefined;
  GamesTumble: { mode?: GamesMode } | undefined;
  GamesConnection: { gameId: string };
  GamesJoin: { token?: string; code?: string } | undefined;
  GamesRemote: { sessionId: string; token?: string; hostUserId?: string; tableCode?: string };
  GamesAccount: Record<string, string> | undefined;
};
