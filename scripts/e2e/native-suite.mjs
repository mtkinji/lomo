import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const workspaceFlows = ['smoke-devtools', 'onboarding-plan-ready-touch-regression', 'arc-banner-touch-regression', 'activity-detail-key-actions'];
export function selectGroup({ group, suite = 'acceptance', workspaceFlow = 'all' }) {
  if (!['smoke', 'acceptance'].includes(suite)) throw new Error('Unknown native suite');
  if (!['all', ...workspaceFlows].includes(workspaceFlow)) throw new Error('Unknown workspace flow');
  if (group === 'auth') return { env: { KWILT_MAESTRO_APP_FIXTURE: 'auth', KWILT_MAESTRO_BUDGET_FIXTURE: '0' }, flows: ['e2e/maestro/auth-gate-smoke.yaml'] };
  if (group === 'workspace') return { env: { KWILT_MAESTRO_APP_FIXTURE: 'workspace', KWILT_MAESTRO_BUDGET_FIXTURE: '0' },
    flows: (workspaceFlow === 'all' ? workspaceFlows : [workspaceFlow]).map(name => `e2e/workspace-fixture/${name}.yaml`) };
  if (group === 'budget') return { env: { KWILT_MAESTRO_APP_FIXTURE: '', KWILT_MAESTRO_BUDGET_FIXTURE: '1' },
    flows: [`e2e/budget-fixture/navigation-${suite === 'acceptance' ? 'inventory' : 'refresh'}.yaml`] };
  throw new Error('Unknown native test group');
}
export function acceptanceResult({ suite, group, workspaceFlow, outcomes }) {
  if (!['smoke', 'acceptance'].includes(suite) || !['all', 'auth', 'workspace', 'budget'].includes(group)) throw new Error('Unknown acceptance scope');
  const groups = group === 'all' ? ['auth', 'workspace', 'budget'] : [group];
  const passed = groups.every(g => outcomes[g] === 'success');
  return { passed, fullAcceptance: passed && suite === 'acceptance' && group === 'all' && workspaceFlow === 'all' };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if (process.argv[2] === 'summary') {
      const { SUITE: suite, GROUP: group, FLOW: workspaceFlow, AUTH: auth, WORKSPACE: workspace, BUDGET: budget } = process.env;
      const result = acceptanceResult({ suite, group, workspaceFlow, outcomes: { auth, workspace, budget } });
      const report = `## Native result\nSuite: ${suite}; group: ${group}; workspace flow: ${workspaceFlow}.\nAuth: ${auth}; workspace: ${workspace}; Budget: ${budget}.\n${result.fullAcceptance ? 'Full isolated native acceptance passed.' : 'This run does not establish full isolated release acceptance.'}\n`;
      console.log(report);
      if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
      if (!result.passed) process.exitCode = 1;
    } else {
      const selection = selectGroup({ group: process.argv[2], suite: process.env.KWILT_NATIVE_SUITE || 'acceptance', workspaceFlow: process.env.KWILT_WORKSPACE_FLOW || 'all' });
      const result = spawnSync('bash', ['scripts/e2e/run-maestro-ios.sh', ...selection.flows], { stdio: 'inherit', env: { ...process.env, ...selection.env } });
      process.exitCode = result.status ?? 1;
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
