export class EventEmitter {}
export class NativeModule {}
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

export function requireNativeModule() {
  return {};
}

export function requireOptionalNativeModule() {
  return null;
}

export function registerWebModule() {
  return undefined;
}

export function isRunningInExpoGo() {
  return false;
}

export const Platform = {
  select: (options: Record<string, unknown>) => options.web ?? options.default,
};
