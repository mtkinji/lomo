import { CapabilityOnboardingHost } from './CapabilityOnboardingHost';
import { CAPABILITY_ONBOARDING_PATHS, type CapabilityOnboardingContract } from './capabilityOnboardingContracts';
import { buildCapabilityOnboardingNavigationTarget } from './capabilityOnboardingNavigationTarget';
import { navigateWhenReady } from '../../navigation/rootNavigationRef';
import { useFirstTimeUxStore } from '../../store/useFirstTimeUxStore';
import { useAppStore } from '../../store/useAppStore';

const FIRST_RUN_PATHS: CapabilityOnboardingContract[] = CAPABILITY_ONBOARDING_PATHS.filter(path =>
  ['budget-app-controls', 'make-meals-easier', 'make-progress', 'screen-time-controls'].includes(path.id));

/** Post-auth first-run integration. This does not introduce guest persistence. */
export function FirstRunCapabilityHost({ visible, userId }: { visible: boolean; userId: string }) {
  const finishIntroduction = () => useAppStore.getState().setHasCompletedFirstTimeOnboarding(true);
  const startPath = (path: CapabilityOnboardingContract) => {
    const target = buildCapabilityOnboardingNavigationTarget(path.handoff);
    if (target?.root === 'FirstTimeUx') {
      useFirstTimeUxStore.getState().startFlow();
      return;
    }
    if (!target) return;
    // This flag completes the universal introduction, not the selected job.
    // Capability activation remains tied to its separate real receipt.
    finishIntroduction();
    if (target.root === 'Chores') navigateWhenReady(target.root);
    else navigateWhenReady(target.root, target.params);
  };
  return <CapabilityOnboardingHost visible={visible} userId={userId}
    surface="production" presentation="editorial" paths={FIRST_RUN_PATHS}
    onStartPath={startPath} onExploreKwilt={finishIntroduction} />;
}
