import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../../..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('remote Games submission gate wiring', () => {
  it('guards discovery, hosting, remote-only Slanguage, and direct room routes', () => {
    const shelf = read('src/capabilities/games/features/home/GameShelfScreen.tsx');
    const bank = read('src/capabilities/games/features/tumble/TumbleScreen.tsx');
    const connection = read('src/capabilities/games/features/connection-games/ConnectionGameScreen.tsx');
    const navigator = read('src/capabilities/games/navigation/GamesNavigator.tsx');

    expect(shelf).toContain('REMOTE_GAMES_RELEASE_ENABLED ? <JoinTableDrawer');
    expect(shelf).toContain("REMOTE_GAMES_RELEASE_ENABLED || game.id !== 'slanguage'");
    expect(bank).toContain("mode === 'bank' && REMOTE_GAMES_RELEASE_ENABLED");
    expect(connection).toContain("game.id === 'slanguage' && !REMOTE_GAMES_RELEASE_ENABLED");
    expect(navigator).toContain('REMOTE_GAMES_RELEASE_ENABLED ? JoinTableScreen : RemoteGamesUnavailableScreen');
    expect(navigator).toContain('REMOTE_GAMES_RELEASE_ENABLED ? RemoteGameScreen : RemoteGamesUnavailableScreen');
  });
});
