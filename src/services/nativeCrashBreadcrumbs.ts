import AsyncStorage from '@react-native-async-storage/async-storage';

export const NATIVE_CRASH_BREADCRUMB_STORAGE_KEY = 'kwilt.nativeCrashBreadcrumbs.v1';

const MAX_BREADCRUMBS = 50;
const MAX_CONTEXT_KEYS = 16;
const MAX_ARRAY_ITEMS = 8;
const MAX_STRING_LENGTH = 240;

export type NativeCrashBreadcrumbPhase = 'before' | 'after' | 'error';

type SanitizedValue = null | boolean | number | string | SanitizedValue[] | { [key: string]: SanitizedValue };

export type NativeCrashBreadcrumb = {
  atIso: string;
  area: string;
  operation: string;
  phase: NativeCrashBreadcrumbPhase;
  context?: Record<string, SanitizedValue>;
  errorMessage?: string;
};

export type NativeCrashBreadcrumbInput = Omit<NativeCrashBreadcrumb, 'atIso' | 'context' | 'errorMessage'> & {
  atIso?: string;
  context?: Record<string, unknown>;
  errorMessage?: unknown;
};

let writeQueue: Promise<void> = Promise.resolve();

export async function loadNativeCrashBreadcrumbs(): Promise<NativeCrashBreadcrumb[]> {
  return readStoredBreadcrumbs();
}

export async function recordNativeCrashBreadcrumb(input: NativeCrashBreadcrumbInput): Promise<void> {
  const entry = normalizeBreadcrumb(input);
  writeQueue = writeQueue
    .catch(() => undefined)
    .then(async () => {
      const existing = await readStoredBreadcrumbs();
      const next = [...existing, entry].slice(-MAX_BREADCRUMBS);
      await AsyncStorage.setItem(NATIVE_CRASH_BREADCRUMB_STORAGE_KEY, JSON.stringify(next));
    })
    .catch(() => undefined);
  return writeQueue;
}

export function recordNativeCrashBreadcrumbBestEffort(input: NativeCrashBreadcrumbInput): void {
  void recordNativeCrashBreadcrumb(input);
}

export function nativeCrashErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`.slice(0, MAX_STRING_LENGTH);
  }
  if (typeof error === 'string') {
    return truncateString(error);
  }
  try {
    const serialized = JSON.stringify(error);
    return truncateString(serialized ?? String(error));
  } catch {
    return String(error).slice(0, MAX_STRING_LENGTH);
  }
}

function normalizeBreadcrumb(input: NativeCrashBreadcrumbInput): NativeCrashBreadcrumb {
  const context = sanitizeContext(input.context);
  const errorMessage = input.errorMessage === undefined ? undefined : nativeCrashErrorMessage(input.errorMessage);
  return {
    atIso: input.atIso || new Date().toISOString(),
    area: truncateString(input.area),
    operation: truncateString(input.operation),
    phase: input.phase,
    ...(context ? { context } : {}),
    ...(errorMessage ? { errorMessage } : {}),
  };
}

async function readStoredBreadcrumbs(): Promise<NativeCrashBreadcrumb[]> {
  try {
    const raw = await AsyncStorage.getItem(NATIVE_CRASH_BREADCRUMB_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStoredBreadcrumb).slice(-MAX_BREADCRUMBS);
  } catch {
    return [];
  }
}

function isStoredBreadcrumb(value: unknown): value is NativeCrashBreadcrumb {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<NativeCrashBreadcrumb>;
  return (
    typeof record.atIso === 'string' &&
    typeof record.area === 'string' &&
    typeof record.operation === 'string' &&
    (record.phase === 'before' || record.phase === 'after' || record.phase === 'error')
  );
}

function sanitizeContext(context: Record<string, unknown> | undefined): Record<string, SanitizedValue> | undefined {
  if (!context) return undefined;
  const sanitized: Record<string, SanitizedValue> = {};
  for (const key of Object.keys(context).slice(0, MAX_CONTEXT_KEYS)) {
    const value = sanitizeValue(context[key], 0);
    if (value !== undefined) {
      sanitized[truncateString(key)] = value;
    }
  }
  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

function sanitizeValue(value: unknown, depth: number): SanitizedValue | undefined {
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'string') return truncateString(value);
  if (typeof value === 'number') return Number.isFinite(value) ? value : String(value);
  if (typeof value === 'bigint') return truncateString(value.toString());
  if (value instanceof Date) return value.toISOString();
  if (depth >= 2) return truncateString(String(value));
  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_ITEMS).map((item) => sanitizeValue(item, depth + 1) ?? null);
  }
  if (typeof value === 'object') {
    const output: Record<string, SanitizedValue> = {};
    for (const key of Object.keys(value as Record<string, unknown>).slice(0, MAX_CONTEXT_KEYS)) {
      const child = sanitizeValue((value as Record<string, unknown>)[key], depth + 1);
      if (child !== undefined) output[truncateString(key)] = child;
    }
    return output;
  }
  if (typeof value === 'undefined' || typeof value === 'function' || typeof value === 'symbol') return undefined;
  return truncateString(String(value));
}

function truncateString(value: string): string {
  return value.length <= MAX_STRING_LENGTH ? value : `${value.slice(0, MAX_STRING_LENGTH - 3)}...`;
}
