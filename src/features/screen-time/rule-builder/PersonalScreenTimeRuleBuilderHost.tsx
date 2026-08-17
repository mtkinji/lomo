import { PersonalScreenTimeRuleBuilderDrawer } from './PersonalScreenTimeRuleBuilderScreen';
import { usePersonalRuleBuilderDrawerStore } from './usePersonalRuleBuilderDrawerStore';

export function PersonalScreenTimeRuleBuilderHost() {
  const request = usePersonalRuleBuilderDrawerStore((state) => state.request);
  const close = usePersonalRuleBuilderDrawerStore((state) => state.close);

  if (!request) return null;

  return (
    <PersonalScreenTimeRuleBuilderDrawer
      key={request.id}
      params={request.params}
      onClose={close}
    />
  );
}
