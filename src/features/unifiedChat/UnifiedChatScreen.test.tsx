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

  test('suppresses the WKWebView form-navigation accessory above the iOS keyboard', () => {
    expect(screenSource).toContain('hideKeyboardAccessoryView');
  });

  test('reloads the embedded surface when a transient load error is tapped', () => {
    expect(screenSource).toContain('const retrySurface = useCallback');
    expect(screenSource).toContain('webViewRef.current?.reload()');
    expect(screenSource).toContain('surfaceLoadFailed ? retrySurface');
  });

  test('handles workbench feedback through the native repository', () => {
    expect(screenSource).toContain("command.type === 'message.feedback'");
    expect(screenSource).toContain('repository.setMessageFeedback');
    expect(screenSource).toContain('command.reason');
  });

  test('uses subtle paired haptics when the composer engages and disengages', () => {
    expect(screenSource).toContain("command.type === 'composer.focus.change'");
    expect(screenSource).toContain("command.focused ? 'canvas.toggle.on' : 'canvas.toggle.off'");
  });

  test('dismisses the embedded keyboard before revealing the navigation menu', () => {
    expect(screenSource).toContain('Keyboard.dismiss()');
    expect(screenSource).toContain('webViewRef.current?.injectJavaScript');
    expect(screenSource).toContain('document.activeElement?.blur()');
  });

  test('deduplicates commands and only opens capability objects evidenced in the active thread', () => {
    expect(screenSource).toContain('handledRequestIds.current.has(message.requestId)');
    expect(screenSource).toContain("command.type === 'object.open'");
    expect(screenSource).toContain('resolveUnifiedChatObjectReturn');
    expect(screenSource).toContain('isInThread');
  });

  test('attaches launch context durably and removes only the active version', () => {
    expect(screenSource).toContain('loadUnifiedChatLaunchAttachment(launchContext)');
    expect(screenSource).toContain('repository.attachContext');
    expect(screenSource).toContain("source: 'launch'");
    expect(screenSource).toContain("command.type === 'context.remove'");
    expect(screenSource).toContain('context.version !== command.expectedVersion');
    expect(screenSource).toContain('repository.removeContext(context.id, context.version)');
  });

  test('lets the user add explicit Kwilt context through the native picker', () => {
    expect(screenSource).toContain("command.type === 'context.add'");
    expect(screenSource).toContain('loadUnifiedChatAttachableContexts()');
    expect(screenSource).toContain('setContextPickerVisible(true)');
    expect(screenSource).toContain("source: 'user_added'");
    expect(screenSource).toContain('Choose what your next message can use.');
  });

  test('validates and executes proposal decisions through the capability-owned boundary', () => {
    expect(screenSource).toContain("command.type === 'proposal.decide'");
    expect(screenSource).toContain('proposal.version !== command.expectedVersion');
    expect(screenSource).toContain('parseActivityMutationPatch(command.patch)');
    expect(screenSource).toContain('executeProposalDecision');
    expect(screenSource).toContain('activityStoreBoundary');
    expect(screenSource).toContain('recoverActivityMutations');
    expect(screenSource).toContain('loadThreadWithRecovery');
  });

  test('auto-applies an explicit reversible To-do create before projecting the result', () => {
    expect(screenSource).toContain('findAutoApplyCreateProposal(refreshedAggregate, completedRunId)');
    expect(screenSource).toContain("action: 'approve'");
    expect(screenSource).toContain('enrichCreatedActivityLikeQuickAdd');
    expect(screenSource).toContain('resolveChatQuickAddAiActions');
    expect(screenSource).toContain('refreshCreatedActivityReceipt');
    expect(screenSource).toContain('refreshedAggregate = await loadThreadWithRecovery');
  });

  test('executes undo only from an active-thread durable receipt', () => {
    expect(screenSource).toContain("command.type === 'receipt.undo'");
    expect(screenSource).toContain('item.id === command.receiptId');
    expect(screenSource).toContain('receipt.proposalId');
    expect(screenSource).toContain('receipt.canUndo');
    expect(screenSource).toContain('executeReceiptUndo');
  });

  test('opens an applied To-do row with the exact Chat return thread', () => {
    expect(screenSource).toContain("command.object.type === 'activity'");
    expect(screenSource).toContain('returnToUnifiedChatThreadId: aggregate.thread.id');
  });

  test('binds stop to the exact active native request', () => {
    expect(screenSource).toContain("command.type === 'run.stop'");
    expect(screenSource).toContain('activeTurn.current?.runId === command.runId');
    expect(screenSource).toContain('activeTurn.current.controller.abort()');
    expect(screenSource).toContain('signal: controller.signal');
  });

  test('keeps microphone recording and authenticated transcription in the native host', () => {
    expect(screenSource).toContain("command.type === 'voice.toggle'");
    expect(screenSource).toContain('startUnifiedChatVoiceRecording');
    expect(screenSource).toContain('stopAndTranscribeUnifiedChatVoice');
    expect(screenSource).toContain("state: 'transcribing'");
  });

  test('steers the exact active run into a durable resumed segment and retries without duplicating input', () => {
    expect(screenSource).toContain("command.type === 'run.steer'");
    expect(screenSource).toContain("disposition = { type: 'steer'");
    expect(screenSource).toContain('abortDisposition: () =>');
    expect(screenSource).toContain("command.type === 'run.retry'");
    expect(screenSource).toContain('retryRunId');
  });

  test('registers UnifiedChat independently from the compatibility Agent route', () => {
    expect(navigatorSource).toContain('Agent:');
    expect(navigatorSource).toContain('UnifiedChat:');
    expect(navigatorSource).toContain('component={AiChatScreen}');
    expect(navigatorSource).toContain('component={UnifiedChatScreen}');
  });

  test('makes durable Chat the shell entry while preserving the legacy Agent route', () => {
    expect(navigatorSource).toContain("rootNavigationRef.navigate('UnifiedChat', launchContext");
    expect(navigatorSource).toContain('deriveCapabilityAgentContext(navigationState)');
    expect(navigatorSource).toContain('resolveCapabilityAgentReturn(context)');
    expect(navigatorSource).not.toContain("onOpenAgent={() =>");
    expect(navigatorSource).toContain('name="Agent"');
  });

  test('hydrates the shared scrollable menu from durable threads and owns creation there', () => {
    expect(navigatorSource).toContain('chatRepository.listThreads()');
    expect(navigatorSource).toContain('chats={chatThreads}');
    expect(navigatorSource).toContain('onSelectChat={openChatThread}');
    expect(navigatorSource).toContain('onCreateChat={() => void createChatThread()}');
  });

  test('uses the standard page header and leaves chat creation and selection to the capability menu', () => {
    expect(screenSource).toContain('<PageHeader');
    expect(screenSource).toContain('onPressMenu={openMenu}');
    expect(screenSource).toContain('menuOpen={menuOpen}');
    expect(screenSource).not.toContain('accessibilityLabel="Open Kwilt menu"');
    expect(screenSource).not.toContain('accessibilityLabel="Open chats"');
    expect(screenSource).not.toContain('accessibilityLabel="New chat"');
    expect(screenSource).not.toContain('setPickerVisible');
    expect(screenSource).toContain('openMenu');
  });
});
