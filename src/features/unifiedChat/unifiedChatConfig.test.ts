import { resolveUnifiedChatConfig } from './unifiedChatConfig';

describe('resolveUnifiedChatConfig', () => {
  test('requires both an explicit gate and a valid URL', () => {
    expect(resolveUnifiedChatConfig({ enabled: '1', workbenchUrl: 'https://chat.example.com/embed' }))
      .toEqual({ enabled: true, workbenchUrl: 'https://chat.example.com/embed' });
    expect(resolveUnifiedChatConfig({ enabled: '0', workbenchUrl: 'https://chat.example.com/embed' }))
      .toEqual({ enabled: false, workbenchUrl: null });
  });

  test('rejects non-HTTPS URLs outside development', () => {
    expect(
      resolveUnifiedChatConfig({
        enabled: '1',
        workbenchUrl: 'http://localhost:3000/embed',
        allowInsecureLocalhost: false,
      }),
    ).toEqual({ enabled: false, workbenchUrl: null });
  });

  test('allows localhost HTTP only when explicitly permitted', () => {
    expect(
      resolveUnifiedChatConfig({
        enabled: '1',
        workbenchUrl: 'http://localhost:3000/embed',
        allowInsecureLocalhost: true,
      }),
    ).toEqual({ enabled: true, workbenchUrl: 'http://localhost:3000/embed' });
  });

  test('rejects credentials and fragments in the configured URL', () => {
    expect(resolveUnifiedChatConfig({ enabled: '1', workbenchUrl: 'https://user:pass@example.com/embed' }))
      .toEqual({ enabled: false, workbenchUrl: null });
    expect(resolveUnifiedChatConfig({ enabled: '1', workbenchUrl: 'https://example.com/embed#token' }))
      .toEqual({ enabled: false, workbenchUrl: null });
  });
});
