import { readFileSync } from 'fs';
import path from 'path';
import './MoneyTransactionDetailScreen';

describe('MoneyTransactionDetailScreen category field', () => {
  it('does not render a decorative color marker beside the selected relation', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyTransactionDetailScreen.tsx'), 'utf8');

    expect(source).not.toContain('styles.categoryDot');
    expect(source).not.toMatch(/categoryDot:\s*\{/);
  });

  it('uses a single disclosure chevron instead of a stacked picker glyph', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyTransactionDetailScreen.tsx'), 'utf8');

    expect(source).toContain('<Icon name="chevronDown" size={18} color={colors.textSecondary} />');
    expect(source).not.toContain('<Icon name="chevronsUpDown" size={18} color={colors.textSecondary} />');
  });
});
