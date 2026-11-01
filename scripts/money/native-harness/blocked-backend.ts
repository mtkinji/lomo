export const posthogClient = undefined;
export function getSupabaseClient(): never { throw new Error('Backend disabled in native Budget fixture'); }
export const setSupabaseAutoRefreshEnabled = getSupabaseClient;
export const flushSupabaseAuthStorage = getSupabaseClient;
export const resetSupabaseAuthStorage = getSupabaseClient;
