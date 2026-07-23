import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, Platform, Pressable, View } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';
import { PortalHost } from '@rn-primitives/portal';
import { colors, spacing } from '../../theme';
import { SOUND_SCAPES, type SoundscapeId } from '../../services/soundscape';
import { BottomDrawer, BottomDrawerScrollView } from '../../ui/BottomDrawer';
import { BrandLockup } from '../../ui/BrandLockup';
import { Button } from '../../ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/DropdownMenu';
import { Icon } from '../../ui/Icon';
import { BottomDrawerHeader } from '../../ui/layout/BottomDrawerHeader';
import { HeaderActionPill } from '../../ui/layout/ObjectPageHeader';
import { HStack, VStack } from '../../ui/primitives';
import { Text } from '../../ui/Typography';
import { DurationPicker } from './DurationPicker';
import { styles } from './activityDetailStyles';
import { formatFocusTimer } from './focusSessionPresentation';
import type { ActivityFocusController } from './useActivityFocusController';

type ActivityFocusExperienceProps = {
  setupVisible: boolean;
  activityTitle: string;
  topInset: number;
  bottomInset: number;
  portalHostName: string;
  controller: ActivityFocusController;
  screenTimeOffer: ReactNode;
  soundscapeEnabled: boolean;
  soundscapeTrackId: SoundscapeId;
  overlayColorIndex: number;
  setSoundscapeEnabled: (enabled: boolean) => void;
  setSoundscapeTrackId: (id: SoundscapeId) => void;
  setOverlayColorIndex: (index: number) => void;
};

export function ActivityFocusExperience({
  setupVisible,
  activityTitle,
  topInset,
  bottomInset,
  portalHostName,
  controller,
  screenTimeOffer,
  soundscapeEnabled,
  soundscapeTrackId,
  overlayColorIndex,
  setSoundscapeEnabled,
  setSoundscapeTrackId,
  setOverlayColorIndex,
}: ActivityFocusExperienceProps) {
  const [soundscapeMenuOpen, setSoundscapeMenuOpen] = useState(false);
  const [soundscapeMenuVisible, setSoundscapeMenuVisible] = useState(false);
  const suppressNextAudioTapRef = useRef(false);
  const menuAnimation = useRef(new Animated.Value(0)).current;
  const palette = useMemo(() => [
    colors.pine700,
    colors.madder700,
    colors.orange700,
    colors.turmeric700,
    colors.quiltBlue600,
    colors.indigo900,
    colors.violet700,
  ], []);
  const normalizedColorIndex = Math.floor(Math.max(0, overlayColorIndex)) % palette.length;
  const colorStep = useRef(new Animated.Value(normalizedColorIndex)).current;
  const colorStepRef = useRef(normalizedColorIndex);
  const colorAnimatingRef = useRef(false);
  const overlayBackgroundColor = colorStep.interpolate({
    inputRange: Array.from({ length: palette.length + 1 }, (_, index) => index),
    outputRange: [...palette, palette[0]],
  });
  const snapPoints = useMemo(() => {
    if (Platform.OS === 'ios') return controller.customExpanded ? ['82%' as const] : ['72%' as const];
    return controller.customExpanded ? ['74%' as const] : ['62%' as const];
  }, [controller.customExpanded]);

  useEffect(() => {
    if (colorAnimatingRef.current) return;
    colorStepRef.current = normalizedColorIndex;
    colorStep.stopAnimation();
    colorStep.setValue(normalizedColorIndex);
  }, [colorStep, normalizedColorIndex]);

  useEffect(() => {
    if (controller.session) return;
    setSoundscapeMenuOpen(false);
  }, [controller.session]);

  useEffect(() => {
    if (soundscapeMenuOpen) {
      setSoundscapeMenuVisible(true);
      Animated.timing(menuAnimation, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      return;
    }
    Animated.timing(menuAnimation, { toValue: 0, duration: 130, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(({ finished }) => {
      if (finished) setSoundscapeMenuVisible(false);
    });
  }, [menuAnimation, soundscapeMenuOpen]);

  const shiftOverlayColor = useCallback(() => {
    if (soundscapeMenuOpen) {
      setSoundscapeMenuOpen(false);
      return;
    }
    if (colorAnimatingRef.current) return;
    const current = colorStepRef.current % palette.length;
    const next = current + 1;
    colorAnimatingRef.current = true;
    Animated.timing(colorStep, { toValue: next, duration: 520, easing: Easing.inOut(Easing.quad), useNativeDriver: false }).start(({ finished }) => {
      colorAnimatingRef.current = false;
      if (!finished) return;
      const normalized = next >= palette.length ? 0 : next;
      colorStepRef.current = normalized;
      colorStep.setValue(normalized);
      setOverlayColorIndex(normalized);
    });
  }, [colorStep, palette.length, setOverlayColorIndex, soundscapeMenuOpen]);

  return (
    <>
      <BottomDrawer visible={setupVisible} onClose={controller.close} snapPoints={snapPoints} scrimToken="pineSubtle">
        <View style={{ flex: 1 }}>
          {Platform.OS === 'ios' ? (
            <FullWindowOverlay><PortalHost name={portalHostName} /></FullWindowOverlay>
          ) : <PortalHost name={portalHostName} />}
          <BottomDrawerScrollView style={{ flex: 1 }} contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
            <VStack space="md">
              <VStack space="md">
                <BottomDrawerHeader
                  title="Focus mode"
                  variant="withClose"
                  onClose={controller.close}
                  containerStyle={styles.sheetHeader}
                  titleStyle={styles.focusSheetTitle}
                />
                {screenTimeOffer}
                <Text style={styles.sheetDescription}>
                  Pick a duration. Kwilt keeps the session tied to this to-do, so the work has a place to land.
                </Text>
              </VStack>
              <View>
                <Text style={styles.estimateFieldLabel}>Minutes</Text>
                <HStack space="sm" alignItems="center" style={styles.focusPresetRow}>
                  {controller.presets.map((minutes) => {
                    const selected = !controller.customExpanded && controller.minutes === minutes;
                    return (
                      <Pressable
                        key={minutes}
                        style={({ pressed }) => [styles.focusPresetChip, selected && styles.focusPresetChipSelected, pressed && styles.focusPresetChipPressed]}
                        onPress={() => {
                          controller.setMinutes(minutes);
                          controller.setCustomExpanded(false);
                        }}
                      >
                        <Text style={[styles.focusPresetChipText, selected && styles.focusPresetChipTextSelected]}>{minutes}m</Text>
                      </Pressable>
                    );
                  })}
                  <Pressable
                    style={({ pressed }) => [styles.focusPresetChip, (controller.customExpanded || controller.isCustomValue) && styles.focusPresetChipSelected, pressed && styles.focusPresetChipPressed]}
                    onPress={() => controller.setCustomExpanded((current) => !current)}
                  >
                    <Text style={[styles.focusPresetChipText, (controller.customExpanded || controller.isCustomValue) && styles.focusPresetChipTextSelected]}>
                      {controller.customExpanded || controller.isCustomValue ? `${controller.minutes}m` : 'Custom'}
                    </Text>
                  </Pressable>
                </HStack>
                {controller.customExpanded ? (
                  <View style={{ marginTop: spacing.md }}>
                    <DurationPicker
                      valueMinutes={controller.minutes}
                      onChangeMinutes={controller.setMinutes}
                      optionsMinutes={controller.customOptions}
                      accessibilityLabel="Select custom focus duration"
                      iosWheelHeight={160}
                      showHelperText={false}
                      iosUseEdgeFades={false}
                    />
                  </View>
                ) : null}
              </View>
              <View>
                <Text style={styles.estimateFieldLabel}>Soundscape</Text>
                <DropdownMenu>
                  <DropdownMenuTrigger {...({ asChild: true } as any)} accessibilityLabel="Select soundscape">
                    <Pressable style={({ pressed }) => [styles.focusSoundscapeTrigger, pressed && styles.focusPresetChipPressed]}>
                      <HStack space="xs" alignItems="center">
                        <Text style={styles.focusSoundscapeTriggerText}>{SOUND_SCAPES.find((item) => item.id === soundscapeTrackId)?.title ?? 'Soundscape'}</Text>
                        <Icon name="chevronDown" size={16} color={colors.textSecondary} />
                      </HStack>
                    </Pressable>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent portalHost={portalHostName} side="bottom" sideOffset={6} align="start">
                    {SOUND_SCAPES.map((item) => (
                      <DropdownMenuItem key={item.id} onPress={() => setSoundscapeTrackId(item.id)}>
                        <Text style={styles.menuRowText} numberOfLines={1}>{item.title}</Text>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </View>
            </VStack>
          </BottomDrawerScrollView>
          <View style={styles.focusSheetFooter}>
            <Button variant="primary" fullWidth testID="e2e.activityDetail.focus.start" onPress={() => controller.start().catch(() => undefined)}>
              <Text style={[styles.sheetRowLabel, { color: colors.primaryForeground }]}>Start</Text>
            </Button>
          </View>
        </View>
      </BottomDrawer>

      {controller.session ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => controller.end().catch(() => undefined)}>
          <Pressable onPress={shiftOverlayColor} accessibilityRole="button" accessibilityLabel="Focus color" accessibilityHint="Double tap to shift focus background color" style={{ flex: 1 }}>
            <Animated.View style={[styles.focusOverlay, { backgroundColor: overlayBackgroundColor, paddingTop: topInset + spacing.lg, paddingBottom: bottomInset + spacing.lg }]}>
              <View style={styles.focusTopBar}>
                <BrandLockup logoSize={28} wordmarkSize="sm" logoVariant="parchment" color={colors.parchment} />
              </View>
              <View style={styles.focusCenter}>
                <Text style={styles.focusTimer}>{formatFocusTimer(controller.remainingMs)}</Text>
                <Text style={styles.focusActivityTitle} numberOfLines={2}>{activityTitle}</Text>
              </View>
              <HStack space="sm" style={styles.focusBottomBar}>
                <HeaderActionPill size={56} accessibilityLabel="End focus session" style={styles.focusActionIconButton} onPress={() => controller.end().catch(() => undefined)}>
                  <Icon name="stop" size={22} color={colors.parchment} />
                </HeaderActionPill>
                <HeaderActionPill
                  size={56}
                  accessibilityLabel={controller.session.mode === 'paused' ? 'Resume focus session' : 'Pause focus session'}
                  style={styles.focusActionIconButton}
                  onPress={() => controller.pauseOrResume().catch(() => undefined)}
                >
                  <Icon name={controller.session.mode === 'paused' ? 'play' : 'pause'} size={22} color={colors.parchment} />
                </HeaderActionPill>
                <View style={styles.focusAudioControlWrap}>
                  {soundscapeMenuVisible ? (
                    <Animated.View style={[styles.focusSoundscapeQuickMenu, { opacity: menuAnimation, transform: [{ translateY: menuAnimation.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }, { scale: menuAnimation.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) }] }]}>
                      {SOUND_SCAPES.map((item) => {
                        const selected = item.id === soundscapeTrackId;
                        return (
                          <Pressable
                            key={item.id}
                            onPress={() => {
                              setSoundscapeTrackId(item.id);
                              setSoundscapeMenuOpen(false);
                            }}
                            style={({ pressed }) => [styles.focusSoundscapeQuickMenuItem, selected && styles.focusSoundscapeQuickMenuItemActive, pressed && styles.focusSoundscapeQuickMenuItemPressed]}
                            accessibilityRole="button"
                            accessibilityLabel={`Select ${item.title} soundscape`}
                          >
                            <Text style={styles.focusSoundscapeQuickMenuItemText} numberOfLines={1}>{item.title}</Text>
                            {selected ? <Icon name="check" size={16} color={colors.textPrimary} /> : null}
                          </Pressable>
                        );
                      })}
                    </Animated.View>
                  ) : null}
                  <HeaderActionPill
                    size={56}
                    accessibilityLabel="Focus soundscape"
                    style={styles.focusActionIconButton}
                    onPress={() => {
                      if (suppressNextAudioTapRef.current) {
                        suppressNextAudioTapRef.current = false;
                        return;
                      }
                      setSoundscapeMenuOpen(false);
                      setSoundscapeEnabled(!soundscapeEnabled);
                    }}
                    onLongPress={() => {
                      suppressNextAudioTapRef.current = true;
                      setSoundscapeMenuOpen(true);
                    }}
                  >
                    <Icon name={soundscapeEnabled ? 'sound' : 'soundOff'} size={22} color={colors.parchment} />
                  </HeaderActionPill>
                </View>
              </HStack>
            </Animated.View>
          </Pressable>
        </Modal>
      ) : null}
    </>
  );
}
