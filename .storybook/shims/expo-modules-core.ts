export class EventEmitter {
  addListener() {
    return { remove: () => undefined };
  }

  removeAllListeners() {
    return undefined;
  }
}

export class LegacyEventEmitter extends EventEmitter {}
export class NativeModule {}
export class ProxyNativeModule {}
export class SharedObject {}
export class SharedRef {}
export class UnavailabilityError extends Error {
  constructor(moduleName = 'Module', propertyName = 'property') {
    super(`${moduleName}.${propertyName} is unavailable in Storybook web.`);
    this.name = 'UnavailabilityError';
  }
}

export class CodedError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'CodedError';
    this.code = code;
  }
}

export type EventSubscription = {
  remove: () => void;
};

export const PermissionStatus = {
  DENIED: 'denied',
  GRANTED: 'granted',
  UNDETERMINED: 'undetermined',
} as const;

export const PermissionExpiration = {
  NEVER: 'never',
} as const;

export type PermissionHookOptions = Record<string, unknown>;
export type PermissionResponse = {
  canAskAgain: boolean;
  expires: string;
  granted: boolean;
  status: (typeof PermissionStatus)[keyof typeof PermissionStatus];
};

export function requireNativeModule() {
  return {};
}

export function requireNativeViewManager() {
  return {};
}

export function requireOptionalNativeModule() {
  return null;
}

export function registerWebModule() {
  return undefined;
}

export function createPermissionHook() {
  return () => [
    {
      canAskAgain: false,
      expires: PermissionExpiration.NEVER,
      granted: false,
      status: PermissionStatus.UNDETERMINED,
    },
    async () => ({
      canAskAgain: false,
      expires: PermissionExpiration.NEVER,
      granted: false,
      status: PermissionStatus.UNDETERMINED,
    }),
    async () => ({
      canAskAgain: false,
      expires: PermissionExpiration.NEVER,
      granted: false,
      status: PermissionStatus.UNDETERMINED,
    }),
  ] as const;
}

export function isRunningInExpoGo() {
  return false;
}

export const Platform = {
  select: (options: Record<string, unknown>) => options.web ?? options.default,
};

function createUuidV4() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export const uuid = {
  v4: createUuidV4,
  v5: createUuidV4,
};
