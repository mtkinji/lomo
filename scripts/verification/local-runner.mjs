import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fingerprint } from './local-state.mjs';

export function assertLocalEnvironment(env) {
  if (['CI', 'GITHUB_ACTIONS', 'EAS_BUILD'].some(k => env[k] && !['false', '0'].includes(env[k].toLowerCase()))) {
    throw new Error('verify:local cannot run in CI. Use the protected integration command: npm run verify:changed -- --run');
  }
}

function isAlive(pid) {
  if (!Number.isInteger(pid) || pid === 0) return false;
  try { process.kill(pid, 0); return true; } catch (error) { return error.code !== 'ESRCH'; }
}

export function acquireLock(cacheDir) {
  fs.mkdirSync(cacheDir, { recursive: true, mode: 0o700 });
  const file = path.join(cacheDir, 'run.lock');
  try { fs.writeFileSync(file, JSON.stringify({ pid: process.pid }), { flag: 'wx', mode: 0o600 }); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const owner = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (isAlive(owner.pid) || isAlive(owner.childPid) || (owner.groupPid && isAlive(-owner.groupPid))) throw new Error('A local verifier or its child process is still running. Wait for that run.');
    fs.unlinkSync(file);
    fs.writeFileSync(file, JSON.stringify({ pid: process.pid }), { flag: 'wx', mode: 0o600 });
  }
  return {
    child: (childPid, groupPid) => fs.writeFileSync(file, JSON.stringify({ pid: process.pid, childPid, groupPid }), { mode: 0o600 }),
    release: () => fs.unlinkSync(file),
  };
}

function writeJson(file, value) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(tmp, file);
}

function readReceipts(file) {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return data.version === 1 && data.entries && !Array.isArray(data.entries) && typeof data.entries === 'object' ? data : { version: 1, entries: {} };
  } catch { return { version: 1, entries: {} }; }
}

function usable(receipt, input) {
  return receipt?.input === input && receipt.exitCode === 0 && Number.isFinite(receipt.durationMs)
    && receipt.durationMs >= 0 && typeof receipt.completedAt === 'string' && Number.isFinite(Date.parse(receipt.completedAt));
}

function executeGate(gate, { root, env, lock }) {
  return new Promise((resolve, reject) => {
    const grouped = process.platform !== 'win32';
    const child = spawn(gate.file, gate.args, { cwd: root, env, stdio: 'inherit', shell: false, detached: grouped });
    lock.child(child.pid, grouped ? child.pid : undefined);
    let interruptedCode = 0;
    let escalation;
    const send = signal => {
      try {
        if (grouped && child.pid) process.kill(-child.pid, signal);
        else child.kill(signal);
      } catch (error) { if (error.code !== 'ESRCH') throw error; }
    };
    const stop = (signal, code) => {
      interruptedCode = code;
      send(signal);
      escalation ??= setTimeout(() => send('SIGKILL'), 2000);
    };
    const interrupt = () => stop('SIGINT', 130);
    const terminate = () => stop('SIGTERM', 143);
    process.once('SIGINT', interrupt);
    process.once('SIGTERM', terminate);
    const cleanup = () => {
      process.removeListener('SIGINT', interrupt);
      process.removeListener('SIGTERM', terminate);
      clearTimeout(escalation);
      lock.child(undefined);
    };
    child.once('error', error => { cleanup(); reject(error); });
    child.once('exit', (code, signal) => {
      // A wrapper may exit zero during signal cleanup. It is still interrupted;
      // stop any surviving descendants before permitting another local run.
      if (interruptedCode && grouped) send('SIGKILL');
      cleanup();
      resolve(interruptedCode || code || (code === 0 ? 0 : signal === 'SIGINT' ? 130 : 1));
    });
  });
}

export async function runLocalPlan(plan, {
  root, cacheDir, env = process.env, force = false, log = console.log,
  getFingerprint = () => fingerprint(root, plan.base, env), execute = executeGate,
}) {
  assertLocalEnvironment(env);
  const lock = acquireLock(cacheDir);
  const started = performance.now();
  const report = { kind: 'local-only', startedAt: new Date().toISOString(), base: plan.base,
    changedFiles: plan.changedFiles, omitted: plan.omitted ?? [], manual: plan.manual,
    status: 'failed', exitCode: 1, results: [] };
  const receiptsFile = path.join(cacheDir, 'receipts.json');
  const receipts = readReceipts(receiptsFile);
  const pending = {};
  try {
    const input = getFingerprint();
    report.input = input;
    report.exitCode = 0;
    for (const gate of plan.commands) {
      const key = crypto.createHash('sha256').update(JSON.stringify([gate.id, gate.file, gate.args])).digest('hex');
      const previous = Object.hasOwn(receipts.entries, key) ? receipts.entries[key] : null;
      if (!force && gate.cacheable && usable(previous, input)) {
        report.results.push({ ...previous, id: gate.id, status: 'reused' });
        log(`[verify:local] reuse ${gate.id} (passed ${previous.completedAt})`);
        continue;
      }
      // Persist invalidation before execution: an interrupted or failed forced
      // run must never leave its earlier pass eligible for reuse.
      delete receipts.entries[key];
      writeJson(receiptsFile, receipts);
      log(`[verify:local] run ${gate.id}: ${[gate.file, ...gate.args].map(a => JSON.stringify(a)).join(' ')}`);
      const gateStart = performance.now();
      const exitCode = await execute(gate, { root, env, lock });
      const result = { id: gate.id, command: { file: gate.file, args: gate.args }, input, exitCode, durationMs: Math.round(performance.now() - gateStart),
        completedAt: new Date().toISOString(), status: exitCode === 0 ? 'passed' : 'failed' };
      report.results.push(result);
      if (exitCode !== 0) { report.exitCode = exitCode; break; }
      if (gate.cacheable) pending[key] = result;
    }
    if (getFingerprint() !== input) {
      report.status = 'stale';
      report.exitCode = 1;
      report.error = 'Inputs changed while checks were running. Results were not cached; verify the updated scope.';
    } else {
      Object.assign(receipts.entries, pending);
      writeJson(receiptsFile, receipts);
      report.status = report.exitCode === 0 ? 'passed' : 'failed';
    }
  } catch (error) {
    report.status = 'failed';
    report.exitCode = 1;
    report.error = error.message;
  } finally {
    report.durationMs = Math.round(performance.now() - started);
    report.completedAt = new Date().toISOString();
    try {
      writeJson(path.join(cacheDir, 'latest.json'), report);
      fs.appendFileSync(path.join(cacheDir, 'history.jsonl'), `${JSON.stringify(report)}\n`, { mode: 0o600 });
    } finally { lock.release(); }
  }
  return report;
}
