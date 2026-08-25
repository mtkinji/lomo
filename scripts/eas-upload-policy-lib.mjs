export const REQUIRED_EAS_IGNORE_ENTRIES = Object.freeze([
  '.git',
  '.cursor/',
  '.worktrees/',
  'node_modules/',
  '.expo/',
  '/ios',
  '/android',
  '/artifacts/',
  '/prototypes/',
  'app-store-screenshots/',
  'eas_logs_local/',
  'eas_cloud_logs/',
  '.env',
  '.env*.local',
  'credentials.json',
  '*.jks',
  '*.key',
  '*.mobileprovision',
  '*.p12',
  '*.p8',
  '*.pem',
  'modules/*/android/build/',
]);

export function parseIgnoreEntries(source) {
  return new Set(
    source
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#')),
  );
}

export function validateEasIgnore(source) {
  const entries = parseIgnoreEntries(source);
  const errors = REQUIRED_EAS_IGNORE_ENTRIES
    .filter((entry) => !entries.has(entry))
    .map((entry) => `missing required EAS exclusion: ${entry}`);

  if (/credentialsSource:\s*["']local["']/u.test(source)) {
    errors.push('obsolete local-credentials rationale remains in .easignore');
  }

  return errors;
}
