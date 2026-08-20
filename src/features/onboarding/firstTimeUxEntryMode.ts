export type FirstTimeUxEntryMode = 'legacy-first-run' | 'capability-path';

export type FirstTimeUxEntryPresentation = {
  initialStep: 'welcome';
  showWorkflowImmediately: boolean;
};

export function resolveFirstTimeUxEntryPresentation(
  entryMode: FirstTimeUxEntryMode,
): FirstTimeUxEntryPresentation {
  return {
    initialStep: 'welcome',
    showWorkflowImmediately: entryMode === 'capability-path',
  };
}
