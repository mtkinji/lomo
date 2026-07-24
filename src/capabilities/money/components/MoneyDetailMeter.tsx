import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { colors, fonts, spacing, typography } from '../../../theme';
import { Icon } from '../../../ui/Icon';
import { formatMoney, type MoneyCategory, type MoneyTransaction } from '../data/moneySnapshot';
import { buildCumulativeSpendSeries } from '../domain/moneyDetailView';

export function MoneyDetailMeter({
  category,
  monthOffset,
  onForecastInfo,
  onNextMonth,
  onPreviousMonth,
  onResetMonth,
  periodElapsedPercent,
  periodEndIso,
  periodLabel,
  periodStartIso,
  transactions,
}: {
  category: MoneyCategory;
  monthOffset: number;
  onForecastInfo: () => void;
  onNextMonth: () => void;
  onPreviousMonth: () => void;
  onResetMonth: () => void;
  periodElapsedPercent: number;
  periodEndIso: string;
  periodLabel: string;
  periodStartIso: string;
  transactions: MoneyTransaction[];
}) {
  const [chartWidth, setChartWidth] = useState(320);
  const forecast = category.forecast;
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

  return (
    <View style={styles.container}>
      <View style={styles.instrumentHeader}>
        <View style={styles.amountRow}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.68} style={styles.amount}>{formatMoney(category.spentCents)}</Text>
          <Text numberOfLines={1} style={styles.limit}>spent / {formatMoney(category.plannedCents)}</Text>
        </View>
        <View style={styles.signalStack}>
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

      <View onLayout={(event) => setChartWidth(Math.max(240, Math.round(event.nativeEvent.layout.width)))} style={styles.chart}>
        <MoneySpendChart
          accentColor={statusColor}
          budgetCents={category.plannedCents}
          elapsedPercent={periodElapsedPercent}
          height={184}
          projectedSpendCents={projectedSpendCents}
          series={series}
          width={chartWidth}
        />
      </View>
      <View style={styles.chartAxisRow}>
        <Text style={styles.axisLabel}>{formatAxisDate(periodStartIso)}</Text>
        <Text style={styles.axisLabel}>{formatAxisDate(periodEndIso)}</Text>
      </View>
    </View>
  );
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

function MoneySpendChart({ accentColor, budgetCents, elapsedPercent, height, projectedSpendCents, series, width }: {
  accentColor: string;
  budgetCents: number;
  elapsedPercent: number;
  height: number;
  projectedSpendCents: number;
  series: Array<{ xPercent: number; valueCents: number }>;
  width: number;
}) {
  const pad = { left: 8, right: 8, top: 18, bottom: 12 };
  const plotWidth = Math.max(1, width - pad.left - pad.right);
  const plotHeight = Math.max(1, height - pad.top - pad.bottom);
  const maxValue = Math.max(100, budgetCents, projectedSpendCents, ...series.map((point) => point.valueCents)) * 1.1;
  const x = (percent: number) => pad.left + plotWidth * Math.max(0, Math.min(100, percent)) / 100;
  const y = (value: number) => pad.top + plotHeight * (1 - Math.max(0, value) / maxValue);
  const actual = [{ xPercent: 0, valueCents: 0 }, ...series.filter((point) => point.xPercent <= elapsedPercent)];
  const actualPath = actual.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(point.xPercent)} ${y(point.valueCents)}`).join(' ');
  const last = actual[actual.length - 1] ?? { xPercent: 0, valueCents: 0 };
  const projectionPath = `M ${x(last.xPercent)} ${y(last.valueCents)} L ${x(100)} ${y(projectedSpendCents)}`;

  return (
    <Svg width={width} height={height}>
      <Line x1={pad.left} y1={y(budgetCents)} x2={width - pad.right} y2={y(budgetCents)} stroke={colors.gray300} strokeWidth={1} strokeDasharray="4 5" />
      <Line x1={x(elapsedPercent)} y1={pad.top} x2={x(elapsedPercent)} y2={height - pad.bottom} stroke={colors.gray300} strokeWidth={1} strokeDasharray="2 5" />
      {actualPath ? <Path d={actualPath} fill="none" stroke={accentColor} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" /> : null}
      <Path d={projectionPath} fill="none" stroke={accentColor} strokeOpacity={0.45} strokeWidth={2} strokeDasharray="5 5" />
      <Circle cx={x(last.xPercent)} cy={y(last.valueCents)} r={4} fill={accentColor} />
      <Circle cx={x(100)} cy={y(projectedSpendCents)} r={3.5} fill={colors.canvas} stroke={accentColor} strokeWidth={2} />
    </Svg>
  );
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
  chartAxisRow: { marginTop: -spacing.md, flexDirection: 'row', justifyContent: 'space-between' },
  axisLabel: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 10, lineHeight: 14 },
});
