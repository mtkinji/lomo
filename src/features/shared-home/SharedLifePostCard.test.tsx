// Callback wiring is isolated from native menu measurement; menu opening is exercised in Simulator.
jest.mock("../../ui/DropdownMenu", () => {
  const { View, Text, Pressable } = require("react-native");
  return {
    DropdownMenu: View,
    DropdownMenuTrigger: View,
    DropdownMenuContent: View,
    DropdownMenuItem: ({
      label,
      onPress,
    }: {
      label: string;
      onPress: () => void;
    }) => (
      <Pressable onPress={onPress}>
        <Text>{label}</Text>
      </Pressable>
    ),
  };
});
import { PortalHost } from "../../ui/Portal";
import { render, fireEvent } from "@testing-library/react-native";
import { SharedLifePostCard } from "./SharedLifePostCard";
import type { HomePost } from "./sharedLifeTypes";
jest.mock("./SharedLifeMediaGallery", () => ({
  SharedLifeMediaGallery: () => null,
}));
it("offers Organize in the shared menu without unsaving the moment", () => {
  const organize = jest.fn();
  const bookmark = jest.fn();
  const noop = jest.fn();
  const post: HomePost = {
    id: "post",
    authorName: "Alex",
    text: "Moment",
    audience: "household",
    householdName: "Family",
    media: [],
    createdAt: new Date().toISOString(),
    saved: true,
    authorId: "alex",
    householdId: "household",
    attachment: null,
    updatedAt: new Date().toISOString(),
    reactionCount: 0,
    replyCount: 0,
    myReaction: null,
  };
  const view = render(
    <>
      <PortalHost />
      <SharedLifePostCard
        post={post}
        onOpen={noop}
        onReact={noop}
        onSave={noop}
        onAuthor={noop}
        onReport={noop}
        onOrganize={organize}
        onBookmark={bookmark}
      />
    </>,
  );
  expect(view.getByLabelText("Options for Alex's post")).toBeTruthy();
  fireEvent.press(view.getByText("Organize saved moment"));
  expect(organize).toHaveBeenCalledTimes(1);
  expect(bookmark).not.toHaveBeenCalled();
  fireEvent.press(view.getByText("Unsave moment"));
  expect(bookmark).toHaveBeenCalledTimes(1);
});

it("offers expansion when larger text reaches the six-line preview limit", () => {
  const noop = jest.fn();
  const post: HomePost = {
    id: "large-text",
    authorId: "maya",
    authorName: "Maya",
    text: "An ordinary moment that wraps at larger text sizes.",
    audience: "household",
    householdId: "home",
    householdName: "Our household",
    media: [],
    attachment: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    reactionCount: 0,
    replyCount: 0,
    myReaction: null,
  };
  const view = render(
    <SharedLifePostCard
      post={post}
      onOpen={noop}
      onReact={noop}
      onSave={noop}
      onAuthor={noop}
      onReport={noop}
    />,
  );
  fireEvent(view.getByText(post.text), "textLayout", {
    nativeEvent: { lines: Array.from({ length: 6 }, () => ({})) },
  });
  fireEvent.press(view.getByText("Read more"));
  expect(view.getByText(post.text).props.numberOfLines).toBeUndefined();
});
