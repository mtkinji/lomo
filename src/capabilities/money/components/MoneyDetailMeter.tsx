import { useCallback, useMemo, useRef, useState } from 'react';
import type { AccessibilityActionEvent, GestureResponderEvent } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { colors, fonts, spacing, typography } from '../../../theme';
import { Icon } from '../../../ui/Icon';
import { formatMoney, type MoneyCategory, type MoneyTransaction } from '../data/moneySnapshot';
import { buildCumulativeSpendSeries, buildHistoricalAverageSpendSeries, type MoneySpendPoint } from '../domain/moneyDetailView';
import { signalMoneyChoice } from '../runtime/moneyMutationFeedback';

export function MoneyDetailMeter({
  category,
  historicalTransactions,
  monthOffset,
  onForecastInfo,
  onNextMonth,
  onPreviousMonth,
  onResetMonth,
  onScrubActiveChange,
  periodElapsedPercent,
  periodEndIso,
  periodLabel,
  periodStartIso,
  transactions,
}: {
  category: MoneyCategory;
  historicalTransactions: MoneyTransaction[];
  monthOffset: number;
  onForecastInfo: () => void;
  onNextMonth: () => void;
  onPreviousMonth: () => void;
  onResetMonth: () => void;
  onScrubActiveChange: (active: boolean) => void;
  periodElapsedPercent: number;
  periodEndIso: string;
  periodLabel: string;
  periodStartIso: string;
  transactions: MoneyTransaction[];
}) {
  const [chartWidth, setChartWidth] = useState(320);
  const forecast = category.forecast;
  const isReserve = category.fundingRhythm === 'reserve';
  const projectedSpendCents = monthOffset === 0 ? forecast.projectedSpendCents : category.spentCents;
  const expectedSpendCents = Math.round(category.plannedCents * periodElapsedPercent / 100);
  const paceDeltaCents = category.spentCents - expectedSpendCents;
  const statusColor = category.remainingCents < 0 || (monthOffset === 0 && forecast.status === 'over')
    ? colors.madder600
    : monthOffset === 0 && forecast.status === 'watch'
      ? colors.turmeric600
      : colors.pine700;
  const projectionColor = projectedSpendCents > category.plannedCents ? colors.madder600 : colors.pine700;
  const series = useMemo(() => buildCumulativeSpendSeries(transactions, periodStartIso, periodEndIso), [periodEndIso, periodStartIso, transactions]);
  const historicalAverage = useMemo(() => buildHistoricalAverageSpendSeries({
    transactions: historicalTransactions,
    periodStartIso,
    periodEndIso,
  }), [historicalTransactions, periodEndIso, periodStartIso]);

  return (
    <View style={styles.container}>
      <View style={styles.instrumentHeader}>
        <View style={styles.amountRow}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.68} style={styles.amount}>{formatMoney(isReserve ? category.reserveAvailableCents : category.spentCents)}</Text>
          <Text numberOfLines={1} style={styles.limit}>{isReserve ? 'available' : `spent / ${formatMoney(category.plannedCents)}`}</Text>
        </View>
        <View style={styles.signalStack}>
          {isReserve ? (
            <>
              <SignalLine color={statusColor} value={formatMoney(category.monthlyContributionCents)} label="monthly contribution" />
              <SignalLine
                color={statusColor}
                value={reserveSignalValue(category)}
                label={reserveSignalLabel(category)}
                onInfoPress={onForecastInfo}
              />
            </>
          ) : (
            <>
              <SignalLine
                color={statusColor}
                value={`${formatMoney(Math.abs(paceDeltaCents))} ${paceDeltaCents > 0 ? 'over' : 'under'}`}
                label={`budget pace (${formatMoney(expectedSpendCents)} allowed by today)`}
              />
              <SignalLine
                color={projectionColor}
                value={formatMoney(projectedSpendCents)}
                label={monthOffset === 0 ? `forecast by month end · ${formatForecastBasis(forecast.mode)}` : 'actual for completed month'}
                onInfoPress={onForecastInfo}
              />
            </>
          )}
        </View>
      </View>

      <View style={styles.monthSelector}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous month" hitSlop={10} onPress={onPreviousMonth} style={styles.monthButton}>
          <Icon name="chevronLeft" size={20} color={colors.textPrimary} />
        </Pressable>
        <Pressable accessibilityRole={monthOffset !== 0 ? 'button' : undefined} accessibilityLabel={monthOffset !== 0 ? 'Return to this month' : undefined} disabled={monthOffset === 0} onPress={onResetMonth} style={styles.monthLabelBlock}>
          <Text style={styles.monthLabel}>{periodLabel}</Text>
          {monthOffset !== 0 ? <Text style={styles.monthMeta}>Tap month to return to current</Text> : null}
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Next month" hitSlop={10} onPress={onNextMonth} style={styles.monthButton}>
          <Icon name="chevronRight" size={20} color={colors.textPrimary} />
        </Pressable>
      </View>

      {isReserve ? (
        <View style={styles.reserveExplanation}>
          <Text style={styles.reserveExplanationTitle}>Availability carries across months</Text>
          <Text style={styles.reserveExplanationCopy}>This reserve adds the same contribution each month and subtracts counted spending. Kwilt checks the accumulated amount against an expected need instead of pacing it as a monthly limit.</Text>
        </View>
      ) : (
        <>
          <View onLayout={(event) => setChartWidth(Math.max(240, Math.round(event.nativeEvent.layout.width)))} style={styles.chart}>
            <MoneySpendChart
              accentColor={statusColor}
              budgetCents={category.plannedCents}
              elapsedPercent={periodElapsedPercent}
              height={184}
              historicalAverage={historicalAverage}
              onScrubActiveChange={onScrubActiveChange}
              periodEndIso={periodEndIso}
              periodStartIso={periodStartIso}
              projectedSpendCents={projectedSpendCents}
              series={series}
              width={chartWidth}
            />
          </View>
          <View style={styles.chartAxisRow}>
            <Text style={styles.axisLabel}>{formatAxisDate(periodStartIso)}</Text>
            <Text style={styles.axisLabel}>{formatAxisDate(periodEndIso)}</Text>
          </View>
        </>
      )}
    </View>
  );
}

function reserveSignalValue(category: MoneyCategory): string {
  if (!category.reserveAvailabilityKnown) return 'Not known';
  const coverage = category.fundingCoverage;
  if (coverage.status === 'none') return 'No need set';
  if (coverage.status === 'covered') return 'Covered';
  if (coverage.status === 'past_due') return 'Due month passed';
  return `${formatMoney(coverage.shortfallCents)} short`;
}

function reserveSignalLabel(category: MoneyCategory): string {
  const coverage = category.fundingCoverage;
  if (coverage.status === 'none') return 'expected need is optional';
  if (coverage.status === 'past_due') return 'update the expected need';
  return `${formatMoney(coverage.needCents)} expected by ${formatMonth(coverage.dueMonth)}`;
}

function formatMonth(periodId: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(periodId);
  if (!match) return periodId;
  return new Date(Number(match[1]), Number(match[2]) - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function SignalLine({ color, label, onInfoPress, value }: { color: string; label: string; onInfoPress?: () => void; value: string }) {
  return (
    <View style={styles.signalLine}>
      <Text style={[styles.signalGlyph, { color }]}>▲</Text>
      <Text numberOfLines={1} style={[styles.signalValue, { color }]}>{value}</Text>
      <Text numberOfLines={1} style={styles.signalLabel}>{label}</Text>
      {onInfoPress ? (
        <Pressable accessibilityRole="button" accessibilityLabel="View forecast details" hitSlop={8} onPress={onInfoPress}>
          <Icon name="info" size={13} color={colors.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

function MoneySpendChart({ accentColor, budgetCents, elapsedPercent, height, historicalAverage, onScrubActiveChange, periodEndIso, periodStartIso, projectedSpendCents, series, width }: {
  accentColor: string;
  budgetCents: number;
  elapsedPercent: number;
  height: number;
  historicalAverage: { monthsUsed: number; series: MoneySpendPoint[] };
  onScrubActiveChange: (active: boolean) => void;
  periodEndIso: string;
  periodStartIso: string;
  projectedSpendCents: number;
  series: MoneySpendPoint[];
  width: number;
}) {
  const scrubbingRef = useRef(false);
  const [selection, setSelection] = useState<MoneyChartSelection | null>(null);
  const pad = { left: 8, right: 8, top: 18, bottom: 12 };
  const plotWidth = Math.max(1, width - pad.left - pad.right);
  const plotHeight = Math.max(1, height - pad.top - pad.bottom);
  const maxValue = Math.max(100, budgetCents, projectedSpendCents, ...series.map((point) => point.valueCents), ...historicalAverage.series.map((point) => point.valueCents)) * 1.1;
  const x = (percent: number) => pad.left + plotWidth * Math.max(0, Math.min(100, percent)) / 100;
  const y = (value: number) => pad.top + plotHeight * (1 - Math.max(0, value) / maxValue);
  const actual = [{ xPercent: 0, valueCents: 0 }, ...series.filter((point) => point.xPercent <= elapsedPercent)];
  const actualPoints = actual.map((point) => ({ x: x(point.xPercent), y: y(point.valueCents) }));
  const historicalPoints = historicalAverage.series.map((point) => ({ x: x(point.xPercent), y: y(point.valueCents) }));
  const actualPath = buildMonotoneMoneyLinePath(actualPoints);
  const historicalPath = buildNaturalMoneyLinePath(historicalPoints);
  const last = actual[actual.length - 1] ?? { xPercent: 0, valueCents: 0 };
  const projectionPath = `M ${x(last.xPercent)} ${y(last.valueCents)} L ${x(100)} ${y(projectedSpendCents)}`;
  const historicalNowCents = Math.round(interpolateSeriesValue(historicalAverage.series, elapsedPercent));
  const accessibilitySummary = [
    `${formatMoney(last.valueCents)} spent`,
    historicalAverage.monthsUsed > 0 ? `${formatMoney(historicalNowCents)} typical by today` : null,
    `${formatMoney(projectedSpendCents)} forecast by month end`,
    `${formatMoney(budgetCents)} planned`,
  ].filter(Boolean).join('; ');
  const updateSelection = useCallback((locationX: number) => {
    const requestedPercent = (locationX - pad.left) / plotWidth * 100;
    setSelection(getMoneyChartSelection({
      periodStartIso,
      periodEndIso,
      observablePercent: elapsedPercent,
      requestedPercent,
      series,
    }));
  }, [elapsedPercent, pad.left, periodEndIso, periodStartIso, plotWidth, series]);
  const beginChartScrub = useCallback((event: GestureResponderEvent) => {
    if (!scrubbingRef.current) {
      scrubbingRef.current = true;
      signalMoneyChoice();
      onScrubActiveChange(true);
    }
    updateSelection(event.nativeEvent.locationX);
  }, [onScrubActiveChange, updateSelection]);
  const moveChartScrub = useCallback((event: GestureResponderEvent) => {
    if (scrubbingRef.current) updateSelection(event.nativeEvent.locationX);
  }, [updateSelection]);
  const endChartScrub = useCallback(() => {
    if (scrubbingRef.current) {
      scrubbingRef.current = false;
      onScrubActiveChange(false);
    }
    setSelection(null);
  }, [onScrubActiveChange]);
  const handleAccessibilityAction = useCallback((event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName !== 'increment' && event.nativeEvent.actionName !== 'decrement') return;
    const requestedPercent = adjustMoneyChartSelectionPercent({
      currentPercent: selection?.xPercent ?? 0,
      direction: event.nativeEvent.actionName,
      periodStartIso,
      periodEndIso,
      observablePercent: elapsedPercent,
    });
    setSelection(getMoneyChartSelection({
      periodStartIso,
      periodEndIso,
      observablePercent: elapsedPercent,
      requestedPercent,
      series,
    }));
  }, [elapsedPercent, periodEndIso, periodStartIso, selection?.xPercent, series]);
  const tooltipPosition = selection ? getBoundedMoneyChartTooltipPosition({
    anchorX: x(selection.xPercent),
    anchorY: y(selection.valueCents),
    chartWidth: width,
    chartHeight: height,
    tooltipWidth: 132,
    tooltipHeight: selection.daySpendCents === 0 ? 54 : 68,
  }) : null;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Line x1={pad.left} y1={y(budgetCents)} x2={width - pad.right} y2={y(budgetCents)} stroke={colors.gray300} strokeWidth={1} strokeDasharray="4 5" />
        <Line x1={x(elapsedPercent)} y1={pad.top} x2={x(elapsedPercent)} y2={height - pad.bottom} stroke={colors.gray300} strokeWidth={1} strokeDasharray="2 5" />
        {historicalPath ? <Path d={historicalPath} fill="none" stroke={colors.gray300} strokeOpacity={0.45} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" /> : null}
        {actualPath ? <Path d={actualPath} fill="none" stroke={accentColor} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" /> : null}
        <Path d={projectionPath} fill="none" stroke={accentColor} strokeOpacity={0.45} strokeWidth={2} strokeDasharray="5 5" />
        <Circle cx={x(last.xPercent)} cy={y(last.valueCents)} r={4} fill={accentColor} />
        <Circle cx={x(100)} cy={y(projectedSpendCents)} r={3.5} fill={colors.canvas} stroke={accentColor} strokeWidth={2} />
        {selection ? (
          <>
            <Line x1={x(selection.xPercent)} y1={pad.top} x2={x(selection.xPercent)} y2={height - pad.bottom} stroke={colors.gray400} strokeWidth={1} />
            <Circle cx={x(selection.xPercent)} cy={y(selection.valueCents)} r={4.5} fill={colors.canvas} stroke={accentColor} strokeWidth={2} />
          </>
        ) : null}
      </Svg>
      {historicalAverage.monthsUsed > 0 ? (
        <Text pointerEvents="none" style={styles.historicalLabel}>
          {historicalAverage.monthsUsed} mo avg by today {formatMoney(historicalNowCents)}
        </Text>
      ) : null}
      <Pressable
        accessibilityActions={[{ name: 'increment', label: 'Next day' }, { name: 'decrement', label: 'Previous day' }]}
        accessibilityLabel={selection ? formatSelectionAccessibilityLabel(selection) : accessibilitySummary}
        accessibilityRole="adjustable"
        delayLongPress={180}
        onAccessibilityAction={handleAccessibilityAction}
        onLongPress={beginChartScrub}
        onPressOut={endChartScrub}
        {...({
          onPressMove: moveChartScrub,
          onResponderTerminate: endChartScrub,
          onResponderTerminationRequest: () => !scrubbingRef.current,
        } as {
          onPressMove: (event: GestureResponderEvent) => void;
          onResponderTerminate: () => void;
          onResponderTerminationRequest: () => boolean;
        })}
        style={styles.chartScrubLayer}
      />
      {selection && tooltipPosition ? (
        <View pointerEvents="none" style={[styles.chartTooltip, tooltipPosition]}>
          <Text style={styles.chartTooltipDate}>{selection.dateLabel}</Text>
          <Text style={styles.chartTooltipValue}>{formatMoney(selection.valueCents)} spent so far</Text>
          {selection.daySpendCents !== 0 ? <Text style={styles.chartTooltipDelta}>{formatSignedMoney(selection.daySpendCents)} that day</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

export type MoneyChartSelection = {
  dateIso: string;
  dateLabel: string;
  xPercent: number;
  valueCents: number;
  daySpendCents: number;
};

type MoneyLinePoint = { x: number; y: number };

export function buildMonotoneMoneyLinePath(points: MoneyLinePoint[]): string {
  const normalized = normalizeMoneyLinePoints(points);
  if (normalized.length === 0) return '';
  if (normalized.length === 1) return `M ${pathNumber(normalized[0].x)} ${pathNumber(normalized[0].y)}`;

  const slopes = normalized.slice(0, -1).map((point, index) => {
    const next = normalized[index + 1];
    return (next.y - point.y) / (next.x - point.x);
  });
  const tangents = normalized.map((_, index) => {
    if (index === 0) return slopes[0];
    if (index === normalized.length - 1) return slopes[slopes.length - 1];
    return (slopes[index - 1] + slopes[index]) / 2;
  });

  slopes.forEach((slope, index) => {
    if (Math.abs(slope) < 0.000001) {
      tangents[index] = 0;
      tangents[index + 1] = 0;
      return;
    }
    const leftRatio = tangents[index] / slope;
    const rightRatio = tangents[index + 1] / slope;
    const magnitude = Math.hypot(leftRatio, rightRatio);
    if (magnitude <= 3) return;
    const scale = 3 / magnitude;
    tangents[index] = scale * leftRatio * slope;
    tangents[index + 1] = scale * rightRatio * slope;
  });

  let path = `M ${pathNumber(normalized[0].x)} ${pathNumber(normalized[0].y)}`;
  for (let index = 0; index < normalized.length - 1; index += 1) {
    const point = normalized[index];
    const next = normalized[index + 1];
    const width = next.x - point.x;
    path += ` C ${pathNumber(point.x + width / 3)} ${pathNumber(point.y + tangents[index] * width / 3)}`;
    path += ` ${pathNumber(next.x - width / 3)} ${pathNumber(next.y - tangents[index + 1] * width / 3)}`;
    path += ` ${pathNumber(next.x)} ${pathNumber(next.y)}`;
  }
  return path;
}

export function buildNaturalMoneyLinePath(points: MoneyLinePoint[]): string {
  const normalized = normalizeMoneyLinePoints(points);
  if (normalized.length === 0) return '';
  if (normalized.length === 1) return `M ${pathNumber(normalized[0].x)} ${pathNumber(normalized[0].y)}`;

  let path = `M ${pathNumber(normalized[0].x)} ${pathNumber(normalized[0].y)}`;
  for (let index = 0; index < normalized.length - 1; index += 1) {
    const previous = normalized[Math.max(0, index - 1)];
    const point = normalized[index];
    const next = normalized[index + 1];
    const following = normalized[Math.min(normalized.length - 1, index + 2)];
    path += ` C ${pathNumber(point.x + (next.x - previous.x) / 6)} ${pathNumber(point.y + (next.y - previous.y) / 6)}`;
    path += ` ${pathNumber(next.x - (following.x - point.x) / 6)} ${pathNumber(next.y - (following.y - point.y) / 6)}`;
    path += ` ${pathNumber(next.x)} ${pathNumber(next.y)}`;
  }
  return path;
}

function normalizeMoneyLinePoints(points: MoneyLinePoint[]): MoneyLinePoint[] {
  const normalized: MoneyLinePoint[] = [];
  points.forEach((point) => {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
    const previous = normalized[normalized.length - 1];
    if (previous && point.x <= previous.x) {
      if (point.x === previous.x) normalized[normalized.length - 1] = point;
      return;
    }
    normalized.push(point);
  });
  return normalized;
}

function pathNumber(value: number): string {
  return String(Math.round(value * 1000) / 1000);
}

export function getMoneyChartSelection(input: {
  periodStartIso: string;
  periodEndIso: string;
  observablePercent: number;
  requestedPercent: number;
  series: MoneySpendPoint[];
}): MoneyChartSelection | null {
  const periodStart = parseUtcDay(input.periodStartIso);
  const periodEnd = parseUtcDay(input.periodEndIso);
  if (!periodStart || !periodEnd || periodEnd <= periodStart) return null;
  const dayCount = Math.round((periodEnd.getTime() - periodStart.getTime()) / 86_400_000) + 1;
  const maxDayIndex = Math.max(0, Math.min(dayCount - 1, Math.round(clampPercent(input.observablePercent) / 100 * (dayCount - 1))));
  const requestedDayIndex = Math.round(clampPercent(input.requestedPercent) / 100 * (dayCount - 1));
  const dayIndex = Math.max(0, Math.min(maxDayIndex, requestedDayIndex));
  const xPercent = roundChartPercent(dayIndex / Math.max(1, dayCount - 1) * 100);
  const previousXPercent = dayIndex > 0 ? roundChartPercent((dayIndex - 1) / (dayCount - 1) * 100) : -1;
  const valueCents = Math.round(getStepSeriesValue(input.series, xPercent));
  const previousValueCents = dayIndex > 0 ? Math.round(getStepSeriesValue(input.series, previousXPercent)) : 0;
  const date = new Date(periodStart.getTime() + dayIndex * 86_400_000);
  return {
    dateIso: date.toISOString().slice(0, 10),
    dateLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
    xPercent,
    valueCents,
    daySpendCents: valueCents - previousValueCents,
  };
}

export function adjustMoneyChartSelectionPercent(input: {
  currentPercent: number;
  direction: 'increment' | 'decrement';
  periodStartIso: string;
  periodEndIso: string;
  observablePercent: number;
}): number {
  const start = parseUtcDay(input.periodStartIso);
  const end = parseUtcDay(input.periodEndIso);
  if (!start || !end || end <= start) return 0;
  const dayCount = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  const maxDayIndex = Math.max(0, Math.min(dayCount - 1, Math.round(clampPercent(input.observablePercent) / 100 * (dayCount - 1))));
  const currentDayIndex = Math.round(clampPercent(input.currentPercent) / 100 * (dayCount - 1));
  const delta = input.direction === 'increment' ? 1 : -1;
  const nextDayIndex = Math.max(0, Math.min(maxDayIndex, currentDayIndex + delta));
  return roundChartPercent(nextDayIndex / Math.max(1, dayCount - 1) * 100);
}

export function getBoundedMoneyChartTooltipPosition(input: {
  anchorX: number;
  anchorY: number;
  chartWidth: number;
  chartHeight: number;
  tooltipWidth: number;
  tooltipHeight: number;
}): { left: number; top: number } {
  return {
    left: Math.max(0, Math.min(input.chartWidth - input.tooltipWidth, input.anchorX + 10)),
    top: Math.max(0, Math.min(input.chartHeight - input.tooltipHeight, input.anchorY - input.tooltipHeight - 8)),
  };
}

function getStepSeriesValue(series: MoneySpendPoint[], xPercent: number): number {
  let valueCents = 0;
  series.forEach((point) => {
    if (point.xPercent <= xPercent + 0.01) valueCents = point.valueCents;
  });
  return valueCents;
}

function interpolateSeriesValue(series: MoneySpendPoint[], xPercent: number): number {
  if (series.length === 0) return 0;
  if (xPercent <= series[0].xPercent) return series[0].valueCents;
  for (let index = 1; index < series.length; index += 1) {
    const right = series[index];
    if (xPercent > right.xPercent) continue;
    const left = series[index - 1];
    const progress = (xPercent - left.xPercent) / Math.max(0.0001, right.xPercent - left.xPercent);
    return left.valueCents + (right.valueCents - left.valueCents) * progress;
  }
  return series[series.length - 1].valueCents;
}

function parseUtcDay(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) ? date : null;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}

function roundChartPercent(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatSelectionAccessibilityLabel(selection: MoneyChartSelection): string {
  return `${selection.dateLabel}, ${formatMoney(selection.valueCents)} spent so far, ${formatSignedMoney(selection.daySpendCents)} that day`;
}

function formatSignedMoney(valueCents: number): string {
  if (valueCents === 0) return formatMoney(0);
  return `${valueCents > 0 ? '+' : '-'}${formatMoney(Math.abs(valueCents))}`;
}

function formatForecastBasis(mode: MoneyCategory['forecast']['mode']): string {
  if (mode === 'manual') return 'your estimate';
  if (mode === 'scheduled') return 'scheduled spending';
  if (mode === 'hybrid') return 'pace and scheduled spending';
  return 'spending pace';
}

function formatAxisDate(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : value;
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  instrumentHeader: { gap: spacing.xs },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  amount: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 46, lineHeight: 51, fontWeight: '700', letterSpacing: -1.6, fontVariant: ['tabular-nums'] },
  limit: { ...typography.bodySm, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  signalStack: { gap: 3, marginTop: spacing.xs },
  signalLine: { minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 5 },
  signalGlyph: { fontSize: 9, lineHeight: 14 },
  signalValue: { flexShrink: 0, fontFamily: fonts.semibold, fontSize: 12, lineHeight: 17, fontWeight: '600', fontVariant: ['tabular-nums'] },
  signalLabel: { minWidth: 0, flex: 1, color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 11, lineHeight: 16 },
  monthSelector: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  monthButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  monthLabelBlock: { minWidth: 148, alignItems: 'center' },
  monthLabel: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 16, lineHeight: 21, fontWeight: '600' },
  monthMeta: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 10, lineHeight: 14 },
  chart: { height: 184, overflow: 'hidden' },
  historicalLabel: { position: 'absolute', top: 0, left: spacing.sm, color: colors.gray500, fontFamily: fonts.medium, fontSize: 10, lineHeight: 14, fontWeight: '500' },
  chartScrubLayer: { ...StyleSheet.absoluteFillObject },
  chartTooltip: { position: 'absolute', width: 132, gap: 1, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, backgroundColor: colors.card },
  chartTooltipDate: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 10, lineHeight: 14, fontWeight: '500' },
  chartTooltipValue: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15, fontWeight: '600' },
  chartTooltipDelta: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 10, lineHeight: 14 },
  chartAxisRow: { marginTop: -spacing.md, flexDirection: 'row', justifyContent: 'space-between' },
  axisLabel: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 10, lineHeight: 14 },
  reserveExplanation: { gap: spacing.xs, padding: spacing.lg, borderRadius: 12, backgroundColor: colors.pine50 },
  reserveExplanationTitle: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  reserveExplanationCopy: { ...typography.bodySm, color: colors.textSecondary },
});
