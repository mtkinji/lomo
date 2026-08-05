import { readFileSync } from 'node:fs';
import path from 'node:path';

const featureDir = path.resolve(__dirname);
const screenSource = readFileSync(path.join(featureDir, 'UnifiedChatScreen.tsx'), 'utf8');
const contextualPresentationSource = readFileSync(
  path.join(featureDir, 'contextualChatPresentation.ts'),
  'utf8',
);
const navigatorSource = readFileSync(
  path.resolve(featureDir, '../../navigation/RootNavigator.tsx'),
  'utf8',
);

describe('Unified Chat coexistence contract', () => {
  test('opens a widget entry as an unsaved composer and creates a thread only for first send', () => {
    expect(screenSource).toContain("routeParams?.entry === 'fresh'");
    expect(screenSource).toContain('buildFreshWorkbenchSnapshot');
    expect(screenSource).toContain('freshThreadGateRef.current!.ensure()');
    expect(screenSource).toContain('(aggregate && !freshEntry) || freshEntry');
    expect(screenSource).toContain('entry: undefined');
    expect(screenSource).not.toContain('startUnifiedChatVoiceRecording(); // widget');
  });

  test('gives a contextual drawer a compact durable-chat title without restoring modal chrome', () => {
    expect(contextualPresentationSource).toContain("title: 'Chat about to-dos'");
    expect(contextualPresentationSource).toContain("FRESH_LAUNCH_CONTEXT_ID = 'fresh-launch-context'");
    expect(screenSource).toContain("command.type === 'context.remove'");
    expect(screenSource).toContain('styles.drawerTitleRail');
    expect(screenSource).not.toContain('UnifiedChatDrawerHeader');
    expect(screenSource).not.toContain('How can I help with your to-dos?');
  });

  test('resets the fresh composer for each repeated widget launch', () => {
    expect(screenSource).toContain('routeParams?.widgetLaunchId');
    expect(screenSource).toContain('widgetLaunchId]);');
    expect(navigatorSource).toContain('prepareIncomingNavigationUrl');
  });

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

  test('gives the embedded jump-to-latest control native selection feedback', () => {
    expect(screenSource).toContain("command.type === 'timeline.jump.latest'");
    expect(screenSource).toContain("HapticsService.trigger('canvas.selection')");
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

  test('shows pending device actions in a native review sheet and shares the durable decision path', () => {
    expect(screenSource).toContain("item.status === 'pending_client_action'");
    expect(screenSource).toContain('Review in Kwilt');
    expect(screenSource).toContain("decideClientAction(pendingClientAction, 'continue')");
    expect(screenSource).toContain("decideClientAction(pendingClientAction, 'decline')");
    expect(screenSource).toContain('executeClientActionDecision');
    expect(screenSource).toContain('resolveClientActionOpenInstruction');
    expect(screenSource).toContain("item.status === 'pending_client_action' || item.status === 'presenting'");
    expect(screenSource).toContain("AppState.addEventListener('change'");
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

  test('dismisses text entry before starting voice recording', () => {
    const voiceCommandBranch = screenSource.slice(
      screenSource.indexOf("if (command.type === 'voice.toggle')"),
      screenSource.indexOf("if (command.type === 'context.add'"),
    );

    expect(voiceCommandBranch).toContain('Keyboard.dismiss()');
    expect(voiceCommandBranch).toContain(
      "webViewRef.current?.injectJavaScript('document.activeElement?.blur(); true;')",
    );
    expect(voiceCommandBranch.indexOf('Keyboard.dismiss()')).toBeLessThan(
      voiceCommandBranch.indexOf('await startUnifiedChatVoiceRecording'),
    );
  });

  test('inserts transcription at the draft selection captured when recording starts', () => {
    expect(screenSource).toContain('voiceInsertionRef.current = command.prompt === undefined');
    expect(screenSource).toContain('insertUnifiedChatTranscriptAtSelection({');
    expect(screenSource).toContain('insertion: voiceInsertionRef.current');
  });

  test('confirms successful recording start and stop with distinct native haptics', () => {
    expect(screenSource).toContain("HapticsService.trigger('canvas.recording.start')");
    expect(screenSource).toContain("HapticsService.trigger('canvas.recording.stop')");
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

  test('keeps shell thread cleanup reversible for archive and confirmed for delete', () => {
    expect(navigatorSource).toContain('chatRepository.archiveThread');
    expect(navigatorSource).toContain('chatRepository.restoreThread');
    expect(navigatorSource).toContain("actionLabel: 'Undo'");
    expect(navigatorSource).toContain("'Delete chat?'");
    expect(navigatorSource).toContain('chatRepository.deleteThread');
  });

  test('projects background intelligent title updates into the open thread and chat list', () => {
    expect(screenSource).toContain('onThreadTitleUpdated: (updatedThread) =>');
    expect(screenSource).toContain('{ ...current, thread: updatedThread }');
    expect(screenSource).toContain('thread.id === updatedThread.id ? updatedThread : thread');
  });

  test('uses the quiet conversation header and leaves chat creation and selection to the capability menu', () => {
    expect(screenSource).toContain('<PageHeader');
    expect(screenSource).toContain('variant="conversation"');
    expect(screenSource).toContain('onPressMenu={openMenu}');
    expect(screenSource).toContain('menuOpen={menuOpen}');
    expect(screenSource).not.toContain('accessibilityLabel="Open Kwilt menu"');
    expect(screenSource).not.toContain('accessibilityLabel="Open chats"');
    expect(screenSource).not.toContain('accessibilityLabel="New chat"');
    expect(screenSource).not.toContain('setPickerVisible');
    expect(screenSource).toContain('openMenu');
  });

  test('offers a local full-chat copy from the conversation options menu', () => {
    expect(screenSource).toContain("import * as Clipboard from 'expo-clipboard'");
    expect(screenSource).toContain("text: 'Copy chat'");
    expect(screenSource).toContain('buildUnifiedChatTranscript(threadAggregate)');
    expect(screenSource).toContain('Clipboard.setStringAsync');
  });
});
