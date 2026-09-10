import type { ReactNode } from "react";
import { View } from "react-native";
import { Button, Text, VStack } from "../../ui/primitives";
import { colors, spacing } from "../../theme";
import {
  FeedItemActions,
  FeedItemMetadata,
  FeedItemSurface,
  feedStyles,
} from "./FeedItemParts";
import { deliveryOutcome, deliveryPattern } from "./feedItemPresentation";
import type { SharedHomeDelivery } from "./sharedHomeTypes";
type Props = {
  delivery: SharedHomeDelivery;
  now: Date;
  onOpen: () => void;
  onReport?: () => void;
  highlighted?: boolean;
};
function SourceMetadata({ delivery: d, now }: Props) {
  return (
    <FeedItemMetadata
      name={d.actorDisplayName ?? "Someone in Kwilt"}
      context="Shared with you"
      createdAt={d.createdAt}
      now={now.getTime()}
    />
  );
}
function SourceActions({
  delivery,
  onReport,
  children,
}: Props & { children?: ReactNode }) {
  return (
    <FeedItemActions
      optionsLabel={`Options for ${delivery.actorDisplayName ?? "this person"}'s item`}
      options={onReport ? [{ label: "Report", onPress: onReport }] : []}
    >
      {children}
    </FeedItemActions>
  );
}
/** Words lead; opening the existing source is a quiet continuation, not a new DM action. */
export function PersonalMessageItem(props: Props) {
  const outcome = deliveryOutcome(props.delivery);
  return (
    <VStack space="sm">
      <FeedItemSurface treatment="message">
        <VStack space="md">
          <VStack space="sm">
            <Text style={feedStyles.meta}>{props.delivery.title}</Text>
            <Text style={feedStyles.quotation}>{props.delivery.body}</Text>
          </VStack>
          {outcome ? <Text style={feedStyles.meta}>{outcome}</Text> : null}
        </VStack>
      </FeedItemSurface>
      <SourceActions {...props}>
        {!outcome ? (
          <View style={{ alignItems: "flex-start" }}>
            <Button
              size="sm"
              variant="ghost"
              onPress={props.onOpen}
              accessibilityLabel={`Open Goal from ${props.delivery.actorDisplayName ?? "your family"}`}
            >
              Open Goal
            </Button>
          </View>
        ) : null}
      </SourceActions>
      <SourceMetadata {...props} />
    </VStack>
  );
}
/** Purpose and participation lead. State controls availability, not visual urgency. */
export function InvitationRequestItem(props: Props) {
  const d = props.delivery,
    outcome = deliveryOutcome(d);
  const action =
    d.eventKind === "goal_invitation"
      ? "Review invitation"
      : d.eventKind === "meal_choice_round"
        ? "Choose a meal"
        : "Take your turn";
  return (
    <VStack space="sm">
      <FeedItemSurface treatment="invitation">
        <VStack space="md">
          <VStack space="sm">
            <Text style={feedStyles.name}>{d.title}</Text>
            <Text style={feedStyles.body}>{d.body}</Text>
          </VStack>
          {outcome ? <Text style={feedStyles.meta}>{outcome}</Text> : null}
        </VStack>
      </FeedItemSurface>
      <SourceActions {...props}>
        {!outcome ? (
          <View style={{ alignItems: "flex-start" }}>
            <Button
              size="sm"
              variant="outline"
              onPress={props.onOpen}
              accessibilityLabel={`${action} from ${d.actorDisplayName ?? "your family"}`}
            >
              {action}
            </Button>
          </View>
        ) : null}
      </SourceActions>
      <SourceMetadata {...props} />
    </VStack>
  );
}
/** Compatibility adapter preserves source ownership/routing and existing callers. */
export function DeliveryCard(props: Props) {
  return (
    <View
      testID={`sharedHome.item.${props.delivery.id}`}
      style={
        props.highlighted
          ? {
              borderLeftWidth: 2,
              borderLeftColor: colors.textPrimary,
              paddingLeft: spacing.sm,
            }
          : undefined
      }
    >
      {deliveryPattern(props.delivery.eventKind) === "message" ? (
        <PersonalMessageItem {...props} />
      ) : (
        <InvitationRequestItem {...props} />
      )}
    </View>
  );
}
