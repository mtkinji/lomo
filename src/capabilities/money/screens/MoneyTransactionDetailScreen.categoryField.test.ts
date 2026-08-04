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

  it('keeps the category value vertically centered in a compact field', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyTransactionDetailScreen.tsx'), 'utf8');

    expect(source).toContain("categoryField: { minHeight: 52");
    expect(source).toContain("categoryFieldCopy: { minWidth: 0, flex: 1, justifyContent: 'center' }");
    expect(source).not.toMatch(/categoryFieldText:\s*\{[^}]*flex:\s*1/);
  });

  it('places the Description label outside its value box', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyTransactionDetailScreen.tsx'), 'utf8');
    const field = source.slice(source.indexOf('<View style={styles.sourceDescriptionField}>'), source.indexOf("{presentation.kind === 'deposit'"));

    expect(field).toContain('<Text style={styles.sectionLabel}>Description</Text>');
    expect(field.indexOf('<Text style={styles.sectionLabel}>Description</Text>')).toBeLessThan(field.indexOf('<View style={styles.sourceDescriptionBlock}>'));
    expect(field).not.toContain('styles.sourceDescriptionLabel');
  });
});
