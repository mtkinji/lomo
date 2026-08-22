import { readFileSync } from 'fs';
import path from 'path';
import './MoneyTransactionDetailScreen';

describe('MoneyTransactionDetailScreen drawer headers', () => {
  it('uses one shared heading without eyebrow labels', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyTransactionDetailScreen.tsx'), 'utf8');

    expect(source).toContain('<BottomDrawerHeader');
    expect(source).toContain('title="Choose a category"');
    expect(source).toContain('title="How should this count?"');
    expect(source).toContain('title="How this is covered"');
    expect(source).toContain('title={`Rule for ${ruleOfferCategory?.name ?? \'category\'}`}');
    expect(source).not.toContain('styles.drawerEyebrow');
    expect(source).not.toContain('drawerEyebrow:');
    expect(source).not.toContain('titleVariant="lg"');
  });

  it('keeps category, plan coverage, and money meaning as separate transaction decisions', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyTransactionDetailScreen.tsx'), 'utf8');

    expect(source).toContain('HOW THIS IS COVERED');
    expect(source).toContain('title="Saved money"');
    expect(source).toContain('title="Split between both"');
    expect(source).toContain('Kwilt is not estimating your remaining savings.');
    expect(source).toContain('setTransactionPlanCoverage(transaction.id, nextSavedResourceCents)');
    expect(source).toContain('It stays in {currentCategory?.name ?? transaction.categoryName}');
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

  it('keeps the merchant-rule decision visible while transaction examples scroll', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyTransactionDetailScreen.tsx'), 'utf8');
    const ruleDrawerVisible = source.indexOf('visible={Boolean(ruleOfferCategory) && ruleDrawerOpen}');
    const ruleDrawer = source.slice(source.lastIndexOf('<BottomDrawer', ruleDrawerVisible), source.indexOf('<MoneyTransactionSplitDrawer'));

    expect(ruleDrawer).toContain('bottomAccessory={ruleOfferCategory ? (');
    expect(ruleDrawer).toContain('bottomAccessoryShowTopBorder');
    expect(ruleDrawer).toContain("{saving ? 'Saving…' : 'Create rule'}");
    expect(ruleDrawer).toContain('Not now');
    expect(ruleDrawer.indexOf('bottomAccessory=')).toBeLessThan(ruleDrawer.indexOf('<BottomDrawerScrollView'));
  });

  it('lets the user edit and validate the partial merchant match before creating the rule', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyTransactionDetailScreen.tsx'), 'utf8');

    expect(source).toContain('label="Merchant contains"');
    expect(source).toContain('value={partialRuleMatch}');
    expect(source).toContain('onChangeText={setPartialRuleMatch}');
    expect(source).toContain('merchantPattern: ruleMode === \'partial\' ? partialRuleMatch : undefined');
    expect(source).toContain('disabled={saving || Boolean(partialRuleError)}');
    expect(source).toContain('if (!transaction || partialRuleError) return [];');
  });

  it('presents a category-change rule offer in a bottom guide instead of an inline row', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyTransactionDetailScreen.tsx'), 'utf8');

    expect(source).toContain("import { BottomGuide } from '../../../ui/BottomGuide';");
    expect(source).toContain('visible={Boolean(ruleOfferCategory) && !ruleDrawerOpen && !categoryPickerOpen && !countsAsOpen && !splitEditorOpen}');
    expect(source).toContain('Use {ruleOfferCategory?.name} next time?');
    expect(source).toContain('Review rule');
    expect(source).not.toContain('style={({ pressed }) => [styles.ruleOffer, pressed ? styles.pressed : null]}');
  });

  it('makes transaction counts-as treatment compact and removes the standalone plan-treatment field', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyTransactionDetailScreen.tsx'), 'utf8');

    expect(source).toContain('COUNTS AS');
    expect(source).toContain('getTransactionPlanTreatment(transaction, categories)');
    expect(source).toContain('Change how this transaction counts.');
    expect(source).not.toContain('<Text style={styles.sectionLabel}>Plan treatment</Text>');
  });

  it('does not elevate pending or infer a temporary hold', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyTransactionDetailScreen.tsx'), 'utf8');

    expect(source).not.toContain('transaction.pending ? <Text style={styles.pendingText}>Pending</Text>');
    expect(source).not.toContain('pendingText:');
    expect(source).not.toContain('Temporary hold');
  });
});
