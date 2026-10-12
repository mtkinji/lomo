import {
  externalMcpRunPrompt,
  externalMcpRunSummary,
} from '../externalMcpPresentation';

describe('external MCP conversation presentation', () => {
  test('uses plain fallback copy instead of exposing connector operation ids', () => {
    expect(externalMcpRunPrompt('Open Kwilt Capability'))
      .toBe('Requested in ChatGPT: Open Kwilt Capability.');
  });

  test('reports the device limitation without claiming a mobile review task is ready', () => {
    expect(externalMcpRunSummary('Open Kwilt Capability', {
      status: 'pending_client_action',
      provider: 'device',
      request: { title: 'Open To-dos' },
    })).toBe('Open To-dos requires a device or provider interaction that this connection cannot perform.');
  });
});
