import { fireEvent, render } from "@testing-library/react-native";
import { SharedLifeChoreCard, HomeChoreDetails } from "./SharedLifeChoreCard";
import type { HomePost } from "./sharedLifeTypes";
const post: HomePost = {
  id: "post",
  authorId: null,
  authorName: "Grant",
  text: "",
  kind: "chore_update",
  audience: "household",
  householdId: "home",
  householdName: "Our household",
  attachment: null,
  media: [],
  createdAt: "2026-09-09T13:00:00Z",
  updatedAt: "2026-09-09T13:00:00Z",
  reactionCount: 0,
  replyCount: 0,
  myReaction: null,
  choreUpdate: {
    items: [
      {
        occurrenceId: "one",
        title: "Recycling",
        state: "completed",
        scheduledDate: null,
        reportedEarlier: false,
      },
      {
        occurrenceId: "two",
        title: "Dishes",
        state: "waiting_approval",
        scheduledDate: null,
        reportedEarlier: false,
      },
    ],
  },
};
it("groups contribution, exposes pending status, expands detail and offers thanks/comments", () => {
  const onReact = jest.fn();
  const onOpen = jest.fn();
  const view = render(
    <SharedLifeChoreCard
      post={post}
      onReact={onReact}
      onOpen={onOpen}
      onReport={jest.fn()}
    />,
  );
  expect(
    view.getByText("Grant completed 1 · 1 awaiting approval"),
  ).toBeTruthy();
  expect(view.getByText("Recycling")).toBeTruthy();
  expect(view.getByText("Recycling")).toBeTruthy();
  expect(view.getByText("Dishes")).toBeTruthy();
  fireEvent.press(view.getByLabelText("Thank Grant"));
  expect(onReact).toHaveBeenCalledTimes(1);
  fireEvent.press(view.getByLabelText("Comment"));
  expect(onOpen).toHaveBeenCalledTimes(1);
  expect(view.queryByText("Edit words")).toBeNull();
});
it("single earlier-day report shows honest timing and keeps its title visible", () => {
  const single = {
    ...post,
    choreUpdate: {
      items: [
        {
          ...post.choreUpdate!.items[1],
          scheduledDate: "2026-09-07",
          reportedEarlier: true,
        },
      ],
    },
  };
  const view = render(<HomeChoreDetails post={single} />);
  expect(view.getByText("Grant marked a chore done")).toBeTruthy();
  expect(view.getByText("Dishes")).toBeTruthy();
  expect(view.getByText("Awaiting approval")).toBeTruthy();
  expect(view.getByText(/Reported for Sep 7/)).toBeTruthy();
});
