import { useContext, useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  Keyboard,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import type { TextInput } from "react-native";
import { randomUUID } from "expo-crypto";
import { Button, Input, Text, VStack, HStack } from "../../ui/primitives";
import { colors, radii, spacing, typography } from "../../theme";
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
import {
  MomentSuggestionRow,
  MomentSourcePreview,
  MomentSourceSummary,
} from "./MomentSuggestionRow";
import { Icon } from "../../ui/Icon";
import { ButtonLabel } from "../../ui/Typography";
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
  onPublished: (id: string) => void;
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
  const textInput = useRef<TextInput>(null);
  const [textFocused, setTextFocused] = useState(false);
  const finishEditing = () => {
    textInput.current?.blur();
    Keyboard.dismiss();
    setTextFocused(false);
  };
  const [choosing, setChoosing] = useState(false);
  const [suggestionLimit, setSuggestionLimit] = useState(3);
  const [draft, setDraft] = useState<HomeDraft | null>(null);
  const clearance = useFullWidthActionDockClearance();
  const [audienceOpen, setAudienceOpen] = useState(false);
  const [photoEdit, setPhotoEdit] = useState(false);
  const [minimized, setMinimized] = useState(false);
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
    void saveHomeDraft(userId, next)
      .then(() => undefined)
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
      if (!(await startIncomingMoment()) && mounted.current)
        onPublished(draft.id);
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
  const isChoosing =
    choosing ||
    Boolean(
      draft &&
      !writing &&
      !draft.text.trim() &&
      !draft.photos.length &&
      !draft.attachment,
    );
  const selectedSuggestion = draft?.attachment
    ? suggestions.find(
        (suggestion) =>
          JSON.stringify(suggestion.attachment) ===
          JSON.stringify(draft.attachment),
      )
    : undefined;
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
      >
        <BottomDrawerScrollView
          key={isChoosing ? "moment-picker" : "moment-review"}
          stickyHeaderIndices={[0]}
          style={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={styles.body}
        >
          <View style={styles.header}>
            <BottomDrawerHeader
              title="Share a moment"
              variant={isChoosing ? "withClose" : "navbar"}
              onClose={() => void close()}
              closeAccessibilityLabel="Close Share a moment"
              leftAction={
                !isChoosing ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    iconButtonSize={44}
                    accessibilityLabel="Choose a different starting point"
                    onPress={() => {
                      finishEditing();
                      setChoosing(true);
                      setSuggestionLimit(3);
                    }}
                  >
                    <Icon
                      name="chevronLeft"
                      size={20}
                      color={colors.textPrimary}
                    />
                  </Button>
                ) : undefined
              }
              rightAction={
                !isChoosing && draft ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={busy}
                    accessibilityLabel={`Post to ${audience}`}
                    disabled={
                      choosing ||
                      (!draft.text.trim() &&
                        !draft.photos.length &&
                        !draft.attachment)
                    }
                    onPress={() => void publish()}
                  >
                    Post
                  </Button>
                ) : undefined
              }
            />
          </View>
          {error || status ? (
            <Text
              accessibilityRole={error ? "alert" : undefined}
              accessibilityLiveRegion="polite"
            >
              {error || status}
            </Text>
          ) : null}
          {draft ? (
            <VStack space="lg">
              {!isChoosing ? (
                <HStack alignItems="center" justifyContent="space-between">
                  <Text style={typography.bodySm} tone="secondary">
                    Visible to {audience}
                  </Text>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    accessibilityLabel={`Audience: ${audience}`}
                    onPress={() => setAudienceOpen(!audienceOpen)}
                  >
                    Change
                  </Button>
                </HStack>
              ) : null}
              {audienceOpen && !isChoosing ? (
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
                  <Button onPress={() => setAudienceOpen(false)}>Done</Button>
                </VStack>
              ) : null}
              {isChoosing ? (
                <VStack space="sm">
                  <Text style={typography.bodySm}>Suggested moments</Text>
                  {suggestions.slice(0, suggestionLimit).map((suggestion) => (
                    <MomentSuggestionRow
                      key={suggestion.id}
                      suggestion={suggestion}
                      disabled={busy}
                      onPress={() => {
                        change(applyMomentSuggestion(draft, suggestion));
                        setWriting(true);
                        setTextFocused(false);
                        setChoosing(false);
                        setSuggestionLimit(3);
                      }}
                    />
                  ))}
                  {suggestionsLoading ? (
                    <Text tone="secondary">Finding moments…</Text>
                  ) : null}
                  {!suggestionsLoading && !suggestions.length ? (
                    <Text tone="secondary">
                      No suggested moments yet. You can still share a story or
                      photo.
                    </Text>
                  ) : null}
                  {suggestionsError ? (
                    <Button variant="ghost" size="sm" onPress={retry}>
                      Retry recent meals
                    </Button>
                  ) : null}
                  {suggestions.length > suggestionLimit ? (
                    <Button
                      variant="ghost"
                      size="inline"
                      style={styles.inlineAction}
                      onPress={() => setSuggestionLimit((n) => n + 3)}
                    >
                      View more ›
                    </Button>
                  ) : null}
                  {choosing ? (
                    <Button
                      variant="ghost"
                      size="inline"
                      style={styles.inlineAction}
                      onPress={() => setChoosing(false)}
                    >
                      Back to your post
                    </Button>
                  ) : null}
                </VStack>
              ) : null}
              {draft.photos.length && !photoEdit && !choosing ? (
                <VStack space="xs">
                  <Image
                    source={{ uri: draft.photos[0].uri }}
                    style={styles.photoHero}
                    resizeMode="cover"
                    accessibilityLabel={
                      draft.photos[0].alt || "Selected photo 1"
                    }
                  />
                  {draft.photos.length > 1 ? (
                    <ScrollView
                      horizontal
                      keyboardShouldPersistTaps="handled"
                      contentContainerStyle={styles.photos}
                    >
                      {draft.photos.slice(1).map((photo, index) => (
                        <Image
                          key={photo.id}
                          source={{ uri: photo.uri }}
                          style={styles.thumbnail}
                          resizeMode="cover"
                          accessibilityLabel={
                            photo.alt || `Selected photo ${index + 2}`
                          }
                        />
                      ))}
                    </ScrollView>
                  ) : null}
                  <HStack justifyContent="flex-end">
                    <Button
                      variant="link"
                      size="inline"
                      disabled={busy}
                      onPress={() => setPhotoEdit(true)}
                    >
                      Edit photos
                    </Button>
                  </HStack>
                </VStack>
              ) : null}
              {draft.attachment && !choosing ? (
                <VStack space="xs">
                  {draft.photos.length ? (
                    <MomentSourceSummary
                      suggestion={{
                        kind:
                          draft.attachment.kind === "place" ? "place" : "goal",
                        title:
                          draft.attachment.kind === "place"
                            ? draft.attachment.name
                            : draft.attachment.title,
                        context:
                          draft.attachment.kind === "place"
                            ? "Place from Explore"
                            : draft.attachment.kind === "goal_completed"
                              ? "Goal completed"
                              : "Outing",
                        artwork: selectedSuggestion?.artwork,
                      }}
                    />
                  ) : (
                    <MomentSourcePreview
                      suggestion={{
                        kind:
                          draft.attachment.kind === "place" ? "place" : "goal",
                        title:
                          draft.attachment.kind === "place"
                            ? draft.attachment.name
                            : draft.attachment.title,
                        context:
                          draft.attachment.kind === "place"
                            ? "Place from Explore"
                            : draft.attachment.kind === "goal_completed"
                              ? "Goal completed"
                              : "Outing",
                        artwork: selectedSuggestion?.artwork,
                      }}
                    />
                  )}
                  <HStack alignItems="center" justifyContent="space-between">
                    <Text tone="secondary" style={typography.caption}>
                      {draft.attachment.kind === "goal_completed"
                        ? "Only the goal title will be shared."
                        : draft.attachment.kind === "place"
                          ? "The place and exact location will be shared."
                          : "This moment will be included in your post."}
                    </Text>
                    <Button
                      variant="link"
                      size="inline"
                      disabled={busy}
                      accessibilityLabel="Remove recent moment"
                      onPress={() => change({ attachment: null })}
                    >
                      Remove
                    </Button>
                  </HStack>
                  {draft.attachment.kind === "place" ? (
                    <Text tone="secondary" style={typography.caption}>
                      Your route stays private.
                    </Text>
                  ) : null}
                </VStack>
              ) : null}
              {!choosing ? (
                <VStack key="moment-entry" space="sm">
                  {isChoosing ? (
                    <View style={styles.invitation}>
                      <Text style={typography.bodyBold}>
                        Share a story or photo
                      </Text>
                      <Text tone="secondary" style={typography.bodySm}>
                        Help family and friends catch up with you.
                      </Text>
                    </View>
                  ) : null}
                  <Input
                    key="moment-text"
                    ref={textInput}
                    surfaceRole="composer"
                    accessibilityLabel="Your moment"
                    label={
                      isChoosing
                        ? undefined
                        : draft.attachment
                          ? "Add a few words (optional)"
                          : "Your moment"
                    }
                    placeholder={
                      isChoosing
                        ? "Write a note…"
                        : "What would you like to share?"
                    }
                    multiline
                    multilineMinHeight={isChoosing ? 56 : draft.text ? 88 : 72}
                    multilineMaxHeight={isChoosing ? 56 : 220}
                    footerElement={
                      <HStack
                        space="sm"
                        alignItems="center"
                        justifyContent="space-between"
                        style={styles.composerTools}
                      >
                        <HStack space="sm" alignItems="center">
                          <Button
                            variant="ghost"
                            size="inline"
                            disabled={busy || draft.photos.length >= 4}
                            onPress={() => {
                              setWriting(true);
                              void addPhotos();
                            }}
                          >
                            <HStack space="xs" alignItems="center">
                              <Icon
                                name="image"
                                size={17}
                                color={colors.textPrimary}
                              />
                              <ButtonLabel tone="default">Photo</ButtonLabel>
                            </HStack>
                          </Button>
                          {!isChoosing ? (
                            <Button
                              variant="ghost"
                              size="inline"
                              disabled={busy}
                              onPress={() => {
                                finishEditing();
                                setChoosing(true);
                                setSuggestionLimit(3);
                              }}
                            >
                              {draft.attachment
                                ? "Choose another"
                                : "Recent moment"}
                            </Button>
                          ) : null}
                        </HStack>
                        {isChoosing ? (
                          <Text tone="secondary" style={typography.caption}>
                            Words, photos, or both.
                          </Text>
                        ) : textFocused ? (
                          <Button
                            variant="ghost"
                            size="inline"
                            onPress={finishEditing}
                          >
                            Done
                          </Button>
                        ) : null}
                      </HStack>
                    }
                    onFocus={() => {
                      setWriting(true);
                      setTextFocused(true);
                    }}
                    onBlur={() => setTextFocused(false)}
                    value={draft.text}
                    onChangeText={(text) => {
                      setWriting(true);
                      change({ text });
                    }}
                    maxLength={4000}
                    editable={!busy}
                  />
                </VStack>
              ) : null}
              {photoEdit ? (
                <VStack space="md">
                  <HStack justifyContent="flex-end">
                    <Button
                      variant="link"
                      size="inline"
                      onPress={() => setPhotoEdit(false)}
                    >
                      Done editing photos
                    </Button>
                  </HStack>
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

              {!isChoosing && !draft.attachment ? (
                <Button
                  variant="link"
                  size="inline"
                  style={styles.maintenanceAction}
                  accessibilityLabel="Draft options"
                  onPress={() => setDraftMenu(!draftMenu)}
                >
                  Draft options
                </Button>
              ) : null}
              {draftMenu ? (
                <HStack justifyContent="flex-end">
                  <Button
                    variant="link"
                    size="inline"
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
                </HStack>
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
  header: { backgroundColor: colors.card },
  invitation: { gap: spacing.xs, paddingTop: spacing.sm },
  photo: {
    width: "100%",
    height: 220,
    borderRadius: radii.card,
  },
  photoHero: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: radii.card,
    backgroundColor: colors.shellAlt,
  },
  scroll: { flex: 1 },
  feedback: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  photos: { gap: spacing.sm },
  thumbnail: {
    width: 88,
    height: 88,
    borderRadius: radii.input,
    backgroundColor: colors.shellAlt,
  },
  composerTools: { flexWrap: "wrap" },
  inlineAction: { alignSelf: "flex-start" },
  maintenanceAction: { alignSelf: "flex-end" },
  wrap: { flexWrap: "wrap" },
});
