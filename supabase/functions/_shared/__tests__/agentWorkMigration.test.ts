import { readFileSync } from 'node:fs';
import path from 'node:path';

const sql = readFileSync(path.resolve(
  __dirname,
  '../../../migrations/20260725032643_agent_work_continuity.sql',
), 'utf8');
const phoneTick = readFileSync(path.resolve(__dirname, '../../phone-agent-tick/index.ts'), 'utf8');

describe('agent work continuity migration contract', () => {
  test('keeps proactive occurrences owner-readable and service-write-only', () => {
    expect(sql).toContain('alter table public.kwilt_agent_work_items enable row level security');
    expect(sql).toContain('create policy "kwilt_agent_work_items_owner_select"');
    expect(sql).toContain('using ((select auth.uid()) = user_id)');
    expect(sql).toContain('revoke all on function public.enqueue_kwilt_agent_work_item');
    expect(sql).toContain('from public, anon, authenticated');
    expect(sql).toContain('to service_role');
  });

  test('uses stable idempotency, bounded leases, and skip-locked claims', () => {
    expect(sql).toContain('unique (user_id, idempotency_key)');
    expect(sql).toContain("locked_at < now() - interval '5 minutes'");
    expect(sql).toContain('for update skip locked');
    expect(sql).toContain("if v_item.attempts >= 3 then raise exception 'work_item_attempts_exhausted'");
  });

  test('requires authoritative evidence for every proactive completion kind', () => {
    expect(sql).toContain("when 'reminder' then");
    expect(sql).toContain("when 'recurring_kwilt_action' then");
    expect(sql).toContain("receipt.status = 'applied'");
    expect(sql).toContain("when 'monitor' then");
    expect(sql).toContain("when 'background_analysis' then");
    expect(sql).toContain("run.status in ('complete', 'partial')");
    expect(sql).toContain("when 'native_device_enforcement' then");
    expect(sql).toContain("action.status = 'completed'");
    expect(sql).toContain("raise exception 'authoritative_completion_evidence_required'");
  });

  test('validates every linked causal record against the same owner', () => {
    for (const error of [
      'work_item_thread_owner_mismatch', 'work_item_run_owner_mismatch',
      'work_item_proposal_owner_mismatch', 'work_item_client_action_owner_mismatch',
      'work_item_receipt_owner_mismatch',
    ]) expect(sql).toContain(error);
  });

  test('routes scheduled Phone reminders through the canonical occurrence ledger', () => {
    expect(phoneTick).toContain("admin.rpc('enqueue_kwilt_agent_work_item'");
    expect(phoneTick).toContain("admin.rpc('claim_kwilt_agent_work_item'");
    expect(phoneTick).toContain("p_evidence: { deliveryCheckpointed: true, outboundMessageId: outcome.sid }");
    expect(phoneTick.indexOf("p_state: 'completed'")).toBeGreaterThan(phoneTick.indexOf('const outcome = await sendSms'));
  });
});
