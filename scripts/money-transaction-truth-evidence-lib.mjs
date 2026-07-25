const TOP_LEVEL_FIELDS = new Set([
  'id',
  'current_score',
  'build',
  'window',
  'aggregate',
  'installed_build_reconciliation_discrepancies',
  'household_assessments',
]);

const BUILD_FIELDS = new Set([
  'app_version',
  'app_build',
  'testflight_installed',
  'physical_device_verified',
]);

const WINDOW_FIELDS = new Set(['observation_days']);

const AGGREGATE_FIELDS = new Set([
  'genuine_starts',
  'saved',
  'saved_under_one_minute',
  'save_failed',
  'abandoned',
  'replace_saved',
]);

const HOUSEHOLD_FIELDS = new Set([
  'ease_rating',
  'trust_rating',
  'explains_change',
  'routine_bookkeeping',
]);

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function findProhibitedFields(value, allowedFields, label, errors) {
  if (!isObject(value)) return;
  for (const field of Object.keys(value)) {
    if (!allowedFields.has(field)) errors.push(`${label} contains prohibited field: ${field}`);
  }
}

function safeCount(value) {
  return isNonNegativeInteger(value) ? value : 0;
}

function rate(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : null;
}

export function assessMoneyTransactionTruthEvidence(evidence) {
  const build = isObject(evidence?.build) ? evidence.build : {};
  const aggregate = isObject(evidence?.aggregate) ? evidence.aggregate : {};
  const households = Array.isArray(evidence?.household_assessments)
    ? evidence.household_assessments
    : [];
  const starts = safeCount(aggregate.genuine_starts);
  const saved = safeCount(aggregate.saved);
  const savedUnderOneMinute = safeCount(aggregate.saved_under_one_minute);
  const saveFailed = safeCount(aggregate.save_failed);
  const abandoned = safeCount(aggregate.abandoned);
  const replaceSaved = safeCount(aggregate.replace_saved);
  const metrics = {
    fast_save_rate: rate(savedUnderOneMinute, saved),
    abandonment_rate: rate(abandoned, starts),
    save_failure_rate: rate(saveFailed, saved + saveFailed),
  };

  const gates = [
    {
      id: 'installed_build',
      passed: isNonEmptyString(build.app_version)
        && isNonEmptyString(build.app_build)
        && build.testflight_installed === true
        && build.physical_device_verified === true,
    },
    {
      id: 'statement_cycle',
      passed: safeCount(evidence?.window?.observation_days) >= 28,
    },
    {
      id: 'representative_households',
      passed: households.length >= 3,
    },
    {
      id: 'behavior_thresholds',
      passed: starts >= 8
        && replaceSaved >= 1
        && metrics.fast_save_rate !== null
        && metrics.fast_save_rate >= 0.8
        && metrics.abandonment_rate !== null
        && metrics.abandonment_rate <= 0.2
        && metrics.save_failure_rate !== null
        && metrics.save_failure_rate <= 0.05,
    },
    {
      id: 'reconciliation',
      passed: evidence?.installed_build_reconciliation_discrepancies === 0,
    },
    {
      id: 'household_trust',
      passed: households.length >= 3 && households.every((household) =>
        household?.ease_rating >= 4
        && household?.ease_rating <= 5
        && household?.trust_rating >= 4
        && household?.trust_rating <= 5
        && household?.explains_change === true
        && household?.routine_bookkeeping === false),
    },
  ];

  return {
    eligible_for_five: gates.every((gate) => gate.passed),
    gates,
    metrics,
  };
}

export function validateMoneyTransactionTruthEvidence(evidence) {
  const errors = [];
  if (!isObject(evidence)) return ['evidence must be an object'];

  findProhibitedFields(evidence, TOP_LEVEL_FIELDS, 'evidence', errors);
  if (evidence.id !== 'money-transaction-truth') {
    errors.push('evidence id must be `money-transaction-truth`');
  }
  if (!Number.isInteger(evidence.current_score) || evidence.current_score < 1 || evidence.current_score > 5) {
    errors.push('current_score must be an integer from 1 to 5');
  }

  if (!isObject(evidence.build)) {
    errors.push('build must be an object');
  } else {
    findProhibitedFields(evidence.build, BUILD_FIELDS, 'build', errors);
    for (const field of ['app_version', 'app_build']) {
      if (evidence.build[field] !== null && !isNonEmptyString(evidence.build[field])) {
        errors.push(`build.${field} must be null or non-empty text`);
      }
    }
    for (const field of ['testflight_installed', 'physical_device_verified']) {
      if (typeof evidence.build[field] !== 'boolean') {
        errors.push(`build.${field} must be boolean`);
      }
    }
  }

  if (!isObject(evidence.window)) {
    errors.push('window must be an object');
  } else {
    findProhibitedFields(evidence.window, WINDOW_FIELDS, 'window', errors);
    if (!isNonNegativeInteger(evidence.window.observation_days)) {
      errors.push('window.observation_days must be a non-negative integer');
    }
  }

  if (!isObject(evidence.aggregate)) {
    errors.push('aggregate must be an object');
  } else {
    findProhibitedFields(evidence.aggregate, AGGREGATE_FIELDS, 'aggregate', errors);
    for (const field of AGGREGATE_FIELDS) {
      if (!isNonNegativeInteger(evidence.aggregate[field])) {
        errors.push(`${field} must be a non-negative integer`);
      }
    }
    if (isNonNegativeInteger(evidence.aggregate.saved)
      && isNonNegativeInteger(evidence.aggregate.genuine_starts)
      && evidence.aggregate.saved > evidence.aggregate.genuine_starts) {
      errors.push('saved cannot exceed genuine_starts');
    }
    if (isNonNegativeInteger(evidence.aggregate.saved_under_one_minute)
      && isNonNegativeInteger(evidence.aggregate.saved)
      && evidence.aggregate.saved_under_one_minute > evidence.aggregate.saved) {
      errors.push('saved_under_one_minute cannot exceed saved');
    }
    if (isNonNegativeInteger(evidence.aggregate.abandoned)
      && isNonNegativeInteger(evidence.aggregate.genuine_starts)
      && evidence.aggregate.abandoned > evidence.aggregate.genuine_starts) {
      errors.push('abandoned cannot exceed genuine_starts');
    }
    if (isNonNegativeInteger(evidence.aggregate.replace_saved)
      && isNonNegativeInteger(evidence.aggregate.saved)
      && evidence.aggregate.replace_saved > evidence.aggregate.saved) {
      errors.push('replace_saved cannot exceed saved');
    }
  }

  const discrepancies = evidence.installed_build_reconciliation_discrepancies;
  if (discrepancies !== null && !isNonNegativeInteger(discrepancies)) {
    errors.push('installed_build_reconciliation_discrepancies must be null or a non-negative integer');
  }

  if (!Array.isArray(evidence.household_assessments)) {
    errors.push('household_assessments must be an array');
  } else {
    evidence.household_assessments.forEach((household, index) => {
      const label = `household assessment ${index + 1}`;
      if (!isObject(household)) {
        errors.push(`${label} must be an object`);
        return;
      }
      findProhibitedFields(household, HOUSEHOLD_FIELDS, label, errors);
      for (const field of ['ease_rating', 'trust_rating']) {
        if (!Number.isInteger(household[field]) || household[field] < 1 || household[field] > 5) {
          errors.push(`${label} ${field} must be an integer from 1 to 5`);
        }
      }
      for (const field of ['explains_change', 'routine_bookkeeping']) {
        if (typeof household[field] !== 'boolean') {
          errors.push(`${label} ${field} must be boolean`);
        }
      }
    });
  }

  if (errors.length === 0
    && evidence.current_score === 5
    && !assessMoneyTransactionTruthEvidence(evidence).eligible_for_five) {
    errors.push('current_score 5 requires every score-five evidence gate to pass');
  }

  return errors;
}
