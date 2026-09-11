import { Pressable } from '@/src/ui/HapticPressable';
import React, { useState, useCallback, useRef } from 'react';
import { View, type TextInput, StyleSheet, Keyboard, type StyleProp, type ViewStyle } from 'react-native';
import { HStack, VStack, Text } from '../../ui/primitives';
import { Input } from '../../ui/Input';
import { Icon } from '../../ui/Icon';
import { Card } from '../../ui/Card';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography, fonts } from '../../theme/typography';
import { HapticsService } from '../../services/HapticsService';
import { templateToView, BLANK_TEMPLATES } from './viewTemplates';
import type { ActivityView, Goal } from '../../domain/types';
import { KwiltLoader } from '../../ui/KwiltLoader';

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
  iconContainerStyle,
  iconColor,
  onPress,
}: {
  icon: 'viewList' | 'viewKanban';
  title: string;
  subtitle: string;
  iconContainerStyle?: StyleProp<ViewStyle>;
  iconColor?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.layoutCardPressable,
        pressed && styles.layoutCardPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
    >
      {({ pressed }) => (
        <Card
          padding="none"
          marginVertical={0}
          elevation={pressed ? 'lift' : 'soft'}
          style={styles.layoutCardInner}
        >
          <View style={[styles.layoutIconContainer, iconContainerStyle]}>
            <Icon name={icon} size={32} color={iconColor ?? colors.textPrimary} />
          </View>
          <Text style={styles.layoutTitle}>{title}</Text>
          <Text style={styles.layoutSubtitle}>{subtitle}</Text>
        </Card>
      )}
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
        <HStack space="md" style={styles.cardsRow}>
          <LayoutCard
            icon="viewList"
            title="List"
            subtitle="Scrollable list"
            iconContainerStyle={styles.layoutIconContainerList}
            iconColor={colors.quiltBlue800}
            onPress={handleCreateList}
          />
          <LayoutCard
            icon="viewKanban"
            title="Board"
            subtitle="Kanban columns"
            iconContainerStyle={styles.layoutIconContainerBoard}
            iconColor={colors.pine800}
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
              <Input
                accessibilityLabel="Describe a new view"
                ref={inputRef}
                leadingIcon="sparkles"
                placeholder="e.g., High priority to-dos due this week"
                value={aiPrompt}
                onChangeText={setAiPrompt}
                onSubmitEditing={handleAiSubmit}
                returnKeyType="go"
                editable={!isAiLoading}
                multiline={false}
                autoFocus
                trailingElement={isAiLoading ? (
                  <KwiltLoader size="small" color={colors.accent} />
                ) : aiPrompt.trim().length > 0 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Create AI view"
                    onPress={handleAiSubmit}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Icon name="arrowUp" size={20} color={colors.accent} />
                  </Pressable>
                ) : undefined}
              />
            )}
          </View>
        )}
      </VStack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  cardsRow: {
    justifyContent: 'center',
  },
  layoutCardPressable: {
    flex: 1,
    maxWidth: 168,
  },
  layoutCardInner: {
    width: '100%',
    padding: spacing.lg,
    alignItems: 'center',
  },
  layoutCardPressed: {
    transform: [{ scale: 0.99 }],
  },
  layoutIconContainer: {
    width: 68,
    height: 68,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  layoutIconContainerList: {
    backgroundColor: colors.quiltBlue100,
  },
  layoutIconContainerBoard: {
    backgroundColor: colors.pine100,
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
    marginTop: 4,
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
});
