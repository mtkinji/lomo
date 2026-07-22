import { readFileSync } from 'node:fs';
import path from 'node:path';

const featureDir = path.resolve(__dirname);
const screenSource = readFileSync(path.join(featureDir, 'UnifiedChatScreen.tsx'), 'utf8');
const navigatorSource = readFileSync(
  path.resolve(featureDir, '../../navigation/RootNavigator.tsx'),
  'utf8',
);

describe('Unified Chat coexistence contract', () => {
  test('does not import the existing workflow-chat surface', () => {
    expect(screenSource).not.toContain('AiChatScreen');
    expect(screenSource).not.toContain('AgentWorkspace');
    expect(screenSource).not.toContain('AiChatPane');
  });

  test('uses a restricted WebView bridge and no embedded credentials', () => {
    expect(screenSource).toContain('onShouldStartLoadWithRequest');
    expect(screenSource).toContain('sharedCookiesEnabled={false}');
    expect(screenSource).toContain('parseAgentWorkbenchSurfaceMessage');
    expect(screenSource).not.toContain('SUPABASE_ANON_KEY');
    expect(screenSource).not.toContain('Authorization');
  });

  test('handles workbench feedback through the native repository', () => {
    expect(screenSource).toContain("command.type === 'message.feedback'");
    expect(screenSource).toContain('repository.setMessageFeedback');
  });

  test('registers UnifiedChat independently from the compatibility Agent route', () => {
    expect(navigatorSource).toContain('Agent:');
    expect(navigatorSource).toContain('UnifiedChat:');
    expect(navigatorSource).toContain('component={AiChatScreen}');
    expect(navigatorSource).toContain('component={UnifiedChatScreen}');
  });

  test('makes durable Chat the shell entry while preserving the legacy Agent route', () => {
    expect(navigatorSource).toContain("rootNavigationRef.navigate('UnifiedChat')");
    expect(navigatorSource).not.toContain("onOpenAgent={() =>");
    expect(navigatorSource).toContain('name="Agent"');
  });

  test('can reopen the capability shell without replacing the thread picker', () => {
    expect(screenSource).toContain('accessibilityLabel="Open Kwilt menu"');
    expect(screenSource).toContain('accessibilityLabel="Open chats"');
    expect(screenSource).toContain('openMenu');
  });
});
