export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LoggerEnvironment = {
  isDev: boolean;
  nodeEnv?: string | null;
};

export type LogSink = Record<LogLevel, (...args: unknown[]) => void>;

export type Logger = Record<LogLevel, (...args: unknown[]) => void>;

const consoleSink: LogSink = {
  debug: (...args) => console.debug(...args),
  info: (...args) => console.info(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};

export function resolveLoggerEnvironment(): LoggerEnvironment {
  const nodeEnv = typeof process !== 'undefined' ? process.env?.NODE_ENV ?? null : null;
  const isDev = typeof __DEV__ === 'boolean' ? __DEV__ : nodeEnv !== 'production';
  return { isDev, nodeEnv };
}

export function shouldEmitLog(level: LogLevel, env: LoggerEnvironment): boolean {
  if (level === 'warn' || level === 'error') return true;
  if (env.nodeEnv === 'test') return false;
  return env.isDev;
}

export function createLogger(
  scope: string,
  options: {
    env?: LoggerEnvironment;
    sink?: LogSink;
  } = {},
): Logger {
  const prefix = `[${scope}]`;
  const env = options.env ?? resolveLoggerEnvironment();
  const sink = options.sink ?? consoleSink;

  const emit = (level: LogLevel, args: unknown[]) => {
    if (!shouldEmitLog(level, env)) return;
    sink[level](prefix, ...args);
  };

  return {
    debug: (...args) => emit('debug', args),
    info: (...args) => emit('info', args),
    warn: (...args) => emit('warn', args),
    error: (...args) => emit('error', args),
  };
}
