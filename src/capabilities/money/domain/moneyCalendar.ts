export function getLocalMoneyPeriodId(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function getLocalMoneyDayId(date: Date): string {
  return `${getLocalMoneyPeriodId(date)}-${String(date.getDate()).padStart(2, '0')}`;
}
