export function formatChoreRewardRateInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function parseChoreRewardRateInput(value: string): number | null {
  const normalized = value.trim();
  if (!/^(?:\d+|\d*\.\d{1,2})$/.test(normalized)) return null;

  const [whole = '0', fraction = ''] = normalized.split('.');
  const cents = Number(whole || '0') * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}
