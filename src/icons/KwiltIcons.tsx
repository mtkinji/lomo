import React from 'react';
import Svg, { Circle, Defs, G, Mask, Path, Rect } from 'react-native-svg';
import type { KwiltIconProps } from './types';

export const KwiltIcons = {
  focus: FocusIcon,
  sendTo: SendToIcon,
  sendToCalendar: SendToCalendarIcon,
} as const;

export type KwiltIconName = keyof typeof KwiltIcons;

export function KwiltIcon({ name, size = 24, color = '#000' }: KwiltIconProps & { name: KwiltIconName }) {
  const Comp = KwiltIcons[name];
  return <Comp size={size} color={color} />;
}

function BaseSvg({
  size = 24,
  color = '#000',
  children,
}: KwiltIconProps & { children: React.ReactNode }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </Svg>
  );
}

/**
 * focus
 * - Outer circle: session boundary
 * - Inner dot: point of attention
 * Calm, centered, neutral.
 */
function FocusIcon(props: KwiltIconProps) {
  return (
    <BaseSvg {...props}>
      {/* Calm focus flow: two horizontal waves, centered and legible at 20–24px. */}
      <Path d="M4 8.75C7 6.75 10 6.75 12 8.75C14 10.75 17 10.75 20 8.75" />
      <Path d="M4 15.25C7 13.25 10 13.25 12 15.25C14 17.25 17 17.25 20 15.25" />
    </BaseSvg>
  );
}

/**
 * sendTo
 * - Rounded square: payload
 * - Arrow exiting right: send out to external systems
 */
function SendToIcon(props: KwiltIconProps) {
  return (
    <BaseSvg {...props}>
      {/* Payload (stack) */}
      <Rect x={2.5} y={5.75} width={10} height={10} rx={2.75} />
      <Rect x={4.5} y={7.75} width={10} height={10} rx={2.75} />

      {/* Arrow exiting right (send out) */}
      <Path d="M14.5 12H21" />
      <Path d="M18.5 9.5L21 12L18.5 14.5" />
    </BaseSvg>
  );
}

/**
 * sendToCalendar
 * - Calendar body + outbound arrow (clearly “export to calendar”, not “pick a date”)
 */
function SendToCalendarIcon(props: KwiltIconProps) {
  return (
    <BaseSvg {...props}>
      {/*
        Match the reference: calendar outline + a circle with a plus.
        Use a mask so the calendar stroke cleanly disappears behind the circle,
        creating true negative space regardless of background.
      */}
      <Defs>
        <Mask id="kwilt-sendToCalendar-cutout">
          {/* Keep everything by default */}
          <Rect x={0} y={0} width={24} height={24} fill="#fff" />
          {/* Punch a hole where the plus circle sits */}
          {/* Make the cutout slightly larger than the circle's OUTER stroke radius to create a visible gap. */}
          <Circle cx={18} cy={18} r={8.5} fill="#000" />
        </Mask>
      </Defs>

      <G mask="url(#kwilt-sendToCalendar-cutout)">
        {/* Calendar body */}
        <Rect x={2} y={3.75} width={15} height={15} rx={3.2} />
        {/* Header separator */}
        <Path d="M2 8.2H17" />
        {/* Top rings */}
        <Path d="M7.6 2.9V6.15" />
        <Path d="M11.9 2.9V6.15" />
      </G>

      {/* Plus circle */}
      <Circle cx={18} cy={18} r={5} />
      {/* Plus mark */}
      {/* Slightly shorter arms so the + has breathing room inside the circle. */}
      <Path d="M18 15.7V20.3" />
      <Path d="M15.7 18H20.3" />
    </BaseSvg>
  );
}



