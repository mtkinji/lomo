import vm from 'node:vm';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { buildContract, contractQuery, validateChecks, resolveProfile, verifyBackend as realVerifyBackend } from './backend-contract.mjs';
const contract = buildContract();
const verifyBackend = input => realVerifyBackend({ resolveTarget: () => contract.origin, ...input });
const eas = JSON.parse(fs.readFileSync(new URL('../../eas.json', import.meta.url), 'utf8'));
const good = () => contract.checkIds.map(id => ({ id, ok: true }));

test('the release contract requires actual rollover, atomic command, privileges and household policies', () => {
  for (const key of ['column:public.budget_plans.rollover_policy', 'function:public.save_budget_category_settings',
    'function:public.get_budget_category_settings_receipt', 'private-receipts', 'policy:Household adults can read the Money plan config', 'rollover-trigger']) {
    assert(contract.checkIds.includes(key), key);
  }
  const sql = contractQuery(contract);
  assert.match(sql, /pg_catalog\.pg_proc/);
  assert.match(sql, /md5\(p\.prosrc\)/);
  assert.doesNotMatch(sql, /from public\.budget_transactions/i);
});

test('missing columns, RPCs, privileges, false or incomplete observations all block release', () => {
  assert.doesNotThrow(() => validateChecks(contract, good()));
  for (const id of contract.checkIds) {
    assert.throws(() => validateChecks(contract, good().map(c => c.id === id ? { ...c, ok: false } : c)), /incompatible/);
  }
  assert.throws(() => validateChecks(contract, []), /incomplete/);
  assert.throws(() => validateChecks(contract, [...good(), good()[0]]), /incomplete/);
  assert.throws(() => validateChecks(contract, good().map(c => ({ ...c, ok: 'true' }))), /incompatible/);
});

test('release profile inheritance is resolved and a different backend is rejected before network access', async () => {
  assert.equal(resolveProfile(eas, 'testflight-widgets').SUPABASE_URL, 'https://auth.kwilt.app');
  assert.throws(() => resolveProfile({ build: { a: { extends: 'b' }, b: { extends: 'a' } } }, 'a'), /cycle/);
  const fetcher = async () => { throw new Error('must not fetch'); };
  await assert.rejects(verifyBackend({ contract, env: { SUPABASE_ACCESS_TOKEN: 'test' }, profile: 'testflight',
    eas: { build: { testflight: { env: { SUPABASE_URL: 'https://other.supabase.co' } } } }, fetcher }), /target/);
});

test('preflight uses only the read-only API with fixed host, rejects redirects, and fails closed', async () => {
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, status: 200, json: async () => url.endsWith('/custom-hostname')
      ? { custom_hostname: 'auth.kwilt.app' } : good() };
  };
  await verifyBackend({ contract, env: { SUPABASE_ACCESS_TOKEN: 'do-not-log' }, eas, profile: 'testflight', fetcher });
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, 'https://api.supabase.com/v1/projects/sqxwjtorodqjdfnuvprf/database/query/read-only');
  assert.equal(calls[1].options.redirect, 'error');
  assert.match(JSON.parse(calls[1].options.body).query, /^with /i);
  await assert.rejects(verifyBackend({ contract, env: {}, eas, profile: 'testflight', fetcher }), /SUPABASE_ACCESS_TOKEN/);
  await assert.rejects(verifyBackend({ contract, env: { SUPABASE_ACCESS_TOKEN: 'do-not-log' }, eas, profile: 'testflight',
    fetcher: async () => ({ ok: false, status: 403, json: async () => ({ secret: 'do-not-log' }) }) }), /^Error: Backend preflight request failed \(403\)$/);
});

test('store builds validate the backend after dotenv precedence', () => {
  const source = fs.readFileSync(new URL('../../app.config.ts', import.meta.url), 'utf8');
  const require = createRequire(new URL('../../app.config.ts', import.meta.url));
  const env = { EAS_BUILD_PROFILE: 'testflight-widgets', KWILT_APP_ENV: 'test', SUPABASE_URL: contract.origin };
  const context = { module: { exports: {} }, __dirname: '/fixture', process: { env },
    require: name => name === 'fs' ? { existsSync: () => true }
      : name === 'dotenv' ? { config: () => { env.SUPABASE_URL = 'https://wrong.supabase.co'; } } : require(name) };
  assert.throws(() => vm.runInNewContext(source, context), /release backend/i);
  context.require = name => name === 'fs' ? { existsSync: () => true }
    : name === 'dotenv' ? { config: () => { env.SUPABASE_URL = contract.origin; } } : require(name);
  const accepted = { ...context, module: { exports: {} } };
  vm.runInNewContext(source, accepted);
  assert.equal(accepted.module.exports.extra.supabaseUrl, contract.origin);
});

test('preflight checks resolved Expo configuration before sending credentials', async () => {
  let called = false;
  await assert.rejects(verifyBackend({ contract, env: { SUPABASE_ACCESS_TOKEN: 'secret' }, eas, profile: 'testflight',
    resolveTarget: () => 'https://other.supabase.co', fetcher: async () => { called = true; } }), /Effective Expo/);
  assert.equal(called, false);
});
