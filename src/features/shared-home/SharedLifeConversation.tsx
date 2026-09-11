import { useEffect, useRef, useState } from "react";
import { AppState, ScrollView, StyleSheet, View } from "react-native";
import { randomUUID } from "expo-crypto";
import { Button, HStack, Input, Text, VStack } from "../../ui/primitives";
import { HomeChoreDetails } from "./SharedLifeChoreCard";
import { colors, spacing, typography } from "../../theme";
import type { UgcReportTarget } from "../../services/ugcSafety";
import type { HomeConversation, HomePost } from "./sharedLifeTypes";
import type { SharedLifeRepository } from "./sharedLifeRepository";
import { SharedLifePage } from "./SharedLifePage";
import { ProfileAvatar } from "../../ui/ProfileAvatar";
import { HomePhoto } from "./SharedLifeMediaGallery";
import { audienceLabel, momentTime } from "./sharedLifePresentation";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  const replyId = useRef(randomUUID());
  const refreshConversation = useRef<() => void>(() => {});
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
  return (
    <SharedLifePage
      title={editing ? "Edit your words" : "Conversation"}
      onClose={onClose}
      footer={
        <View
          onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
          style={[
            styles.replyDock,
            { bottom: resolvePhoneFloatingBottomInset(insets.bottom) },
          ]}
        >
          <Text tone="secondary" style={typography.bodySm}>
            Visible to this post's audience
          </Text>
          <HStack space="sm" alignItems="flex-end">
            <View style={{ flex: 1 }}>
              <Input
                surfaceRole="composer"
                accentLabelOnFocus={false}
                accessibilityLabel={editing ? "Your moment" : "Your reply"}
                placeholder={editing ? "Edit your words…" : "Write a reply…"}
                multiline
                multilineMinHeight={RESTING_COMPOSER_HEIGHT_PX}
                multilineMaxHeight={RESTING_COMPOSER_HEIGHT_PX * 3}
                maxLength={editing ? 4000 : 2000}
                value={text}
                onChangeText={setText}
                editable={!busy}
              />
            </View>
            <Button
              size="icon"
              iconButtonSize={44}
              accessibilityLabel={editing ? "Save changes" : "Send reply"}
              loading={busy}
              disabled={!text.trim() || !conversation}
              onPress={() => void submit()}
            >
              ↑
            </Button>
          </HStack>
          {error ? <Text accessibilityRole="alert">{error}</Text> : null}
        </View>
      }
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
        <VStack space="xl">
          {!conversation ? (
            <Text>{error ?? "Loading conversation…"}</Text>
          ) : conversation.post.kind === "chore_update" ? (
            <HomeChoreDetails post={conversation.post} expanded />
          ) : (
            <HStack space="md">
              <View style={{ width: 88 }}>
                {conversation.post.media[0] ? (
                  <HomePhoto {...conversation.post.media[0]} />
                ) : (
                  <ProfileAvatar
                    name={conversation.post.authorName}
                    size={40}
                  />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={typography.bodyBold}>
                  {conversation.post.authorName}
                </Text>
                <Text numberOfLines={3}>
                  {conversation.post.text ||
                    (conversation.post.attachment &&
                    "title" in conversation.post.attachment
                      ? conversation.post.attachment.title
                      : "")}
                </Text>
                <Text tone="secondary">{audienceLabel(conversation.post)}</Text>
              </View>
            </HStack>
          )}
          {!editing
            ? conversation?.replies.map((reply) => (
                <VStack key={reply.id} space="xs">
                  <HStack space="md" alignItems="center">
                    <ProfileAvatar name={reply.authorName} size={36} />
                    <View style={{ flex: 1 }}>
                      <Text style={typography.bodyBold}>
                        {reply.authorName}
                      </Text>
                      <Text tone="secondary">
                        {momentTime(reply.createdAt)}
                      </Text>
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
                  <Text>{reply.text}</Text>
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
      </ScrollView>
    </SharedLifePage>
  );
}
const styles = StyleSheet.create({
  body: { padding: spacing.lg },
  replyDock: {
    position: "absolute",
    left: RESTING_COMPOSER_HORIZONTAL_INSET_PX,
    right: RESTING_COMPOSER_HORIZONTAL_INSET_PX,
    gap: spacing.sm,
    backgroundColor: colors.canvas,
  },
});
