import assert from "node:assert/strict";
import test from "node:test";

import {
  chooseContextualChatAction,
  completeContextualChatAction,
  createContextualChatState,
  openTreeContextualChat,
  returnToPet,
} from "../lib/pet-contextual-chat.ts";

test("the becoming tree opens one ephemeral Pet context without creating a thread", () => {
  const opened = openTreeContextualChat(createContextualChatState());

  assert.equal(opened.phase, "choosing");
  assert.equal(opened.context.capability, "Pet");
  assert.equal(opened.context.object, "Moss's becoming tree");
  assert.equal(opened.threadCreated, false);
});

test("Chat keeps one selected path and returns the capability-owned receipt source", () => {
  const opened = openTreeContextualChat(createContextualChatState());
  const selected = chooseContextualChatAction(opened, "existing-todo");
  const completed = completeContextualChatAction(selected);

  assert.equal(selected.phase, "ready");
  assert.equal(completed.state.phase, "complete");
  assert.equal(completed.source, "todo");
  assert.equal(completed.state.threadCreated, true, "the draft becomes a conversation only after an action is taken");
});

test("each bounded Chat path maps to an existing privacy-safe Pet receipt", () => {
  const opened = openTreeContextualChat(createContextualChatState());

  assert.equal(completeContextualChatAction(chooseContextualChatAction(opened, "existing-todo")).source, "todo");
  assert.equal(completeContextualChatAction(chooseContextualChatAction(opened, "short-focus")).source, "focus");
  assert.equal(completeContextualChatAction(chooseContextualChatAction(opened, "small-next-action")).source, "todo");
});

test("returning to Pet closes the draft and preserves no stale selection", () => {
  const completed = completeContextualChatAction(
    chooseContextualChatAction(openTreeContextualChat(createContextualChatState()), "small-next-action"),
  ).state;

  assert.deepEqual(returnToPet(completed), createContextualChatState());
});
