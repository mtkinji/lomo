import { BottomGuide } from '../../ui/BottomGuide';
import { WorkflowFeedbackQuestion } from './WorkflowFeedbackQuestion';
import { useWorkflowFeedbackRuntime } from './workflowFeedbackRuntime';

export function WorkflowFeedbackHost() {
  const runtime = useWorkflowFeedbackRuntime();
  const active = runtime.active?.placement === 'standalone' ? runtime.active : null;
  if (!active) return null;
  return (
    <BottomGuide visible scrim="none" layout="floating" dynamicSizing onClose={runtime.dismiss}>
      <WorkflowFeedbackQuestion
        key={active.instanceId}
        prompt={active.prompt}
        onSubmit={runtime.submit}
        onReason={runtime.submitReason}
        onDismiss={runtime.dismiss}
        onComplete={runtime.complete}
      />
    </BottomGuide>
  );
}
