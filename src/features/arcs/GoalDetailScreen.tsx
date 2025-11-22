import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import {
  StyleSheet,
  FlatList,
  View,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { VStack, Heading, Text, HStack } from '@gluestack-ui/themed';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../ui/layout/AppShell';
import { cardSurfaceStyle, colors, spacing, typography } from '../../theme';
import { useAppStore, defaultForceLevels, getCanonicalForce } from '../../store/useAppStore';
import type { ArcsStackParamList } from '../../navigation/RootNavigator';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Arc, ForceLevel } from '../../domain/types';
import { TakadoBottomSheet } from '../../ui/BottomSheet';

type GoalDetailRouteProp = RouteProp<ArcsStackParamList, 'GoalDetail'>;

const FORCE_ORDER: Array<string> = [
  'force-activity',
  'force-connection',
  'force-mastery',
  'force-spirituality',
];

export function GoalDetailScreen() {
  const route = useRoute<GoalDetailRouteProp>();
  const navigation = useNavigation();
  const { goalId, entryPoint } = route.params;

  const arcs = useAppStore((state) => state.arcs);
  const goals = useAppStore((state) => state.goals);
  const activities = useAppStore((state) => state.activities);
  const updateGoal = useAppStore((state) => state.updateGoal);
  const [arcSelectorVisible, setArcSelectorVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingField, setEditingField] = useState<'title' | 'description' | null>(null);
  const [editingForces, setEditingForces] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editForceIntent, setEditForceIntent] = useState<Record<string, ForceLevel>>(
    defaultForceLevels(0)
  );
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    const nav: any = navigation;

    // If we explicitly arrived here from the Goals tab, always send the user
    // back to the Goals canvas instead of stepping back through any existing
    // Arcs stack history.
    if (entryPoint === 'goalsTab') {
      if (nav && typeof nav.getParent === 'function') {
        const parent = nav.getParent();
        if (parent && typeof parent.navigate === 'function') {
          parent.navigate('Goals');
          return;
        }
      }
      if (nav && typeof nav.navigate === 'function') {
        nav.navigate('Goals');
        return;
      }
    }

    // When GoalDetail is pushed from ArcDetail inside the Arcs stack, we can
    // safely pop back to the previous Arcs screen.
    if (nav && typeof nav.canGoBack === 'function' && nav.canGoBack()) {
      nav.goBack();
      return;
    }

    // Fallback: if something unexpected happens with the stack history, treat
    // Goals as a safe home base.
    if (nav && typeof nav.getParent === 'function') {
      const parent = nav.getParent();
      if (parent && typeof parent.navigate === 'function') {
        parent.navigate('Goals');
        return;
      }
    }
    if (nav && typeof nav.navigate === 'function') {
      nav.navigate('Goals');
    }
  };

  const goal = useMemo(() => goals.find((g) => g.id === goalId), [goals, goalId]);
  const arc = useMemo(() => arcs.find((a) => a.id === goal?.arcId), [arcs, goal?.arcId]);
  const goalActivities = useMemo(
    () => activities.filter((activity) => activity.goalId === goalId),
    [activities, goalId]
  );

  if (!goal) {
    return (
      <AppShell>
        <VStack space="md">
          <Button
            size="icon"
            style={styles.backButton}
            onPress={handleBack}
            accessibilityLabel="Back"
          >
            <Icon name="arrowLeft" size={20} color={colors.canvas} strokeWidth={2.5} />
          </Button>
          <Text style={styles.emptyBody}>Goal not found.</Text>
        </VStack>
      </AppShell>
    );
  }

  useEffect(() => {
    setEditTitle(goal.title);
    setEditDescription(goal.description ?? '');
    setEditForceIntent({ ...defaultForceLevels(0), ...goal.forceIntent });
  }, [goal]);

  const startDateLabel = goal.startDate
    ? new Date(goal.startDate).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : undefined;

  const targetDateLabel = goal.targetDate
    ? new Date(goal.targetDate).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : undefined;

  const forceIntent = { ...defaultForceLevels(0), ...goal.forceIntent };
  const liveForceIntent = editingForces ? editForceIntent : forceIntent;

  const handleUpdateArc = (nextArcId: string | null) => {
    const timestamp = new Date().toISOString();
    updateGoal(goal.id, (prev) => ({
      ...prev,
      arcId: nextArcId ?? '',
      updatedAt: timestamp,
    }));
    setArcSelectorVisible(false);
  };

  const handleSaveGoal = (values: {
    title: string;
    description?: string;
    forceIntent: Record<string, ForceLevel>;
  }) => {
    const timestamp = new Date().toISOString();
    updateGoal(goal.id, (prev) => ({
      ...prev,
      title: values.title.trim(),
      description: values.description?.trim() || undefined,
      forceIntent: values.forceIntent,
      updatedAt: timestamp,
    }));
    setEditModalVisible(false);
  };

  const beginInlineEdit = (field: 'title' | 'description') => {
    // If a different field is currently editing, first commit that change.
    if (editingField && editingField !== field) {
      commitInlineEdit();
      return;
    }

    setEditingField(field);
    if (field === 'title') {
      setEditTitle(goal.title);
    } else {
      setEditDescription(goal.description ?? '');
    }
  };

  const commitInlineEdit = () => {
    if (!editingField) return;
    const timestamp = new Date().toISOString();

    if (editingField === 'title') {
      const nextTitle = editTitle.trim();
      if (!nextTitle || nextTitle === goal.title) {
        setEditingField(null);
        setEditTitle(goal.title);
        return;
      }
      updateGoal(goal.id, (prev) => ({
        ...prev,
        title: nextTitle,
        updatedAt: timestamp,
      }));
    }

    if (editingField === 'description') {
      const nextDescription = editDescription.trim();
      if (nextDescription === (goal.description ?? '')) {
        setEditingField(null);
        setEditDescription(goal.description ?? '');
        return;
      }
      updateGoal(goal.id, (prev) => ({
        ...prev,
        description: nextDescription || undefined,
        updatedAt: timestamp,
      }));
    }

    setEditingField(null);
  };

  const commitForceEdit = () => {
    if (!editingForces) return;
    const timestamp = new Date().toISOString();
    updateGoal(goal.id, (prev) => ({
      ...prev,
      forceIntent: editForceIntent,
      updatedAt: timestamp,
    }));
    setEditingForces(false);
  };

  const handleToggleForceEdit = () => {
    if (editingForces) {
      commitForceEdit();
      return;
    }
    // Enter edit mode with the latest store values
    setEditForceIntent({ ...defaultForceLevels(0), ...goal.forceIntent });
    setEditingForces(true);
  };

  const handleSetForceLevel = (forceId: string, level: ForceLevel) => {
    setEditForceIntent((prev) => ({
      ...prev,
      [forceId]: level,
    }));
  };

  const renderActivity = ({ item }: { item: (typeof activities)[number] }) => {
    const estimateHours =
      item.estimateMinutes != null ? Math.round((item.estimateMinutes ?? 0) / 60) : null;
    return (
      <VStack style={styles.activityCard} space="xs">
        <HStack justifyContent="space-between" alignItems="center">
          <Text style={styles.activityPhase}>{item.phase ?? 'Activity'}</Text>
          <Text style={styles.activityMeta}>
            {estimateHours != null ? `${estimateHours}h · ` : ''}
            {item.status.replace('_', ' ')}
          </Text>
        </HStack>
        <Text style={styles.activityTitle}>{item.title}</Text>
        {item.notes ? <Text style={styles.activityNotes}>{item.notes}</Text> : null}
      </VStack>
    );
  };

  return (
    <AppShell>
      {editingForces && (
        <TouchableOpacity
          activeOpacity={1}
          style={styles.forceEditOverlay}
          onPress={commitForceEdit}
        />
      )}
      <VStack space="lg">
        <HStack justifyContent="space-between" alignItems="center">
          <Button
            size="icon"
            style={styles.backButton}
            onPress={handleBack}
            accessibilityLabel="Back to Arc"
          >
            <Icon name="arrowLeft" size={20} color={colors.canvas} strokeWidth={2.5} />
          </Button>
          <Button
            size="icon"
            style={styles.optionsButton}
            accessibilityLabel="Goal options"
            onPress={() => setEditModalVisible(true)}
          >
            <Icon name="more" size={18} color={colors.canvas} />
          </Button>
        </HStack>

        <VStack space="sm">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => beginInlineEdit('title')}
            accessibilityRole="button"
            accessibilityLabel="Edit goal title"
          >
            <View
              style={[
                styles.editableField,
                editingField === 'title' && styles.editableFieldActive,
              ]}
            >
              {editingField === 'title' ? (
                <TextInput
                  style={styles.goalTitleInput}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  autoFocus
                  multiline
                  scrollEnabled={false}
                  onBlur={commitInlineEdit}
                />
              ) : (
                <Heading style={styles.goalTitle}>{goal.title}</Heading>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setArcSelectorVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={
              arc ? 'Change connected arc' : 'Connect this goal to an arc'
            }
          >
            <HStack
              alignItems="center"
              justifyContent="space-between"
              style={styles.arcRow}
            >
              <VStack space="xs" flex={1}>
                <Text style={styles.arcLabel}>
                  {arc ? 'Arc' : 'Not connected to an arc'}
                </Text>
                {arc ? (
                  <Text style={styles.arcName} numberOfLines={1} ellipsizeMode="tail">
                    {arc.name}
                  </Text>
                ) : (
                  <Text style={styles.arcEmptyHelper} numberOfLines={2}>
                    Connect this goal to a broader arc so it has a clear home.
                  </Text>
                )}
              </VStack>
              <HStack alignItems="center" space="xs" style={styles.arcRight}>
                <Text style={styles.arcChangeText}>{arc ? 'Change' : 'Connect'}</Text>
                <Icon name="chevronRight" size={16} color={colors.textSecondary} />
              </HStack>
            </HStack>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => beginInlineEdit('description')}
            accessibilityRole="button"
            accessibilityLabel="Edit goal description"
          >
            <View
              style={[
                styles.editableField,
                editingField === 'description' && styles.editableFieldActive,
              ]}
            >
              {editingField === 'description' ? (
                <TextInput
                  style={styles.goalDescriptionInput}
                  value={editDescription}
                  onChangeText={setEditDescription}
                  placeholder="Add a short description"
                  placeholderTextColor="#6B7280"
                  autoFocus
                  multiline
                  scrollEnabled={false}
                  onBlur={commitInlineEdit}
                />
              ) : (
                goal.description && <Text style={styles.goalDescription}>{goal.description}</Text>
              )}
            </View>
          </TouchableOpacity>
          <HStack space="md" alignItems="center" style={styles.timeRow}>
            {startDateLabel && (
              <Text style={styles.timeText}>
                Started {startDateLabel}
                {targetDateLabel ? ` · Target ${targetDateLabel}` : ''}
              </Text>
            )}
            {!startDateLabel && targetDateLabel && (
              <Text style={styles.timeText}>Target {targetDateLabel}</Text>
            )}
            <Text style={styles.statusText}>{goal.status.replace('_', ' ')}</Text>
          </HStack>
        </VStack>

        <VStack space="sm">
          <HStack justifyContent="space-between" alignItems="center">
            <Heading style={styles.sectionTitle}>Force intent</Heading>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleToggleForceEdit}
              accessibilityRole="button"
              accessibilityLabel={
                editingForces ? 'Save force intent updates' : 'Edit force intent'
              }
              style={styles.forceEditIconButton}
            >
              <Icon
                name="edit"
                size={16}
                color={editingForces ? colors.accent : colors.textSecondary}
              />
            </TouchableOpacity>
          </HStack>
          <VStack
            style={[styles.forceCard, editingForces && styles.editableFieldActive]}
            space="sm"
          >
            {FORCE_ORDER.map((forceId) => {
              const force = getCanonicalForce(forceId);
              if (!force) return null;
              const level = liveForceIntent[forceId] ?? 0;
              const percentage = (Number(level) / 3) * 100;

              if (!editingForces) {
                return (
                  <VStack key={forceId} space="xs">
                    <HStack justifyContent="space-between" alignItems="center">
                      <Text style={styles.forceLabel}>{force.name}</Text>
                      <Text style={styles.forceValue}>{level}/3</Text>
                    </HStack>
                    <View style={styles.forceBarTrack}>
                      <View style={[styles.forceBarFill, { width: `${percentage}%` }]} />
                    </View>
                  </VStack>
                );
              }

              return (
                <VStack key={forceId} space="xs">
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text style={styles.forceLabel}>{force.name}</Text>
                    <Text style={styles.forceValue}>{level}/3</Text>
                  </HStack>
                  <HStack space="xs" style={styles.forceSliderRow}>
                    {[0, 1, 2, 3].map((value) => (
                      <TouchableOpacity
                        key={value}
                        activeOpacity={0.8}
                        style={[
                          styles.forceLevelChip,
                          level === value && styles.forceLevelChipActive,
                        ]}
                        onPress={() => handleSetForceLevel(forceId, value as ForceLevel)}
                      >
                        <Text
                          style={[
                            styles.forceLevelChipText,
                            level === value && styles.forceLevelChipTextActive,
                          ]}
                        >
                          {value}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </HStack>
                </VStack>
              );
            })}
          </VStack>
        </VStack>

        <VStack space="md">
          <HStack space="sm">
            <Button style={{ flex: 1 }}>
              <Text style={styles.primaryCtaText}>Generate Activities with AI</Text>
            </Button>
            <Button variant="outline" style={{ flex: 1 }}>
              <Text style={styles.secondaryCtaText}>Add Activity manually</Text>
            </Button>
          </HStack>
        </VStack>

        <VStack space="md" style={{ flex: 1 }}>
          <Heading style={styles.sectionTitle}>Activities</Heading>
          {goalActivities.length === 0 ? (
            <Text style={styles.emptyBody}>
              No Activities yet. These are the atomic units of doing—short, concrete steps that move
              this goal forward.
            </Text>
          ) : (
            <FlatList
              data={goalActivities}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={renderActivity}
              contentContainerStyle={{ paddingBottom: spacing.lg }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </VStack>
      </VStack>
      <EditGoalModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        initialTitle={goal.title}
        initialDescription={goal.description}
        initialForceIntent={forceIntent}
        onSubmit={handleSaveGoal}
        insetTop={insets.top}
      />
      <ArcSelectorModal
        visible={arcSelectorVisible}
        arcs={arcs}
        currentArcId={arc?.id ?? null}
        onClose={() => setArcSelectorVisible(false)}
        onSubmit={handleUpdateArc}
      />
    </AppShell>
  );
}

type EditGoalModalProps = {
  visible: boolean;
  onClose: () => void;
  initialTitle: string;
  initialDescription?: string;
  initialForceIntent: Record<string, ForceLevel>;
  onSubmit: (values: {
    title: string;
    description?: string;
    forceIntent: Record<string, ForceLevel>;
  }) => void;
  insetTop: number;
};

function EditGoalModal({
  visible,
  onClose,
  initialTitle,
  initialDescription,
  initialForceIntent,
  onSubmit,
  insetTop,
}: EditGoalModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? '');
  const [forceIntent, setForceIntent] =
    useState<Record<string, ForceLevel>>(initialForceIntent);

  useEffect(() => {
    if (visible) {
      setTitle(initialTitle);
      setDescription(initialDescription ?? '');
      setForceIntent(initialForceIntent);
    }
  }, [visible, initialTitle, initialDescription, initialForceIntent]);

  const disabled = title.trim().length === 0;

  const handleSetForceLevel = (forceId: string, level: ForceLevel) => {
    setForceIntent((prev) => ({
      ...prev,
      [forceId]: level,
    }));
  };

  return (
    <TakadoBottomSheet visible={visible} onClose={onClose} snapPoints={['70%']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalContent, { paddingTop: spacing.lg }]}>
          <Heading style={styles.modalTitle}>Edit Goal</Heading>
          <Text style={styles.modalBody}>
            Update the goal details and rebalance the forces to better match this season.
          </Text>

          <Text style={styles.modalLabel}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Goal title"
            placeholderTextColor="#6B7280"
          />

          <Text style={styles.modalLabel}>Description</Text>
          <TextInput
            style={[styles.input, styles.descriptionInput]}
            value={description}
            onChangeText={setDescription}
            placeholder="Short description of this goal"
            placeholderTextColor="#6B7280"
            multiline
          />

          <ScrollView
            style={{ marginTop: spacing.lg }}
            contentContainerStyle={{ paddingBottom: spacing.lg }}
          >
            <Text style={styles.modalLabel}>Forces</Text>
            <VStack space="md" style={{ marginTop: spacing.sm }}>
              {FORCE_ORDER.map((forceId) => {
                const force = getCanonicalForce(forceId);
                if (!force) return null;
                const currentLevel = forceIntent[forceId] ?? 0;
                return (
                  <VStack key={forceId} space="xs">
                    <HStack justifyContent="space-between" alignItems="center">
                      <Text style={styles.forceLabel}>{force.name}</Text>
                      <Text style={styles.forceValue}>{currentLevel}/3</Text>
                    </HStack>
                    <HStack space="xs" style={styles.forceSliderRow}>
                      {[0, 1, 2, 3].map((value) => (
                        <TouchableOpacity
                          key={value}
                          activeOpacity={0.8}
                          style={[
                            styles.forceLevelChip,
                            currentLevel === value && styles.forceLevelChipActive,
                          ]}
                          onPress={() => handleSetForceLevel(forceId, value as ForceLevel)}
                        >
                          <Text
                            style={[
                              styles.forceLevelChipText,
                              currentLevel === value && styles.forceLevelChipTextActive,
                            ]}
                          >
                            {value}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </HStack>
                  </VStack>
                );
              })}
            </VStack>
          </ScrollView>

          <HStack space="sm" marginTop={spacing.lg}>
            <Button variant="outline" style={{ flex: 1 }} onPress={onClose}>
              <Text style={styles.secondaryCtaText}>Cancel</Text>
            </Button>
            <Button
              style={{ flex: 1 }}
              disabled={disabled}
              onPress={() => onSubmit({ title, description, forceIntent })}
            >
              <Text style={styles.primaryCtaText}>Save</Text>
            </Button>
          </HStack>
        </View>
      </KeyboardAvoidingView>
    </TakadoBottomSheet>
  );
}

type ArcSelectorModalProps = {
  visible: boolean;
  arcs: Arc[];
  currentArcId: string | null;
  onClose: () => void;
  onSubmit: (arcId: string | null) => void;
};

function ArcSelectorModal({
  visible,
  arcs,
  currentArcId,
  onClose,
  onSubmit,
}: ArcSelectorModalProps) {
  const [selectedArcId, setSelectedArcId] = useState<string | null>(currentArcId);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (visible) {
      setSelectedArcId(currentArcId);
      setQuery('');
    }
  }, [visible, currentArcId]);

  const filteredArcs = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return arcs;
    return arcs.filter((arc) => {
      const name = arc.name.toLowerCase();
      const narrative = (arc.narrative ?? '').toLowerCase();
      return name.includes(term) || narrative.includes(term);
    });
  }, [arcs, query]);

  const handleConfirm = () => {
    onSubmit(selectedArcId);
  };

  const handleRemoveConnection = () => {
    setSelectedArcId(null);
  };

  const hasSelectionChanged = selectedArcId !== currentArcId;

  return (
    <TakadoBottomSheet visible={visible} onClose={onClose} snapPoints={['75%']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalContent, { paddingTop: spacing.lg }]}>
          <Heading style={styles.modalTitle}>Connect to an Arc</Heading>
          <Text style={styles.modalBody}>
            Choose an Arc this goal contributes to. You can change or remove this connection at any
            time.
          </Text>

          <Text style={styles.modalLabel}>Search arcs</Text>
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name or narrative"
            placeholderTextColor="#6B7280"
          />

          <ScrollView
            style={{ marginTop: spacing.lg, flex: 1 }}
            contentContainerStyle={{ paddingBottom: spacing.lg }}
          >
            <VStack space="sm">
              {filteredArcs.map((arc) => {
                const selected = selectedArcId === arc.id;
                return (
                  <TouchableOpacity
                    key={arc.id}
                    activeOpacity={0.8}
                    style={styles.arcOptionRow}
                    onPress={() => setSelectedArcId(arc.id)}
                  >
                    <VStack space="xs" flex={1}>
                      <Text style={styles.arcOptionName}>{arc.name}</Text>
                      {arc.narrative ? (
                        <Text
                          style={styles.arcOptionNarrative}
                          numberOfLines={2}
                          ellipsizeMode="tail"
                        >
                          {arc.narrative}
                        </Text>
                      ) : null}
                    </VStack>
                    <View
                      style={[
                        styles.arcOptionRadio,
                        selected && styles.arcOptionRadioSelected,
                      ]}
                    >
                      {selected && <View style={styles.arcOptionRadioDot} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
              {filteredArcs.length === 0 && (
                <Text style={styles.emptyBody}>
                  No arcs match that search. Try a different phrase or clear the search.
                </Text>
              )}
            </VStack>
          </ScrollView>

          <VStack space="sm">
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.removeArcButton}
              onPress={handleRemoveConnection}
              disabled={currentArcId === null && selectedArcId === null}
            >
              <Text style={styles.removeArcText}>
                {currentArcId || selectedArcId ? 'Remove arc connection' : 'No arc connected'}
              </Text>
            </TouchableOpacity>

            <HStack space="sm" marginTop={spacing.sm}>
              <Button variant="outline" style={{ flex: 1 }} onPress={onClose}>
                <Text style={styles.secondaryCtaText}>Cancel</Text>
              </Button>
              <Button
                style={{ flex: 1 }}
                disabled={!hasSelectionChanged}
                onPress={handleConfirm}
              >
                <Text style={styles.primaryCtaText}>Save</Text>
              </Button>
            </HStack>
          </VStack>
        </View>
      </KeyboardAvoidingView>
    </TakadoBottomSheet>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    width: 36,
    height: 36,
  },
  optionsButton: {
    borderRadius: 999,
    width: 36,
    height: 36,
  },
  arcRow: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.shellAlt,
  },
  arcLabel: {
    ...typography.bodyXs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  arcName: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontFamily: typography.titleSm.fontFamily,
  },
  arcEmptyHelper: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  arcRight: {
    marginLeft: spacing.md,
  },
  arcChangeText: {
    ...typography.bodySm,
    color: colors.accent,
  },
  goalTitle: {
    ...typography.titleLg,
    color: colors.textPrimary,
  },
  goalTitleInput: {
    ...typography.titleLg,
    color: colors.textPrimary,
    padding: 0,
    margin: 0,
  },
  goalDescription: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  goalDescriptionInput: {
    ...typography.bodySm,
    color: colors.textSecondary,
    padding: 0,
    margin: 0,
  },
  timeRow: {
    marginTop: spacing.xs,
  },
  timeText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  statusText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  sectionTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  forceCard: {
    ...cardSurfaceStyle,
    padding: spacing.lg,
  },
  forceLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  forceValue: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  forceBarTrack: {
    height: 8,
    borderRadius: 99,
    backgroundColor: colors.cardMuted,
    overflow: 'hidden',
  },
  forceBarFill: {
    height: 8,
    borderRadius: 99,
    backgroundColor: colors.accent,
  },
  primaryCtaText: {
    ...typography.body,
    color: colors.canvas,
  },
  secondaryCtaText: {
    ...typography.body,
    color: colors.accent,
  },
  activityCard: {
    ...cardSurfaceStyle,
    padding: spacing.lg,
  },
  activityPhase: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  activityMeta: {
    ...typography.bodySm,
    color: colors.muted,
  },
  activityTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  activityNotes: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  emptyBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  separator: {
    height: spacing.md,
  },
  forceEditOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  editableField: {
    borderWidth: 1,
    borderRadius: 12,
    borderColor: 'transparent',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  editableFieldActive: {
    borderColor: colors.accent,
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
    minHeight: 48,
    color: colors.textPrimary,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
  },
  descriptionInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  forceSliderRow: {
    flexDirection: 'row',
  },
  forceLevelChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
  },
  forceLevelChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  forceLevelChipText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  forceLevelChipTextActive: {
    color: colors.canvas,
  },
  forceEditIconButton: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs / 2,
  },
  arcOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  arcOptionName: {
    ...typography.body,
    color: colors.textPrimary,
  },
  arcOptionNarrative: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  arcOptionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.md,
  },
  arcOptionRadioSelected: {
    borderColor: colors.accent,
  },
  arcOptionRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  removeArcButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  removeArcText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
});


