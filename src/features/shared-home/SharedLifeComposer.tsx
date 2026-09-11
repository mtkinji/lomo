import { useContext, useEffect, useRef, useState } from "react";
import { Alert, Image, Keyboard, ScrollView, StyleSheet, View } from "react-native";
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

import { NavigationContext } from "@react-navigation/native";
import { BottomDrawer, BottomDrawerScrollView } from "../../ui/BottomDrawer";
import { BottomDrawerHeader } from "../../ui/layout/BottomDrawerHeader";
import { SettingsRow } from "../../ui/SettingsSurface";
import { useMomentSuggestions } from "./useMomentSuggestions";
import { applyMomentSuggestion } from "./sharedLifeSuggestions";
import { useFullWidthActionDockClearance } from "../../ui/FullWidthActionDock";
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
  const navigation = useContext(NavigationContext);
  const [focused, setFocused] = useState(() => navigation?.isFocused() ?? true);
  useEffect(() => {
    if (!navigation) return;
    const focus = navigation.addListener("focus", () => setFocused(true));
    const blur = navigation.addListener("blur", () => setFocused(false));
    return () => {
      focus();
      blur();
    };
  }, [navigation]);
  const {
    suggestions,
    loading: suggestionsLoading,
    error: suggestionsError,
    retry,
  } = useMomentSuggestions(userId);
  const [writing, setWriting] = useState(
    intent === "photo" || Boolean(attachment),
  );
  const [focusWriting, setFocusWriting] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [suggestionLimit, setSuggestionLimit] = useState(3);
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
    setError(null);
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
      <BottomDrawer
        visible={!minimized && focused}
        onClose={() => void close()}
        snapPoints={["95%"]}
        keyboardBehavior="resize"
        contentLayout="edgeToEdge"
        footer={{
          primaryAction: {
            label: "Post",
            loading: busy,
            loadingLabel: "Posting…",
            accessibilityLabel: `Post to ${audience}`,
            disabled:
              choosing || !draft ||
              (!draft.text.trim() && !draft.photos.length && !draft.attachment),
            onPress: () => void publish(),
          },
        }}
      >
        <View style={styles.header}>
          <BottomDrawerHeader
            title="Share a moment"
            variant="withClose"
            onClose={() => void close()}
            closeAccessibilityLabel="Close Share a moment"
          />
        </View>
        {error || status ? (
          <View style={styles.feedback}>
            <Text
              accessibilityRole={error ? "alert" : undefined}
              accessibilityLiveRegion="polite"
            >
              {error || status}
            </Text>
          </View>
        ) : null}
        <BottomDrawerScrollView
          style={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={styles.body}
        >
          {draft ? (
            <VStack space="lg">
              <HStack>
                <Button
                  variant="outline"
                  disabled={busy}
                  accessibilityLabel={`Audience: ${audience}`}
                  onPress={() => setAudienceOpen(!audienceOpen)}
                >
                  {`${audience} ⌄`}
                </Button>
                <Button
                  disabled={busy}
                  accessibilityLabel="Draft options"
                  onPress={() => setDraftMenu(!draftMenu)}
                >
                  •••
                </Button>
              </HStack>
              {audienceOpen ? (
                <VStack space="sm">
                  <Text tone="secondary">Who can see this?</Text>
                  <Text tone="secondary">
                    {draft.audience === "household"
                      ? `Only members of ${audience} can see this.`
                      : draft.audience === "people"
                        ? "Only the people you choose can see this."
                        : "Only followers approved before you post can see this."}
                  </Text>

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
                      onPress={() => setAudienceOpen(false)}
                  >
                    Done
                  </Button>
                </VStack>
              ) : null}
              {choosing ||
              (!writing &&
                !draft.text.trim() &&
                !draft.photos.length &&
                !draft.attachment) ? (
                <VStack space="sm">
                  <Text>Start with a recent moment</Text>
                  {suggestions.slice(0, suggestionLimit).map((suggestion) => (
                    <SettingsRow
                      key={suggestion.id}
                      title={suggestion.title}
                      value={suggestion.context}
                      multiline
                      disabled={busy}
                      onPress={() => {
                        change(applyMomentSuggestion(draft, suggestion));
                        setWriting(true);
                        setFocusWriting(false);
                        setChoosing(false);
                        setSuggestionLimit(3);
                      }}
                    />
                  ))}
                  {suggestionsLoading ? (
                    <Text tone="secondary">Finding recent moments…</Text>
                  ) : null}
                  {!suggestionsLoading && !suggestions.length ? (
                    <Text tone="secondary">
                      Share a photo or something from your day.
                    </Text>
                  ) : null}
                  {suggestionsError ? (
                    <Button variant="ghost" size="sm" onPress={retry}>
                      Retry recent meals
                    </Button>
                  ) : null}
                  {suggestions.length > suggestionLimit ? (
                    <Button
                          size="sm"
                      onPress={() => setSuggestionLimit((n) => n + 3)}
                    >
                      View more moments
                    </Button>
                  ) : null}
                  <HStack>
                    <Button
                      variant="outline"
                      disabled={busy}
                      onPress={() => {
                        setWriting(true);
                        setChoosing(false);
                        setFocusWriting(true);
                      }}
                    >
                      Write something
                    </Button>
                    <Button
                          disabled={busy}
                      onPress={() => {
                        setWriting(true);
                        setChoosing(false);
                        void addPhotos();
                      }}
                    >
                      Add photos
                    </Button>
                  </HStack>
                </VStack>
              ) : (
                <Button
                  size="sm"
                  disabled={busy}
                  onPress={() => {
                    Keyboard.dismiss();
                    setChoosing(true);
                    setSuggestionLimit(3);
                  }}
                >
                  Choose a recent moment
                </Button>
              )}
              {draft.attachment && !choosing ? (
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
                      onPress={() => change({ attachment: null })}
                  >
                    Remove attachment
                  </Button>
                </View>
              ) : null}
              {(writing ||
                draft.text.trim() ||
                draft.photos.length ||
                draft.attachment) &&
              !choosing ? (
                <Input
                  surfaceRole="composer"
                  accentLabelOnFocus={false}
                  label={
                    draft.attachment
                      ? "Add a few words (optional)"
                      : "Your moment"
                  }
                  placeholder="What would you like to share?"
                  autoFocus={focusWriting}
                  multiline
                  value={draft.text}
                  onChangeText={(text) => change({ text })}
                  maxLength={4000}
                  editable={!busy}
                />
              ) : null}
              {draft.photos.length ? (
                <VStack space="xs">
                  {!photoEdit ? (
                    <ScrollView
                      horizontal
                      keyboardShouldPersistTaps="handled"
                      contentContainerStyle={styles.photos}
                    >
                      {draft.photos.map((photo, index) => (
                        <Image
                          key={photo.id}
                          source={{ uri: photo.uri }}
                          style={styles.thumbnail}
                          accessibilityLabel={
                            photo.alt || `Selected photo ${index + 1}`
                          }
                        />
                      ))}
                    </ScrollView>
                  ) : null}
                  <Button
                      size="sm"
                    disabled={busy}
                    onPress={() => setPhotoEdit(!photoEdit)}
                  >
                    {photoEdit ? "Done editing photos" : "Edit photos"}
                  </Button>
                </VStack>
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
                        label="Photo description (optional)"
                        helperText="Helps people using a screen reader."
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
                        disabled={busy}
                      >
                        Remove photo
                      </Button>
                    </VStack>
                  ))}
                </VStack>
              ) : null}

              {draft.photos.length < 4 &&
              (writing ||
                draft.text.trim() ||
                draft.attachment ||
                draft.photos.length) &&
              !choosing ? (
                <Button
                  disabled={busy}
                  onPress={() => void addPhotos()}
                >
                  Add photos
                </Button>
              ) : null}
              {draftMenu ? (
                <>
                  <Button
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
              {draftMenu && savedStatus && !busy ? (
                <Text tone="secondary" accessibilityLiveRegion="polite">
                  {savedStatus}
                </Text>
              ) : null}
            </VStack>
          ) : (
            <Text>Restoring your draft…</Text>
          )}
        </BottomDrawerScrollView>
      </BottomDrawer>
    </>
  );
}
const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  header: { paddingHorizontal: spacing.lg },
  photo: { width: "100%", height: 220 },
  scroll: { flex: 1 },
  feedback: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  photos: { gap: spacing.sm },
  thumbnail: { width: 160, height: 160, backgroundColor: colors.shellAlt },
  wrap: { flexWrap: "wrap" },
});
