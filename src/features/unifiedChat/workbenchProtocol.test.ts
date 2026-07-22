import {
  AGENT_WORKBENCH_PROTOCOL_VERSION,
  parseAgentWorkbenchSurfaceMessage,
} from './workbenchProtocol';

describe('Unified Chat workbench protocol', () => {
  test('accepts the ready signal for protocol v1', () => {
    expect(
      parseAgentWorkbenchSurfaceMessage(
        JSON.stringify({
          protocolVersion: AGENT_WORKBENCH_PROTOCOL_VERSION,
          type: 'surface.ready',
          requestId: 'ready-1',
        }),
      ),
    ).toEqual({ protocolVersion: 1, type: 'surface.ready', requestId: 'ready-1' });
  });

  test.each([
    { type: 'composer.change', prompt: 'New draft' },
    { type: 'run.send', prompt: 'Help me plan this week' },
    { type: 'run.stop', runId: 'run-1' },
    { type: 'run.steer', runId: 'run-1', prompt: 'Focus on family' },
    { type: 'message.feedback', messageId: 'message-1', feedback: 'positive' },
    { type: 'thread.create' },
  ])('accepts supported $type commands', (command) => {
    expect(
      parseAgentWorkbenchSurfaceMessage(
        JSON.stringify({
          protocolVersion: 1,
          type: 'surface.command',
          requestId: 'command-1',
          command,
        }),
      ),
    ).toMatchObject({ type: 'surface.command', command });
  });

  test.each([
    'not-json',
    JSON.stringify({ protocolVersion: 2, type: 'surface.ready', requestId: 'ready-1' }),
    JSON.stringify({ protocolVersion: 1, type: 'surface.ready' }),
    JSON.stringify({
      protocolVersion: 1,
      type: 'surface.command',
      requestId: 'x',
      command: { type: 'run.send' },
    }),
    JSON.stringify({
      protocolVersion: 1,
      type: 'surface.command',
      requestId: 'x',
      command: { type: 'model.change', model: 'expert' },
    }),
  ])('rejects malformed, stale, or unsupported messages', (raw) => {
    expect(parseAgentWorkbenchSurfaceMessage(raw)).toBeNull();
  });
});
