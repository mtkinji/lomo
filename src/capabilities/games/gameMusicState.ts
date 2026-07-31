import type { RemoteAudioAssetId } from '@/src/services/audioAssetCatalog';

type BankMusicState = {
  status: 'playing' | 'finished';
  rollInRound: number;
  pot: number;
};

export function bankMusicForState(game: BankMusicState): RemoteAudioAssetId | null {
  if (game.status !== 'playing') return null;
  if (game.rollInRound >= 7 || game.pot >= 75) return 'game.bank-maximum';
  if (game.rollInRound >= 5 || game.pot >= 25) return 'game.bank-building';
  return 'game.bank-initial';
}
