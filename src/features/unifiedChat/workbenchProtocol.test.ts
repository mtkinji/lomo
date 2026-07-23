import {
  AGENT_WORKBENCH_PROTOCOL_VERSION,
  parseAgentWorkbenchSurfaceMessage,
} from './workbenchProtocol';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const sharedV2Fixture = readFileSync(
  path.resolve(__dirname, '../../../protocol-fixtures/kwilt-unified-chat-v2.json'),
  'utf8',
);

describe('Unified Chat workbench protocol', () => {
  test('accepts the shared Kwilt protocol-v2 conformance fixture', () => {
    expect(parseAgentWorkbenchSurfaceMessage(sharedV2Fixture)).toBeNull();
    expect(JSON.parse(sharedV2Fixture)).toMatchObject({
      protocolVersion: 2,
      snapshot: { context: [expect.objectContaining({ version: 2 })], runs: [expect.objectContaining({ canRetry: true })] },
    });
  });
  test('accepts the ready signal for protocol v2', () => {
    expect(
      parseAgentWorkbenchSurfaceMessage(
        JSON.stringify({
          protocolVersion: AGENT_WORKBENCH_PROTOCOL_VERSION,
          type: 'surface.ready',
          requestId: 'ready-1',
        }),
      ),
    ).toEqual({ protocolVersion: 2, type: 'surface.ready', requestId: 'ready-1' });
  });

  test.each([
    { type: 'composer.change', prompt: 'New draft' },
    { type: 'composer.focus.change', focused: true },
    { type: 'composer.focus.change', focused: false },
    { type: 'voice.toggle' },
    { type: 'context.add' },
    { type: 'attachment.pick' },
    { type: 'attachment.remove', attachmentId: 'local-1' },
    { type: 'run.send', prompt: 'Help me plan this week' },
    { type: 'run.stop', runId: 'run-1' },
    { type: 'run.steer', runId: 'run-1', prompt: 'Focus on family' },
    { type: 'run.retry', runId: 'run-1' },
    { type: 'context.remove', contextId: 'context-1', expectedVersion: 2 },
    { type: 'message.feedback', messageId: 'message-1', feedback: 'positive' },
    { type: 'proposal.decide', proposalId: 'proposal-1', action: 'approve', expectedVersion: 1 },
    { type: 'proposal.decide', proposalId: 'proposal-1', action: 'edit', expectedVersion: 2, patch: { scheduledDate: '2026-07-25' } },
    { type: 'receipt.undo', receiptId: 'receipt-1' },
    { type: 'thread.create' },
  ])('accepts supported $type commands', (command) => {
    expect(
      parseAgentWorkbenchSurfaceMessage(
        JSON.stringify({
          protocolVersion: 2,
          type: 'surface.command',
          requestId: 'command-1',
          command,
        }),
      ),
    ).toMatchObject({ type: 'surface.command', command });
  });

  test.each([
    'not-json',
    JSON.stringify({ protocolVersion: 1, type: 'surface.ready', requestId: 'ready-1' }),
    JSON.stringify({ protocolVersion: 2, type: 'surface.ready' }),
    JSON.stringify({
      protocolVersion: 2,
      type: 'surface.command',
      requestId: 'x',
      command: { type: 'run.send' },
    }),
    JSON.stringify({
      protocolVersion: 2,
      type: 'surface.command',
      requestId: 'x',
      command: { type: 'model.change', model: 'expert' },
    }),
    JSON.stringify({
      protocolVersion: 2,
      type: 'surface.command',
      requestId: 'x',
      command: { type: 'proposal.decide', proposalId: 'proposal-1', action: 'approve', expectedVersion: 0 },
    }),
    JSON.stringify({
      protocolVersion: 2,
      type: 'surface.command',
      requestId: 'x',
      command: { type: 'context.remove', contextId: 'context-1' },
    }),
    JSON.stringify({
      protocolVersion: 2,
      type: 'surface.command',
      requestId: 'x',
      command: { type: 'attachment.remove' },
    }),
  ])('rejects malformed, stale, or unsupported messages', (raw) => {
    expect(parseAgentWorkbenchSurfaceMessage(raw)).toBeNull();
  });
});
