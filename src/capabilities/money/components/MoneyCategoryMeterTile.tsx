import { useState, type ReactNode } from 'react';
import {
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, spacing } from '../../../theme';
import { formatMoney, type MoneyCategory } from '../data/moneySnapshot';

const TICK_COUNT = 52;
const MAX_OVER_BUDGET_TICK_WIDTH_MULTIPLIER = 3.2;

export type MoneyCategoryValueMode = 'percent_used' | 'dollars_left';
export type MoneyCategoryPresentation = 'tiles' | 'list_percent' | 'list_dollars';

export function resolveCategoryPresentation(presentation: MoneyCategoryPresentation): {
  layout: 'tiles' | 'list';
  valueMode: MoneyCategoryValueMode;
} {
  if (presentation === 'list_dollars') return { layout: 'list', valueMode: 'dollars_left' };
  if (presentation === 'list_percent') return { layout: 'list', valueMode: 'percent_used' };
  return { layout: 'tiles', valueMode: 'percent_used' };
}

export function MoneyCategoryMeterTile({
  category,
  onPress,
  periodElapsedPercent,
  style,
}: {
  category: MoneyCategory;
  onPress: () => void;
  periodElapsedPercent: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [meterSize, setMeterSize] = useState(136);
  const percent = Math.round(category.percentUsed);
  const isOver = category.remainingCents < 0;
  const isRisk = percent >= 100 || isOver || category.forecast.status === 'over';
  const statusColor = isRisk
    ? colors.destructive
    : category.forecast.status === 'watch'
      ? colors.turmeric600
      : colors.pine400;

  const handleLayout = (event: LayoutChangeEvent) => {
    const width = Math.round(event.nativeEvent.layout.width);
    if (width > 0 && width !== meterSize) setMeterSize(width);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${category.name} category, ${formatMoney(category.spentCents)} spent of ${formatMoney(category.plannedCents)}, ${percent} percent used, ${formatMoney(Math.abs(category.remainingCents))} ${isOver ? 'over' : 'left'}`}
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, style, pressed ? styles.pressed : null]}
    >
      <View style={styles.card} onLayout={handleLayout}>
        <RoundedRectRadialMeter
          color={statusColor}
          markerPercent={periodElapsedPercent}
          percent={percent}
          size={meterSize}
        >
          <View style={styles.center}>
            <View style={styles.valueRow}>
              <Text
                numberOfLines={1}
                style={[
                  styles.value,
                  isRisk ? styles.valueRisk : null,
                ]}
              >
                {percent}
              </Text>
              <Text style={styles.valueSuffix}>%</Text>
            </View>
            <Text numberOfLines={2} style={styles.name}>
              {category.name}
            </Text>
          </View>
        </RoundedRectRadialMeter>
      </View>
      <View style={styles.captionRow}>
        <Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={1} style={styles.caption}>
          {formatMoney(category.spentCents)} / {formatMoney(category.plannedCents)}
        </Text>
      </View>
    </Pressable>
  );
}

export function MoneyCategoryListRow({ category, onPress, valueMode }: {
  category: MoneyCategory;
  onPress: () => void;
  valueMode: MoneyCategoryValueMode;
}) {
  const percent = Math.round(category.percentUsed);
  const isOver = category.remainingCents < 0;
  const value = valueMode === 'percent_used'
    ? `${percent}% used`
    : `${formatMoney(Math.abs(category.remainingCents))} ${isOver ? 'over' : 'left'}`;
  return (
    <Pressable
      accessibilityLabel={`Open ${category.name} category, ${value}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.listRow, pressed ? styles.pressed : null]}
    >
      <View style={styles.listCopy}>
        <Text numberOfLines={2} style={styles.listName}>{category.name}</Text>
        <Text numberOfLines={1} style={styles.listDetail}>{formatMoney(category.spentCents)} / {formatMoney(category.plannedCents)}</Text>
      </View>
      <Text numberOfLines={1} style={[styles.listValue, isOver ? styles.valueRisk : null]}>{value}</Text>
      <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.listChevron}>›</Text>
    </Pressable>
  );
}

export function RoundedRectRadialMeter({
  children,
  color,
  markerPercent,
  percent,
  size,
}: {
  children: ReactNode;
  color: string;
  markerPercent: number;
  percent: number;
  size: number;
}) {
  const clampedPercent = Math.max(0, percent);
  const activeTicks = Math.round((Math.min(100, clampedPercent) / 100) * TICK_COUNT);
  const markerTick = Math.round((Math.min(100, Math.max(0, markerPercent)) / 100) * TICK_COUNT);

  return (
    <View style={[styles.radial, { width: size, height: size, borderRadius: size * 0.18 }]}>
      {Array.from({ length: TICK_COUNT }).map((_, index) => {
        const isActive = index < activeTicks;
        const isMarker = index === markerTick;
        const activeTickWidth = getOverBudgetTickWidth(2, clampedPercent, index);
        const tickHeight = isMarker ? 14 : isActive ? 9 : 6;
        const tickWidth = isMarker ? Math.max(3, activeTickWidth) : isActive ? activeTickWidth : 2;

        return (
          <View
            key={index}
            style={[
              styles.tick,
              getRoundedRectTickPosition({
                index,
                size,
                tickHeight,
                tickWidth,
                padding: 12,
                cornerRadius: 22,
              }),
              {
                width: tickWidth,
                height: tickHeight,
                backgroundColor: isMarker
                  ? colors.gray700
                  : isActive
                    ? color
                    : 'rgba(21,40,32,0.12)',
              },
            ]}
          />
        );
      })}
      {children}
    </View>
  );
}

function getOverBudgetTickWidth(baseWidth: number, percent: number, tickIndex: number) {
  const fullLapCount = Math.floor(percent / 100);
  const partialLapTickCount = Math.round(((percent % 100) / 100) * TICK_COUNT);
  const tickLapCount = fullLapCount + (tickIndex < partialLapTickCount ? 1 : 0);
  const overBudgetLapCount = Math.max(0, tickLapCount - 1);
  if (overBudgetLapCount <= 0) return baseWidth;
  return Math.min(
    Math.round(baseWidth * MAX_OVER_BUDGET_TICK_WIDTH_MULTIPLIER),
    baseWidth + overBudgetLapCount,
  );
}

function getRoundedRectTickPosition({
  cornerRadius,
  index,
  padding,
  size,
  tickHeight,
  tickWidth,
}: {
  cornerRadius: number;
  index: number;
  padding: number;
  size: number;
  tickHeight: number;
  tickWidth: number;
}) {
  const half = size / 2 - padding;
  const radius = Math.min(cornerRadius, half);
  const straight = Math.max(0, half * 2 - radius * 2);
  const arc = (Math.PI * radius) / 2;
  const perimeter = straight * 4 + arc * 4;
  let distance = (index / TICK_COUNT) * perimeter;
  let x = 0;
  let y = -half;
  const topHalf = straight / 2;

  if (distance <= topHalf) {
    x = distance;
  } else if ((distance -= topHalf) <= arc) {
    const angle = -Math.PI / 2 + distance / radius;
    x = half - radius + Math.cos(angle) * radius;
    y = -half + radius + Math.sin(angle) * radius;
  } else if ((distance -= arc) <= straight) {
    x = half;
    y = -half + radius + distance;
  } else if ((distance -= straight) <= arc) {
    const angle = distance / radius;
    x = half - radius + Math.cos(angle) * radius;
    y = half - radius + Math.sin(angle) * radius;
  } else if ((distance -= arc) <= straight) {
    x = half - radius - distance;
    y = half;
  } else if ((distance -= straight) <= arc) {
    const angle = Math.PI / 2 + distance / radius;
    x = -half + radius + Math.cos(angle) * radius;
    y = half - radius + Math.sin(angle) * radius;
  } else if ((distance -= arc) <= straight) {
    x = -half;
    y = half - radius - distance;
  } else if ((distance -= straight) <= arc) {
    const angle = Math.PI + distance / radius;
    x = -half + radius + Math.cos(angle) * radius;
    y = -half + radius + Math.sin(angle) * radius;
  } else {
    distance -= arc;
    x = -topHalf + distance;
  }

  return {
    left: size / 2 + x - tickWidth / 2,
    top: size / 2 + y - tickHeight / 2,
    transform: [{ rotate: `${Math.atan2(-y, -x) - Math.PI / 2}rad` }],
  };
}

const styles = StyleSheet.create({
  pressable: {
    flexBasis: '48%',
    flexGrow: 1,
    maxWidth: '48%',
    borderRadius: 18,
    gap: spacing.xs,
  },
  pressed: { opacity: 0.86 },
  card: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 26,
    backgroundColor: colors.card,
  },
  radial: {
    position: 'relative',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: { position: 'absolute', borderRadius: 99 },
  center: {
    width: '90%',
    height: 88,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing.xs,
  },
  valueRow: {
    width: '100%',
    height: 48,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: 2,
  },
  value: {
    maxWidth: '76%',
    flexShrink: 1,
    color: colors.gray900,
    fontSize: 42,
    lineHeight: 46,
    fontWeight: '800',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1.5,
  },
  valueRisk: { color: colors.destructive },
  valueSuffix: {
    flexShrink: 0,
    color: colors.gray500,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '600',
  },
  name: {
    minHeight: 36,
    maxWidth: 112,
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '400',
  },
  captionRow: {
    width: '100%',
    minHeight: 26,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  caption: {
    color: colors.gray700,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '400',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  listRow: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingVertical: spacing.sm,
  },
  listCopy: { flex: 1, minWidth: 0, gap: 2 },
  listName: { color: colors.textPrimary, fontSize: 16, lineHeight: 21, fontWeight: '600' },
  listDetail: { color: colors.textSecondary, fontSize: 12, lineHeight: 16, fontVariant: ['tabular-nums'] },
  listValue: { flexShrink: 0, color: colors.textPrimary, fontSize: 15, lineHeight: 20, fontWeight: '600', fontVariant: ['tabular-nums'] },
  listChevron: { color: colors.textSecondary, fontSize: 22, lineHeight: 24 },
});
