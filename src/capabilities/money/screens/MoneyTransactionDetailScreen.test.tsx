import { readFileSync } from 'fs';
import path from 'path';
import './MoneyTransactionDetailScreen';

describe('MoneyTransactionDetailScreen drawer headers', () => {
  it('uses one shared heading without eyebrow labels', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyTransactionDetailScreen.tsx'), 'utf8');

    expect(source).toContain('<BottomDrawerHeader');
    expect(source).toContain('title="Where does this belong?"');
    expect(source).toContain('title={`Rule for ${pendingRuleCategory?.name ?? \'category\'}`}');
    expect(source).not.toContain('styles.drawerEyebrow');
    expect(source).not.toContain('drawerEyebrow:');
  });

  it('does not report a restored transaction as unavailable while Money is still loading', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyTransactionDetailScreen.tsx'), 'utf8');

    expect(source).toContain('snapshot,\n    status,');
    expect(source).toContain("status === 'loading' ? 'Loading transaction…' : 'This transaction is unavailable'");
  });
});
