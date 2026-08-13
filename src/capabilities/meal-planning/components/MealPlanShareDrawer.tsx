import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { colors, fonts, radii, spacing } from '../../../theme';
import { BottomDrawerScrollView } from '../../../ui/BottomDrawer';
import { BottomGuide } from '../../../ui/BottomGuide';
import { Button } from '../../../ui/Button';
import { Icon } from '../../../ui/Icon';
import { BottomDrawerHeader } from '../../../ui/layout/BottomDrawerHeader';
import { Text } from '../../../ui/Typography';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import {
  getHouseholdSnapshot,
  type HouseholdMember,
} from '../../../features/household/data/household';
import { createMealPlanningRepository } from '../data/mealPlanningRepository';

export function MealPlanShareDrawer(props: {
  visible: boolean;
  planId: string;
  planVersion: number;
  onClose(): void;
  onShared?(): void;
}) {
  const { visible, planId, planVersion, onClose, onShared } = props;
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) {
      setMembers([]);
      setSelected([]);
      setLoading(false);
      setBusy(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void getHouseholdSnapshot(getSupabaseClient())
      .then((snapshot) => {
        if (cancelled) return;
        const activeChildren = new Set(
          snapshot.activations
            .filter((activation) => (
              activation.capabilityId === 'meal-planning' && activation.state === 'active'
            ))
            .map((activation) => activation.childMembershipId),
        );
        const eligibleMembers = snapshot.members.filter((member) => (
          member.id !== snapshot.currentMembershipId
          && (member.role !== 'child' || activeChildren.has(member.id))
        ));
        setMembers(eligibleMembers);
        setSelected(eligibleMembers.map((member) => member.id));
      })
      .catch(() => {
        if (!cancelled) {
          setMembers([]);
          setSelected([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const askSelectedPeople = useCallback(async () => {
    if (!selected.length || busy) return;
    setBusy(true);
    try {
      await createMealPlanningRepository().openRound({
        planId,
        expectedVersion: planVersion,
        participantMembershipIds: selected,
        closesAt: null,
      });
      onShared?.();
      onClose();
    } catch (error) {
      Alert.alert(
        'Could not ask these people',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }, [busy, onClose, onShared, planId, planVersion, selected]);

  const selectedCount = selected.length;
  const askLabel = selectedCount === 1 ? 'Ask 1 person' : `Ask ${selectedCount} people`;

  return (
    <BottomGuide
      visible={visible}
      onClose={onClose}
      snapPoints={['46%']}
      scrim="light"
      layout="floating"
      showDragHandle={false}
    >
      <View>
        <BottomDrawerHeader
          variant="withClose"
          titleVariant="sm"
          title="Ask household"
          onClose={onClose}
          closeAccessibilityLabel="Close household request"
        />
        <BottomDrawerScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.textSecondary} />
              <Text tone="secondary">Finding your people…</Text>
            </View>
          ) : members.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Who should weigh in?</Text>
              <View style={styles.card}>
                {members.map((member, index) => {
                  const included = selected.includes(member.id);
                  return (
                    <View key={member.id}>
                      {index > 0 ? <View style={styles.divider} /> : null}
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityLabel={`${included ? 'Exclude' : 'Include'} ${member.displayName}`}
                        accessibilityState={{ checked: included }}
                        onPress={() => setSelected((current) => (
                          included
                            ? current.filter((membershipId) => membershipId !== member.id)
                            : [...current, member.id]
                        ))}
                        style={({ pressed }) => [styles.personRow, pressed && styles.pressed]}
                      >
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>{member.displayName.slice(0, 1).toUpperCase()}</Text>
                        </View>
                        <View style={styles.personCopy}>
                          <Text style={styles.personName}>{member.displayName}</Text>
                          <Text tone="secondary">{member.role === 'child' ? 'Household child' : 'Household'}</Text>
                        </View>
                        <View style={[styles.checkbox, included && styles.checkboxSelected]}>
                          {included ? <Icon name="check" size={15} color={colors.canvas} /> : null}
                        </View>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
              <Button
                accessibilityLabel={askLabel}
                disabled={!selectedCount || busy}
                fullWidth
                onPress={() => void askSelectedPeople()}
              >
                {busy ? 'Sending…' : askLabel}
              </Button>
            </View>
          ) : (
            <Text tone="secondary" style={styles.emptyCopy}>
              No one else in your Household can respond in Kwilt yet.
            </Text>
          )}
        </BottomDrawerScrollView>
      </View>
    </BottomGuide>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  section: {
    gap: spacing.md,
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontFamily: fonts.semibold,
    fontSize: 12,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  emptyCopy: {
    paddingVertical: spacing.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  divider: {
    backgroundColor: colors.border,
    height: StyleSheet.hairlineWidth,
    marginLeft: 58,
  },
  personRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pressed: {
    opacity: 0.68,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.cardMuted,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  avatarText: {
    fontFamily: fonts.semibold,
  },
  personCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  personName: {
    fontFamily: fonts.semibold,
  },
  checkbox: {
    alignItems: 'center',
    borderColor: colors.sumi300,
    borderRadius: 6,
    borderWidth: 1,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  checkboxSelected: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
});
