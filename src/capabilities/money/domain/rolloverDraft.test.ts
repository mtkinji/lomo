import { initialRolloverDraft, reviewRolloverDraft } from './rolloverDraft';
import type { MoneyCategory, MoneyTransaction } from '../data/moneySnapshot';
const category = { id: 'food', sourceId: 'food-1', plannedCents: 40000, spentCents: 10000, remainingCents: 30000, rolloverEnabled: false, fundingRhythm: 'monthly' } as MoneyCategory;
it('starts in the current month with zero carried in', () => {
  const draft = initialRolloverDraft(category, '2026-10');
  expect(draft).toMatchObject({ enabled: false, startMonth: '2026-10', balance: '0.00' });
  expect(reviewRolloverDraft(category, { ...draft, enabled: true }, '400', [], '2026-10')).toMatchObject({ error: null, preview: { availableCents: 30000 } });
});
it('blocks missing history rather than treating it as zero spending', () => {
  const draft = { ...initialRolloverDraft(category, '2026-10'), enabled: true, startMonth: '2026-01', historyReviewed: true };
  expect(reviewRolloverDraft(category, draft, '400', [], '2026-10')).toMatchObject({ preview: null, error: expect.stringContaining('No imported activity') });
});
it('requires review of backdated contributions even when activity exists', () => {
  const draft = { ...initialRolloverDraft(category, '2026-10'), enabled: true, startMonth: '2026-09' };
  const transactions = [{ date: '2026-09-02', pending: false, categoryId: 'other' }] as MoneyTransaction[];
  expect(reviewRolloverDraft(category, draft, '400', transactions, '2026-10').error).toContain('Review');
  expect(reviewRolloverDraft(category, { ...draft, historyReviewed: true }, '400', transactions, '2026-10').error).toBeNull();
});
it('preserves existing reserve availability when opening rollover settings', () => {
  const reserve = { ...category, fundingRhythm: 'reserve' as const, remainingCents: 93000 };
  const draft = initialRolloverDraft(reserve, '2026-10');
  expect(draft.balance).toBe('630.00');
  expect(reviewRolloverDraft(reserve, draft, '400', [], '2026-10').preview?.availableCents).toBe(93000);
});
