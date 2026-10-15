import { initialRolloverDraft, reviewRolloverDraft } from './rolloverDraft';
import type { MoneyCategory, MoneyTransaction } from '../data/moneySnapshot';
const category = { id: 'food', sourceId: 'food-1', plannedCents: 40000, spentCents: 10000, remainingCents: 30000, rolloverEnabled: false, fundingRhythm: 'monthly' } as MoneyCategory;
it('starts in the current month with zero carried in', () => {
  const draft = initialRolloverDraft(category, '2026-10');
  expect(draft).toMatchObject({ enabled: false, startMonth: '2026-10', balance: '0.00' });
  expect(reviewRolloverDraft(category, { ...draft, enabled: true }, '400', [], '2026-10')).toMatchObject({ error: null, preview: { availableCents: 30000 } });
});
it('allows zero opening balance and quiet months when backdating June through October', () => {
  const draft = { ...initialRolloverDraft(category, '2026-10'), enabled: true, startMonth: '2026-06' };
  const transactions = [{ date: '2026-06-02', pending: false, categoryId: 'food', amountCents: 50000, direction: 'outflow', moneyMeaning: null }] as MoneyTransaction[];
  expect(reviewRolloverDraft(category, draft, '400', transactions, '2026-10')).toMatchObject({ error: null, preview: { carriedInCents: 110000, availableCents: 140000 } });
});
it('uses the entered monthly amount for backdating and allows a deficit', () => {
  const draft = { ...initialRolloverDraft(category, '2026-10'), enabled: true, startMonth: '2026-06' };
  const transactions = [{ date: '2026-08-02', pending: false, categoryId: 'food', amountCents: 300000, direction: 'outflow', moneyMeaning: null }] as MoneyTransaction[];
  expect(reviewRolloverDraft(category, draft, '500', transactions, '2026-10')).toMatchObject({ error: null, policy: { monthlyAmounts: { '2026-06': 50000, '2026-10': 50000 } }, preview: { availableCents: -60000 } });
});
it('preserves saved historical budget changes when the start month is unchanged', () => {
  const saved = { ...category, rolloverPolicy: { startMonth: '2026-06', startingBalanceCents: 0, monthlyAmounts: { '2026-06': 30000, '2026-08': 40000 }, timeZone: 'America/Denver' } };
  expect(reviewRolloverDraft(saved, { ...initialRolloverDraft(saved, '2026-10'), enabled: true }, '500', [], '2026-10')).toMatchObject({ error: null, preview: { availableCents: 180000 } });
});
it('preserves existing reserve availability when opening rollover settings', () => {
  const reserve = { ...category, fundingRhythm: 'reserve' as const, remainingCents: 93000 };
  const draft = initialRolloverDraft(reserve, '2026-10');
  expect(draft.balance).toBe('630.00');
  expect(reviewRolloverDraft(reserve, draft, '400', [], '2026-10').preview?.availableCents).toBe(93000);
});
