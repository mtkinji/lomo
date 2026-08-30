export function shouldLoadRequestedChatThread({
  requestedThreadId,
  aggregateThreadId,
  previousRequestedThreadId,
}: {
  requestedThreadId?: string | null;
  aggregateThreadId?: string | null;
  previousRequestedThreadId?: string | null;
}): boolean {
  if (!requestedThreadId || requestedThreadId === aggregateThreadId) return false;
  if (aggregateThreadId) return true;
  return requestedThreadId !== previousRequestedThreadId;
}
