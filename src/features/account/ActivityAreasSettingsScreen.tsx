import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { getActiveActivityAreas } from '../../domain/activityAreas';
import { useAppStore } from '../../store/useAppStore';
import { colors, spacing, typography } from '../../theme';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { Heading, HStack, Text, VStack } from '../../ui/primitives';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'SettingsActivityAreas'>;

export function ActivityAreasSettingsScreen() {
  const navigation = useNavigation<Nav>();
  const areas = useAppStore((state) => state.activityAreas);
  const addActivityArea = useAppStore((state) => state.addActivityArea);
  const renameActivityArea = useAppStore((state) => state.renameActivityArea);
  const archiveActivityArea = useAppStore((state) => state.archiveActivityArea);
  const [newAreaLabel, setNewAreaLabel] = useState('');
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');

  const activeAreas = getActiveActivityAreas(areas);

  function handleAddArea() {
    const label = newAreaLabel.trim();
    if (!label) return;
    addActivityArea(label);
    setNewAreaLabel('');
  }

  function startEditing(areaId: string, currentLabel: string) {
    setEditingAreaId(areaId);
    setEditingLabel(currentLabel);
  }

  function saveEditing() {
    if (!editingAreaId) return;
    const label = editingLabel.trim();
    if (label) renameActivityArea(editingAreaId, label);
    setEditingAreaId(null);
    setEditingLabel('');
  }

  return (
    <AppShell>
      <PageHeader title="Areas" onPressBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <VStack space="md">
          <View style={styles.panel}>
            <Heading variant="sm">Your areas</Heading>
            <Text variant="bodySm" tone="secondary">
              Areas help Kwilt schedule work in the part of life where it usually fits.
            </Text>
            {activeAreas.map((area) => {
              const isEditing = editingAreaId === area.id;
              return (
                <HStack key={area.id} alignItems="center" justifyContent="space-between" style={styles.row}>
                  <View style={styles.rowText}>
                    {isEditing ? (
                      <TextInput
                        value={editingLabel}
                        onChangeText={setEditingLabel}
                        autoFocus
                        returnKeyType="done"
                        onSubmitEditing={saveEditing}
                        placeholder="Area name"
                        placeholderTextColor={colors.muted}
                        style={styles.input}
                      />
                    ) : (
                      <>
                        <Text variant="body">{area.label}</Text>
                        <Text variant="bodySm" tone="secondary">
                          Usually fits: {area.scheduling?.fallbackMode === 'work' ? 'work hours' : 'personal time'}
                        </Text>
                      </>
                    )}
                  </View>
                  <HStack space="xs">
                    {isEditing ? (
                      <Button label="Save" onPress={saveEditing} disabled={!editingLabel.trim()} />
                    ) : (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Rename ${area.label}`}
                        onPress={() => startEditing(area.id, area.label)}
                        style={styles.iconButton}
                      >
                        <Icon name="edit" size={18} color={colors.textPrimary} />
                      </Pressable>
                    )}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Archive ${area.label}`}
                      onPress={() => archiveActivityArea(area.id)}
                      style={styles.iconButton}
                    >
                      <Icon name="close" size={18} color={colors.textSecondary} />
                    </Pressable>
                  </HStack>
                </HStack>
              );
            })}
          </View>
          <View style={styles.panel}>
            <Heading variant="sm">Add area</Heading>
            <HStack space="sm" alignItems="center">
              <TextInput
                value={newAreaLabel}
                onChangeText={setNewAreaLabel}
                placeholder="Church, School, Side project"
                placeholderTextColor={colors.muted}
                style={styles.input}
                returnKeyType="done"
                onSubmitEditing={handleAddArea}
              />
              <Button label="Add" onPress={handleAddArea} disabled={!newAreaLabel.trim()} />
            </HStack>
          </View>
        </VStack>
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  panel: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: {
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    color: colors.textPrimary,
    fontSize: typography.body.fontSize,
  },
});
