export const FREE_GENERATIVE_CREDITS_PER_MONTH = 25;
export const PRO_GENERATIVE_CREDITS_PER_MONTH = 1000;
export const PRO_TOOLS_TRIAL_GENERATIVE_CREDITS_TOTAL = 200;

export type GenerativeTier = 'free' | 'pro' | 'pro_tools_trial';

export function getMonthlyCreditLimit(tier: GenerativeTier): number {
  return tier === 'pro' ? PRO_GENERATIVE_CREDITS_PER_MONTH : FREE_GENERATIVE_CREDITS_PER_MONTH;
}

export function getMonthKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}


