export type SimulatedFamilyScreenTimeReceipt = {
  policyVersion: number;
  acknowledgedAtIso: string;
};

export async function simulateFamilyScreenTimePolicyDelivery(
  policyVersion: number,
): Promise<SimulatedFamilyScreenTimeReceipt> {
  if (!__DEV__ || !Number.isInteger(policyVersion) || policyVersion <= 0) {
    throw new Error('Simulated Screen Time delivery is unavailable');
  }
  await new Promise<void>((resolve) => setTimeout(resolve, 450));
  return {
    policyVersion,
    acknowledgedAtIso: new Date().toISOString(),
  };
}
