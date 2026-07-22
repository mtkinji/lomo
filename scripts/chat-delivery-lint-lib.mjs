const EVIDENCE_FIELDS = ['code', 'tests', 'runtime_evidence'];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isNonEmptyText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validatePath(stepId, field, candidate, io, errors) {
  if (!isNonEmptyText(candidate)) {
    errors.push(`step ${stepId}: ${field} entries must be non-empty paths`);
    return;
  }
  if (candidate.startsWith('/') || candidate.split('/').includes('..')) {
    errors.push(`step ${stepId}: ${field} path must be repository-relative: ${candidate}`);
    return;
  }
  if (!io.exists(candidate)) {
    errors.push(`step ${stepId}: ${field} path does not exist: ${candidate}`);
  }
}

export function validateChatDeliveryLedger(ledger, io) {
  const errors = [];
  const exists = typeof io?.exists === 'function' ? io.exists : () => false;
  const checkedIo = { exists };
  const steps = Array.isArray(ledger?.steps) ? ledger.steps : [];

  if (ledger?.id !== 'unified-chat') {
    errors.push('delivery ledger id must be `unified-chat`');
  }
  if (!isNonEmptyText(ledger?.brief)) {
    errors.push('delivery ledger must reference its accepted brief');
  } else {
    validatePath('ledger', 'accepted brief', ledger.brief, checkedIo, errors);
  }
  if (!isNonEmptyText(ledger?.job_flow)) {
    errors.push('delivery ledger must reference its job flow');
  }
  if (!isNonEmptyText(ledger?.job_flow_source)) {
    errors.push('delivery ledger must reference its job flow source');
  } else {
    validatePath('ledger', 'job flow source', ledger.job_flow_source, checkedIo, errors);
  }
  if (steps.length !== 10) {
    errors.push('unified Chat ledger must contain exactly ten steps');
  }

  const ids = steps.map((step) => step?.id);
  const expectedIds = Array.from({ length: 10 }, (_, index) => index + 1);
  const uniqueSortedIds = [...new Set(ids)].sort((left, right) => left - right);
  if (
    uniqueSortedIds.length !== expectedIds.length ||
    uniqueSortedIds.some((id, index) => id !== expectedIds[index])
  ) {
    errors.push('step ids must be the unique integers 1 through 10');
  }

  for (const step of steps) {
    const stepId = step?.id ?? '?';
    if (!isNonEmptyText(step?.name)) {
      errors.push(`step ${stepId}: name is required`);
    }
    if (!Number.isInteger(step?.score) || step.score < 1 || step.score > 5) {
      errors.push(`step ${stepId}: score must be an integer from 1 to 5`);
      continue;
    }

    if (step.score < 5 && !isNonEmptyText(step.gap)) {
      errors.push(`step ${stepId}: scores below 5 must name the remaining gap`);
    }

    for (const field of EVIDENCE_FIELDS) {
      const entries = asArray(step[field]);
      if (step.score === 5 && entries.length === 0) {
        errors.push(`step ${stepId}: score 5 requires ${field.replace('_', ' ')} evidence`);
      }
      for (const candidate of entries) {
        validatePath(stepId, field, candidate, checkedIo, errors);
      }
    }

    if (step.score === 5) {
      if (!isNonEmptyText(step.proof?.simulator)) {
        errors.push(`step ${stepId}: score 5 requires simulator proof`);
      }
      if (!isNonEmptyText(step.proof?.physical_device)) {
        errors.push(`step ${stepId}: score 5 requires physical-device proof`);
      }
    }

    for (const [field, label] of [
      ['simulator', 'simulator proof'],
      ['physical_device', 'physical_device proof'],
    ]) {
      const candidate = step.proof?.[field];
      if (isNonEmptyText(candidate)) {
        validatePath(stepId, label, candidate, checkedIo, errors);
      }
    }
  }

  return errors;
}
