import { readFileSync } from 'node:fs';
import path from 'node:path';

const sql = readFileSync(path.resolve(
  __dirname,
  '../../../migrations/20260828210000_conversational_control_audit.sql',
), 'utf8').toLowerCase();

describe('conversational control operational migration', () => {
  test('keeps audit, rate, flag, circuit, and dead-letter state service-only', () => {
    for (const table of [
      'kwilt_conversational_control_audit', 'kwilt_conversational_control_rate_events',
      'kwilt_conversational_control_flags', 'kwilt_conversational_provider_circuits',
      'kwilt_conversational_control_dead_letters',
    ]) {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
      expect(sql).toContain(`revoke all on table public.${table} from anon, authenticated`);
      expect(sql).toContain(`grant all on table public.${table} to service_role`);
    }
  });

  test('rate limits atomically while replaying the same request without a second allowance', () => {
    expect(sql).toContain('pg_advisory_xact_lock');
    expect(sql).toContain('unique (actor_id, operation_id, request_id)');
    expect(sql).toContain("'replayed', true");
    expect(sql).toContain("'reason', 'rate_limited'");
    expect(sql).toContain('p_oauth_client_id');
    expect(sql).toContain('p_consequence');
  });

  test('supports surgical disablement, circuit opening, expiration, and dead-letter inspection', () => {
    expect(sql).toContain('authorize_kwilt_conversational_control');
    expect(sql).toContain("'reason', 'operation_disabled'");
    expect(sql).toContain("'reason', 'provider_circuit_open'");
    expect(sql).toContain('reconcile_kwilt_conversational_control');
    expect(sql).toContain("state = 'expired'");
    expect(sql).toContain('kwilt_conversational_control_dead_letters');
    expect(sql).toContain('record_kwilt_conversational_provider_outcome');
    expect(sql).toContain("failure_count + 1 >= 5");
  });

  test('projects actionable alert classes without exposing the underlying ledger', () => {
    expect(sql).toContain('kwilt_conversational_control_alerts');
    for (const alert of [
      'elevated_failure_or_refusal', 'duplicate_or_replay_spike', 'receipt_mismatch',
      'oauth_scope_mismatch', 'tool_catalog_drift', 'stalled_handoff_or_run',
    ]) expect(sql).toContain(alert);
    expect(sql).toContain('grant select on table public.kwilt_conversational_control_alerts to service_role');
  });

  test('stores only a digest for arguments and exposes service-role RPCs only', () => {
    expect(sql).toContain('argument_digest text not null');
    expect(sql).not.toContain('raw_arguments');
    expect(sql).not.toContain('access_token ');
    expect(sql).not.toContain('refresh_token ');
    expect(sql).toContain('grant execute on function public.authorize_kwilt_conversational_control');
    expect(sql).toContain('grant execute on function public.reconcile_kwilt_conversational_control');
  });
});
