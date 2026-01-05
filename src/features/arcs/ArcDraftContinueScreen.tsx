import React, { useMemo } from 'react';
import { AppShell } from '../../ui/layout/AppShell';
import { AgentWorkspace } from '../ai/AgentWorkspace';
import { getWorkflowLaunchConfig } from '../ai/workflowRegistry';

export function ArcDraftContinueScreen() {
  const arcCreationWorkflow = useMemo(() => getWorkflowLaunchConfig('arcCreation'), []);

  return (
    <AppShell>
      <AgentWorkspace
        mode={arcCreationWorkflow.mode}
        launchContext={{
          source: 'standaloneCoach',
          intent: 'arcCreation',
        }}
        workflowDefinitionId={arcCreationWorkflow.workflowDefinitionId}
        // Arc draft continuation should start from a clean thread; the draft is injected via ArcDraftContinueFlow.
        resumeDraft={false}
        hideBrandHeader
        hidePromptSuggestions
      />
    </AppShell>
  );
}


