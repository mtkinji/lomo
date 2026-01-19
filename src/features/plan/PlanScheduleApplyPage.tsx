import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, ActivityIndicator, Pressable } from 'react-native';
import { colors, typography, spacing } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import { proposeSchedule, ProposedEvent } from '../../services/scheduling/schedulingEngine';
import { inferSchedulingDomain } from '../../services/scheduling/inferSchedulingDomain';
import { 
  getWritableCalendars, 
  getDefaultCalendarId, 
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvents,
  DeviceCalendar,
} from '../../services/calendar/deviceCalendar';
import { Button } from '../../ui/Button';
import { Heading, VStack, Text, EmptyState, HStack } from '../../ui/primitives';
import { Icon } from '../../ui/Icon';
import { Combobox } from '../../ui/Combobox';
import { inferActivitySchedulingDomainWithAI } from '../../services/ai';

type PlanScheduleApplyPageProps = {
  selectedActivityIds: string[];
  onBackToPick: () => void;
  onClearSelection: () => void;
  /**
   * Extra padding applied by the page itself. When hosted inside `BottomDrawer`,
   * the drawer already supplies a horizontal gutter, so this should be 0.
   */
  contentPadding?: number;
};

export function PlanScheduleApplyPage({
  selectedActivityIds,
  onBackToPick,
  onClearSelection,
  contentPadding = spacing.xl,
}: PlanScheduleApplyPageProps) {
  const activities = useAppStore((s) => s.activities);
  const goals = useAppStore((s) => s.goals);
  const userProfile = useAppStore((s) => s.userProfile);
  const updateActivity = useAppStore((s) => s.updateActivity);
  const updateUserProfile = useAppStore((s) => s.updateUserProfile);
  const lastSchedulingApply = useAppStore((s) => (s as any).lastSchedulingApply);
  const setLastSchedulingApply = useAppStore((s) => (s as any).setLastSchedulingApply);
  const [proposals, setProposals] = useState<ProposedEvent[]>([]);
  const [calendars, setCalendars] = useState<DeviceCalendar[]>([]);
  const [defaultCalId, setDefaultCalId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [openComboboxId, setOpenComboboxId] = useState<string | null>(null);
  const [busyByCalendarId, setBusyByCalendarId] = useState<Record<string, Array<{ start: Date; end: Date }>>>({});
  const [pendingDomainMapping, setPendingDomainMapping] = useState<Record<string, string>>({});
  const [isUndoing, setIsUndoing] = useState(false);
  const [mode, setMode] = useState<'selected' | 'all'>(() =>
    selectedActivityIds.length > 0 ? 'selected' : 'all',
  );
  const prevSelectedCountRef = useRef<number>(selectedActivityIds.length);

  // Keep mode aligned as selection changes (e.g. select items on page 1 then swipe here).
  useEffect(() => {
    const prev = prevSelectedCountRef.current;
    const next = selectedActivityIds.length;

    // If the user just selected items (0 → N) while we were in "All", switch to "Selected"
    // so Scheduling Assist matches their intent.
    if (prev === 0 && next > 0 && mode === 'all') {
      setMode('selected');
    }
    if (next === 0 && mode === 'selected') {
      setMode('all');
    }

    prevSelectedCountRef.current = next;
  }, [selectedActivityIds.length, mode]);

  useEffect(() => {
    async function load() {
      try {
        const [writable, defId] = await Promise.all([
          getWritableCalendars(),
          getDefaultCalendarId()
        ]);
        setCalendars(writable);
        setDefaultCalId(defId);
      } catch (err) {
        console.warn('[scheduling] failed to load calendars', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!calendars || calendars.length === 0) {
      setBusyByCalendarId({});
      return;
    }

    const loadBusy = async () => {
      const calendarIds = calendars.map((c) => c.id).filter(Boolean).slice(0, 20);
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 14);

      const events = await getCalendarEvents({ calendarIds, startDate: start, endDate: end });
      const byCal: Record<string, Array<{ start: Date; end: Date }>> = {};
      const all: Array<{ start: Date; end: Date }> = [];

      for (const e of events) {
        if (!e?.calendarId || !e.startDate || !e.endDate) continue;
        const interval = { start: new Date(e.startDate), end: new Date(e.endDate) };
        byCal[e.calendarId] = [...(byCal[e.calendarId] ?? []), interval];
        all.push(interval);
      }
      byCal['__all__'] = all;
      setBusyByCalendarId(byCal);
    };

    loadBusy().catch((err) => console.warn('[scheduling] failed to load busy events', err));
  }, [calendars, isLoading]);

  const activitiesWithInferredDomain = useMemo(() => {
    const base = activities
      .filter(a => a.status !== 'done' && !a.scheduledAt)
      .map(a => ({
        ...a,
        schedulingDomain: a.schedulingDomain || inferSchedulingDomain(a, goals)
      }));
    if (mode === 'all') return base;
    if (selectedActivityIds.length === 0) return [];
    const selected = new Set(selectedActivityIds);
    return base.filter((a) => selected.has(a.id));
  }, [activities, goals, mode, selectedActivityIds]);

  useEffect(() => {
    // Best-effort AI domain inference, persists onto the Activity so the app learns over time.
    // This is intentionally capped to avoid burning credits / hammering the proxy.
    const candidates = activitiesWithInferredDomain
      .filter((a) => !a.schedulingDomain)
      .slice(0, 8);
    if (candidates.length === 0) return;

    let cancelled = false;
    (async () => {
      for (const activity of candidates) {
        if (cancelled) return;
        const goal = goals.find((g) => g.id === activity.goalId);
        const domain = await inferActivitySchedulingDomainWithAI({
          title: activity.title,
          goalTitle: goal?.title ?? null,
          goalDescriptionPlain: null,
        });
        if (!domain || cancelled) continue;
        const timestamp = new Date().toISOString();
        updateActivity(activity.id, (prev) => ({
          ...prev,
          schedulingDomain: domain,
          updatedAt: timestamp,
        }));
      }
    })().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [activitiesWithInferredDomain, goals, updateActivity]);

  useEffect(() => {
    if (isLoading) return;
    
    const suggested = proposeSchedule({
      activities: activitiesWithInferredDomain,
      userProfile,
      defaultCalendarId: defaultCalId,
      busyByCalendarId,
    });
    setProposals(suggested);
  }, [activitiesWithInferredDomain, userProfile, defaultCalId, busyByCalendarId, isLoading]);

  const calendarOptions = useMemo(() => {
    return calendars.map(c => ({
      value: c.id,
      label: c.title,
      leftElement: <View style={[styles.calDot, { backgroundColor: c.color }]} />
    }));
  }, [calendars]);

  const handleCalendarChange = (activityId: string, calendarId: string) => {
    setProposals(prev => prev.map(p =>
      p.activityId === activityId ? { ...p, calendarId } : p
    ));
    // Track mapping preference by domain, but do NOT persist until Apply.
    const nextProposal = proposals.find((p) => p.activityId === activityId);
    if (nextProposal?.domain) {
      setPendingDomainMapping((prev) => ({ ...(prev ?? {}), [nextProposal.domain]: calendarId }));
    }
    setOpenComboboxId(null);
  };

  const handleApply = async () => {
    if (proposals.length === 0) return;
    setIsApplying(true);
    
    let successCount = 0;
    const created: Array<{
      activityId: string;
      calendarId: string;
      eventId: string;
      startAtISO: string;
      endAtISO: string;
      prevScheduledAt: string | null | undefined;
      prevCalendarId: string | null | undefined;
      domain: string;
    }> = [];
    try {
      for (const proposal of proposals) {
        try {
          const prev = activities.find((a) => a.id === proposal.activityId);
          const eventId = await createCalendarEvent({
            title: proposal.title,
            startDate: new Date(proposal.startDate),
            endDate: new Date(proposal.endDate),
            calendarId: proposal.calendarId,
          });

          const timestamp = new Date().toISOString();
          updateActivity(proposal.activityId, (prev) => ({
            ...prev,
            scheduledAt: proposal.startDate,
            calendarId: proposal.calendarId,
            updatedAt: timestamp,
          }));
          if (typeof eventId === 'string' && eventId) {
            created.push({
              activityId: proposal.activityId,
              calendarId: proposal.calendarId,
              eventId,
              startAtISO: proposal.startDate,
              endAtISO: proposal.endDate,
              prevScheduledAt: prev?.scheduledAt ?? null,
              prevCalendarId: prev?.calendarId ?? null,
              domain: proposal.domain ?? 'personal',
            });
          }
          successCount++;
        } catch (err) {
          console.error(`[scheduling] failed to schedule activity ${proposal.activityId}`, err);
        }
      }
      
      if (successCount > 0) {
        // Persist domain→calendar mapping only on Apply (per PRD).
        const domainCalendarMappingApplied = { ...(pendingDomainMapping ?? {}) };
        if (Object.keys(domainCalendarMappingApplied).length > 0 && userProfile) {
          updateUserProfile((current) => {
            const existing = current.preferences?.scheduling?.domainCalendarMapping ?? {};
            return {
              ...current,
              preferences: {
                ...(current.preferences ?? {}),
                scheduling: {
                  ...(current.preferences?.scheduling ?? {}),
                  domainCalendarMapping: { ...existing, ...domainCalendarMappingApplied },
                },
              },
            };
          });
        }

        // Store undo record.
        if (created.length > 0 && typeof setLastSchedulingApply === 'function') {
          setLastSchedulingApply({
            appliedAtMs: Date.now(),
            items: created,
            domainCalendarMappingApplied:
              Object.keys(domainCalendarMappingApplied).length > 0 ? domainCalendarMappingApplied : undefined,
          });
        }
        setPendingDomainMapping({});
        Alert.alert('Success', `${successCount} activities scheduled on your calendar.`);
        onClearSelection();
      } else {
        Alert.alert('Error', 'Failed to schedule activities. Please check calendar permissions.');
      }
    } finally {
      setIsApplying(false);
    }
  };

  const canUndo =
    lastSchedulingApply &&
    typeof lastSchedulingApply?.appliedAtMs === 'number' &&
    Date.now() - lastSchedulingApply.appliedAtMs < 2 * 60 * 60 * 1000 &&
    Array.isArray(lastSchedulingApply.items) &&
    lastSchedulingApply.items.length > 0;

  const handleUndo = async () => {
    if (!canUndo) return;
    setIsUndoing(true);
    try {
      const record = lastSchedulingApply;
      for (const item of record.items) {
        try {
          await deleteCalendarEvent(item.calendarId, item.eventId);
        } catch (err) {
          console.warn('[scheduling] failed to delete calendar event', err);
        }
        const timestamp = new Date().toISOString();
        updateActivity(item.activityId, (prev) => ({
          ...prev,
          scheduledAt: item.prevScheduledAt ?? null,
          calendarId: item.prevCalendarId ?? null,
          updatedAt: timestamp,
        }));
      }
      if (typeof setLastSchedulingApply === 'function') {
        setLastSchedulingApply(null);
      }
      Alert.alert('Undone', 'Removed the scheduled events and restored your activities.');
    } finally {
      setIsUndoing(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (proposals.length === 0) {
    return (
      <View style={[styles.center, { padding: contentPadding }]}>
        <EmptyState
          title={mode === 'selected' ? 'Select activities to schedule' : 'Nothing to schedule'}
          description={
            mode === 'selected'
              ? 'Pick a few recommendations, then come back to schedule them.'
              : 'Add some activities to see a proposed schedule.'
          }
        />
        {mode === 'selected' ? (
          <VStack space={spacing.sm} style={styles.emptyActions}>
            <Button variant="primary" fullWidth onPress={onBackToPick}>
              Back to recommendations
            </Button>
            <Button variant="secondary" fullWidth onPress={() => setMode('all')}>
              Schedule all unscheduled instead
            </Button>
          </VStack>
        ) : null}
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { padding: contentPadding, paddingBottom: spacing.xl * 4 }]}
      showsVerticalScrollIndicator={false}
    >
      <VStack space={spacing.md}>
        <VStack space={spacing.xs}>
          <Heading size="sm">Scheduling Assist</Heading>
          <Text style={styles.subtitle}>
            {mode === 'selected'
              ? `Proposed placements for ${proposals.length} selected activities.`
              : 'Proposed placements on your device calendar.'}
          </Text>
        </VStack>

        <HStack space={spacing.sm} style={styles.modeRow}>
          <Button
            size="sm"
            fullWidth
            variant={mode === 'selected' ? 'primary' : 'secondary'}
            onPress={() => setMode('selected')}
            disabled={selectedActivityIds.length === 0}
          >
            Selected
          </Button>
          <Button
            size="sm"
            fullWidth
            variant={mode === 'all' ? 'primary' : 'secondary'}
            onPress={() => setMode('all')}
          >
            All unscheduled
          </Button>
        </HStack>

        {canUndo ? (
          <View style={styles.undoCard}>
            <HStack space={spacing.sm} alignItems="center">
              <Icon name="undo" size={16} color={colors.textPrimary} />
              <Text style={styles.undoText}>Just applied a schedule.</Text>
              <View style={{ flex: 1 }} />
              <Button variant="outline" onPress={handleUndo} loading={isUndoing}>
                Undo
              </Button>
            </HStack>
          </View>
        ) : null}

        <VStack space={spacing.sm}>
          {proposals.map((p) => {
            const start = new Date(p.startDate);
            const timeStr = start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
            const dateStr = start.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
            const calName = calendars.find(c => c.id === p.calendarId)?.title || 'Default Calendar';
            
            return (
              <View key={p.activityId} style={styles.proposalCard}>
                <VStack space={spacing.xs}>
                  <Text style={styles.proposalTitle}>{p.title}</Text>
                  <HStack space={spacing.sm} style={styles.proposalMeta}>
                    <Icon name="daily" size={14} color={colors.textSecondary} />
                    <Text style={styles.proposalMetaText}>{dateStr} at {timeStr}</Text>
                  </HStack>
                  <Combobox
                    open={openComboboxId === p.activityId}
                    onOpenChange={(open) => setOpenComboboxId(open ? p.activityId : null)}
                    value={p.calendarId}
                    onValueChange={(val) => handleCalendarChange(p.activityId, val)}
                    options={calendarOptions}
                    searchPlaceholder="Search calendars…"
                    trigger={
                      <Pressable style={styles.calPickerTrigger}>
                        <HStack space={spacing.sm} style={styles.proposalMeta}>
                          <Icon name="dot" size={14} color={colors.textSecondary} />
                          <Text style={styles.proposalMetaText} numberOfLines={1}>
                            Calendar: {calName}
                          </Text>
                          <Icon name="chevronDown" size={12} color={colors.textSecondary} />
                        </HStack>
                      </Pressable>
                    }
                  />
                </VStack>
              </View>
            );
          })}
        </VStack>

        <Button
          variant="primary"
          fullWidth
          onPress={handleApply}
          loading={isApplying}
          style={styles.applyButton}
        >
          Apply to Calendar
        </Button>
      </VStack>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 0,
    paddingBottom: 0,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  modeRow: {
    alignItems: 'center',
  },
  emptyActions: {
    marginTop: spacing.md,
    width: '100%',
  },
  proposalCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  proposalTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  proposalMeta: {
    alignItems: 'center',
  },
  proposalMetaText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  applyButton: {
    marginTop: spacing.md,
  },
  undoCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  undoText: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  calDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  calPickerTrigger: {
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
  },
});
