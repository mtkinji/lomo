import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export function makeRepo(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kwilt-verification-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const write = (file, value = '') => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), value);
  };
  git('init', '-b', 'main');
  git('config', 'user.name', 'Verification fixture');
  git('config', 'user.email', 'verification@example.invalid');
  write('.gitignore', 'node_modules/\n.env*\n');
  write('src/a.ts', 'export const a = 1;\n');
  write('src/b.ts', 'export const b = 1;\n');
  git('add', '.');
  git('commit', '-qm', 'fixture');
  return { root, git, write };
}
