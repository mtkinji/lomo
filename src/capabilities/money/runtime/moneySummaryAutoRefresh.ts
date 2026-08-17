export async function refreshStaleMoneySummary(input: {
  reconcileConnectedActivity: () => Promise<void>;
}): Promise<void> {
  await input.reconcileConnectedActivity();
}
