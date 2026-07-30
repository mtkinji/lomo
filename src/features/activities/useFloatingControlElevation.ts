import React from 'react';

export const FLOATING_CONTROL_SETTLE_DELAY_MS = 600;

export function useFloatingControlElevation() {
  const [isProminent, setIsProminent] = React.useState(true);
  const settleTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSettleTimer = React.useCallback(() => {
    if (settleTimerRef.current == null) return;
    clearTimeout(settleTimerRef.current);
    settleTimerRef.current = null;
  }, []);

  const markScrolling = React.useCallback(() => {
    clearSettleTimer();
    setIsProminent(false);
  }, [clearSettleTimer]);

  const markSettled = React.useCallback(() => {
    clearSettleTimer();
    settleTimerRef.current = setTimeout(() => {
      settleTimerRef.current = null;
      setIsProminent(true);
    }, FLOATING_CONTROL_SETTLE_DELAY_MS);
  }, [clearSettleTimer]);

  const reset = React.useCallback(() => {
    clearSettleTimer();
    setIsProminent(true);
  }, [clearSettleTimer]);

  React.useEffect(() => clearSettleTimer, [clearSettleTimer]);

  return {
    isProminent,
    markScrolling,
    markSettled,
    reset,
  };
}
