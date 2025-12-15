import { useCallback, useMemo, useState } from 'react';
import { BottomDrawer } from '../../ui/BottomDrawer';
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
export function useAgentLauncher(workspaceSnapshot?: string) {
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
        // For now, inline editing flows use the generic coach mode without a
        // dedicated workflow. The launch context string carries the detail.
        mode: undefined as ChatMode | undefined,
        launchContext,
        workspaceSnapshot,
      });
      setVisible(true);
    },
    [workspaceSnapshot],
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
    return (
      <BottomDrawer
        visible={visible}
        onClose={close}
        snapPoints={['90%']}
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
            hideBrandHeader
          />
        ) : null}
      </BottomDrawer>
    );
  }, [state, visible, close]);

  return {
    openForScreenContext,
    openForFieldContext,
    AgentWorkspaceSheet,
    isAgentOpen: visible,
  };
}


