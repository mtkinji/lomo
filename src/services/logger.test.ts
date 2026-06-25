import { createLogger, shouldEmitLog, type LogSink } from './logger';

function buildSink(): LogSink & {
  debug: jest.Mock;
  info: jest.Mock;
  warn: jest.Mock;
  error: jest.Mock;
} {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

describe('logger', () => {
  it('suppresses debug and info logs in tests and production', () => {
    expect(shouldEmitLog('debug', { isDev: true, nodeEnv: 'test' })).toBe(false);
    expect(shouldEmitLog('info', { isDev: true, nodeEnv: 'test' })).toBe(false);
    expect(shouldEmitLog('debug', { isDev: false, nodeEnv: 'production' })).toBe(false);
    expect(shouldEmitLog('info', { isDev: false, nodeEnv: 'production' })).toBe(false);
  });

  it('allows debug and info logs in development outside tests', () => {
    expect(shouldEmitLog('debug', { isDev: true, nodeEnv: 'development' })).toBe(true);
    expect(shouldEmitLog('info', { isDev: true, nodeEnv: 'development' })).toBe(true);
  });

  it('always allows warning and error logs', () => {
    expect(shouldEmitLog('warn', { isDev: false, nodeEnv: 'production' })).toBe(true);
    expect(shouldEmitLog('error', { isDev: false, nodeEnv: 'test' })).toBe(true);
  });

  it('prefixes scoped log messages and uses the requested sink method', () => {
    const sink = buildSink();
    const logger = createLogger('domainSync', {
      env: { isDev: true, nodeEnv: 'development' },
      sink,
    });

    logger.info('pull complete', { activities: 3 });
    logger.warn('retrying');

    expect(sink.info).toHaveBeenCalledWith('[domainSync]', 'pull complete', { activities: 3 });
    expect(sink.warn).toHaveBeenCalledWith('[domainSync]', 'retrying');
    expect(sink.debug).not.toHaveBeenCalled();
    expect(sink.error).not.toHaveBeenCalled();
  });

  it('does not call the sink for suppressed logs', () => {
    const sink = buildSink();
    const logger = createLogger('domainSync', {
      env: { isDev: true, nodeEnv: 'test' },
      sink,
    });

    logger.info('hidden');

    expect(sink.info).not.toHaveBeenCalled();
  });
});
