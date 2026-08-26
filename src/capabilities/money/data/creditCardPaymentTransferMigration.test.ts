import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260825215611_reconcile_credit_card_payment_transfers.sql'),
  'utf8',
);

describe('credit-card payment transfer reconciliation migration', () => {
  it('normalizes exact provider card-payment evidence without overriding household meaning', () => {
    expect(migration).toContain("LOAN_PAYMENTS_CREDIT_CARD_PAYMENT");
    expect(migration).toContain("money_meaning in ('unknown')");
    expect(migration).toContain("money_meaning_source = 'inferred'");
    expect(migration).toContain("money_meaning = 'transfer'");
    expect(migration).toContain('budget_match_source is null');
  });

  it('pairs only unique equal-and-opposite owned-account rows in a bounded date window', () => {
    expect(migration).toContain('outflow.amount_cents = inflow.amount_cents');
    expect(migration).toContain("outflow.direction = 'outflow'");
    expect(migration).toContain("inflow.direction = 'inflow'");
    expect(migration).toContain("inflow_account.type = 'credit'");
    expect(migration).toContain('candidate_count = 1');
    expect(migration).toMatch(/update public\.budget_transactions as inflow[\s\S]*set money_meaning = 'transfer'/);
  });

  it('keeps automated reconciliation server-owned and runs it after transaction sync writes', () => {
    expect(migration).toContain('security invoker');
    expect(migration).toContain('create trigger reconcile_credit_card_payment_transfers_after_write');
    expect(migration).toMatch(/revoke execute on function public\.reconcile_credit_card_payment_transfers\(uuid, date\)[\s\S]*from public, anon, authenticated;/);
    expect(migration).toMatch(/grant execute on function public\.reconcile_credit_card_payment_transfers\(uuid, date\)[\s\S]*to service_role;/);
  });
});
