import { Pressable } from '@/src/ui/HapticPressable';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, ScrollView, View } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';
import { PortalHost } from '../../ui/Portal';
import { colors, spacing } from '../../theme';
import { type SoundscapeId } from '../../services/soundscape';
import { SOUND_SCAPES, type FocusVideoEnvironmentId } from '../../services/soundscapeCatalog';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { BrandLockup } from '../../ui/BrandLockup';
import { Icon } from '../../ui/Icon';
import { BottomDrawerHeader } from '../../ui/layout/BottomDrawerHeader';
import { HeaderActionPill } from '../../ui/layout/ObjectPageHeader';
import { HStack, VStack } from '../../ui/primitives';
import { Text } from '../../ui/Typography';
import { styles } from './activityDetailStyles';
import { FocusSetupContent } from './FocusSetupContent';
import { FocusEnvironmentBackdrop } from './FocusEnvironmentBackdrop';
import { FocusSessionOverlay } from './FocusSessionOverlay';
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
  focusVideoEnvironmentId: FocusVideoEnvironmentId | null;
  overlayColorIndex: number;
  setSoundscapeEnabled: (enabled: boolean) => void;
  setSoundscapeTrackId: (id: SoundscapeId) => void;
  setFocusVideoEnvironmentId: (id: FocusVideoEnvironmentId | null) => void;
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
  focusVideoEnvironmentId,
  overlayColorIndex,
  setSoundscapeEnabled,
  setSoundscapeTrackId,
  setFocusVideoEnvironmentId,
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
  const hasScreenTimeOffer = screenTimeOffer != null;
  const videoEnvironmentActive = focusVideoEnvironmentId != null;
  const snapPoints = useMemo(() => {
    if (Platform.OS === 'ios') {
      if (controller.customExpanded) return hasScreenTimeOffer ? ['92%' as const] : ['82%' as const];
      return hasScreenTimeOffer ? ['82%' as const] : ['56%' as const];
    }
    if (controller.customExpanded) return hasScreenTimeOffer ? ['90%' as const] : ['74%' as const];
    return hasScreenTimeOffer ? ['78%' as const] : ['54%' as const];
  }, [controller.customExpanded, hasScreenTimeOffer]);

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
          <FocusSetupContent
            minutes={controller.minutes}
            presets={controller.presets}
            customOptions={controller.customOptions}
            customExpanded={controller.customExpanded}
            isCustomValue={controller.isCustomValue}
            onMinutesChange={controller.setMinutes}
            onCustomExpandedChange={controller.setCustomExpanded}
            audio={soundscapeEnabled ? soundscapeTrackId : 'none'}
            onAudioChange={(nextAudio) => {
              setFocusVideoEnvironmentId(nextAudio === 'canyonSpring' ? 'canyonSpring' : null);
              setSoundscapeEnabled(nextAudio !== 'none');
              if (nextAudio !== 'none') setSoundscapeTrackId(nextAudio);
            }}
            portalHostName={portalHostName}
            leadingContent={(
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
            )}
            onStart={() => controller.start().catch(() => undefined)}
            startTestID="e2e.activityDetail.focus.start"
            scrollMode="drawer"
          />
        </View>
      </BottomDrawer>

      {controller.session ? (
        <FocusSessionOverlay
          onRequestClose={() => controller.end().catch(() => undefined)}
        >
          <Pressable
            onPress={videoEnvironmentActive ? undefined : shiftOverlayColor}
            accessibilityRole={videoEnvironmentActive ? 'image' : 'button'}
            accessibilityLabel={videoEnvironmentActive ? 'Canyon Spring Focus environment' : 'Focus color'}
            accessibilityHint={videoEnvironmentActive ? undefined : 'Double tap to shift focus background color'}
            style={{ flex: 1 }}
          >
            <Animated.View style={[styles.focusOverlay, { backgroundColor: overlayBackgroundColor, paddingTop: topInset + spacing.lg, paddingBottom: bottomInset + spacing.lg }]}>
              {videoEnvironmentActive ? (
                <FocusEnvironmentBackdrop
                  soundscapeId={focusVideoEnvironmentId}
                  running={controller.session.mode === 'running'}
                />
              ) : null}
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
                      <ScrollView showsVerticalScrollIndicator={false} bounces={false} overScrollMode="never">
                        {SOUND_SCAPES.map((item) => {
                          const selected = item.id === soundscapeTrackId;
                          return (
                            <Pressable
                              key={item.id}
                              onPress={() => {
                                setFocusVideoEnvironmentId(item.id === 'canyonSpring' ? 'canyonSpring' : null);
                                setSoundscapeTrackId(item.id);
                                setSoundscapeMenuOpen(false);
                              }}
                              style={({ pressed }) => [styles.focusSoundscapeQuickMenuItem, selected && styles.focusSoundscapeQuickMenuItemActive, pressed && styles.focusSoundscapeQuickMenuItemPressed]}
                              accessibilityRole="button"
                              accessibilityLabel={item.id === 'canyonSpring'
                                ? 'Select Canyon Spring video environment'
                                : `Select ${item.title} soundscape`}
                            >
                              <HStack space="sm" alignItems="center" style={{ flex: 1 }}>
                                <Text style={styles.focusSoundscapeQuickMenuItemText} numberOfLines={1}>{item.title}</Text>
                                {item.id === 'canyonSpring' ? <Icon name="video" size={16} color={colors.textSecondary} /> : null}
                              </HStack>
                              {selected ? <Icon name="check" size={16} color={colors.textPrimary} /> : null}
                            </Pressable>
                          );
                        })}
                      </ScrollView>
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
        </FocusSessionOverlay>
      ) : null}
    </>
  );
}
