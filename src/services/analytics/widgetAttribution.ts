/**
 * Session-scoped flag tracking whether the current app session originated from
 * a widget tap. Used by `recordShowUpWithCelebration` to fire the
 * `WidgetAssistedShowUp` attribution event.
 *
 * The flag is set when `source=widget` is detected in RootNavigator's
 * `onStateChange`, and consumed (reset) when a show-up is recorded in the
 * same session.
 */

let _openedFromWidget = false;

export function markOpenedFromWidget(): void {
  _openedFromWidget = true;
}

export function consumeOpenedFromWidget(): boolean {
  if (!_openedFromWidget) return false;
  _openedFromWidget = false;
  return true;
}
