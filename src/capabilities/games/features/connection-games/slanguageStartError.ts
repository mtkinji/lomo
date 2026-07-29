export function getSlanguageStartError(error: unknown) {
  const details = typeof error === 'object' && error !== null
    ? [
        'message' in error ? error.message : null,
        'code' in error ? error.code : null,
        'details' in error ? error.details : null,
        'hint' in error ? error.hint : null,
      ].filter((value): value is string => typeof value === 'string').join(' ')
    : error instanceof Error ? error.message : String(error ?? '');
  return details.includes('anonymous_room_limit')
    ? 'Finish or close your open table first.'
    : details.includes('not configured in this build')
      ? 'Remote play isn’t available in this preview build.'
    : 'Unable to open Slanguage right now.';
}
