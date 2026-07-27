import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { HapticsService } from '../../../services/HapticsService';
import { colors, fonts, spacing } from '../../../theme';
import { rootNavigationRef } from '../../../navigation/rootNavigationRef';
import { Icon } from '../../../ui/Icon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../ui/DropdownMenu';
import { menuItemTextProps, menuStyles } from '../../../ui/menuStyles';
import { formatMoney, formatMoneyFreshness } from '../data/moneySnapshot';
import { useMoneyData } from '../data/MoneyDataContext';
import { projectMoneyPeriodView, type MoneyPeriodView } from '../domain/moneyPeriodView';
import type { MoneyStackParamList } from '../navigation/types';
import { MoneyCategoryMeterTile } from '../components/MoneyCategoryMeterTile';
import { MoneyScreenFrame } from './MoneyScreenFrame';

const MONTH_RADIUS = 12;
const INITIAL_MONTH_INDEX = MONTH_RADIUS;

export function MoneySummaryScreen({ navigation }: NativeStackScreenProps<MoneyStackParamList, 'MoneySummary'>) {
  const { snapshot } = useMoneyData();
  const { width: windowWidth } = useWindowDimensions();
  const [measuredPagerWidth, setMeasuredPagerWidth] = useState(0);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(INITIAL_MONTH_INDEX);
  const pagerRef = useRef<FlatList<MoneyPeriodView>>(null);
  const pagerWidth = measuredPagerWidth > 24
    ? measuredPagerWidth
    : Math.max(1, windowWidth - spacing.sm * 4);
  const periods = useMemo(() => {
    if (!snapshot) return [];
    return Array.from({ length: MONTH_RADIUS * 2 + 1 }, (_, index) => (
      projectMoneyPeriodView(snapshot, index - MONTH_RADIUS)
    ));
  }, [snapshot]);
  const currentPeriod = periods[currentMonthIndex] ?? periods[INITIAL_MONTH_INDEX];

  const scrollToMonth = useCallback((nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= periods.length) return;
    pagerRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    setCurrentMonthIndex(nextIndex);
    void HapticsService.trigger('canvas.selection');
  }, [periods.length]);

  const handleMomentumEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (pagerWidth <= 0) return;
    const nextIndex = Math.max(0, Math.min(periods.length - 1, Math.round(event.nativeEvent.contentOffset.x / pagerWidth)));
    if (nextIndex !== currentMonthIndex) {
      setCurrentMonthIndex(nextIndex);
      void HapticsService.trigger('canvas.selection');
    }
  }, [currentMonthIndex, pagerWidth, periods.length]);

  const summaryMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Pressable accessibilityRole="button" accessibilityLabel="Summary options" style={styles.headerMoreButton}>
          <Icon name="more" size={22} color={colors.textPrimary} />
        </Pressable>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="bottom" sideOffset={6}>
        <SummaryMenuItem icon="plus" label="Add category" onPress={() => navigation.navigate('MoneyCategoryCreate')} />
        <SummaryMenuItem icon="receipt" label="Transactions" onPress={() => navigation.navigate('MoneyTransactions', {})} />
        <SummaryMenuItem
          icon="settings"
          label="Settings"
          onPress={() => rootNavigationRef.navigate('Settings', { screen: 'SettingsHome' })}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <MoneyScreenFrame moreMenu={summaryMenu} title="Summary">
      {snapshot && currentPeriod ? (
        <View
          style={styles.monthSwipeSurface}
          onLayout={(event) => {
            const width = Math.round(event.nativeEvent.layout.width);
            if (width > 24) setMeasuredPagerWidth(width);
          }}
        >
          <View style={styles.monthHeader}>
            <View style={styles.monthPicker}>
              <MonthArrow
                direction="left"
                disabled={currentMonthIndex === 0}
                label={`Show previous month from ${currentPeriod.periodLabel}`}
                onPress={() => scrollToMonth(currentMonthIndex - 1)}
              />
              <MonthArrow
                direction="right"
                disabled={currentMonthIndex === periods.length - 1}
                label={`Show next month from ${currentPeriod.periodLabel}`}
                onPress={() => scrollToMonth(currentMonthIndex + 1)}
              />
              <Text numberOfLines={1} style={styles.monthTitle}>{currentPeriod.periodLabel}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add category"
              hitSlop={10}
              onPress={() => navigation.navigate('MoneyCategoryCreate')}
              style={({ pressed }) => [styles.iconButton, pressed ? styles.iconButtonPressed : null]}
            >
              <Icon name="plus" size={20} color={colors.textPrimary} />
            </Pressable>
          </View>

          <FlatList
            ref={pagerRef}
            horizontal
            pagingEnabled
            data={periods}
            keyExtractor={(period) => `money-month-${period.monthOffset}`}
            initialScrollIndex={INITIAL_MONTH_INDEX}
            getItemLayout={(_, index) => ({ index, length: pagerWidth, offset: pagerWidth * index })}
            onMomentumScrollEnd={handleMomentumEnd}
            onScrollToIndexFailed={({ index }) => {
              requestAnimationFrame(() => pagerRef.current?.scrollToIndex({ index, animated: false }));
            }}
            renderItem={({ item }) => (
              <SummaryMonthPanel
                pageWidth={pagerWidth}
                period={item}
                freshness={formatMoneyFreshness(snapshot.lastSyncedAt)}
                onOpenCategory={(categoryId) => navigation.navigate('MoneyCategoryDetail', { categoryId, monthOffset: item.monthOffset })}
              />
            )}
            bounces={false}
            showsHorizontalScrollIndicator={false}
            initialNumToRender={3}
            maxToRenderPerBatch={3}
            windowSize={3}
            style={styles.monthPager}
          />
        </View>
      ) : null}
    </MoneyScreenFrame>
  );
}

function SummaryMonthPanel({
  freshness,
  onOpenCategory,
  pageWidth,
  period,
}: {
  freshness: string;
  onOpenCategory: (categoryId: string) => void;
  pageWidth: number;
  period: MoneyPeriodView;
}) {
  const cardWidth = Math.max(1, Math.floor((pageWidth - spacing.sm) / 2));
  return (
    <View style={[styles.monthBody, { width: pageWidth }]}>
      <View style={styles.categoryGrid}>
        {period.categories.map((category) => (
          <MoneyCategoryMeterTile
            key={category.id}
            category={category}
            periodElapsedPercent={period.periodElapsedPercent}
            onPress={() => onOpenCategory(category.id)}
            style={{ width: cardWidth, flexBasis: cardWidth, flexGrow: 0, maxWidth: cardWidth }}
          />
        ))}
      </View>
      <View style={styles.totalSection}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>
            {formatMoney(period.totals.spentCents)} / {formatMoney(period.totals.plannedCents)} ({period.totals.percentUsed}%)
          </Text>
        </View>
        <Text style={styles.remainingLabel}>{formatMoney(period.totals.remainingCents)} left across planned categories</Text>
      </View>
      <Text style={styles.updatedLabel}>{period.monthOffset === 0 ? `Connected accounts · ${freshness}` : 'Saved transaction history'}</Text>
    </View>
  );
}

function MonthArrow({ direction, disabled, label, onPress }: {
  direction: 'left' | 'right';
  disabled: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={10}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        styles.monthArrowButton,
        disabled ? styles.iconButtonDisabled : null,
        pressed ? styles.iconButtonPressed : null,
      ]}
    >
      <Icon name={direction === 'left' ? 'chevronLeft' : 'chevronRight'} size={22} color={disabled ? colors.textSecondary : colors.textPrimary} />
    </Pressable>
  );
}

function SummaryMenuItem({ icon, label, onPress }: {
  icon: 'plus' | 'receipt' | 'settings';
  label: string;
  onPress: () => void;
}) {
  return (
    <DropdownMenuItem onPress={onPress} accessibilityLabel={label}>
      <View style={menuStyles.menuItemRow}>
        <Icon name={icon} size={18} color={colors.textPrimary} />
        <Text style={menuStyles.menuItemText} {...menuItemTextProps}>{label}</Text>
      </View>
    </DropdownMenuItem>
  );
}

const styles = StyleSheet.create({
  headerMoreButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  monthSwipeSurface: { gap: spacing.lg, overflow: 'hidden' },
  monthPager: { overflow: 'hidden' },
  monthHeader: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  monthPicker: { minWidth: 0, flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  monthTitle: { flexShrink: 1, marginLeft: spacing.xs, color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24, fontWeight: '600' },
  iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  monthArrowButton: { width: 32, height: 32 },
  iconButtonPressed: { backgroundColor: colors.fieldFillPressed },
  iconButtonDisabled: { opacity: 0.35 },
  monthBody: { minHeight: 520, gap: spacing.lg },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.md, columnGap: spacing.sm },
  totalSection: { gap: spacing.xs, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.cardBorder, paddingVertical: spacing.lg },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  totalLabel: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24, fontWeight: '600' },
  totalValue: { color: colors.textPrimary, textAlign: 'right', fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24, fontWeight: '600', fontVariant: ['tabular-nums'] },
  remainingLabel: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  updatedLabel: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
});
