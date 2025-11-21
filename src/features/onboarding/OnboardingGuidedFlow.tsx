import { ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from '@gluestack-ui/themed';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, typography } from '../../theme';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Logo } from '../../ui/Logo';
import { useAppStore } from '../../store/useAppStore';
import { useWorkflowRuntime } from '../ai/WorkflowRuntimeContext';
import { generateArcs, type GeneratedArc } from '../../services/ai';
import type { AgeRange, Arc, FocusAreaId } from '../../domain/types';
import { FOCUS_AREA_OPTIONS, getFocusAreaLabel } from '../../domain/focusAreas';

type OnboardingStage =
  | 'welcome'
  | 'name'
  | 'age'
  | 'focus'
  | 'profileImage'
  | 'notifications'
  | 'arcIntro'
  | 'arcSuggestion'
  | 'arcManual'
  | 'closing';

const AGE_BUCKETS: { range: AgeRange; min: number; max: number }[] = [
  { range: 'under-18', min: 0, max: 17 },
  { range: '18-24', min: 18, max: 24 },
  { range: '25-34', min: 25, max: 34 },
  { range: '35-44', min: 35, max: 44 },
  { range: '45-54', min: 45, max: 54 },
  { range: '55-64', min: 55, max: 64 },
  { range: '65-plus', min: 65, max: 150 },
];

const DEFAULT_AGE_PLACEHOLDER: Record<AgeRange, string> = {
  'under-18': '17',
  '18-24': '22',
  '25-34': '29',
  '35-44': '38',
  '45-54': '48',
  '55-64': '58',
  '65-plus': '68',
  'prefer-not-to-say': '',
};

const STEP_LABELS: Record<OnboardingStage, string> = {
  welcome: 'Step 1',
  name: 'Step 2',
  age: 'Step 3',
  focus: 'Step 4',
  profileImage: 'Step 5',
  notifications: 'Step 6',
  arcIntro: 'Step 7',
  arcSuggestion: 'Step 8',
  arcManual: 'Step 9',
  closing: 'Step 10',
};

const STEP_SEQUENCE: OnboardingStage[] = [
  'welcome',
  'name',
  'age',
  'focus',
  'profileImage',
  'notifications',
  'arcIntro',
];

const AGE_RANGE_LABELS: Record<AgeRange, string> = {
  'under-18': 'Under 18',
  '18-24': '18–24',
  '25-34': '25–34',
  '35-44': '35–44',
  '45-54': '45–54',
  '55-64': '55–64',
  '65-plus': '65+',
  'prefer-not-to-say': 'Prefer not to say',
};

type OnboardingGuidedFlowProps = {
  /**
   * Optional callback fired when the user completes the onboarding flow.
   * When omitted, the component falls back to updating the first-time UX
   * store directly so legacy entry points keep working.
   */
  onComplete?: () => void;
};

export function OnboardingGuidedFlow({ onComplete }: OnboardingGuidedFlowProps) {
  const scrollRef = useRef<ScrollView | null>(null);
  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const workflowRuntime = useWorkflowRuntime();

  const userProfile = useAppStore((state) => state.userProfile);
  const updateUserProfile = useAppStore((state) => state.updateUserProfile);
  const addArc = useAppStore((state) => state.addArc);
  const [visibleSteps, setVisibleSteps] = useState<OnboardingStage[]>(['welcome']);
  const [completedSteps, setCompletedSteps] = useState<OnboardingStage[]>([]);

  const initialName = userProfile?.fullName?.trim() ?? '';
  const [nameInput, setNameInput] = useState(initialName);
  const [nameSubmitted, setNameSubmitted] = useState(Boolean(initialName));
  const [isEditingName, setIsEditingName] = useState(!nameSubmitted);

  const initialAgePlaceholder =
    userProfile?.ageRange && userProfile.ageRange !== 'prefer-not-to-say'
      ? DEFAULT_AGE_PLACEHOLDER[userProfile.ageRange]
      : '';
  const [ageInput, setAgeInput] = useState(initialAgePlaceholder);
  const [ageSubmitted, setAgeSubmitted] = useState(Boolean(userProfile?.ageRange));
  const [isEditingAge, setIsEditingAge] = useState(!ageSubmitted);

  const [selectedFocusAreas, setSelectedFocusAreas] = useState<FocusAreaId[]>(
    userProfile?.focusAreas ?? []
  );
  const [focusAreasSubmitted, setFocusAreasSubmitted] = useState(
    Boolean(userProfile?.focusAreas && userProfile.focusAreas.length > 0)
  );

  const initialAvatar = userProfile?.avatarUrl ?? '';
  const [profileImageUri, setProfileImageUri] = useState(initialAvatar);
  const [profileImageStatus, setProfileImageStatus] = useState<'idle' | 'completed' | 'skipped'>(
    'idle'
  );
  const [isPickingImage, setIsPickingImage] = useState(false);

  const initialNotifications =
    typeof userProfile?.notifications?.remindersEnabled === 'boolean'
      ? userProfile.notifications.remindersEnabled
      : null;
  const [notificationsChoice, setNotificationsChoice] = useState<boolean | null>(
    initialNotifications
  );

  const [arcChoice, setArcChoice] = useState<'suggest' | 'manual' | null>(null);
  const [isGeneratingArc, setIsGeneratingArc] = useState(false);
  const [arcSuggestion, setArcSuggestion] = useState<GeneratedArc | null>(null);
  const [arcSuggestionError, setArcSuggestionError] = useState<string | null>(null);
  const [editedArcName, setEditedArcName] = useState('');
  const [editedArcNarrative, setEditedArcNarrative] = useState('');
  const [manualArcName, setManualArcName] = useState('');
  const [arcFinalized, setArcFinalized] = useState(false);
  const [createdArcName, setCreatedArcName] = useState<string | null>(null);

  const displayName = userProfile?.fullName?.trim() || nameInput.trim() || 'friend';

  const addVisibleStep = (step: OnboardingStage) => {
    setVisibleSteps((prev) => (prev.includes(step) ? prev : [...prev, step]));
  };

  const completeStep = (step: OnboardingStage, nextOverride?: OnboardingStage) => {
    setCompletedSteps((prev) => (prev.includes(step) ? prev : [...prev, step]));
    const index = STEP_SEQUENCE.indexOf(step);
    const defaultNext = index >= 0 ? STEP_SEQUENCE[index + 1] : undefined;
    const next = nextOverride ?? defaultNext;
    if (next) {
      addVisibleStep(next);
    }
    scrollToEnd();
  };

  const isStepVisible = (step: OnboardingStage) => visibleSteps.includes(step);
  const isStepCompleted = (step: OnboardingStage) => completedSteps.includes(step);

  const handleWelcome = () => {
    completeStep('welcome');
    // Map to workflow step "welcome"
    workflowRuntime?.completeStep('welcome');
  };

  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      return;
    }
    updateUserProfile((current) => ({
      ...current,
      fullName: trimmed,
    }));
    setNameSubmitted(true);
    setIsEditingName(false);
    completeStep('name');
  };

  const handleKeepName = () => {
    if (!nameInput.trim()) {
      return;
    }
    completeStep('name');
  };

  const handleSaveAge = () => {
    const parsed = Number(ageInput);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return;
    }
    const range = pickAgeRange(parsed);
    updateUserProfile((current) => ({
      ...current,
      ageRange: range,
    }));
    setAgeSubmitted(true);
    setIsEditingAge(false);
    completeStep('age');
    // Map to workflow step "profile_basics" once we have a usable age range (and best-effort name).
    const effectiveName =
      userProfile?.fullName?.trim() || nameInput.trim() || undefined;
    workflowRuntime?.completeStep('profile_basics', {
      name: effectiveName,
      ageRange: range,
    });
  };

  const handleKeepAge = () => {
    if (!userProfile?.ageRange) {
      return;
    }
    completeStep('age');
  };

  const toggleFocusArea = (area: FocusAreaId) => {
    setSelectedFocusAreas((current) =>
      current.includes(area) ? current.filter((id) => id !== area) : [...current, area]
    );
  };

  const handleSaveFocusAreas = () => {
    if (selectedFocusAreas.length === 0) {
      return;
    }
    updateUserProfile((current) => ({
      ...current,
      focusAreas: selectedFocusAreas,
    }));
    setFocusAreasSubmitted(true);
    completeStep('focus');
    // Map to workflow step "focus_areas"
    workflowRuntime?.completeStep('focus_areas', {
      focusAreas: selectedFocusAreas,
    });
  };

  const handleKeepFocusAreas = () => {
    if (selectedFocusAreas.length === 0) {
      return;
    }
    completeStep('focus');
  };

  const ensurePermission = async (type: 'camera' | 'library') => {
    if (type === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      return permission.granted;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return permission.granted;
  };

  const handlePickImage = async (type: 'camera' | 'library') => {
    console.log('[onboarding] pick image requested', { type });
    if (isPickingImage) {
      console.log('[onboarding] pick image already in progress – ignoring');
      return;
    }
    const hasPermission = await ensurePermission(type);
    if (!hasPermission) {
      console.log('[onboarding] permission denied for', type);
      Alert.alert(
        'Permission needed',
        type === 'camera'
          ? 'Allow camera access in Settings to take a photo.'
          : 'Allow photo library access in Settings to pick an image.'
      );
      return;
    }
    console.log('[onboarding] permission granted for', type);
    setIsPickingImage(true);
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1] as [number, number],
      quality: 0.9,
      presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
    };

    const handleResult = (result: ImagePicker.ImagePickerResult) => {
      console.log('[onboarding] picker returned result', result);
      if ('canceled' in result && result.canceled) {
        console.log('[onboarding] picker canceled by user');
        return;
      }
      const asset = result.assets?.[0];
      if (asset?.uri) {
        console.log('[onboarding] picker asset selected', asset.uri);
        setProfileImageUri(asset.uri);
        updateUserProfile((current) => ({
          ...current,
          avatarUrl: asset.uri,
        }));
        setProfileImageStatus('completed');
        completeStep('profileImage');
      } else {
        console.warn('[onboarding] picker returned result with no asset');
      }
    };

    const handleError = (err: unknown) => {
      console.error('[onboarding] Failed to pick image', err);
      Alert.alert('Unable to update photo', 'Something went wrong. Please try again.');
    };

    const cleanup = () => {
      console.log('[onboarding] picker cleanup');
      setIsPickingImage(false);
    };

    const pickPromise =
      type === 'camera'
        ? ImagePicker.launchCameraAsync(options)
        : ImagePicker.launchImageLibraryAsync(options);

    pickPromise.then(handleResult).catch(handleError).finally(cleanup);
  };

  const handleSkipImage = () => {
    setProfileImageStatus('skipped');
    completeStep('profileImage');
  };

  const handleKeepAvatar = () => {
    setProfileImageStatus('completed');
    completeStep('profileImage');
  };

  const handleRemoveAvatar = () => {
    setProfileImageUri('');
    updateUserProfile((current) => ({
      ...current,
      avatarUrl: undefined,
    }));
    setProfileImageStatus('idle');
  };

  const handleNotificationsChoice = (enabled: boolean) => {
    updateUserProfile((current) => ({
      ...current,
      notifications: {
        ...current.notifications,
        remindersEnabled: enabled,
      },
    }));
    setNotificationsChoice(enabled);
    completeStep('notifications');
    // Map to workflow step "notifications"
    workflowRuntime?.completeStep('notifications', {
      notifications: enabled ? 'enabled' : 'disabled',
    });
  };

  const handleConfirmNotifications = () => {
    if (notificationsChoice === null) {
      return;
    }
    completeStep('notifications');
  };

  const handleArcChoice = (choice: 'suggest' | 'manual') => {
    setArcChoice(choice);
    setArcSuggestion(null);
    setArcSuggestionError(null);
    setArcFinalized(false);
    setManualArcName('');
    if (choice === 'suggest') {
      completeStep('arcIntro', 'arcSuggestion');
      void handleGenerateArc();
    } else {
      completeStep('arcIntro', 'arcManual');
    }
    // Map to workflow step "starter_arc_decision"
    const strategy =
      choice === 'suggest'
        ? 'generate_from_answers'
        : 'start_from_scratch';
    workflowRuntime?.completeStep('starter_arc_decision', {
      starterArcStrategy: strategy,
    });
  };

  const resetArcSelection = () => {
    if (arcFinalized) {
      return;
    }
    setArcChoice(null);
    setArcFinalized(false);
    setCreatedArcName(null);
    setArcSuggestion(null);
    setArcSuggestionError(null);
    setManualArcName('');
    setIsGeneratingArc(false);
    setVisibleSteps((prev) =>
      prev.filter((step) => step !== 'arcSuggestion' && step !== 'arcManual' && step !== 'closing')
    );
    setCompletedSteps((prev) =>
      prev.filter((step) => step !== 'arcSuggestion' && step !== 'arcManual' && step !== 'closing')
    );
  };

  const handleGenerateArc = async () => {
    setIsGeneratingArc(true);
    setArcSuggestionError(null);
    setArcSuggestion(null);
    try {
      const focusSummary =
        selectedFocusAreas.length > 0
          ? `Focus areas: ${selectedFocusAreas.map((area) => getFocusAreaLabel(area)).join(', ')}.`
          : 'Focus areas not specified.';
      const ageLine = userProfile?.ageRange ? `Age range: ${userProfile.ageRange}.` : '';
      const nameLine = userProfile?.fullName ? `Preferred name: ${userProfile.fullName}.` : '';
      const prompt = `${focusSummary} ${ageLine} ${nameLine} Generate a single grounded Arc idea that feels specific and doable.`;
      const arcs = await generateArcs({ prompt });
      if (!arcs || arcs.length === 0) {
        throw new Error('No arc suggestions returned');
      }
      const first = arcs[0];
      setArcSuggestion(first);
      setEditedArcName(first.name ?? '');
      setEditedArcNarrative(first.narrative ?? '');
    } catch (error) {
      console.error('Failed to generate arc', error);
      setArcSuggestionError('Unable to suggest an Arc right now. Try again in a moment.');
    } finally {
      setIsGeneratingArc(false);
      scrollToEnd();
    }
  };

  const handleConfirmSuggestedArc = () => {
    if (!arcSuggestion) {
      return;
    }
    const name = (editedArcName || arcSuggestion.name || '').trim();
    if (!name) {
      return;
    }
    finalizeArc({
      name,
      narrative: (editedArcNarrative || arcSuggestion.narrative || '').trim(),
      status: arcSuggestion.status ?? 'active',
    });
  };

  const handleManualArcSubmit = () => {
    const trimmed = manualArcName.trim();
    if (trimmed.length < 3) {
      return;
    }
    finalizeArc({
      name: trimmed,
      narrative: undefined,
      status: 'active',
    });
  };

  const finalizeArc = (payload: { name: string; narrative?: string; status?: Arc['status'] }) => {
    const arc = buildArcRecord(payload);
    addArc(arc);
    setArcFinalized(true);
    setCreatedArcName(arc.name);
    const completionStep = arcChoice === 'manual' ? 'arcManual' : 'arcSuggestion';
    completeStep(completionStep, 'closing');
    // Mark workflow "closing" step as reached so the runtime has a complete picture.
    workflowRuntime?.completeStep('closing');
  };

  const handleCloseFlow = () => {
    if (onComplete) {
      onComplete();
      return;
    }
    // Legacy fallback for any callers that still depend on this component
    // to close the first-time UX overlay directly.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useFirstTimeUxStore } = require('../../store/useFirstTimeUxStore') as typeof import('../../store/useFirstTimeUxStore');
    const completeFlowFromStore = useFirstTimeUxStore.getState().completeFlow;
    completeFlowFromStore();
  };

  const welcomeVisible = isStepVisible('welcome');
  const welcomeCompleted = isStepCompleted('welcome');
  const nameVisible = isStepVisible('name');
  const nameCompleted = isStepCompleted('name');
  const ageVisible = isStepVisible('age');
  const ageCompleted = isStepCompleted('age');
  const focusVisible = isStepVisible('focus');
  const focusCompleted = isStepCompleted('focus');
  const profileVisible = isStepVisible('profileImage');
  const profileCompleted = isStepCompleted('profileImage');
  const notificationsVisible = isStepVisible('notifications');
  const notificationsCompleted = isStepCompleted('notifications');
  const arcIntroVisible = isStepVisible('arcIntro') && !arcFinalized;
  const arcSuggestionVisible = isStepVisible('arcSuggestion') && !arcFinalized;
  const arcManualVisible = isStepVisible('arcManual') && !arcFinalized;
  const closingVisible = isStepVisible('closing');
  const existingAgeLabel = userProfile?.ageRange ? AGE_RANGE_LABELS[userProfile.ageRange] : null;
  const hasAvatar = Boolean(profileImageUri);
  const notificationsCopy =
    notificationsChoice === null
      ? null
      : notificationsChoice
      ? 'Gentle reminders are on.'
      : 'Noted. No reminders right now.';
  const focusHasSelection = selectedFocusAreas.length > 0;
  const finalArcName = createdArcName ?? 'your first Arc';

  const selectedFocusSummary = useMemo(() => {
    if (selectedFocusAreas.length === 0 && userProfile?.focusAreas?.length) {
      return userProfile.focusAreas.map((area) => getFocusAreaLabel(area)).join(', ');
    }
    if (selectedFocusAreas.length === 0) {
      return '';
    }
    return selectedFocusAreas.map((area) => getFocusAreaLabel(area)).join(', ');
  }, [selectedFocusAreas, userProfile?.focusAreas]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={64}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.timeline}>
          <View style={styles.brandHeader}>
            <Logo size={36} />
            <Text style={styles.brandWordmark}>Takado</Text>
          </View>

          {welcomeVisible && (
            <StepCard
              label={STEP_LABELS.welcome}
              title="Welcome & framing"
              completed={welcomeCompleted}
            >
              <Text style={styles.bodyText}>Welcome to Takado.</Text>
              <Text style={styles.bodyText}>
                I’ll help you turn your goals into a simple plan you can actually follow.
              </Text>
              <Text style={styles.bodyText}>First, let’s get you set up.</Text>
              {welcomeCompleted ? (
                <Text style={styles.ackText}>Great. Let’s keep going.</Text>
              ) : (
                <Button style={styles.primaryButton} onPress={handleWelcome}>
                  <Text style={styles.primaryButtonLabel}>Let’s do it</Text>
                </Button>
              )}
            </StepCard>
          )}

          {nameVisible && (
            <StepCard
              label={STEP_LABELS.name}
              title="Name"
              completed={nameCompleted}
            >
              <Text style={styles.bodyText}>What should I call you?</Text>
              {nameSubmitted && !isEditingName ? (
                <>
                  <Text style={styles.ackText}>Nice to meet you, {nameInput.trim()}.</Text>
                  {nameCompleted ? (
                    <Button variant="link" onPress={() => setIsEditingName(true)}>
                      <Text style={styles.linkLabel}>Change name</Text>
                    </Button>
                  ) : (
                    <View style={styles.inlineActions}>
                      <Button style={styles.primaryButton} onPress={handleKeepName}>
                        <Text style={styles.primaryButtonLabel}>Keep this name</Text>
                      </Button>
                      <Button variant="ghost" onPress={() => setIsEditingName(true)}>
                        <Text style={styles.linkLabel}>Edit name</Text>
                      </Button>
                    </View>
                  )}
                </>
              ) : (
                <>
                  <Input
                    value={nameInput}
                    onChangeText={setNameInput}
                    placeholder="e.g., Maya or MJ"
                    autoCapitalize="words"
                    returnKeyType="done"
                    onSubmitEditing={handleSaveName}
                  />
                  <Button
                    style={styles.primaryButton}
                    onPress={handleSaveName}
                    disabled={!nameInput.trim()}
                  >
                    <Text style={styles.primaryButtonLabel}>Save name</Text>
                  </Button>
                </>
              )}
            </StepCard>
          )}

          {ageVisible && (
            <StepCard
              label={STEP_LABELS.age}
              title="Age"
              completed={ageCompleted}
            >
              <Text style={styles.bodyText}>How old are you?</Text>
              {ageSubmitted && !isEditingAge ? (
                <>
                  <Text style={styles.bodyText}>
                    {existingAgeLabel
                      ? `I currently have you in the ${existingAgeLabel} range.`
                      : 'Age saved.'}
                  </Text>
                  {ageCompleted ? (
                    <Button variant="link" onPress={() => setIsEditingAge(true)}>
                      <Text style={styles.linkLabel}>Update age</Text>
                    </Button>
                  ) : (
                    <View style={styles.inlineActions}>
                      <Button style={styles.primaryButton} onPress={handleKeepAge}>
                        <Text style={styles.primaryButtonLabel}>Keep this age range</Text>
                      </Button>
                      <Button variant="ghost" onPress={() => setIsEditingAge(true)}>
                        <Text style={styles.linkLabel}>Edit age</Text>
                      </Button>
                    </View>
                  )}
                </>
              ) : (
                <>
                  <Input
                    value={ageInput}
                    onChangeText={setAgeInput}
                    placeholder="Enter your age"
                    keyboardType="number-pad"
                    returnKeyType="done"
                    onSubmitEditing={handleSaveAge}
                  />
                  <Button
                    style={styles.primaryButton}
                    onPress={handleSaveAge}
                    disabled={!ageInput.trim()}
                  >
                    <Text style={styles.primaryButtonLabel}>Save age</Text>
                  </Button>
                </>
              )}
            </StepCard>
          )}

          {focusVisible && (
            <StepCard
              label={STEP_LABELS.focus}
              title="Focus areas"
              completed={focusCompleted}
            >
              <Text style={styles.bodyText}>
                Takado helps you organize your goals into clear paths, so you always know what to work
                on next.
              </Text>
              <Text style={styles.bodyText}>
                To start, where do you most want to make progress?
              </Text>
              {!focusAreasSubmitted ? (
                <>
                  <View style={styles.chipGrid}>
                    {FOCUS_AREA_OPTIONS.map((option) => {
                      const selected = selectedFocusAreas.includes(option.id);
                      return (
                        <Pressable
                          key={option.id}
                          style={[styles.chip, selected && styles.chipSelected]}
                          onPress={() => toggleFocusArea(option.id)}
                        >
                          <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
                            {option.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Button
                    style={styles.primaryButton}
                    onPress={handleSaveFocusAreas}
                    disabled={!focusHasSelection}
                  >
                    <Text style={styles.primaryButtonLabel}>Save focus areas</Text>
                  </Button>
                </>
              ) : (
                <>
                  <Text style={styles.ackText}>
                    Great. I’ll keep {selectedFocusSummary || 'those'} in mind.
                  </Text>
                  {focusCompleted ? (
                    <Button variant="link" onPress={() => setFocusAreasSubmitted(false)}>
                      <Text style={styles.linkLabel}>Edit selection</Text>
                    </Button>
                  ) : (
                    <View style={styles.inlineActions}>
                      <Button style={styles.primaryButton} onPress={handleKeepFocusAreas}>
                        <Text style={styles.primaryButtonLabel}>Keep these focus areas</Text>
                      </Button>
                      <Button variant="ghost" onPress={() => setFocusAreasSubmitted(false)}>
                        <Text style={styles.linkLabel}>Edit selection</Text>
                      </Button>
                    </View>
                  )}
                </>
              )}
            </StepCard>
          )}

          {profileVisible && (
            <StepCard
              label={STEP_LABELS.profileImage}
              title="Profile image (optional)"
              completed={profileCompleted}
            >
              <Text style={styles.bodyText}>
                Do you want to add a photo or avatar for your profile? You can skip this if you’d
                like.
              </Text>
              {hasAvatar ? (
                <View style={styles.avatarPreview}>
                  <Image source={{ uri: profileImageUri }} style={styles.avatarImage} />
                </View>
              ) : null}
              {!profileCompleted ? (
                <>
                  {hasAvatar && (
                    <Button style={styles.primaryButton} onPress={handleKeepAvatar}>
                      <Text style={styles.primaryButtonLabel}>Keep this photo</Text>
                    </Button>
                  )}
                  <View style={styles.inlineActions}>
                    <Button
                      style={styles.primaryButton}
                      onPress={() => handlePickImage('library')}
                      disabled={isPickingImage}
                    >
                      {isPickingImage ? (
                        <ActivityIndicator color={colors.canvas} />
                      ) : (
                        <Text style={styles.primaryButtonLabel}>Choose from library</Text>
                      )}
                    </Button>
                    <Button variant="ghost" onPress={handleSkipImage} disabled={isPickingImage}>
                      <Text style={styles.linkLabel}>Skip for now</Text>
                    </Button>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.ackText}>
                    {profileImageStatus === 'skipped'
                      ? 'No worries. You can add one later.'
                      : 'Perfect. Profile is set.'}
                  </Text>
                  <View style={styles.inlineActions}>
                    <Button variant="link" onPress={() => handlePickImage('library')}>
                      <Text style={styles.linkLabel}>
                        {hasAvatar ? 'Change photo' : 'Add one now'}
                      </Text>
                    </Button>
                    {hasAvatar ? (
                      <Button variant="link" onPress={handleRemoveAvatar}>
                        <Text style={styles.linkLabel}>Remove photo</Text>
                      </Button>
                    ) : null}
                  </View>
                </>
              )}
            </StepCard>
          )}

          {notificationsVisible && (
            <StepCard
              label={STEP_LABELS.notifications}
              title="Notifications"
              completed={notificationsCompleted}
            >
              <Text style={styles.bodyText}>
                I can send gentle reminders when an important step is coming up. Do you want
                notifications?
              </Text>
              {notificationsChoice === null ? (
                <View style={styles.inlineActions}>
                  <Button
                    style={styles.primaryButton}
                    onPress={() => handleNotificationsChoice(true)}
                  >
                    <Text style={styles.primaryButtonLabel}>Yes, enable notifications</Text>
                  </Button>
                  <Button variant="ghost" onPress={() => handleNotificationsChoice(false)}>
                    <Text style={styles.linkLabel}>Not now</Text>
                  </Button>
                </View>
              ) : (
                <>
                  <Text style={styles.ackText}>{notificationsCopy}</Text>
                  {notificationsCompleted ? (
                    <Button variant="link" onPress={() => setNotificationsChoice(null)}>
                      <Text style={styles.linkLabel}>Change preference</Text>
                    </Button>
                  ) : (
                    <View style={styles.inlineActions}>
                      <Button style={styles.primaryButton} onPress={handleConfirmNotifications}>
                        <Text style={styles.primaryButtonLabel}>Keep this preference</Text>
                      </Button>
                      <Button variant="ghost" onPress={() => setNotificationsChoice(null)}>
                        <Text style={styles.linkLabel}>Change choice</Text>
                      </Button>
                    </View>
                  )}
                </>
              )}
            </StepCard>
          )}

          {arcIntroVisible && (
            <StepCard label={STEP_LABELS.arcIntro} title="First Arc">
              <Text style={styles.bodyText}>
                In Takado, your bigger goals live inside Arcs. An Arc is just a focused chapter of
                your life, like “Get fit for summer” or “Launch my side project.”
              </Text>
              <Text style={styles.bodyText}>
                Want me to suggest a first Arc based on what you chose earlier, or start from
                scratch?
              </Text>
              {arcChoice === null ? (
                <View style={styles.inlineActions}>
                  <Button
                    style={styles.primaryButton}
                    onPress={() => handleArcChoice('suggest')}
                    disabled={isGeneratingArc}
                  >
                    <Text style={styles.primaryButtonLabel}>Suggest an Arc for me</Text>
                  </Button>
                  <Button variant="outline" onPress={() => handleArcChoice('manual')}>
                    <Text style={styles.outlineButtonLabel}>I’ll create my own</Text>
                  </Button>
                </View>
              ) : (
                <>
                  <Text style={styles.ackText}>
                    {arcChoice === 'suggest'
                      ? 'Great. I’ll suggest one based on what you shared.'
                      : 'Great. We’ll name this Arc together.'}
                  </Text>
                  <Button variant="link" onPress={resetArcSelection}>
                    <Text style={styles.linkLabel}>Change option</Text>
                  </Button>
                </>
              )}
            </StepCard>
          )}

          {arcSuggestionVisible && (
            <StepCard
              label={STEP_LABELS.arcSuggestion}
              title="Suggested Arc"
              completed={isStepCompleted('arcSuggestion')}
            >
              {isGeneratingArc ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={colors.textPrimary} />
                  <Text style={styles.bodyText}>Thinking through a good fit…</Text>
                </View>
              ) : arcSuggestionError ? (
                <>
                  <Text style={styles.errorText}>{arcSuggestionError}</Text>
                  <Button style={styles.primaryButton} onPress={handleGenerateArc}>
                    <Text style={styles.primaryButtonLabel}>Try again</Text>
                  </Button>
                </>
              ) : arcSuggestion ? (
                <>
                  <Text style={styles.bodyText}>Here’s a starter Arc based on what you shared:</Text>
                  <Input
                    value={editedArcName}
                    onChangeText={setEditedArcName}
                    placeholder="Arc name"
                    label="Arc name"
                  />
                  <Input
                    value={editedArcNarrative}
                    onChangeText={setEditedArcNarrative}
                    placeholder="One-line description"
                    label="One-line description"
                    multiline
                  />
                  <Text style={styles.bodyText}>
                    We’ll keep it simple: a few clear steps you can actually do.
                  </Text>
                  <View style={styles.inlineActions}>
                    <Button style={styles.primaryButton} onPress={handleConfirmSuggestedArc}>
                      <Text style={styles.primaryButtonLabel}>Looks good – use this</Text>
                    </Button>
                    <Button variant="ghost" onPress={handleGenerateArc}>
                      <Text style={styles.linkLabel}>Get a different one</Text>
                    </Button>
                  </View>
                </>
              ) : null}
            </StepCard>
          )}

          {arcManualVisible && (
            <StepCard
              label={STEP_LABELS.arcManual}
              title="Name your Arc"
              completed={isStepCompleted('arcManual')}
            >
              <Text style={styles.bodyText}>Okay. Let’s start with a name for this Arc.</Text>
              <Text style={styles.bodyText}>What’s one thing you want to make real in your life?</Text>
              <Input
                value={manualArcName}
                onChangeText={setManualArcName}
                placeholder="e.g., Be a steady creative"
                returnKeyType="done"
                onSubmitEditing={handleManualArcSubmit}
              />
              <Button
                style={styles.primaryButton}
                onPress={handleManualArcSubmit}
                disabled={manualArcName.trim().length < 3}
              >
                <Text style={styles.primaryButtonLabel}>Save Arc name</Text>
              </Button>
            </StepCard>
          )}

          {closingVisible && (
            <StepCard label={STEP_LABELS.closing} title="You’re all set" completed>
              <Text style={styles.bodyText}>
                You’re all set, {displayName || 'friend'}.
              </Text>
              <Text style={styles.bodyText}>
                From here, you can:
              </Text>
              <Text style={styles.bodyText}>– Break your Arc into smaller steps</Text>
              <Text style={styles.bodyText}>– Add goals or habits</Text>
              <Text style={styles.bodyText}>– Or just ask me, “What should I do next?”</Text>
              <Text style={styles.bodyText}>
                {finalArcName ? `${finalArcName} is ready.` : 'Your first Arc is ready.'} I’ll keep
                things simple and focused as you go. 🌱
              </Text>
              <Button style={styles.primaryButton} onPress={handleCloseFlow}>
                <Text style={styles.primaryButtonLabel}>Enter Takado</Text>
              </Button>
            </StepCard>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type StepCardProps = {
  label: string;
  title: string;
  children: ReactNode;
  completed?: boolean;
};

function StepCard({ label, title, children, completed }: StepCardProps) {
  return (
    <View style={[styles.stepCard, completed && styles.stepCardCompleted]}>
      <Text style={styles.stepLabel}>{label}</Text>
      <Text style={styles.stepTitle}>{title}</Text>
      <View style={styles.stepBody}>{children}</View>
    </View>
  );
}

function pickAgeRange(age: number): AgeRange {
  const bucket = AGE_BUCKETS.find((entry) => age >= entry.min && age <= entry.max);
  return bucket ? bucket.range : '65-plus';
}

function buildArcRecord(payload: {
  name: string;
  narrative?: string;
  status?: Arc['status'];
}): Arc {
  const timestamp = new Date().toISOString();
  return {
    id: `arc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: payload.name,
    narrative: payload.narrative,
    status: payload.status ?? 'active',
    startDate: timestamp,
    endDate: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: (spacing['2xl'] ?? spacing.xl) * 2,
  },
  timeline: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  brandWordmark: {
    ...typography.brand,
    color: colors.textPrimary,
  },
  stepCard: {
    backgroundColor: colors.card,
    borderRadius: spacing.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    gap: spacing.md,
  },
  stepCardCompleted: {
    borderColor: 'rgba(15,23,42,0.15)',
    opacity: 0.95,
  },
  stepLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  stepTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  stepBody: {
    gap: spacing.md,
  },
  bodyText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  ackText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  primaryButton: {
    width: '100%',
  },
  primaryButtonLabel: {
    ...typography.body,
    color: colors.canvas,
    fontWeight: '600',
  },
  outlineButtonLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  linkLabel: {
    ...typography.bodySm,
    color: colors.accent,
    fontWeight: '600',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.shell,
  },
  chipSelected: {
    borderColor: colors.accent,
    backgroundColor: '#DCFCE7',
  },
  chipLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  chipLabelSelected: {
    color: colors.accent,
    fontWeight: '600',
  },
  inlineActions: {
    flexDirection: 'column',
    gap: spacing.sm,
  },
  avatarPreview: {
    alignItems: 'center',
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorText: {
    ...typography.bodySm,
    color: '#B91C1C',
  },
});


