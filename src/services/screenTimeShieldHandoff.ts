export function routeForScreenTimeShieldReason(reason: string | null | undefined): string {
  if (reason?.startsWith('money_')) return 'kwilt://money?source=screen-time';
  if (reason === 'focus_session_active' || reason === 'focus') {
    return 'kwilt://focus?source=screen-time';
  }
  if (reason === 'meaningful_first_locked') {
    return 'kwilt://today?source=screen-time&highlightSuggested=1';
  }
  return 'kwilt://settings/screen-time';
}
