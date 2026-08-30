import {
  externalMcpRunPrompt,
  externalMcpRunSummary,
} from '../externalMcpPresentation';

describe('external MCP conversation presentation', () => {
  test('uses plain fallback copy instead of exposing connector operation ids', () => {
    expect(externalMcpRunPrompt('Open Kwilt Capability'))
      .toBe('Requested in ChatGPT: Open Kwilt Capability.');
  });

  test('uses the staged action title for a device handoff summary', () => {
    expect(externalMcpRunSummary('Open Kwilt Capability', {
      status: 'pending_client_action',
      provider: 'device',
      request: { title: 'Open To-dos' },
    })).toBe('Open To-dos is ready in Kwilt.');
  });
});
