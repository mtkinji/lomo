import { readFileSync } from 'fs';
import path from 'path';
import './MoneyTransactionDetailScreen';

describe('MoneyTransactionDetailScreen drawer headers', () => {
  it('keeps a household note separate from the provider description and financial decisions', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyTransactionDetailScreen.tsx'), 'utf8');

    expect(source).toContain('<Text style={styles.sectionLabel}>Note</Text>');
    expect(source).toContain("transaction.userNote ?? 'Add a note'");
    expect(source).toContain('title="Transaction note"');
    expect(source).toContain('Everyone in this Money household can see this note.');
    expect(source).toContain('setTransactionNote(transaction.id, noteDraft)');
    expect(source).toContain("placeholder=\"Family pictures\"");
    expect(source).not.toContain('captureMoneyMutation(capture, { operation: \'transaction_note\'');
  });

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

  it('does not also call a purchase flexible or committed when saved money covers all of it', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyTransactionDetailScreen.tsx'), 'utf8');

    expect(source).toContain('usesOnlySavedMoney(transaction)');
    expect(source).toContain("transaction.direction === 'outflow' && currentCategory && !transaction.allocations?.length && !usesOnlySavedMoney(transaction)");
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
    expect(source).toContain('visible={Boolean(ruleOfferCategory) && !ruleDrawerOpen && !categoryPickerOpen && !countsAsOpen && !splitEditorOpen && !noteEditorOpen}');
    expect(source).toContain('Use {ruleOfferCategory?.name} next time?');
    expect(source).toContain('Review rule');
    expect(source).toContain('scrim="light"');
    expect(source).toContain('contentStyle={styles.ruleGuideContent}');
    expect(source).toContain('contentExtendsIntoBottomSafeArea');
    expect(source).toContain('See which future {transaction.merchantName} transactions would match.');
    expect(source).toContain("ruleGuideActions: { flexDirection: 'row'");
    expect(source.indexOf('>Not now</Button>')).toBeLessThan(source.indexOf('>Review rule</Button>'));
    expect(source).not.toContain('Kwilt won’t create a rule until you confirm.');
    expect(source).not.toContain('style={({ pressed }) => [styles.ruleOffer, pressed ? styles.pressed : null]}');
  });

  it('opens the merchant-rule guide before the category save returns and keeps review disabled until confirmation', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyTransactionDetailScreen.tsx'), 'utf8');
    const selectCategory = source.slice(source.indexOf('const selectCategory = async'), source.indexOf('const selectMeaning = async'));

    expect(selectCategory.indexOf("if (outcome === 'offer_rule')")).toBeLessThan(selectCategory.indexOf('const changed = await runReview'));
    expect(selectCategory.indexOf('setPendingRuleCategory(category)')).toBeLessThan(selectCategory.indexOf('const changed = await runReview'));
    expect(selectCategory).toContain('if (!changed) {');
    expect(selectCategory).toContain('setPendingRuleCategory(null)');
    expect(selectCategory).toContain('setCategoryPickerOpen(true)');
    expect(source).toContain('onClose={saving ? undefined : () => void dismissRuleOffer()}');
    expect(source).toContain('<Button loading={saving} loadingLabel="Saving category…" onPress={() => setRuleDrawerOpen(true)}>Review rule</Button>');
    expect(source).toContain('<Button disabled={saving} variant="ghost" onPress={() => void dismissRuleOffer()}>Not now</Button>');
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

  it('does not present inferred payroll as reviewed or explicitly outside the plan', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyTransactionDetailScreen.tsx'), 'utf8');

    expect(source).toContain('isTransactionExplicitlyReviewed(transaction)');
    expect(source).toContain("if (isProviderIncome(transaction)) return 'Income';");
    expect(source).not.toContain("option.meaning === 'not_counted' && transaction.reviewState === 'not_counted'");
    expect(source).not.toContain("transaction.reviewState === 'not_counted' || transaction.moneyMeaning === 'not_counted'");
  });
});
