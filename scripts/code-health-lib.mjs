import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const DEFAULT_THRESHOLDS = {
  largeFile: 800,
  veryLargeFile: 1500,
  hugeFile: 3000,
  largeFileGrowth: 100,
};

export const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);

const DEFAULT_IGNORE_PARTS = new Set(['node_modules', '.git', '.worktrees']);
const DEFAULT_IGNORE_PREFIXES = ['ios/Pods/', 'ios/build/', 'android/build/'];

export function toPosix(file) {
  return file.split(path.sep).join('/');
}

export function isCodeFile(file) {
  return CODE_EXTENSIONS.has(path.extname(file));
}

export function shouldIgnoreFile(file) {
  const normalized = toPosix(file);
  if (DEFAULT_IGNORE_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return true;
  return normalized.split('/').some((part) => DEFAULT_IGNORE_PARTS.has(part));
}

export function splitLines(text) {
  if (text.length === 0) return 0;
  return text.split('\n').length;
}

export function countMatches(text, pattern) {
  return (text.match(pattern) ?? []).length;
}

export function analyzeText(text) {
  return {
    lines: splitLines(text),
    asAny: countMatches(text, /\bas any\b/g),
    explicitAny: countMatches(text, /[:<,(]\s*any\b/g),
    tsIgnore: countMatches(text, /(^|\n)\s*\/\/\s*@ts-ignore\b/g),
    tsExpectError: countMatches(text, /(^|\n)\s*\/\/\s*@ts-expect-error\b/g),
    consoleLog: countMatches(text, /console\.log\b/g),
    directReusableImport: /from\s+['"][^'"]*components\/ui\/[^'"]*['"]/.test(text),
    rawReactNativeText:
      /import\s+\{[^}]*\bText\b[^}]*\}\s+from\s+['"]react-native['"]/.test(text) ||
      /import\s+\{[^}]*\bText\s+as\s+\w+[^}]*\}\s+from\s+['"]react-native['"]/.test(text),
  };
}

export function summarizeFiles(filesWithText, thresholds = DEFAULT_THRESHOLDS) {
  const rows = filesWithText
    .filter(({ file }) => isCodeFile(file) && !shouldIgnoreFile(file))
    .map(({ file, text }) => ({
      file: toPosix(file),
      ...analyzeText(text),
    }))
    .sort((a, b) => a.file.localeCompare(b.file));

  const totals = {
    files: rows.length,
    lines: 0,
    largeFiles: 0,
    veryLargeFiles: 0,
    hugeFiles: 0,
    asAny: 0,
    explicitAny: 0,
    tsIgnore: 0,
    tsExpectError: 0,
    consoleLog: 0,
    directReusableImports: 0,
    rawReactNativeTextFeatureFiles: 0,
  };

  for (const row of rows) {
    totals.lines += row.lines;
    totals.asAny += row.asAny;
    totals.explicitAny += row.explicitAny;
    totals.tsIgnore += row.tsIgnore;
    totals.tsExpectError += row.tsExpectError;
    totals.consoleLog += row.consoleLog;
    if (row.lines >= thresholds.largeFile) totals.largeFiles += 1;
    if (row.lines >= thresholds.veryLargeFile) totals.veryLargeFiles += 1;
    if (row.lines >= thresholds.hugeFile) totals.hugeFiles += 1;
    if (row.directReusableImport) totals.directReusableImports += 1;
    if (row.file.startsWith('src/features/') && row.rawReactNativeText) {
      totals.rawReactNativeTextFeatureFiles += 1;
    }
  }

  return { rows, totals };
}

export function compareSummaries(currentRows, baseRows, thresholds = DEFAULT_THRESHOLDS) {
  const baseByFile = new Map(baseRows.map((row) => [row.file, row]));
  const findings = [];

  for (const row of currentRows) {
    const base = baseByFile.get(row.file);
    const isNew = !base;
    const baseLines = base?.lines ?? 0;
    const lineGrowth = row.lines - baseLines;

    if (isNew && row.lines >= thresholds.largeFile) {
      findings.push({
        severity: 'error',
        file: row.file,
        code: 'new-large-file',
        message: `new code file has ${row.lines} lines (budget ${thresholds.largeFile})`,
      });
    }

    if (!isNew && baseLines >= thresholds.veryLargeFile && lineGrowth > thresholds.largeFileGrowth) {
      findings.push({
        severity: 'error',
        file: row.file,
        code: 'large-file-growth',
        message: `large file grew by ${lineGrowth} lines (budget ${thresholds.largeFileGrowth})`,
      });
    }

    const newTsIgnore = row.tsIgnore - (base?.tsIgnore ?? 0);
    if (newTsIgnore > 0) {
      findings.push({
        severity: 'error',
        file: row.file,
        code: 'new-ts-ignore',
        message: `added ${newTsIgnore} @ts-ignore directive${newTsIgnore === 1 ? '' : 's'}`,
      });
    }

    const newConsoleLog = row.consoleLog - (base?.consoleLog ?? 0);
    if (row.file.startsWith('src/') && newConsoleLog > 0) {
      findings.push({
        severity: 'error',
        file: row.file,
        code: 'new-console-log',
        message: `added ${newConsoleLog} console.log call${newConsoleLog === 1 ? '' : 's'} in src`,
      });
    }

    if (row.directReusableImport && !base?.directReusableImport) {
      findings.push({
        severity: 'error',
        file: row.file,
        code: 'new-direct-reusables-import',
        message: 'new direct components/ui import; feature/app code must use src/ui adapters',
      });
    }

    if (row.file.startsWith('src/features/') && row.rawReactNativeText && !base?.rawReactNativeText) {
      findings.push({
        severity: 'error',
        file: row.file,
        code: 'new-raw-react-native-text',
        message: 'new raw react-native Text import in feature file; use src/ui Typography adapters',
      });
    }

    const newAsAny = row.asAny - (base?.asAny ?? 0);
    if (newAsAny > 0) {
      findings.push({
        severity: 'warning',
        file: row.file,
        code: 'new-as-any',
        message: `added ${newAsAny} unchecked cast${newAsAny === 1 ? '' : 's'}`,
      });
    }

    const newExplicitAny = row.explicitAny - (base?.explicitAny ?? 0);
    if (newExplicitAny > 0) {
      findings.push({
        severity: 'warning',
        file: row.file,
        code: 'new-explicit-any',
        message: `added ${newExplicitAny} explicit any usage${newExplicitAny === 1 ? '' : 's'}`,
      });
    }
  }

  return findings.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'error' ? -1 : 1;
    return `${a.file}:${a.code}`.localeCompare(`${b.file}:${b.code}`);
  });
}

export function formatReport({ current, findings, baseLabel, topCount = 10 }) {
  const lines = [];
  lines.push('Code health summary');
  if (baseLabel) lines.push(`Base: ${baseLabel}`);
  lines.push(`Files: ${current.totals.files}`);
  lines.push(`Lines: ${current.totals.lines}`);
  lines.push(`Large files >=800 lines: ${current.totals.largeFiles}`);
  lines.push(`Very large files >=1500 lines: ${current.totals.veryLargeFiles}`);
  lines.push(`Huge files >=3000 lines: ${current.totals.hugeFiles}`);
  lines.push(`unchecked casts: ${current.totals.asAny}`);
  lines.push(`explicit any matches: ${current.totals.explicitAny}`);
  lines.push(`@ts-ignore directives: ${current.totals.tsIgnore}`);
  lines.push(`console.log calls: ${current.totals.consoleLog}`);
  lines.push(`raw react-native Text feature files: ${current.totals.rawReactNativeTextFeatureFiles}`);

  const largest = [...current.rows].sort((a, b) => b.lines - a.lines).slice(0, topCount);
  if (largest.length > 0) {
    lines.push('');
    lines.push(`Largest files (top ${largest.length}):`);
    for (const row of largest) {
      lines.push(`- ${row.file}: ${row.lines} lines`);
    }
  }

  if (findings.length > 0) {
    lines.push('');
    lines.push('Ratchet findings:');
    for (const finding of findings) {
      lines.push(`- [${finding.severity}] ${finding.file}: ${finding.message}`);
    }
  } else if (baseLabel) {
    lines.push('');
    lines.push('Ratchet findings: none');
  }

  return `${lines.join('\n')}\n`;
}

export function git(args, cwd) {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

export function listWorkingFiles(repoRoot) {
  const tracked = git(['ls-files'], repoRoot).split('\n').filter(Boolean);
  const untracked = git(['ls-files', '--others', '--exclude-standard'], repoRoot).split('\n').filter(Boolean);
  return [...new Set([...tracked, ...untracked])]
    .filter((file) => isCodeFile(file) && !shouldIgnoreFile(file))
    .sort();
}

export function readWorkingFiles(repoRoot, files = listWorkingFiles(repoRoot)) {
  return files
    .map((file) => {
      const full = path.join(repoRoot, file);
      if (!fs.existsSync(full)) return null;
      return { file, text: fs.readFileSync(full, 'utf8') };
    })
    .filter(Boolean);
}

export function readGitFiles(repoRoot, ref) {
  const fileList = git(['ls-tree', '-r', '--name-only', ref], repoRoot)
    .split('\n')
    .filter((file) => file && isCodeFile(file) && !shouldIgnoreFile(file));

  return fileList
    .map((file) => {
      const text = git(['show', `${ref}:${file}`], repoRoot);
      return { file, text };
    })
    .filter(({ text }) => text.length > 0);
}

export function pickBaseRef(repoRoot, requestedBase) {
  if (requestedBase) return requestedBase;
  const upstream = git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], repoRoot);
  if (upstream) return upstream;
  if (git(['rev-parse', '--verify', 'origin/main'], repoRoot)) return 'origin/main';
  return 'main';
}
