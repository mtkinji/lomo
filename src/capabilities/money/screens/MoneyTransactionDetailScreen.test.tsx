import { readFileSync } from 'fs';
import path from 'path';
import './MoneyTransactionDetailScreen';

describe('MoneyTransactionDetailScreen drawer headers', () => {
  it('uses one shared heading without eyebrow labels', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyTransactionDetailScreen.tsx'), 'utf8');

    expect(source).toContain('<BottomDrawerHeader');
    expect(source).toContain('title="Choose a category"');
    expect(source).toContain('title="How should this count?"');
    expect(source).toContain('title={`Rule for ${pendingRuleCategory?.name ?? \'category\'}`}');
    expect(source).not.toContain('styles.drawerEyebrow');
    expect(source).not.toContain('drawerEyebrow:');
  });

  it('does not report a restored transaction as unavailable while Money is still loading', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyTransactionDetailScreen.tsx'), 'utf8');

    expect(source).toContain('snapshot,\n    status,');
    expect(source).toContain("status === 'loading' ? 'Loading transaction…' : 'This transaction is unavailable'");
  });

  it('keeps category and non-spending meanings in one grouped picker', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyTransactionDetailScreen.tsx'), 'utf8');

    expect(source).toContain('FLEXIBLE SPENDING');
    expect(source).toContain('COMMITTED SPENDING');
    expect(source).toContain('getTransactionMeaningOptions(transaction.direction)');
    expect(source).toContain('setTransactionPlanRoleOverride(transaction.id, override)');
    expect(source).toContain('await refresh();');
    expect(source).toContain("navigation.popTo('MoneySummary')");
    expect(source).not.toContain('grocery percentage');
  });

  it('clears an unaccepted merchant-rule offer when the transaction becomes non-spending', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyTransactionDetailScreen.tsx'), 'utf8');
    const selectMeaning = source.slice(source.indexOf('const selectMeaning = async'), source.indexOf('const selectPlanRole = async'));

    expect(selectMeaning).toContain('setPendingRuleCategory(null)');
    expect(selectMeaning).toContain('setRuleDrawerOpen(false)');
  });

  it('makes transaction counts-as treatment compact and removes the standalone plan-treatment field', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyTransactionDetailScreen.tsx'), 'utf8');

    expect(source).toContain('COUNTS AS');
    expect(source).toContain('getTransactionPlanTreatment(transaction, categories)');
    expect(source).toContain('Change how this transaction counts.');
    expect(source).not.toContain('<Text style={styles.sectionLabel}>Plan treatment</Text>');
  });
});
