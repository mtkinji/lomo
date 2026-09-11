import { Pressable } from '@/src/ui/HapticPressable';
import { useState } from 'react';
import { Alert, Keyboard, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { getActiveActivityAreas } from '../../domain/activityAreas';
import { useAppStore } from '../../store/useAppStore';
import { colors, spacing } from '../../theme';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { KeyboardAwareScrollView } from '../../ui/KeyboardAwareScrollView';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { Heading, HStack, Input, Text, VStack } from '../../ui/primitives';
import { activityAreaActions } from './actions/activityAreaActionsBoundary';
import { activityAreaReviewReference } from './actions/activityAreaActions';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'SettingsActivityAreas'>;

export function ActivityAreasSettingsScreen() {
  const navigation = useNavigation<Nav>();
  const areas = useAppStore((state) => state.activityAreas);
  const [newAreaLabel, setNewAreaLabel] = useState('');
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');

  const activeAreas = getActiveActivityAreas(areas);

  function handleAddArea() {
    const label = newAreaLabel.trim();
    if (!label) return;
    try {
      activityAreaActions.create({ label });
      setNewAreaLabel('');
    } catch (error) {
      Alert.alert('Unable to add area', error instanceof Error ? error.message : 'Try again.');
    }
  }

  function startEditing(areaId: string, currentLabel: string) {
    setEditingAreaId(areaId);
    setEditingLabel(currentLabel);
  }

  function saveEditing() {
    if (!editingAreaId) return;
    const label = editingLabel.trim();
    const area = areas.find((item) => item.id === editingAreaId);
    if (!label || !area) return;
    try {
      activityAreaActions.update({ ...activityAreaReviewReference(area), label });
      Keyboard.dismiss();
      setEditingAreaId(null);
      setEditingLabel('');
    } catch (error) {
      Alert.alert('Unable to rename area', error instanceof Error ? error.message : 'Try again.');
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Areas"
        onPressBack={() => navigation.goBack()}
        rightElement={editingAreaId ? (
          <Button label="Done" variant="ghost" onPress={saveEditing} disabled={!editingLabel.trim()} />
        ) : null}
      />
      <KeyboardAwareScrollView contentContainerStyle={styles.content}>
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
                      <Input
                        value={editingLabel}
                        onChangeText={setEditingLabel}
                        autoFocus
                        returnKeyType="done"
                        enablesReturnKeyAutomatically
                        submitBehavior="submit"
                        onSubmitEditing={saveEditing}
                        placeholder="Area name"
                        accessibilityLabel="Area name"
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
                    {!isEditing ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Rename ${area.label}`}
                        onPress={() => startEditing(area.id, area.label)}
                        style={styles.iconButton}
                      >
                        <Icon name="edit" size={18} color={colors.textPrimary} />
                      </Pressable>
                    ) : null}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Archive ${area.label}`}
                      onPress={() => {
                        try {
                          activityAreaActions.delete(activityAreaReviewReference(area));
                        } catch (error) {
                          Alert.alert('Unable to archive area', error instanceof Error ? error.message : 'Try again.');
                        }
                      }}
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
              <Input
                value={newAreaLabel}
                onChangeText={setNewAreaLabel}
                placeholder="Church, School, Side project"
                accessibilityLabel="New area name"
                wrapperStyle={styles.inputLayout}
                returnKeyType="done"
                onSubmitEditing={handleAddArea}
              />
              <Button label="Add" onPress={handleAddArea} disabled={!newAreaLabel.trim()} />
            </HStack>
          </View>
        </VStack>
      </KeyboardAwareScrollView>
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
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputLayout: {
    width: 'auto',
    flex: 1,
    minWidth: 0,
  },
});
