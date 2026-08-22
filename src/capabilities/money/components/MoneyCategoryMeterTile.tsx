import { useState, type ReactNode, type Ref } from 'react';
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
import { Icon } from '../../../ui/Icon';
import { formatMoney, type MoneyCategory } from '../data/moneySnapshot';
import { formatBudgetOverviewMoney } from '../presentation/budgetOverviewMoney';

const TICK_COUNT = 52;
const MAX_OVER_BUDGET_TICK_WIDTH_MULTIPLIER = 3.2;

export type MoneyCategoryValueMode = 'percent_used' | 'dollars_left';
export type MoneyCategoryPresentation = 'list' | 'meters';

export function resolveCategoryPresentation(presentation: MoneyCategoryPresentation): {
  layout: 'meters' | 'list';
  valueMode: MoneyCategoryValueMode;
} {
  if (presentation === 'meters') return { layout: 'meters', valueMode: 'percent_used' };
  return { layout: 'list', valueMode: 'dollars_left' };
}

export function MoneyCategoryMeterTile({
  category,
  onPress,
  periodElapsedPercent,
  style,
  targetRef,
}: {
  category: MoneyCategory;
  onPress: () => void;
  periodElapsedPercent: number;
  style?: StyleProp<ViewStyle>;
  targetRef?: Ref<View>;
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
      ref={targetRef}
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
          {formatBudgetOverviewMoney(category.spentCents)} / {formatBudgetOverviewMoney(category.plannedCents)}
        </Text>
      </View>
    </Pressable>
  );
}

export type MoneyCategoryListStatus = {
  label: 'Projected to go over' | null;
  tone: 'danger' | 'watch' | 'neutral';
};

export function getCategoryListStatus(category: MoneyCategory): MoneyCategoryListStatus {
  const attentionThresholdCents = Math.max(2_500, Math.round(category.plannedCents * 0.1));
  const currentOverageCents = Math.max(0, -category.remainingCents);
  const projectedOverageCents = Math.max(0, category.forecast.projectedOverageCents ?? 0);
  if (currentOverageCents > 0) {
    return { label: null, tone: 'danger' };
  }
  if (projectedOverageCents >= attentionThresholdCents || category.forecast.status === 'watch' || category.forecast.status === 'over') {
    return { label: 'Projected to go over', tone: 'watch' };
  }
  return { label: null, tone: 'neutral' };
}

export function MoneyCategoryListRow({ category, onPress, periodElapsedPercent, targetRef }: {
  category: MoneyCategory;
  onPress: () => void;
  periodElapsedPercent: number;
  targetRef?: Ref<View>;
}) {
  const isOver = category.remainingCents < 0;
  const value = `${formatBudgetOverviewMoney(Math.abs(category.remainingCents))} ${isOver ? 'over' : 'left'}`;
  const status = getCategoryListStatus(category);
  const usedPercent = Math.min(100, Math.max(0, category.percentUsed));
  const elapsedPercent = Math.min(100, Math.max(0, periodElapsedPercent));
  const paceColor = status.tone === 'danger'
    ? colors.destructive
    : status.tone === 'watch'
      ? colors.turmeric500
      : colors.gray500;
  return (
    <Pressable
      ref={targetRef}
      accessibilityLabel={`Open ${category.name} category, ${value}${status.label ? `, ${status.label}` : ''}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.listRow, pressed ? styles.pressed : null]}
    >
      <View style={styles.listRowContent}>
        <Text numberOfLines={2} style={styles.listName}>{category.name}</Text>
        <View style={styles.listTrailing}>
          <Text numberOfLines={1} style={[styles.listValue, status.tone === 'danger' ? styles.valueRisk : null]}>{value}</Text>
          {status.tone === 'watch' ? (
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              testID="money-category-projected-warning"
            >
              <Icon color={colors.turmeric600} name="warning" size={14} strokeWidth={2.25} />
            </View>
          ) : null}
          <Icon
            accessibilityElementsHidden
            color={colors.gray400}
            importantForAccessibility="no-hide-descendants"
            name="chevronRight"
            size={18}
            strokeWidth={2}
          />
        </View>
      </View>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.paceRail}
      >
        <View style={styles.paceRailTrack} />
        <View
          testID="money-category-pace-used"
          style={[styles.paceRailUsed, { backgroundColor: paceColor, width: `${usedPercent}%` }]}
        />
        <View
          testID="money-category-pace-elapsed"
          style={[styles.paceRailMarker, { left: `${elapsedPercent}%` }]}
        />
      </View>
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
    minHeight: 82,
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  listRowContent: { minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  listName: { flex: 1, minWidth: 0, color: colors.textPrimary, fontSize: 16, lineHeight: 21, fontWeight: '600' },
  listTrailing: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  listValue: { flexShrink: 0, color: colors.textPrimary, fontSize: 15, lineHeight: 20, fontWeight: '600', fontVariant: ['tabular-nums'] },
  paceRail: { height: 9, justifyContent: 'center', position: 'relative' },
  paceRailTrack: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.gray200 },
  paceRailUsed: { position: 'absolute', left: 0, height: 2, borderRadius: 999 },
  paceRailMarker: { position: 'absolute', width: 2, height: 9, marginLeft: -1, borderRadius: 999, backgroundColor: colors.gray500 },
});
