import { useCallback, useEffect, useState } from 'react';
import type { BankGame } from '../../domain/bank';

type BankCooldownState = Pick<BankGame, 'players' | 'rollInRound'>;

export const BANK_ROLL_COOLDOWN_SECONDS = 2;

export function bankRollCooldownRemaining(
  game: BankCooldownState,
  remainingSeconds: number,
) {
  const activeRollers = game.players.filter((player) => !player.banked).length;
  return game.rollInRound >= 3 && activeRollers > 1 ? remainingSeconds : 0;
}

export function bankRollButtonLabel(rolling: boolean, remainingSeconds: number) {
  if (rolling) return 'Rolling…';
  if (remainingSeconds > 0) return `Roll in ${remainingSeconds}`;
  return 'Roll';
}

export function useRollCooldown(durationSeconds: number) {
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (remainingSeconds === 0) return;
    const timer = setInterval(() => {
      setRemainingSeconds((current) => Math.max(0, current - 1));
    }, 1_000);
    return () => clearInterval(timer);
  }, [remainingSeconds]);

  const start = useCallback(() => setRemainingSeconds(durationSeconds), [durationSeconds]);
  const reset = useCallback(() => setRemainingSeconds(0), []);

  return { remainingSeconds, start, reset };
}
