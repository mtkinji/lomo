import { useMemo, useState } from 'react';
import {
  StyleSheet,
  FlatList,
  Modal,
  View,
  TextInput,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import {
  VStack,
  Heading,
  Text,
  Button,
  Icon as GluestackIcon,
  HStack,
  Badge,
  Pressable,
} from '@gluestack-ui/themed';
import { AppShell } from '../../ui/layout/AppShell';
import { colors, spacing, typography } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import { Icon } from '../../ui/Icon';
import { useNavigation } from '@react-navigation/native';
import { ArcsStackParamList } from '../../navigation/RootNavigator';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { generateArcs, GeneratedArc } from '../../services/ai';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function ArcsScreen() {
  const arcs = useAppStore((state) => state.arcs);
  const addArc = useAppStore((state) => state.addArc);
  const navigation = useNavigation<NativeStackNavigationProp<ArcsStackParamList>>();
  const insets = useSafeAreaInsets();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [timeHorizon, setTimeHorizon] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<GeneratedArc[]>([]);
  const [error, setError] = useState('');

  const empty = arcs.length === 0;

  return (
    <AppShell>
      <VStack space="lg">
        <VStack space="xs" style={styles.header}>
          <Heading style={styles.title}>Arcs</Heading>
          <Text style={styles.subtitle}>Who you&apos;re becoming</Text>
        </VStack>
        <Button
          variant="solid"
          action="primary"
          borderRadius="$full"
          alignSelf="flex-start"
          onPress={() => setIsModalVisible(true)}
        >
          <HStack space="sm" alignItems="center">
            <GluestackIcon as={() => <Icon name="today" size={18} color="#020617" />} />
            <Text style={styles.buttonText}>New Arc</Text>
          </HStack>
        </Button>

        {empty ? (
          <VStack space="sm" style={styles.emptyState}>
            <Heading style={styles.emptyTitle}>No arcs yet</Heading>
            <Text style={styles.emptyBody}>
              Arcs are long-horizon identity directions like Discipleship, Family Stewardship, or
              Making &amp; Embodied Creativity. We&apos;ll use AI to help you define them.
            </Text>
          </VStack>
        ) : (
          <FlatList
            data={arcs}
            keyExtractor={(arc) => arc.id}
            ItemSeparatorComponent={() => <VStack style={styles.separator} />}
            renderItem={({ item }) => (
                <Pressable
                  style={styles.arcCard}
                  onPress={() => navigation.navigate('ArcDetail', { arcId: item.id })}
                >
                <VStack space="sm">
                  <HStack justifyContent="space-between" alignItems="center">
                    <Heading style={styles.arcTitle}>{item.name}</Heading>
                    <Badge variant="outline" action="info">
                      <Text style={styles.badgeText}>{item.status}</Text>
                    </Badge>
                  </HStack>
                  {item.narrative && <Text style={styles.arcNarrative}>{item.narrative}</Text>}
                </VStack>
              </Pressable>
            )}
          />
        )}
      </VStack>
      <NewArcModal
        visible={isModalVisible}
        onClose={() => {
          setIsModalVisible(false);
          setPrompt('');
          setTimeHorizon('');
          setAdditionalContext('');
          setSuggestions([]);
          setError('');
          setCurrentStep(0);
        }}
        prompt={prompt}
        setPrompt={setPrompt}
        timeHorizon={timeHorizon}
        setTimeHorizon={setTimeHorizon}
        additionalContext={additionalContext}
        setAdditionalContext={setAdditionalContext}
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
        loading={loading}
        suggestions={suggestions}
        error={error}
        onGenerate={async () => {
          setLoading(true);
          setError('');
          try {
            const result = await generateArcs({ prompt, timeHorizon, additionalContext });
            setSuggestions(result);
          } catch (err) {
            console.error('generateArcs failed', err);
            setError('Something went wrong asking LOMO. Try again.');
          } finally {
            setLoading(false);
          }
        }}
        onAdopt={(suggestion) => {
          const now = new Date().toISOString();
          addArc({
            id: `arc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: suggestion.name,
            narrative: suggestion.narrative,
            northStar: suggestion.northStar,
            status: suggestion.status,
            startDate: now,
            endDate: null,
            createdAt: now,
            updatedAt: now,
          });
          setIsModalVisible(false);
          setPrompt('');
          setTimeHorizon('');
          setAdditionalContext('');
          setSuggestions([]);
          setCurrentStep(0);
        }}
        insetTop={insets.top}
      />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.titleLg,
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: spacing.xs,
    ...typography.body,
    color: colors.textSecondary,
  },
  emptyState: {
    marginTop: spacing['2xl'],
  },
  emptyTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  buttonText: {
    ...typography.body,
    color: colors.canvas,
  },
  arcCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },
  arcTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  arcNarrative: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  badgeText: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  separator: {
    height: spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },
  modalContent: {
    flex: 1,
    backgroundColor: colors.canvas,
    borderRadius: 32,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  modalBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  progressText: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  questionTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  modalLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    minHeight: 60,
    color: colors.textPrimary,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
  },
  errorText: {
    ...typography.bodySm,
    color: colors.warning,
    marginTop: spacing.sm,
  },
  suggestionCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: spacing.lg,
    backgroundColor: '#0f172a',
  },
});

type NewArcModalProps = {
  visible: boolean;
  onClose: () => void;
  prompt: string;
  setPrompt: (value: string) => void;
  timeHorizon: string;
  setTimeHorizon: (value: string) => void;
  additionalContext: string;
  setAdditionalContext: (value: string) => void;
  currentStep: number;
  setCurrentStep: (value: number) => void;
  loading: boolean;
  suggestions: GeneratedArc[];
  error: string;
  onGenerate: () => void;
  onAdopt: (suggestion: GeneratedArc) => void;
  insetTop: number;
};

function NewArcModal({
  visible,
  onClose,
  prompt,
  setPrompt,
  timeHorizon,
  setTimeHorizon,
  additionalContext,
  setAdditionalContext,
  currentStep,
  setCurrentStep,
  loading,
  suggestions,
  error,
  onGenerate,
  onAdopt,
  insetTop,
}: NewArcModalProps) {
  const QUESTIONS = [
    {
      title: 'Where are you most hungry for growth?',
      placeholder: 'e.g. balancing leadership with health',
      value: prompt,
      onChange: setPrompt,
      required: true,
      multiline: true,
    },
    {
      title: 'Time horizon',
      placeholder: 'Next 90 days',
      value: timeHorizon,
      onChange: setTimeHorizon,
      required: false,
      multiline: false,
    },
    {
      title: 'Any non-negotiables or guidance?',
      placeholder: 'Faith anchors, family priorities, etc.',
      value: additionalContext,
      onChange: setAdditionalContext,
      required: false,
      multiline: true,
    },
  ] as const;

  const atResults = suggestions.length > 0;
  const atLoading = loading;
  const showQuestions = !atResults && !atLoading;
  const totalSteps = QUESTIONS.length;
  const currentQuestion = QUESTIONS[currentStep] ?? QUESTIONS[0];
  const isFinalStep = currentStep === totalSteps - 1;
  const nextDisabled =
    currentQuestion.required && currentQuestion.value.trim().length === 0;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalContent, { paddingTop: spacing.xl + insetTop }]}>
          <Heading style={styles.modalTitle}>Ask LOMO to draft Arcs</Heading>
          <Text style={styles.modalBody}>
            Answer focused prompts so LOMO can guide you toward the right identity directions.
          </Text>
          {showQuestions && (
            <>
              <Text style={styles.progressText}>
                Step {currentStep + 1} / {totalSteps}
              </Text>
              <Text style={styles.questionTitle}>{currentQuestion.title}</Text>
              <TextInput
                style={[
                  styles.input,
                  currentQuestion.multiline && { minHeight: 120, textAlignVertical: 'top' },
                ]}
                multiline={currentQuestion.multiline}
                placeholder={currentQuestion.placeholder}
                placeholderTextColor="#6B7280"
                value={currentQuestion.value}
                onChangeText={currentQuestion.onChange}
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <HStack justifyContent="space-between" marginTop={spacing.lg}>
                <Button
                  variant="outline"
                  isDisabled={currentStep === 0}
                  onPress={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
                  flex={1}
                  marginRight={spacing.sm}
                >
                  <Text style={styles.linkText}>Back</Text>
                </Button>
                <Button
                  flex={1}
                  isDisabled={nextDisabled}
                  onPress={() => {
                    if (isFinalStep) {
                      onGenerate();
                    } else {
                      setCurrentStep((prev) => Math.min(totalSteps - 1, prev + 1));
                    }
                  }}
                >
                  <Text style={styles.buttonText}>
                    {isFinalStep ? 'Ask LOMO' : 'Next'}
                  </Text>
                </Button>
              </HStack>
            </>
          )}

          {atLoading && (
            <VStack alignItems="center" space="md" style={{ marginTop: spacing.xl }}>
              <ActivityIndicator size="large" color="#38BDF8" />
              <Text style={styles.modalBody}>Lomo is considering your season…</Text>
            </VStack>
          )}

          {atResults && (
            <ScrollView
              style={{ marginTop: spacing.lg }}
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              <Text style={styles.modalLabel}>Suggested Arcs</Text>
              <VStack space="md" style={{ marginTop: spacing.sm }}>
                {suggestions.map((suggestion) => (
                  <VStack key={suggestion.name} style={styles.suggestionCard} space="sm">
                    <Heading style={styles.arcTitle}>{suggestion.name}</Heading>
                    <Text style={styles.goalDescription}>{suggestion.northStar}</Text>
                    <Text style={styles.arcNarrative}>{suggestion.narrative}</Text>
                    <Button variant="outline" onPress={() => onAdopt(suggestion)}>
                      <Text style={styles.linkText}>Adopt Arc</Text>
                    </Button>
                  </VStack>
                ))}
              </VStack>
              <Button
                variant="link"
                onPress={() => {
                  setSuggestions([]);
                  setCurrentStep(0);
                }}
                style={{ marginTop: spacing.lg }}
              >
                <Text style={styles.linkText}>Ask again</Text>
              </Button>
            </ScrollView>
          )}

          <Button variant="link" onPress={onClose} style={{ marginTop: spacing.lg }}>
            <Text style={styles.linkText}>Close</Text>
          </Button>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}


