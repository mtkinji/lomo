import fs from 'node:fs';
import path from 'node:path';
import { buildVerificationPlan } from './plan.mjs';

const code = /^(src|packages|scripts)\/.*\.(ts|tsx|js|jsx|json)$/;
const runtime = /^(package(-lock)?\.json|.*config\.(js|ts|json)|jest\.setup\.ts|src\/test\/)/;
export const verificationTool = /^scripts\/(verify-(local|changed)(-lib)?(\.test)?\.mjs|verification\/)/;

function inheritedGate({ command, reason }, base, cacheDir) {
  if (command === 'npm run lint' || command === 'npm run lint:tests') {
    const tests = command.endsWith(':tests');
    return {
      id: tests ? 'types:tests' : 'types:app', file: process.execPath,
      args: ['node_modules/typescript/bin/tsc', '--noEmit', '--project', tests ? 'tsconfig.test.json' : 'tsconfig.json',
        '--incremental', '--tsBuildInfoFile', path.join(cacheDir, tests ? 'tests.tsbuildinfo' : 'app.tsbuildinfo')],
      reason, cacheable: true,
    };
  }
  if (command.startsWith('npm run code:health ')) {
    return { id: 'code:health', file: process.execPath, args: ['scripts/verification/local-code-health.mjs', base], reason, cacheable: true };
  }
  const npm = /^npm run ([a-z0-9:.-]+)$/.exec(command);
  if (npm) return { id: npm[1], file: 'npm', args: ['run', npm[1]], reason, cacheable: npm[1] === 'test:verification' };
  // These inherited commands contain only fixed repository-authored arguments.
  // Dynamic Jest paths and Git refs are handled separately as argument arrays.
  if (command === 'git diff --check') return { id: 'whitespace', file: 'git', args: ['diff', '--check'], reason, cacheable: false };
  if (/^node --test [a-zA-Z0-9./ _-]+$/.test(command)) {
    return { id: command, file: process.execPath, args: command.split(' ').slice(1), reason, cacheable: true };
  }
  throw new Error(`Local verifier needs an argument-safe adapter for: ${command}`);
}

export function buildLocalPlan(files, { base, cacheDir, workers = 1, exists = fs.existsSync }) {
  const original = buildVerificationPlan(files, base);
  const hasProductLint = original.commands.some(c => c.command === 'npm run product:lint');
  const commands = original.commands
    .filter(c => !c.command.startsWith('npm test ') && c.command !== 'npm run agent:map')
    .filter(c => !(hasProductLint && c.command === 'npm run chat:delivery-lint'))
    .map(c => inheritedGate(c, base, cacheDir));
  if (files.length) commands.splice(1, 0, {
    id: 'staged-whitespace', file: 'git', args: ['diff', '--cached', '--check'],
    reason: 'check staged content as well as working-tree edits', cacheable: false,
  });
  const seeds = files.filter(f => code.test(f));
  const full = files.some(f => runtime.test(f) || (code.test(f) && !exists(f)));
  if (full || seeds.length) {
    commands.push({
      id: 'jest', file: process.execPath,
      args: ['node_modules/jest/bin/jest.js', workers === 1 ? '--runInBand' : `--maxWorkers=${workers}`,
        ...(full ? [] : ['--passWithNoTests', '--findRelatedTests', ...seeds])],
      reason: full ? 'shared configuration or removed sources require broad regression coverage'
        : 'run tests related to selected source, fixture, and test files; file count does not broaden scope',
      cacheable: true,
    });
  }
  if (files.some(f => verificationTool.test(f)) && !commands.some(c => c.id === 'test:verification')) {
    commands.push({ id: 'test:verification', file: 'npm', args: ['run', 'test:verification'],
      reason: 'verify protected selection, local scoping, invalidation, and CLI isolation', cacheable: true });
  }
  const scriptTests = [...new Set(files.filter(f => /^scripts\/.*\.mjs$/.test(f) && !verificationTool.test(f))
    .map(f => f.endsWith('.test.mjs') ? f : f.replace(/\.mjs$/, '.test.mjs')).filter(exists))];
  if (scriptTests.length) commands.push({ id: 'script-tests', file: process.execPath, args: ['--test', ...scriptTests],
    reason: 'run changed script tests and existing companion regressions', cacheable: true });
  const manual = [...original.manual];
  if (original.commands.some(c => c.command === 'npm run agent:map')) {
    manual.push({ command: 'npm run agent:map', reason: 'refresh generated documentation explicitly if needed; local verification does not rewrite it' });
  }
  return { ...original, mode: 'local', commands, manual,
    notes: [...original.notes, 'Local results do not approve integration, deployment, or omitted work.'] };
}
