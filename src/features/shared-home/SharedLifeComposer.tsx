import { useEffect, useRef, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { randomUUID } from "expo-crypto";
import { Button, Input, Text, VStack, HStack } from "../../ui/primitives";
import { colors, spacing } from "../../theme";
import { useAppStore } from "../../store/useAppStore";
import { useHouseholdModeStore } from "../household/sharedDevice/useHouseholdModeStore";
import {
  loadHomeDraft,
  loadPendingHomeMoments,
  savePendingHomeMoments,
  saveHomeDraft,
  keepHomePhoto,
  removeHomeDraftPhotos,
} from "./sharedLifeDrafts";
import { publishHomeDraft } from "./sharedLifePublishing";
import { uploadHomePhoto } from "./sharedLifeMedia";
import type {
  HomeAttachment,
  HomeBootstrap,
  HomeDraft,
} from "./sharedLifeTypes";
import type { SharedLifeRepository } from "./sharedLifeRepository";

import { SharedLifePage } from "./SharedLifePage";
import {
  FullWidthActionDock,
  useFullWidthActionDockClearance,
} from "../../ui/FullWidthActionDock";
export function SharedLifeComposer({
  userId,
  bootstrap,
  repository,
  attachment,
  intent,
  onClose,
  onPublished,
}: {
  userId: string;
  bootstrap: HomeBootstrap;
  repository: SharedLifeRepository;
  attachment?: HomeAttachment;
  intent?: "photo" | "write";
  onClose: () => void;
  onPublished: () => void;
}) {
  const [draft, setDraft] = useState<HomeDraft | null>(null);
  const clearance = useFullWidthActionDockClearance();
  const [audienceOpen, setAudienceOpen] = useState(false);
  const [photoEdit, setPhotoEdit] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [savedStatus, setSavedStatus] = useState("");
  const [draftMenu, setDraftMenu] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const started = useRef(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const initialBootstrap = useRef(bootstrap).current;
  const incomingMoment = useRef<HomeAttachment[]>([]);
  const startIncomingMoment = async () => {
    if (!incomingMoment.current.length) return false;
    const next: HomeDraft = {
      id: randomUUID(),
      text: "",
      audience: initialBootstrap.households.length ? "household" : "people",
      householdId:
        initialBootstrap.households.length === 1
          ? initialBootstrap.households[0].id
          : null,
      recipientIds: [],
      photos: [],
      attachment: incomingMoment.current[0],
    };
    await saveHomeDraft(userId, next);
    incomingMoment.current = incomingMoment.current.slice(1);
    await savePendingHomeMoments(userId, incomingMoment.current);
    if (mounted.current) {
      setDraft(next);
      setError(null);
    }
    return true;
  };
  useEffect(() => {
    mounted.current = true;
    void Promise.all([loadHomeDraft(userId), loadPendingHomeMoments(userId)])
      .then(async ([saved, pending]) => {
        if (!mounted.current) return;
        if (saved) started.current = true;
        if (!saved && initialBootstrap.households.length !== 1)
          setAudienceOpen(true);
        incomingMoment.current = attachment
          ? [...pending, attachment]
          : pending;
        const firstAttachment = saved
          ? null
          : (incomingMoment.current.shift() ?? null);
        const restored: HomeDraft = saved ?? {
          id: randomUUID(),
          text: "",
          audience: initialBootstrap.households.length ? "household" : "people",
          householdId:
            initialBootstrap.households.length === 1
              ? initialBootstrap.households[0].id
              : null,
          recipientIds: [],
          photos: [],
          attachment: firstAttachment,
        };
        await saveHomeDraft(userId, restored);
        await savePendingHomeMoments(userId, incomingMoment.current);
        if (!mounted.current) return;
        setDraft(restored);
        if (saved && incomingMoment.current.length)
          setError(
            "Your previous draft is here. Finish or discard it before sharing another moment.",
          );
      })
      .catch(() =>
        setError("Your draft could not be restored. Close and try again."),
      );
    return () => {
      mounted.current = false;
    };
  }, [userId, initialBootstrap, attachment]);
  const change = (patch: Partial<HomeDraft>) => {
    if (!draft || busy) return;
    const next = { ...draft, ...patch };
    setDraft(next);
    setSavedStatus("Saving draft…");
    void saveHomeDraft(userId, next)
      .then(() => {
        if (mounted.current) setSavedStatus("Draft saved on this device");
      })
      .catch(() => {
        if (mounted.current)
          setError("Your draft could not be saved on this device.");
      });
  };
  const close = async () => {
    if (busy) {
      if (status === "Publishing…" || status === "Checking your post…") {
        setMinimized(true);
        return;
      }
      Alert.alert("Stop upload?", "Your draft will be kept.", [
        { text: "Keep open", style: "cancel" },
        {
          text: "Stop upload and save draft",
          onPress: () => controller.current?.abort(),
        },
      ]);
      return;
    }
    try {
      if (draft) await saveHomeDraft(userId, draft);
      onClose();
    } catch {
      setError("Your draft could not be saved. Try again before closing.");
    }
  };
  const publish = async () => {
    if (!draft || busy) return;
    if (draft.photos.some((p) => !p.alt.trim())) {
      setPhotoEdit(true);
      setError("Add a short description for each photo.");
      return;
    }
    setBusy(true);
    controller.current = new AbortController();
    setError(null);
    try {
      await saveHomeDraft(userId, draft);
      await publishHomeDraft(
        draft,
        userId,
        {
          signal: controller.current.signal,
          command: repository.command,
          upload: uploadHomePhoto,
          currentUser: () =>
            useHouseholdModeStore.getState().session
              ? null
              : (useAppStore.getState().authIdentity?.userId ?? null),
        },
        (label) => {
          if (mounted.current) setStatus(label);
        },
      );
      await saveHomeDraft(userId, null);
      removeHomeDraftPhotos(draft);
      if (!(await startIncomingMoment()) && mounted.current) onPublished();
    } catch (e) {
      if (mounted.current) {
        setMinimized(false);
        setError(
          e instanceof Error ? e.message : "Your post could not be published.",
        );
      }
    } finally {
      if (mounted.current) {
        setBusy(false);
        setStatus("");
      }
    }
  };
  const addPhotos = async () => {
    if (!draft || busy || draft.photos.length >= 4) return;
    setBusy(true);
    setError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: 4 - draft.photos.length,
        quality: 0.9,
      });
      if (result.canceled) return;
      const photos = await Promise.all(
        result.assets
          .slice(0, 4 - draft.photos.length)
          .map((asset) => keepHomePhoto(userId, asset.uri)),
      );
      const next = { ...draft, photos: [...draft.photos, ...photos] };
      await saveHomeDraft(userId, next);
      if (mounted.current) setDraft(next);
    } catch {
      if (mounted.current) setError("Photos could not be added. Try again.");
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  useEffect(() => {
    if (draft && intent === "photo" && !started.current) {
      started.current = true;
      void addPhotos();
    }
  }, [draft?.id, intent]);
  const audience = !draft
    ? "Choose audience"
    : draft.audience === "household"
      ? (bootstrap.households.find((h) => h.id === draft.householdId)?.name ??
        "Choose household")
      : draft.audience === "people"
        ? `${draft.recipientIds.length} people`
        : "Approved followers";
  return (
    <>
      {minimized ? (
        <View
          style={{
            position: "absolute",
            bottom: clearance,
            left: spacing.lg,
            right: spacing.lg,
          }}
        >
          <Button variant="outline" onPress={() => setMinimized(false)}>
            Publishing your moment… Open
          </Button>
        </View>
      ) : null}
      <SharedLifePage
        visible={!minimized}
        title="Share a moment"
        onClose={() => void close()}
        footer={
          <FullWidthActionDock>
            <Button
              fullWidth
              size="lg"
              loading={busy}
              loadingLabel={status || "Preparing…"}
              disabled={!draft}
              onPress={() => void publish()}
            >
              {`Post to ${audience}`}
            </Button>
          </FullWidthActionDock>
        }
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.body,
            { paddingBottom: clearance + spacing.xl },
          ]}
        >
          {draft ? (
            <VStack space="xl">
              <HStack>
                <Button
                  variant="outline"
                  accessibilityLabel={`Audience: ${audience}`}
                  onPress={() => setAudienceOpen(!audienceOpen)}
                >
                  {`${audience} ⌄`}
                </Button>
                <Button
                  variant="ghost"
                  accessibilityLabel="Draft options"
                  onPress={() => setDraftMenu(!draftMenu)}
                >
                  •••
                </Button>
              </HStack>
              {audienceOpen ? (
                <VStack space="sm">
                  <Text tone="secondary">Who can see this?</Text>
                  <HStack space="xs" style={styles.wrap}>
                    {bootstrap.households.length > 0 ? (
                      <Button
                        size="sm"
                        variant={
                          draft.audience === "household" ? "outline" : "ghost"
                        }
                        onPress={() =>
                          change({
                            audience: "household",
                            householdId: bootstrap.households[0].id,
                          })
                        }
                      >
                        Household
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant={
                        draft.audience === "people" ? "outline" : "ghost"
                      }
                      onPress={() =>
                        change({ audience: "people", householdId: null })
                      }
                    >
                      Choose people
                    </Button>
                    <Button
                      size="sm"
                      variant={
                        draft.audience === "followers" ? "outline" : "ghost"
                      }
                      onPress={() =>
                        change({ audience: "followers", householdId: null })
                      }
                    >
                      Followers
                    </Button>
                  </HStack>
                  {draft.audience === "people" ? (
                    <VStack space="xs">
                      {bootstrap.people.length === 0 ? (
                        <Text tone="secondary">
                          Add a friend in Sharing to choose someone.
                        </Text>
                      ) : (
                        bootstrap.people.map((person) => (
                          <Button
                            key={person.id}
                            size="sm"
                            variant={
                              draft.recipientIds.includes(person.id)
                                ? "outline"
                                : "ghost"
                            }
                            accessibilityState={{
                              selected: draft.recipientIds.includes(person.id),
                            }}
                            onPress={() =>
                              change({
                                recipientIds: draft.recipientIds.includes(
                                  person.id,
                                )
                                  ? draft.recipientIds.filter(
                                      (id) => id !== person.id,
                                    )
                                  : [...draft.recipientIds, person.id],
                              })
                            }
                          >
                            {`${person.name}${draft.recipientIds.includes(person.id) ? " ✓" : ""}`}
                          </Button>
                        ))
                      )}
                    </VStack>
                  ) : (
                    <VStack space="xs">
                      {draft.audience === "followers" ? (
                        <Button
                          size="sm"
                          variant={!draft.householdId ? "outline" : "ghost"}
                          onPress={() => change({ householdId: null })}
                        >
                          My approved followers
                        </Button>
                      ) : null}
                      {bootstrap.households.map((h) => (
                        <Button
                          key={h.id}
                          size="sm"
                          variant={
                            draft.householdId === h.id ? "outline" : "ghost"
                          }
                          onPress={() => change({ householdId: h.id })}
                        >
                          {`${h.name}${draft.audience === "followers" ? " · approved followers" : ""}`}
                        </Button>
                      ))}
                      {draft.audience === "followers" ? (
                        <Text tone="secondary">
                          Only people approved before you post. They won’t see
                          private household posts.
                        </Text>
                      ) : null}
                    </VStack>
                  )}
                  <Button
                    variant="ghost"
                    onPress={() => setAudienceOpen(false)}
                  >
                    Done
                  </Button>
                </VStack>
              ) : null}
              {draft.photos.length ? (
                <>
                  <Image
                    source={{ uri: draft.photos[0].uri }}
                    style={styles.preview}
                    accessibilityLabel={draft.photos[0].alt || "Selected photo"}
                  />
                  <ScrollView
                    horizontal
                    contentContainerStyle={{ gap: spacing.sm }}
                  >
                    {draft.photos.map((p) => (
                      <Image
                        key={p.id}
                        source={{ uri: p.uri }}
                        style={styles.thumbnail}
                        accessibilityLabel={p.alt || "Selected photo"}
                      />
                    ))}
                  </ScrollView>
                  <Button
                    variant="ghost"
                    onPress={() => setPhotoEdit(!photoEdit)}
                  >
                    {`${draft.photos.length} photos · Edit order and descriptions`}
                  </Button>
                </>
              ) : null}
              {photoEdit ? (
                <VStack space="md">
                  {draft.photos.map((photo) => (
                    <VStack space="xs" key={photo.id}>
                      <Image
                        source={{ uri: photo.uri }}
                        style={styles.photo}
                        accessibilityLabel={photo.alt || "Selected photo"}
                      />
                      <HStack>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy || draft.photos[0].id === photo.id}
                          onPress={() => {
                            const next = [...draft.photos];
                            const i = next.findIndex((p) => p.id === photo.id);
                            [next[i - 1], next[i]] = [next[i], next[i - 1]];
                            change({ photos: next });
                          }}
                        >
                          Move earlier
                        </Button>
                      </HStack>
                      <Input
                        accentLabelOnFocus={false}
                        label="Photo description"
                        value={photo.alt}
                        maxLength={200}
                        onChangeText={(alt) =>
                          change({
                            photos: draft.photos.map((p) =>
                              p.id === photo.id ? { ...p, alt } : p,
                            ),
                          })
                        }
                        editable={!busy}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onPress={() => {
                          change({
                            photos: draft.photos.filter(
                              (p) => p.id !== photo.id,
                            ),
                          });
                          // Keep the local file until the draft write succeeds.
                          void saveHomeDraft(userId, {
                            ...draft,
                            photos: draft.photos.filter(
                              (p) => p.id !== photo.id,
                            ),
                          })
                            .then(() =>
                              removeHomeDraftPhotos({
                                ...draft,
                                photos: [photo],
                              }),
                            )
                            .catch(() => undefined);
                        }}
                      >
                        Remove photo
                      </Button>
                    </VStack>
                  ))}
                </VStack>
              ) : null}
              <Input
                accentLabelOnFocus={false}
                label="Your moment"
                placeholder="What would you like to share?"
                multiline
                value={draft.text}
                onChangeText={(text) => change({ text })}
                maxLength={4000}
                editable={!busy}
              />
              {draft.attachment ? (
                <View>
                  {draft.attachment.kind === "goal_completed" ? (
                    <Text tone="secondary">
                      Goal completed · Only this title will be shared.
                    </Text>
                  ) : null}
                  <Text>
                    {draft.attachment.kind === "place"
                      ? draft.attachment.name
                      : draft.attachment.title}
                  </Text>
                  {draft.attachment.kind === "place" ? (
                    <Text tone="secondary">
                      The name and exact location will be shared. Your route
                      stays private.
                    </Text>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    onPress={() => change({ attachment: null })}
                  >
                    Remove attachment
                  </Button>
                </View>
              ) : null}

              {draft.photos.length < 4 ? (
                <Button
                  variant="ghost"
                  disabled={busy}
                  onPress={() => void addPhotos()}
                >
                  Add photos
                </Button>
              ) : null}
              {draftMenu ? (
                <>
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onPress={() =>
                      Alert.alert(
                        "Discard this draft?",
                        "Your words and selected photos will be removed from this draft.",
                        [
                          { text: "Keep draft", style: "cancel" },
                          {
                            text: "Discard draft",
                            style: "destructive",
                            onPress: () => {
                              setBusy(true);
                              void repository
                                .command("discard", { id: draft.id })
                                .then(() => saveHomeDraft(userId, null))
                                .then(async () => {
                                  removeHomeDraftPhotos(draft);
                                  void repository
                                    .cleanupMedia()
                                    .catch(() => undefined);
                                  if (
                                    !(await startIncomingMoment()) &&
                                    mounted.current
                                  )
                                    onClose();
                                })
                                .catch(() =>
                                  setError(
                                    "Draft could not be discarded. If posting was interrupted, refresh Home to check whether it published.",
                                  ),
                                )
                                .finally(() => {
                                  if (mounted.current) setBusy(false);
                                });
                            },
                          },
                        ],
                      )
                    }
                  >
                    Discard draft
                  </Button>
                </>
              ) : null}
              <Text tone="secondary">
                {draft.audience === "household"
                  ? `Only members of ${audience} can see this.`
                  : draft.audience === "people"
                    ? "Only the people you choose can see this."
                    : "Only followers approved before you post can see this."}
              </Text>
              {error ? <Text accessibilityRole="alert">{error}</Text> : null}
              {savedStatus && !busy ? (
                <Text tone="secondary" accessibilityLiveRegion="polite">
                  {savedStatus}
                </Text>
              ) : null}
              {status ? (
                <Text accessibilityLiveRegion="polite">{status}</Text>
              ) : null}
            </VStack>
          ) : (
            <Text>Restoring your draft…</Text>
          )}
        </ScrollView>
      </SharedLifePage>
    </>
  );
}
const styles = StyleSheet.create({
  body: { padding: spacing.lg },
  photo: { width: "100%", height: 220 },
  preview: {
    width: "100%",
    aspectRatio: 4 / 3,
    backgroundColor: colors.shellAlt,
  },
  thumbnail: { width: 72, height: 72 },
  wrap: { flexWrap: "wrap" },
});
