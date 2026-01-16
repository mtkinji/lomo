import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { HStack, VStack, Text } from '../../ui/primitives';
import { Icon } from '../../ui/Icon';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography, fonts } from '../../theme/typography';
import { HapticsService } from '../../services/HapticsService';
import { templateToView, BLANK_TEMPLATES } from './viewTemplates';
import type { ActivityView, Goal } from '../../domain/types';

export type InlineViewCreatorProps = {
  /** User's goals for AI context */
  goals: Goal[];
  /** Callback when a view is created */
  onCreateView: (view: ActivityView) => void;
  /** Callback when AI view creation is requested */
  onCreateAiView?: (prompt: string) => void;
  /** Whether AI view creation is in progress */
  isAiLoading?: boolean;
  /** Callback to close the creator */
  onClose?: () => void;
};

/**
 * LayoutCard - A large, friendly card for choosing List or Board
 */
function LayoutCard({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: 'viewList' | 'viewKanban';
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.layoutCard,
        pressed && styles.layoutCardPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.layoutIconContainer}>
        <Icon name={icon} size={32} color={colors.textPrimary} />
      </View>
      <Text style={styles.layoutTitle}>{title}</Text>
      <Text style={styles.layoutSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}

/**
 * InlineViewCreator - Simplified component for creating views
 */
export function InlineViewCreator({
  goals,
  onCreateView,
  onCreateAiView,
  isAiLoading = false,
  onClose,
}: InlineViewCreatorProps) {
  const [showAiInput, setShowAiInput] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const inputRef = useRef<TextInput>(null);

  const handleCreateList = useCallback(() => {
    void HapticsService.trigger('canvas.selection');
    const listTemplate = BLANK_TEMPLATES.find((t) => t.id === 'template-blank-list');
    if (listTemplate) {
      const view = templateToView(listTemplate, 'My List');
      onCreateView(view);
    }
  }, [onCreateView]);

  const handleCreateBoard = useCallback(() => {
    void HapticsService.trigger('canvas.selection');
    const boardTemplate = BLANK_TEMPLATES.find((t) => t.id === 'template-blank-board');
    if (boardTemplate) {
      const view = templateToView(boardTemplate, 'My Board');
      onCreateView(view);
    }
  }, [onCreateView]);

  const handleAiSubmit = useCallback(() => {
    const trimmed = aiPrompt.trim();
    if (!trimmed || !onCreateAiView) return;
    
    Keyboard.dismiss();
    void HapticsService.trigger('canvas.selection');
    onCreateAiView(trimmed);
  }, [aiPrompt, onCreateAiView]);

  const handleToggleAi = useCallback(() => {
    setShowAiInput((prev) => !prev);
    if (!showAiInput) {
      // Focus the input when opening
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [showAiInput]);

  const hasAiSupport = !!onCreateAiView;

  return (
    <View style={styles.container}>
      <VStack space="lg">
        {/* Main choices */}
        <Text style={styles.prompt}>What kind of view?</Text>
        
        <HStack space="md" style={styles.cardsRow}>
          <LayoutCard
            icon="viewList"
            title="List"
            subtitle="Scrollable list"
            onPress={handleCreateList}
          />
          <LayoutCard
            icon="viewKanban"
            title="Board"
            subtitle="Kanban columns"
            onPress={handleCreateBoard}
          />
        </HStack>

        {/* AI option */}
        {hasAiSupport && (
          <View style={styles.aiSection}>
            {!showAiInput ? (
              <Pressable
                style={styles.aiToggle}
                onPress={handleToggleAi}
              >
                <Icon name="sparkles" size={16} color={colors.accent} />
                <Text style={styles.aiToggleText}>
                  Or describe what you want to see...
                </Text>
              </Pressable>
            ) : (
              <View style={styles.aiInputContainer}>
                <Icon
                  name="sparkles"
                  size={18}
                  color={colors.accent}
                  style={styles.aiIcon}
                />
                <TextInput
                  ref={inputRef}
                  style={styles.aiInput}
                  placeholder="e.g., High priority tasks due this week"
                  placeholderTextColor={colors.muted}
                  value={aiPrompt}
                  onChangeText={setAiPrompt}
                  onSubmitEditing={handleAiSubmit}
                  returnKeyType="go"
                  editable={!isAiLoading}
                  multiline={false}
                  autoFocus
                />
                {isAiLoading ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  aiPrompt.trim().length > 0 && (
                    <Pressable
                      onPress={handleAiSubmit}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Icon name="arrowUp" size={20} color={colors.accent} />
                    </Pressable>
                  )
                )}
              </View>
            )}
          </View>
        )}
      </VStack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
  },
  prompt: {
    ...typography.titleSm,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  cardsRow: {
    justifyContent: 'center',
  },
  layoutCard: {
    flex: 1,
    maxWidth: 160,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  layoutCardPressed: {
    backgroundColor: colors.fieldFill,
  },
  layoutIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.fieldFill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  layoutTitle: {
    ...typography.body,
    fontFamily: fonts.semibold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  layoutSubtitle: {
    ...typography.bodySm,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 2,
  },
  aiSection: {
    marginTop: spacing.sm,
  },
  aiToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  aiToggleText: {
    ...typography.bodySm,
    color: colors.accent,
  },
  aiInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.fieldFill,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  aiIcon: {
    marginRight: spacing.xs,
  },
  aiInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: 0,
    minHeight: 24,
  },
});

