import type { ChatMode } from './chatRegistry';
import type { LaunchContext } from '../../domain/workflows';
import { AiChatPane } from './AiChatScreen';

export type AgentWorkspaceProps = {
  mode?: ChatMode;
  launchContext: LaunchContext;
  workflowDefinitionId?: string;
  workflowInstanceId?: string;
  onComplete?: (outcome: unknown) => void;
  onDismiss?: () => void;
};

const serializeLaunchContext = (context: LaunchContext): string => {
  const parts: string[] = [`Launch source: ${context.source}.`];

  if (context.intent) {
    parts.push(`Intent: ${context.intent}.`);
  }

  if (context.entityRef) {
    parts.push(
      `Focused entity: ${context.entityRef.type}#${context.entityRef.id}.`,
    );
  }

  return parts.join(' ');
};

export function AgentWorkspace(props: AgentWorkspaceProps) {
  const { mode, launchContext } = props;

  const launchContextText = serializeLaunchContext(launchContext);

  // For now, AgentWorkspace is a light orchestrator that forwards mode and a
  // structured launch context string into the existing AiChatPane. As we
  // introduce real workflow instances and richer card rendering, this
  // component will become the primary host for those concerns.
  return <AiChatPane mode={mode} launchContext={launchContextText} />;
}



