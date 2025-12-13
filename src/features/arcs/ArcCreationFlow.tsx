import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button } from '../../ui/Button';
import { Text } from '../../ui/primitives';
import { QuestionCard } from '../../ui/QuestionCard';
import { Input } from '../../ui/Input';
import { ButtonLabel } from '../../ui/Typography';
import { colors, spacing, typography } from '../../theme';
import { useWorkflowRuntime } from '../ai/WorkflowRuntimeContext';
import type { ChatTimelineController } from '../ai/AiChatScreen';
import type {
  ArchetypeAdmiredQualityId,
  ArchetypeRoleModelTypeId,
  ArchetypeRoleModelWhyId,
  ArchetypeSpecificRoleModelId,
} from '../../domain/archetypeTaps';
import {
  ARCHETYPE_ADMIRED_QUALITIES,
  ARCHETYPE_ROLE_MODEL_TYPES,
  ARCHETYPE_ROLE_MODEL_WHY,
  ARCHETYPE_SPECIFIC_ROLE_MODELS,
} from '../../domain/archetypeTaps';

type ArcCreationFlowProps = {
  /**
   * Optional handle to the shared chat surface. This flow treats the chat
   * controller as its only link to the visible thread: it can mirror user
   * answers into the transcript, but it never mounts its own chat UI.
   */
  chatControllerRef?: React.RefObject<ChatTimelineController | null>;
};

/**
 * Lightweight presenter for the Arc creation workflow.
 *
 * This component owns the initial context-collection card for new Arc
 * creation and talks to the agent runtime only through
 * `WorkflowRuntimeContext` + `ChatTimelineController` so that all messages
 * still flow through the shared AgentWorkspace + AiChatPane timeline.
 */
export function ArcCreationFlow({ chatControllerRef }: ArcCreationFlowProps) {
  const workflowRuntime = useWorkflowRuntime();

  const definition = workflowRuntime?.definition;
  const instance = workflowRuntime?.instance;

  const isArcCreationWorkflow = definition?.chatMode === 'arcCreation';
  const currentStepId = instance?.currentStepId;

  const isContextStepActive =
    isArcCreationWorkflow && (currentStepId === 'context_collect' || !currentStepId);

  const [desireText, setDesireText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPersonalization, setShowPersonalization] = useState(false);

  // Hybrid archetype taps (optional): boosts felt accuracy without forcing typing.
  const [roleModelTypeId, setRoleModelTypeId] = useState<ArchetypeRoleModelTypeId | null>(null);
  const [specificRoleModelId, setSpecificRoleModelId] = useState<
    ArchetypeSpecificRoleModelId | 'none' | 'not_sure' | null
  >(null);
  const [roleModelWhyId, setRoleModelWhyId] = useState<ArchetypeRoleModelWhyId | null>(null);
  const [admiredQualityIds, setAdmiredQualityIds] = useState<ArchetypeAdmiredQualityId[]>([]);

  const labelFor = <T extends { id: string; label: string }>(
    options: T[],
    id: string | null | undefined
  ): string | null => {
    if (!id) return null;
    return options.find((o) => o.id === id)?.label ?? null;
  };

  const toggleQuality = (id: ArchetypeAdmiredQualityId) => {
    setAdmiredQualityIds((current) => {
      if (current.includes(id)) {
        return current.filter((q) => q !== id);
      }
      // Keep it small to reduce survey length + keep signal crisp.
      if (current.length >= 3) {
        return current;
      }
      return [...current, id];
    });
  };

  const handleSubmit = useCallback(async () => {
    if (!workflowRuntime || !isArcCreationWorkflow) {
      return;
    }

    const trimmed = desireText.trim();
    if (!trimmed) {
      return;
    }

    // Record structured context on the workflow so future steps (and the
    // host app) can reason about what the user shared.
    const roleModelTypeLabel = labelFor(ARCHETYPE_ROLE_MODEL_TYPES, roleModelTypeId);
    const specificRoleModelLabel =
      specificRoleModelId === 'none'
        ? 'No one specific'
        : specificRoleModelId === 'not_sure'
        ? 'Not sure'
        : labelFor(ARCHETYPE_SPECIFIC_ROLE_MODELS, specificRoleModelId);
    const roleModelWhyLabel = labelFor(ARCHETYPE_ROLE_MODEL_WHY, roleModelWhyId);
    const admiredLabels = admiredQualityIds
      .map((id) => labelFor(ARCHETYPE_ADMIRED_QUALITIES, id))
      .filter((l): l is string => Boolean(l));

    workflowRuntime.completeStep('context_collect', {
      prompt: trimmed,
      // These extra fields aren't required by the workflow schema, but they
      // become visible in chat and can guide the model toward better felt accuracy.
      roleModelType: roleModelTypeLabel ?? null,
      specificRoleModel: specificRoleModelLabel ?? null,
      roleModelWhy: roleModelWhyLabel ?? null,
      admiredQualities: admiredLabels.length ? admiredLabels : null,
    });

    // Mirror the answer into the shared chat timeline so the thread clearly
    // shows what the user told Arc AI, even though the input came from a
    // card instead of the free-form composer.
    const controller = chatControllerRef?.current;
    if (controller) {
      controller.appendUserMessage(trimmed);
      // Mirror optional archetype signals into chat so the Arc coach model sees them.
      if (roleModelTypeLabel || specificRoleModelLabel || roleModelWhyLabel || admiredLabels.length) {
        const lines = [
          'Role model signals (optional):',
          roleModelTypeLabel ? `- People I look up to: ${roleModelTypeLabel}` : null,
          specificRoleModelLabel ? `- Someone specific: ${specificRoleModelLabel}` : null,
          roleModelWhyLabel ? `- Why: ${roleModelWhyLabel}` : null,
          admiredLabels.length ? `- What I admire: ${admiredLabels.join(', ')}` : null,
        ].filter((l): l is string => Boolean(l));
        controller.appendUserMessage(lines.join('\n'));
      }
    }
    // Hand off to the shared workflow runtime so it can invoke the
    // agent-driven generation step and manage progress UI.
    try {
      setSubmitting(true);
      await workflowRuntime.invokeAgentStep?.({ stepId: 'agent_generate_arc' });
    } finally {
      setSubmitting(false);
    }
  }, [
    chatControllerRef,
    desireText,
    isArcCreationWorkflow,
    workflowRuntime,
    roleModelTypeId,
    specificRoleModelId,
    roleModelWhyId,
    admiredQualityIds,
  ]);

  // Only render the card while the context-collection step is active. Once the
  // workflow advances, Arc creation continues as a normal chat-driven flow.
  if (!isContextStepActive) {
    return null;
  }

  return (
    <QuestionCard
      title="Looking ahead, what’s one big thing you’d love to bring to life?"
      style={styles.card}
    >
      <View style={styles.body}>
        <Input
          // label="In your own words"
          placeholder="e.g., Build a small timber-frame studio in the woods."
          multiline
          numberOfLines={4}
          value={desireText}
          onChangeText={setDesireText}
        />

        <Pressable
          accessibilityRole="button"
          onPress={() => setShowPersonalization((v) => !v)}
          style={styles.personalizeToggle}
        >
          <Text style={styles.personalizeToggleText}>
            {showPersonalization ? 'Hide personalization' : 'Add personalization (optional)'}
          </Text>
        </Pressable>

        {showPersonalization ? (
          <View style={styles.personalizeBlock}>
            <Text style={styles.sectionLabel}>Who do you look up to?</Text>
            <View style={styles.chipGrid}>
              {ARCHETYPE_ROLE_MODEL_TYPES.map((option) => {
                const selected = roleModelTypeId === option.id;
                return (
                  <Button
                    key={option.id}
                    size="small"
                    variant="ghost"
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setRoleModelTypeId(option.id)}
                  >
                    <ButtonLabel size="sm">{option.label}</ButtonLabel>
                  </Button>
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>Anyone specific? (optional)</Text>
            <View style={styles.chipGrid}>
              <Button
                size="small"
                variant="ghost"
                style={[styles.chip, specificRoleModelId === 'none' && styles.chipSelected]}
                onPress={() => setSpecificRoleModelId('none')}
              >
                <ButtonLabel size="sm">No one specific</ButtonLabel>
              </Button>
              <Button
                size="small"
                variant="ghost"
                style={[styles.chip, specificRoleModelId === 'not_sure' && styles.chipSelected]}
                onPress={() => setSpecificRoleModelId('not_sure')}
              >
                <ButtonLabel size="sm">Not sure</ButtonLabel>
              </Button>
              {ARCHETYPE_SPECIFIC_ROLE_MODELS.map((option) => {
                const selected = specificRoleModelId === option.id;
                return (
                  <Button
                    key={option.id}
                    size="small"
                    variant="ghost"
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setSpecificRoleModelId(option.id)}
                  >
                    <ButtonLabel size="sm">{option.label}</ButtonLabel>
                  </Button>
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>Why them? (optional)</Text>
            <View style={styles.chipGrid}>
              {ARCHETYPE_ROLE_MODEL_WHY.map((option) => {
                const selected = roleModelWhyId === option.id;
                return (
                  <Button
                    key={option.id}
                    size="small"
                    variant="ghost"
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setRoleModelWhyId(option.id)}
                  >
                    <ButtonLabel size="sm">{option.label}</ButtonLabel>
                  </Button>
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>What do you admire? (pick up to 3)</Text>
            <View style={styles.chipGrid}>
              {ARCHETYPE_ADMIRED_QUALITIES.map((option) => {
                const selected = admiredQualityIds.includes(option.id);
                return (
                  <Button
                    key={option.id}
                    size="small"
                    variant="ghost"
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => toggleQuality(option.id)}
                  >
                    <ButtonLabel size="sm">{option.label}</ButtonLabel>
                  </Button>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={styles.actionsRow}>
          <Button
            style={styles.primaryButton}
            onPress={() => {
              void handleSubmit();
            }}
            disabled={desireText.trim().length === 0 || submitting}
          >
            <ButtonLabel size="md" tone="inverse">
              {submitting ? 'Thinking…' : 'Continue'}
            </ButtonLabel>
          </Button>
        </View>
      </View>
    </QuestionCard>
  );
}

const styles = StyleSheet.create({
  card: {
    // Let AiChatPane's `stepCardHost` control the vertical offset so the card
    // sits directly under the Agent header without extra stacked margins.
    marginTop: 0,
  },
  body: {
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  personalizeToggle: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  personalizeToggleText: {
    ...typography.caption,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  personalizeBlock: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.sm,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  actionsRow: {
    marginTop: spacing.sm,
  },
  primaryButton: {
    alignSelf: 'stretch',
  },
});

