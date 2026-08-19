import {
  formatChoreRewardRateInput,
  parseChoreRewardRateInput,
} from './choreRewardRate';

describe('Chore reward exchange-rate input', () => {
  it('formats cents as a two-decimal dollar amount', () => {
    expect(formatChoreRewardRateInput(50)).toBe('0.50');
    expect(formatChoreRewardRateInput(125)).toBe('1.25');
  });

  it('parses positive dollar amounts with no more than two decimal places', () => {
    expect(parseChoreRewardRateInput('1')).toBe(100);
    expect(parseChoreRewardRateInput(' 0.75 ')).toBe(75);
    expect(parseChoreRewardRateInput('.5')).toBe(50);
  });

  it('rejects zero, imprecise, and non-numeric values', () => {
    expect(parseChoreRewardRateInput('')).toBeNull();
    expect(parseChoreRewardRateInput('0.00')).toBeNull();
    expect(parseChoreRewardRateInput('0.005')).toBeNull();
    expect(parseChoreRewardRateInput('$0.50')).toBeNull();
  });
});
