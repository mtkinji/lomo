import { ShareMomentButton } from "./ShareMomentButton";
import { useEffect, useRef, useState } from "react";
import { AppState, ScrollView, StyleSheet, View } from "react-native";
import { randomUUID } from "expo-crypto";
import { Button, HStack, Input, Text, VStack } from "../../ui/primitives";
import { HomeChoreDetails } from "./SharedLifeChoreCard";
import { colors, radii, spacing, typography } from "../../theme";
import type { UgcReportTarget } from "../../services/ugcSafety";
import type { HomeConversation, HomePost } from "./sharedLifeTypes";
import type { SharedLifeRepository } from "./sharedLifeRepository";
import { SharedLifePage } from "./SharedLifePage";
import { ProfileAvatar } from "../../ui/ProfileAvatar";
import { Icon } from "../../ui/Icon";
import { ChatComposer } from "../../ui/ChatComposer";
import { useChatDictation, type ChatDictationState } from "../unifiedChat/useChatDictation";
import { insertUnifiedChatTranscriptAtSelection } from "../unifiedChat/unifiedChatTranscriptInsertion";
import { HomePhoto } from "./SharedLifeMediaGallery";
import { momentTime } from "./sharedLifePresentation";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomDrawer, BottomDrawerScrollView } from "../../ui/BottomDrawer";
import { BottomDrawerHeader } from "../../ui/layout/BottomDrawerHeader";
import {
  resolvePhoneFloatingBottomInset,
  resolvePhoneFloatingActionContentInset,
} from "../../ui/layout/bottomDockGeometry";
import {
  RESTING_COMPOSER_HEIGHT_PX,
  RESTING_COMPOSER_HORIZONTAL_INSET_PX,
} from "../../ui/layout/restingComposerMetrics";
export function SharedLifeConversation({
  post,
  userId,
  onReport,
  repository,
  editing,
  onClose,
  onChanged,
}: {
  userId: string;
  onReport: (target: UgcReportTarget) => void;
  post: HomePost;
  repository: SharedLifeRepository;
  editing?: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [footerHeight, setFooterHeight] = useState(0);
  const [replyMenu, setReplyMenu] = useState<string | null>(null);
  const [conversation, setConversation] = useState<HomeConversation | null>(
    null,
  );
  const [text, setText] = useState(editing ? post.text : "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dictationState, setDictationState] = useState<ChatDictationState>({
    kind: "dictation",
    state: "idle",
    elapsedSeconds: 0,
    levels: [],
  });
  const [conversationSnapIndex, setConversationSnapIndex] = useState(
    post.replyCount >= 3 ? 1 : 0,
  );
  const replyId = useRef(randomUUID());
  const refreshConversation = useRef<() => void>(() => {});
  const dictation = useChatDictation({
    selectionKey: `home-reply:${post.id}`,
    onState: setDictationState,
    onTranscript: (transcript, insertion) =>
      setText((current) =>
        insertUnifiedChatTranscriptAtSelection({
          currentPrompt: current,
          transcript,
          insertion,
        }),
      ),
  });
  useEffect(() => {
    let active = true;
    let epoch = 0;
    const load = () => {
      const request = ++epoch;
      void repository
        .conversation(post.id)
        .then((value) => {
          if (
            active &&
            request === epoch &&
            AppState.currentState === "active"
          ) {
            setConversation(value);
            setError(null);
          }
        })
        .catch(() => {
          if (
            active &&
            request === epoch &&
            AppState.currentState === "active"
          ) {
            setConversation(null);
            setError("This conversation is no longer available.");
          }
        });
    };
    refreshConversation.current = load;
    load();
    const timer = setInterval(() => {
      if (AppState.currentState === "active") load();
    }, 15000);
    const subscription = AppState.addEventListener("change", (state) => {
      epoch++;
      setConversation(null);
      if (state === "active") load();
    });
    return () => {
      active = false;
      refreshConversation.current = () => {};
      clearInterval(timer);
      subscription.remove();
    };
  }, [post.id, repository]);
  const submit = async () => {
    if (busy || !text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await repository.command(
        editing ? "edit" : "reply",
        editing
          ? { id: post.id, text }
          : { id: replyId.current, postId: post.id, text },
      );
      replyId.current = randomUUID();
      setText("");
      onChanged();
      if (editing) onClose();
      else refreshConversation.current();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Your reply could not be sent.",
      );
    } finally {
      setBusy(false);
    }
  };
  const conversationContent = (
    <VStack space="xl">
      {!conversation ? (
        <Text>{error ?? "Loading conversation…"}</Text>
      ) : conversation.post.kind === "chore_update" ? (
        <HomeChoreDetails post={conversation.post} expanded />
      ) : (
        <HStack space="md">
          <View
            testID="conversation.original-thumbnail"
            style={styles.originalThumbnail}
          >
            {conversation.post.media[0] ? (
              <HomePhoto {...conversation.post.media[0]} />
            ) : (
              <ProfileAvatar name={conversation.post.authorName} size={40} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <HStack space="xs" alignItems="center">
              <Text style={typography.bodyBold}>
                {conversation.post.authorName}
              </Text>
              <Text tone="secondary">
                {`· ${momentTime(conversation.post.createdAt)}`}
              </Text>
            </HStack>
            <Text numberOfLines={3}>
              {conversation.post.text ||
                (conversation.post.attachment &&
                "title" in conversation.post.attachment
                  ? conversation.post.attachment.title
                  : "")}
            </Text>
          </View>
        </HStack>
      )}
      {!editing
        ? conversation?.replies.map((reply) => (
            <VStack key={reply.id} space="xs">
              <HStack space="md" alignItems="center">
                <ProfileAvatar name={reply.authorName} size={36} />
                <View style={{ flex: 1 }}>
                  <HStack space="xs" alignItems="center">
                    <Text style={typography.bodyBold}>{reply.authorName}</Text>
                    <Text tone="secondary">
                      {`· ${momentTime(reply.createdAt)}`}
                    </Text>
                  </HStack>
                  <Text>{reply.text}</Text>
                </View>
                <Button
                  variant="ghost"
                  accessibilityLabel={`Options for reply from ${reply.authorName}`}
                  onPress={() =>
                    setReplyMenu(replyMenu === reply.id ? null : reply.id)
                  }
                >
                  •••
                </Button>
              </HStack>
              {replyMenu === reply.id ? (
                reply.authorId === userId ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onPress={() => {
                      setBusy(true);
                      void repository
                        .command("delete_reply", { id: reply.id })
                        .then(() => refreshConversation.current())
                        .then(onChanged)
                        .catch(() =>
                          setError("Your reply could not be removed."),
                        )
                        .finally(() => setBusy(false));
                    }}
                  >
                    Delete reply
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() =>
                      onReport({
                        kind: "home_reply",
                        id: reply.id,
                        reportedUserId: reply.authorId,
                        displayName: reply.authorName,
                        contextLabel: "Home reply",
                      })
                    }
                  >
                    Report reply
                  </Button>
                )
              ) : null}
            </VStack>
          ))
        : null}
    </VStack>
  );
  const composer = (
    <View
      onLayout={
        editing
          ? (e) => setFooterHeight(e.nativeEvent.layout.height)
          : undefined
      }
      style={
        editing
          ? [
              styles.replyDock,
              { bottom: resolvePhoneFloatingBottomInset(insets.bottom) },
            ]
          : styles.drawerReplyDock
      }
    >
      {editing ? (
        <Text tone="secondary" style={typography.bodySm}>
          {"Visible to this post's audience"}
        </Text>
      ) : null}
      {editing ? (
        <HStack space="sm" alignItems="flex-end">
          <View style={styles.composerInput}>
            <Input
              surfaceRole="composer"
              accentLabelOnFocus={false}
              accessibilityLabel="Your moment"
              placeholder="Edit your words…"
              multiline
              multilineMinHeight={RESTING_COMPOSER_HEIGHT_PX}
              multilineMaxHeight={RESTING_COMPOSER_HEIGHT_PX * 3}
              maxLength={4000}
              value={text}
              onChangeText={setText}
              editable={!busy}
            />
          </View>
          <Button
            size="icon"
            iconButtonSize={44}
            accessibilityLabel="Save changes"
            loading={busy}
            disabled={!text.trim() || !conversation}
            onPress={() => void submit()}
          >
            <Icon name="arrowUp" size={18} color={colors.canvas} />
          </Button>
        </HStack>
      ) : (
        <ChatComposer
          accessibilityLabel="Your reply"
          accessibilityHint="Visible to this post's audience"
          placeholder="Write a reply…"
          maxLength={2000}
          value={text}
          onChangeText={setText}
          onSend={() => void submit()}
          sendAccessibilityLabel="Send reply"
          onPressIn={() => setConversationSnapIndex(1)}
          onFocus={() => setConversationSnapIndex(1)}
          disabled={busy}
          sendDisabled={!conversation}
          loading={busy}
          dictation={{
            state: dictationState.state,
            elapsedSeconds: dictationState.elapsedSeconds,
            levels: dictationState.levels,
            message: dictationState.message,
            canRetry: dictationState.canRetry,
            onStart: (selection) => void dictation.start(selection),
            onStop: () => void dictation.stop(),
            onCancel: dictation.cancel,
            onRetry: () => void dictation.retry(),
          }}
        />
      )}
      {error ? <Text accessibilityRole="alert">{error}</Text> : null}
    </View>
  );

  if (!editing) {
    return (
      <BottomDrawer
        visible
        onClose={onClose}
        snapPoints={["62%", "100%"]}
        snapIndex={conversationSnapIndex}
        onSnapIndexChange={setConversationSnapIndex}
        keyboardBehavior="resize"
        enableContentPanningGesture
        bottomAccessory={composer}
      >
        <View style={styles.drawerContent}>
          <BottomDrawerHeader
            title="Conversation"
            variant="withClose"
            onClose={onClose}
            closeAccessibilityLabel="Close conversation"
            containerStyle={styles.drawerHeader}
          />
          <BottomDrawerScrollView
            style={styles.drawerScroll}
            contentContainerStyle={styles.drawerBody}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            {conversationContent}
          </BottomDrawerScrollView>
        </View>
      </BottomDrawer>
    );
  }

  return (
    <SharedLifePage
      title="Edit your words"
      onClose={onClose}
      rightElement={
        conversation && conversation.post.kind !== "chore_update" ? (
          <ShareMomentButton postId={conversation.post.id} />
        ) : undefined
      }
      footer={composer}
    >
      <ScrollView
        contentContainerStyle={[
          styles.body,
          {
            paddingBottom: resolvePhoneFloatingActionContentInset(
              insets.bottom,
              footerHeight,
            ),
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {conversationContent}
      </ScrollView>
    </SharedLifePage>
  );
}
const styles = StyleSheet.create({
  body: { padding: spacing.lg },
  drawerContent: { flex: 1 },
  drawerHeader: { paddingTop: spacing.md },
  drawerScroll: { flex: 1 },
  drawerBody: { paddingBottom: spacing.xl },
  drawerReplyDock: { gap: spacing.sm },
  composerInput: { flex: 1 },
  originalThumbnail: {
    width: 88,
    borderRadius: radii.input,
    overflow: "hidden",
  },
  replyDock: {
    position: "absolute",
    left: RESTING_COMPOSER_HORIZONTAL_INSET_PX,
    right: RESTING_COMPOSER_HORIZONTAL_INSET_PX,
    gap: spacing.sm,
    backgroundColor: colors.canvas,
  },
});
