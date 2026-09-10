import { useState } from "react";
import { BottomDrawer, BottomDrawerScrollView } from "../../ui/BottomDrawer";
import { BottomDrawerHeader } from "../../ui/layout/BottomDrawerHeader";
import { Button, Text, VStack } from "../../ui/primitives";
import { spacing } from "../../theme";
import { SharedLifeChoreCard } from "../shared-home/SharedLifeChoreCard";
import { SharedLifeConversation } from "../shared-home/SharedLifeConversation";
import type { HomePost } from "../shared-home/sharedLifeTypes";
import type { SharedLifeRepository } from "../shared-home/sharedLifeRepository";
const sample: HomePost = {
  id: "chore-preview",
  kind: "chore_update",
  authorId: null,
  authorName: "Grant",
  text: "",
  audience: "household",
  householdId: "preview",
  householdName: "Our household",
  attachment: null,
  media: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  reactionCount: 0,
  replyCount: 0,
  myReaction: null,
  choreUpdate: {
    items: [
      {
        occurrenceId: "recycling",
        title: "Take out the recycling",
        state: "completed",
        scheduledDate: null,
        reportedEarlier: false,
      },
      {
        occurrenceId: "dishes",
        title: "Clear the table and load the dishwasher",
        state: "waiting_approval",
        scheduledDate: null,
        reportedEarlier: false,
      },
      {
        occurrenceId: "plants",
        title: "Water the porch plants",
        state: "completed",
        scheduledDate: null,
        reportedEarlier: false,
      },
    ],
  },
};
export function HomeChorePreview({ onClose }: { onClose: () => void }) {
  const [post, setPost] = useState(sample);
  const [conversation, setConversation] = useState(false);
  const [repository] = useState(() => {
    const replies: {
      id: string;
      authorId: string;
      authorName: string;
      text: string;
      createdAt: string;
    }[] = [];
    return {
      conversation: async () => ({ post: sample, replies: [...replies] }),
      command: async (_op: string, args: { id: string; text?: string }) => {
        if (_op === "reply")
          replies.push({
            id: args.id,
            authorId: "preview",
            authorName: "You",
            text: args.text ?? "",
            createdAt: new Date().toISOString(),
          });
        if (_op === "delete_reply") {
          const i = replies.findIndex((r) => r.id === args.id);
          if (i >= 0) replies.splice(i, 1);
        }
        return {};
      },
    } as unknown as SharedLifeRepository;
  });
  return conversation ? (
    <SharedLifeConversation
      post={post}
      userId="preview"
      repository={repository}
      onChanged={() => undefined}
      onReport={() => undefined}
      onClose={() => setConversation(false)}
    />
  ) : (
    <BottomDrawer visible onClose={onClose} snapPoints={["85%"]}>
      <BottomDrawerHeader
        variant="withClose"
        title="Household update preview"
        onClose={onClose}
      />
      <BottomDrawerScrollView contentContainerStyle={{ padding: spacing.md }}>
        <VStack space="md">
          <Text tone="secondary">Fictional chores · Nothing is posted</Text>
          <SharedLifeChoreCard
            post={post}
            onReact={() =>
              setPost((p) => ({
                ...p,
                myReaction: p.myReaction ? null : "heart",
                reactionCount: p.myReaction ? 0 : 1,
              }))
            }
            onOpen={() => setConversation(true)}
            onReport={() => undefined}
          />
          <Button
            variant="outline"
            onPress={() =>
              setPost((p) => ({
                ...p,
                choreUpdate: { items: sample.choreUpdate!.items.slice(0, 1) },
              }))
            }
          >
            Preview one chore
          </Button>
          <Button variant="outline" onPress={() => setPost(sample)}>
            Preview grouped chores
          </Button>
        </VStack>
      </BottomDrawerScrollView>
    </BottomDrawer>
  );
}
