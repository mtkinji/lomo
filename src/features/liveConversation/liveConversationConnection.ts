type DataChannelHandlers = {
  onopen: (() => void) | null;
  onerror: (() => void) | null;
};

export function waitForLiveConversationDataChannel(
  channel: { onopen: unknown; onerror: unknown },
  timeoutMs = 10_000,
): Promise<void> {
  const handlers = channel as DataChannelHandlers;
  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (result: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      handlers.onopen = null;
      handlers.onerror = null;
      result();
    };
    const timeout = setTimeout(() => {
      settle(() => reject(new Error('Conversation connection timed out.')));
    }, timeoutMs);
    handlers.onopen = () => settle(resolve);
    handlers.onerror = () => settle(() => reject(new Error('Conversation connection interrupted.')));
  });
}
