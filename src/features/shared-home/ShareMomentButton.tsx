import { Button } from "../../ui/Button";
import { Icon } from "../../ui/Icon";
import { colors } from "../../theme";
import { useAppStore } from "../../store/useAppStore";
import { useHouseholdModeStore } from "../household/sharedDevice/useHouseholdModeStore";
import { shareHomeMoment } from "./shareHomeMoment";
export function ShareMomentButton({ postId }: { postId: string }) {
  const userId = useAppStore((s) => s.authIdentity?.userId);
  const session = useHouseholdModeStore((s) => s.session);
  return (
    <Button
      variant="ghost"
      size="icon"
      iconButtonSize={44}
      accessibilityLabel="Share this moment"
      disabled={!userId || Boolean(session)}
      onPress={() => {
        if (userId) void shareHomeMoment(postId, userId);
      }}
    >
      <Icon name="share" size={20} color={colors.textPrimary} />
    </Button>
  );
}
