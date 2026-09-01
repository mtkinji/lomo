import { normalizeTransactionNote } from './transactionNote';

describe('normalizeTransactionNote', () => {
  it('trims a household note and turns an empty note into removal', () => {
    expect(normalizeTransactionNote('  Family pictures  ')).toBe('Family pictures');
    expect(normalizeTransactionNote('   \n ')).toBeNull();
  });

  it('rejects notes beyond the bounded transaction-note length', () => {
    expect(() => normalizeTransactionNote('a'.repeat(501))).toThrow('500 characters');
  });
});
