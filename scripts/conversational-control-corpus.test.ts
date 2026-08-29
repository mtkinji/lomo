import fs from 'node:fs';
import path from 'node:path';
import { KWILT_CAPABILITY_MANIFEST } from '../packages/kwilt-agent-runtime/src/kwiltCapabilityManifest';
import { EXTERNAL_ACTION_REGISTRATIONS } from '../packages/kwilt-agent-runtime/src/externalActionCatalog';
import {
  CONVERSATIONAL_CONTROL_CASE_KINDS,
  CONVERSATIONAL_CONTROL_CORPUS,
  CONVERSATIONAL_CONTROL_ADVERSARIAL_CASES,
  validateConversationalControlRunEvidence,
} from './conversational-control-corpus';

describe('generated conversational control corpus', () => {
  test('generates the complete deterministic matrix for every canonical operation', () => {
    expect(CONVERSATIONAL_CONTROL_CASE_KINDS).toHaveLength(9);
    expect(CONVERSATIONAL_CONTROL_CORPUS).toHaveLength(
      KWILT_CAPABILITY_MANIFEST.length * CONVERSATIONAL_CONTROL_CASE_KINDS.length,
    );
    for (const operation of KWILT_CAPABILITY_MANIFEST) {
      const rows = CONVERSATIONAL_CONTROL_CORPUS.filter((row) => row.operationId === operation.id);
      expect(rows.map((row) => row.kind).sort()).toEqual([...CONVERSATIONAL_CONTROL_CASE_KINDS].sort());
      expect(rows.every((row) => row.expected.completionMode === operation.completionMode)).toBe(true);
      expect(rows.every((row) => JSON.stringify(row).includes('synthetic'))).toBe(true);
    }
    expect(new Set(CONVERSATIONAL_CONTROL_CORPUS.map((row) => row.id)).size)
      .toBe(CONVERSATIONAL_CONTROL_CORPUS.length);
  });

  test('makes false completion structurally forbidden for proposals, handoffs, boundaries, and failures', () => {
    for (const row of CONVERSATIONAL_CONTROL_CORPUS) {
      if (row.kind === 'valid_path' && row.expected.completionMode === 'direct') continue;
      expect(row.expected.forbiddenClaims).toContain('completed_without_authoritative_receipt');
    }
    expect(CONVERSATIONAL_CONTROL_CORPUS.filter((row) => row.kind === 'provider_failure')
      .every((row) => row.expected.resultFamily === 'failure')).toBe(true);
  });

  test('includes every required capability-specific adversarial family using synthetic evidence only', () => {
    expect(CONVERSATIONAL_CONTROL_ADVERSARIAL_CASES.map((row) => row.family).sort()).toEqual([
      'arbitrary_navigation', 'child_privacy', 'financial_semantics', 'household_roles',
      'publication_attestation', 'retailer_completion', 'reward_settlement',
      'screen_time_token_leakage', 'sharing_audience',
    ].sort());
    const serialized = JSON.stringify(CONVERSATIONAL_CONTROL_ADVERSARIAL_CASES);
    expect(serialized).not.toMatch(/Andrew|Watanabe|@gmail\.com|\+1\d{10}/i);
    expect(serialized).not.toContain('applicationToken');
  });

  test('requires reproducible live-run provenance and separates model misses from runtime failures', () => {
    expect(validateConversationalControlRunEvidence({
      model: 'gpt-test', promptHash: 'sha256:prompt', catalogHash: 'fnv1a:catalog',
      branch: 'codex/test', commit: '0123456789abcdef', backendEnvironment: 'disposable-test',
      accountFixture: 'synthetic-household-v1', timestamp: '2026-08-28T20:00:00.000Z',
      resultArtifact: 'artifacts/control-matrix.json', deterministicPassRate: 1,
      falseCompletionClaims: 0, modelUnderstandingMisses: 2, providerRuntimeFailures: 1,
    })).toEqual({ valid: true, issues: [] });
    expect(validateConversationalControlRunEvidence({
      model: '', promptHash: '', catalogHash: '', branch: '', commit: '', backendEnvironment: '',
      accountFixture: '', timestamp: '', resultArtifact: '', deterministicPassRate: 0.99,
      falseCompletionClaims: 1, modelUnderstandingMisses: 0, providerRuntimeFailures: 0,
    }).valid).toBe(false);
  });

  test('keeps the connector catalog artifact synchronized with canonical operations and tools', () => {
    const artifact = JSON.parse(fs.readFileSync(path.resolve(
      process.cwd(), 'docs/delivery-evidence/unified-chat/conversational-control-catalog.json',
    ), 'utf8')) as { operations: Array<{ id: string }>; externalCanonicalTools: string[] };
    expect(artifact.operations.map((operation) => operation.id)).toEqual(
      KWILT_CAPABILITY_MANIFEST.map((operation) => operation.id),
    );
    expect(artifact.externalCanonicalTools).toEqual(EXTERNAL_ACTION_REGISTRATIONS
      .filter((registration) => registration.exposure !== 'hidden')
      .map((registration) => registration.canonicalName)
      .sort());
  });
});
