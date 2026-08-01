import { readFileSync } from 'fs';
import path from 'path';
import './MoneyTransactionDetailScreen';

describe('MoneyTransactionDetailScreen drawer headers', () => {
  it('uses one shared heading without eyebrow labels', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyTransactionDetailScreen.tsx'), 'utf8');

    expect(source).toContain('<BottomDrawerHeader');
    expect(source).toContain("'Where does this belong?'");
    expect(source).toContain('title={`Rule for ${pendingRuleCategory?.name ?? \'category\'}`}');
    expect(source).not.toContain('styles.drawerEyebrow');
    expect(source).not.toContain('drawerEyebrow:');
  });

  it('does not report a restored transaction as unavailable while Money is still loading', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyTransactionDetailScreen.tsx'), 'utf8');

    expect(source).toContain('snapshot,\n    status,');
    expect(source).toContain("status === 'loading' ? 'Loading transaction…' : 'This transaction is unavailable'");
  });

  it('offers one economic-role choice and returns to Budget after a confirmed write', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyTransactionDetailScreen.tsx'), 'utf8');

    expect(source).toContain('Flexible spending</Button>');
    expect(source).toContain('A protected bill or reserve</Button>');
    expect(source).toContain("selectMeaning('not_counted')}>Outside the plan");
    expect(source).toContain("categories.filter((category) => category.planRole === 'protected')");
    expect(source).toContain('await refresh();');
    expect(source).toContain("navigation.popTo('MoneySummary')");
    expect(source).not.toContain('grocery percentage');
  });
});
