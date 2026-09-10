import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { View } from "react-native";
import { SharedLifePostCard } from "../../../src/features/shared-home/SharedLifePostCard";
import { SharedLifeChoreCard } from "../../../src/features/shared-home/SharedLifeChoreCard";
import { DeliveryCard } from "../../../src/features/shared-home/SharedHomeDeliveryCard";
import { homeFeedItemExamples } from "../../../src/features/dev/homeFeedItemExamples";
import { spacing } from "../../../src/theme";
const meta = {
  title: "Home/Four Feed Patterns",
  parameters: {
    docs: {
      description: {
        component:
          "Home-local candidate compositions. Native lab and captured variants remain the runtime review authority; these examples do not grant canonical status.",
      },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const noop = () => {};
function Example({ id }: { id: string }) {
  const item = homeFeedItemExamples.find((e) => e.id === id)!;
  return (
    <View style={{ width: 390, maxWidth: "100%" }}>
      {item.delivery ? (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <DeliveryCard
            delivery={item.delivery}
            now={new Date("2026-09-09T19:00:00Z")}
            onOpen={noop}
            onReport={noop}
          />
        </View>
      ) : item.post?.kind === "chore_update" ? (
        <SharedLifeChoreCard
          post={item.post}
          onReact={noop}
          onOpen={noop}
          onReport={noop}
        />
      ) : item.post ? (
        <SharedLifePostCard
          post={item.post}
          onReact={noop}
          onOpen={noop}
          onSave={noop}
          onAuthor={noop}
          onReport={noop}
          onBookmark={noop}
        />
      ) : null}
    </View>
  );
}
export const Moment: Story = { render: () => <Example id="text-short" /> };
export const Contribution: Story = {
  render: () => <Example id="chore-group" />,
};
export const PersonalMessage: Story = {
  render: () => <Example id="goal-note-available" />,
};
export const InvitationRequest: Story = {
  render: () => <Example id="goal-invitation-pending" />,
};
export const MixedFeed: Story = {
  render: () => (
    <View style={{ gap: spacing["2xl"] }}>
      {[
        "text-short",
        "chore-single",
        "goal-note-available",
        "goal-invitation-pending",
      ].map((id) => (
        <Example key={id} id={id} />
      ))}
    </View>
  ),
};
