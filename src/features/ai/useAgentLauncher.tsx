import { useCallback, useMemo, useState } from 'react';
import { BottomDrawer, type BottomDrawerSnapPoint } from '../../ui/BottomDrawer';
import { AgentWorkspace } from './AgentWorkspace';
import type { ChatMode } from './workflowRegistry';
import type { LaunchContext, LaunchContextObjectType } from '../../domain/workflows';

type ObjectType = LaunchContextObjectType;

type ScreenContextArgs = {
  objectType: ObjectType;
  objectId: string;
};

type FieldContextArgs = ScreenContextArgs & {
  fieldId: string;
  currentText: string;
  fieldLabel?: string;
};

type AgentLauncherState = {
  mode?: ChatMode;
  launchContext?: LaunchContext;
  workspaceSnapshot?: string;
};

type AgentLauncherOptions = {
  /**
   * Default: ['90%'] (legacy behavior).
   * Some hosts want full-height agent chrome so the chat composer sits at the
   * same vertical rhythm as FTUE and other workflows.
   */
  snapPoints?: BottomDrawerSnapPoint[];
  /**
   * Default: true (legacy behavior) because many hosts render their own header chrome.
   * Set to false to show AgentWorkspace's standard brand header.
   */
  hideBrandHeader?: boolean;
  /**
   * Optional ChatMode to use when launching the agent from the overall screen
   * context (as opposed to a specific field).
   *
   * This is useful for hosts like Activity detail that want the assistant to
   * proactively offer guidance on open.
   */
  screenMode?: ChatMode;
};

const mapObjectTypeToSource = (objectType: ObjectType): LaunchContext['source'] => {
  if (objectType === 'arc') return 'arcDetail';
  if (objectType === 'goal') return 'goalDetail';
  if (objectType === 'activity') return 'activityDetail';
  if (objectType === 'chapter') return 'chapterDetail';
  return 'todayScreen';
};

const mapObjectTypeToEditIntent = (objectType: ObjectType): LaunchContext['intent'] => {
  if (objectType === 'arc') return 'arcEditing';
  if (objectType === 'goal') return 'goalEditing';
  if (objectType === 'activity') return 'activityEditing';
  return 'freeCoach';
};

/**
 * Shared helper for launching AgentWorkspace from object detail canvases or
 * inline field editors.
 *
 * Hosts are responsible for:
 * - Passing any rich workspace snapshot text they want the agent to see.
 * - Rendering the returned `AgentWorkspaceSheet` near the root of the screen.
 *
 * This hook keeps the launch API intentionally small:
 * - `openForScreenContext` focuses the agent on the overall object.
 * - `openForFieldContext` narrows the launch context to a specific field.
 */
export function useAgentLauncher(workspaceSnapshot?: string, options?: AgentLauncherOptions) {
  const [state, setState] = useState<AgentLauncherState>({});
  const [visible, setVisible] = useState(false);

  const close = useCallback(() => {
    setVisible(false);
  }, []);

  const openForScreenContext = useCallback(
    ({ objectType, objectId }: ScreenContextArgs) => {
      const launchContext: LaunchContext = {
        source: mapObjectTypeToSource(objectType),
        intent: mapObjectTypeToEditIntent(objectType),
        objectType,
        objectId,
      };

      setState({
        // Hosts can optionally set a mode to auto-bootstrap a first assistant
        // reply (e.g., activity guidance on Activity detail screens).
        mode: options?.screenMode,
        launchContext,
        workspaceSnapshot,
      });
      setVisible(true);
    },
    [options?.screenMode, workspaceSnapshot],
  );

  const openForFieldContext = useCallback(
    ({ objectType, objectId, fieldId, currentText, fieldLabel }: FieldContextArgs) => {
      const launchContext: LaunchContext = {
        source: mapObjectTypeToSource(objectType),
        intent: 'editField',
        objectType,
        objectId,
        fieldId,
        fieldLabel,
        currentText,
      };

      setState({
        mode: undefined as ChatMode | undefined,
        launchContext,
        workspaceSnapshot,
      });
      setVisible(true);
    },
    [workspaceSnapshot],
  );

  const AgentWorkspaceSheet = useMemo(() => {
    const snapPoints = options?.snapPoints ?? (['90%'] as BottomDrawerSnapPoint[]);
    const hideBrandHeader = options?.hideBrandHeader ?? true;
    return (
      <BottomDrawer
        visible={visible}
        onClose={close}
        snapPoints={snapPoints}
        // Agent chat implements its own keyboard avoidance + focused-input scrolling.
        // Avoid double offsets from BottomDrawer's default keyboard avoidance.
        // See: `docs/keyboard-input-safety-implementation.md`
        keyboardAvoidanceEnabled={false}
      >
        {state.launchContext ? (
          <AgentWorkspace
            mode={state.mode}
            launchContext={state.launchContext}
            workspaceSnapshot={state.workspaceSnapshot}
            // Inline edit flows do not currently attach a structured workflow.
            workflowDefinitionId={undefined}
            resumeDraft={false}
            hideBrandHeader={hideBrandHeader}
            // BottomDrawer pads its sheet by safe-area bottom; AiChatPane should subtract it.
            hostBottomInsetAlreadyApplied
          />
        ) : null}
      </BottomDrawer>
    );
  }, [close, options?.hideBrandHeader, options?.snapPoints, state, visible]);

  return {
    openForScreenContext,
    openForFieldContext,
    AgentWorkspaceSheet,
    isAgentOpen: visible,
  };
}


