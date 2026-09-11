import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
}

export function resolveBase(root, base) {
  if (base) return git(root, ['rev-parse', '--verify', '--end-of-options', `${base}^{commit}`]).trim();
  for (const ref of ['@{u}', 'origin/main', 'HEAD']) {
    try { return resolveBase(root, ref); } catch { /* Try the next available local ref. */ }
  }
  throw new Error('No valid Git base. Commit an initial snapshot before verifying.');
}

export function collectChanges(root, base) {
  const sha = resolveBase(root, base);
  const lists = [
    git(root, ['diff', '--name-only', '-z', '--no-renames', `${sha}...HEAD`]),
    git(root, ['diff', '--cached', '--name-only', '-z', '--no-renames']),
    git(root, ['diff', '--name-only', '-z', '--no-renames']),
    git(root, ['ls-files', '--others', '--exclude-standard', '-z']),
  ];
  return [...new Set(lists.flatMap(s => s.split('\0').filter(Boolean)))].sort();
}

function normalize(root, input) {
  const relative = path.relative(root, path.resolve(root, input));
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`Path is outside the repository: ${input}`);
  }
  return relative.split(path.sep).join('/');
}

export function selectFiles(root, changed, explicit = [], scopes = []) {
  if (!explicit.length && !scopes.length) return { files: changed, omitted: [] };
  const chosen = explicit.map(p => {
    const file = normalize(root, p);
    if (!changed.includes(file) && !fs.existsSync(path.join(root, file))) throw new Error(`Missing file: ${p}`);
    if (fs.existsSync(path.join(root, file)) && fs.statSync(path.join(root, file)).isDirectory()) throw new Error(`Use --scope for directories: ${p}`);
    return file;
  });
  for (const scope of scopes) {
    const dir = normalize(root, scope);
    const matches = changed.filter(p => !dir || p === dir || p.startsWith(`${dir}/`));
    if (!matches.length) throw new Error(`No changed files in scope: ${scope}`);
    chosen.push(...matches);
  }
  const files = [...new Set(chosen)].sort();
  return { files, omitted: changed.filter(p => !files.includes(p)) };
}

function hashFile(hash, file) {
  const buffer = Buffer.allocUnsafe(256 * 1024);
  const fd = fs.openSync(file, 'r');
  try {
    let count;
    while ((count = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0) hash.update(buffer.subarray(0, count));
  } finally { fs.closeSync(fd); }
}

// Include ctime as well as mtime so an edited dependency with a restored mtime
// cannot reuse an earlier result. Follow links, with cycle protection.
function hashInstalledTree(hash, file, visited = new Set()) {
  if (!fs.existsSync(file)) { hash.update(`missing:${file}\0`); return; }
  const real = fs.realpathSync(file);
  hash.update(`${file}:${real}\0`);
  if (visited.has(real)) return;
  visited.add(real);
  const stat = fs.statSync(real, { bigint: true });
  hash.update(`${stat.mode}:${stat.size}:${stat.mtimeNs}:${stat.ctimeNs}:${stat.ino}\0`);
  if (stat.isDirectory()) {
    for (const name of fs.readdirSync(real).sort()) hashInstalledTree(hash, path.join(real, name), visited);
  }
}

export function fingerprint(root, base, env = process.env) {
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify({ version: 1, root: fs.realpathSync(root), base: resolveBase(root, base),
    head: resolveBase(root, 'HEAD'), node: process.version, execPath: process.execPath,
    platform: process.platform, arch: process.arch, env: Object.entries(env).sort(([a], [b]) => a.localeCompare(b)) }));
  // Git hashes the committed tree; these diffs include every tracked working and
  // staged change. Do not invoke external diff/textconv programs.
  hash.update(git(root, ['diff', '--binary', '--no-ext-diff', '--no-textconv', 'HEAD']));
  hash.update(git(root, ['diff', '--binary', '--cached', '--no-ext-diff', '--no-textconv']));
  const untracked = git(root, ['ls-files', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean);
  const environmentFiles = fs.readdirSync(root).filter(p => p.startsWith('.env'));
  for (const file of [...new Set([...untracked, ...environmentFiles])].sort()) {
    const absolute = path.join(root, file);
    hash.update(`${file}\0`);
    const stat = fs.statSync(absolute);
    if (stat.isFile()) hashFile(hash, absolute);
    else hashInstalledTree(hash, absolute);
    hash.update('\0');
  }
  hashInstalledTree(hash, path.join(root, 'node_modules'));
  return hash.digest('hex');
}
