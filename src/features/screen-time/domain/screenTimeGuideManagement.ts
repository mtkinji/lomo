import type { HouseholdSnapshot } from '../../household/data/household';
import type { ScreenTimeRule } from './screenTimeRule';

const SCREEN_TIME_OVERVIEW_URL = 'kwilt://settings/screen-time';

export function routeForScreenTimeGuideManagement(params: {
  rules: ScreenTimeRule[];
  unresolvedCount: number;
  household: HouseholdSnapshot | null;
}): string {
  if (params.unresolvedCount > 0 || params.rules.length === 0 || !params.household?.household) {
    return SCREEN_TIME_OVERVIEW_URL;
  }
  if (params.rules.some((rule) => rule.domain !== 'family' || rule.subject.kind !== 'child')) {
    return SCREEN_TIME_OVERVIEW_URL;
  }
  const subjects = new Set(params.rules.map((rule) => (
    rule.subject.kind === 'child' ? rule.subject.membershipId : ''
  )));
  if (subjects.size !== 1) return SCREEN_TIME_OVERVIEW_URL;
  const childMembershipId = [...subjects][0];
  const child = params.household.members.find((member) => member.id === childMembershipId);
  if (!child) return SCREEN_TIME_OVERVIEW_URL;
  const query = new URLSearchParams({
    householdId: params.household.household.id,
    childDisplayName: child.displayName,
  });
  return `kwilt://settings/household/${encodeURIComponent(childMembershipId)}/screen-time?${query.toString()}`;
}
