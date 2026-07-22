import Constants from 'expo-constants';

export type UnifiedChatConfig = {
  enabled: boolean;
  workbenchUrl: string | null;
};

export function resolveUnifiedChatConfig(input: {
  enabled?: unknown;
  workbenchUrl?: unknown;
  allowInsecureLocalhost?: boolean;
}): UnifiedChatConfig {
  const enabled = input.enabled === true || input.enabled === '1' || input.enabled === 'true';
  if (!enabled || typeof input.workbenchUrl !== 'string') {
    return { enabled: false, workbenchUrl: null };
  }
  try {
    const url = new URL(input.workbenchUrl.trim());
    const localHttp =
      input.allowInsecureLocalhost === true &&
      url.protocol === 'http:' &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
    if ((url.protocol !== 'https:' && !localHttp) || url.username || url.password || url.hash) {
      return { enabled: false, workbenchUrl: null };
    }
    return { enabled: true, workbenchUrl: url.toString().replace(/\/$/, '') };
  } catch {
    return { enabled: false, workbenchUrl: null };
  }
}

export function getUnifiedChatConfig(): UnifiedChatConfig {
  const extra = Constants.expoConfig?.extra as
    | { unifiedChatEnabled?: unknown; unifiedChatWorkbenchUrl?: unknown }
    | undefined;
  return resolveUnifiedChatConfig({
    enabled: extra?.unifiedChatEnabled,
    workbenchUrl: extra?.unifiedChatWorkbenchUrl,
    allowInsecureLocalhost: __DEV__,
  });
}
