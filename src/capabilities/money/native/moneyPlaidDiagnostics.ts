const EVENTS = new Set(['OPEN', 'EXIT', 'ERROR', 'HANDOFF', 'OPEN_OAUTH', 'CLOSE_OAUTH', 'FAIL_OAUTH', 'SUCCESS']);

/** Device diagnostics only. Never forward the SDK metadata object to logs/analytics. */
export function moneyPlaidDiagnostic(event: string, metadata: Record<string, unknown> = {}) {
  if (!EVENTS.has(event)) return null;
  const result: Record<string, string> = { event };
  if (typeof metadata.linkSessionId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(metadata.linkSessionId)) result.linkSessionId = metadata.linkSessionId;
  if (typeof metadata.errorCode === 'string' && /^[A-Z][A-Z0-9_]{1,79}$/.test(metadata.errorCode)) result.errorCode = metadata.errorCode;
  return result;
}

export function logMoneyPlaidDiagnostic(event: string, metadata: object = {}) {
  const diagnostic = moneyPlaidDiagnostic(event, metadata as Record<string, unknown>);
  if (diagnostic) console.info('[money-plaid-link]', diagnostic);
}
