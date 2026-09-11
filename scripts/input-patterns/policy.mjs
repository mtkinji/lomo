const identity = site => [site.file, site.owner, site.kind, site.fingerprint].join('\0');

function validate(records, label) {
  if (!Array.isArray(records)) throw new Error(`${label} must be an array`);
  for (const record of records) {
    for (const key of ['file', 'owner', 'kind', 'fingerprint', 'reason', 'task']) {
      if (typeof record[key] !== 'string' || !record[key].trim()) throw new Error(`${label}: missing ${key}`);
    }
    if (!Array.isArray(record.violations) || !record.violations.length || !Array.isArray(record.siteIds) || !record.siteIds.length) {
      throw new Error(`${label}: violations and siteIds are required`);
    }
  }
}

/** Debt is a multiset of exact observed controls, never a file-wide allowance. */
export function assessInputPolicy({ currentSites, baselineSites, exceptions }) {
  validate(baselineSites, 'baseline');
  validate(exceptions, 'exceptions');
  const allowances = [...exceptions.map(site => ({site, exception: true})), ...baselineSites.map(site => ({site}))];
  const findings = [];
  for (const site of currentSites.filter(site => site.violations.length)) {
    const match = allowances.find(entry => !entry.used && identity(entry.site) === identity(site)
      && site.violations.every(violation => entry.site.violations.includes(violation)));
    if (match) match.used = true;
    else findings.push({...site, code: 'new-input-debt', message: `Use the canonical input family; ${site.violations.join(', ')}`});
  }
  for (const entry of allowances.filter(entry => entry.exception && !entry.used)) {
    findings.push({...entry.site, code: 'stale-exception', message: 'Remove or review this stale exact input exception'});
  }
  return findings;
}
