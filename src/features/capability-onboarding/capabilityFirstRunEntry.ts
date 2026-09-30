type FirstRunFacts = {
  hydrated: boolean;
  signedIn: boolean;
  returningUser: boolean | null;
  completed: boolean;
  returningPermissions: boolean;
  goalFlowActive: boolean;
  universalState: 'reel' | 'chosen' | 'explored';
  selectedPathId: string | null;
};

export function resolveCapabilityFirstRunEntry(facts: FirstRunFacts): 'none' | 'choose-path' | 'resume-goal' {
  if (!facts.hydrated || !facts.signedIn || facts.returningUser !== false
    || facts.completed || facts.returningPermissions || facts.goalFlowActive) return 'none';
  if (facts.universalState === 'reel') return 'choose-path';
  return facts.universalState === 'chosen' && facts.selectedPathId === 'make-progress' ? 'resume-goal' : 'none';
}
