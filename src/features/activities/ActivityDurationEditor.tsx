import React from 'react';
import { Platform, View } from 'react-native';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { BottomDrawerHeader } from '../../ui/layout/BottomDrawerHeader';
import { Button } from '../../ui/Button';
import { HStack, Text, VStack } from '../../ui/primitives';
import { useAppStore } from '../../store/useAppStore';
import { colors } from '../../theme/colors';
import { DurationPicker } from './DurationPicker';
import { styles } from './activitiesScreenStyles';

export type ActivityDurationEditorHandle = {
  open: (activityId: string) => void;
};

export function useActivityDurationEditor() {
  const ref = React.useRef<ActivityDurationEditorHandle | null>(null);
  const open = React.useCallback((activityId: string) => ref.current?.open(activityId), []);
  return { ref, open };
}

export const ActivityDurationEditor = React.forwardRef<ActivityDurationEditorHandle>(
  function ActivityDurationEditor(_, ref) {
    const activities = useAppStore((state) => state.activities);
    const updateActivity = useAppStore((state) => state.updateActivity);
    const [activityId, setActivityId] = React.useState<string | null>(null);
    const [draftMinutes, setDraftMinutes] = React.useState(30);

    const activity = React.useMemo(
      () => activities.find((candidate) => candidate.id === activityId) ?? null,
      [activities, activityId],
    );

    const close = React.useCallback(() => setActivityId(null), []);

    React.useImperativeHandle(
      ref,
      () => ({
        open: (nextActivityId) => {
          const nextActivity = activities.find((candidate) => candidate.id === nextActivityId);
          setDraftMinutes(Math.max(15, Math.round(nextActivity?.estimateMinutes ?? 30)));
          setActivityId(nextActivityId);
        },
      }),
      [activities],
    );

    const commit = React.useCallback(
      (nextEstimateMinutes: number | undefined) => {
        if (!activityId) return;
        const timestamp = new Date().toISOString();
        updateActivity(activityId, (current) => ({
          ...current,
          estimateMinutes: nextEstimateMinutes,
          updatedAt: timestamp,
        }));
        close();
      },
      [activityId, close, updateActivity],
    );

    return (
      <BottomDrawer
        visible={Boolean(activity)}
        onClose={close}
        snapPoints={Platform.OS === 'ios' ? ['62%'] : ['40%']}
        scrimToken="pineSubtle"
      >
        <View style={styles.sheetContent}>
          <BottomDrawerHeader
            title="Duration"
            variant="minimal"
            containerStyle={styles.sheetHeader}
            titleStyle={styles.sheetTitle}
          />
          <VStack space="md">
            <DurationPicker
              valueMinutes={draftMinutes}
              onChangeMinutes={setDraftMinutes}
              accessibilityLabel="Select duration"
              iosUseEdgeFades={false}
            />
            <HStack space="sm">
              <Button variant="outline" style={{ flex: 1 }} onPress={() => commit(undefined)}>
                <Text style={styles.sheetRowLabel}>Clear</Text>
              </Button>
              <Button
                variant="primary"
                style={{ flex: 1 }}
                onPress={() => commit(Math.max(1, Math.round(draftMinutes)))}
              >
                <Text style={[styles.sheetRowLabel, { color: colors.primaryForeground }]}>Save</Text>
              </Button>
            </HStack>
          </VStack>
        </View>
      </BottomDrawer>
    );
  },
);
