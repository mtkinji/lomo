type OpenGlobalSearch = (options: { initialScope: 'activities' }) => void;

export function openActivitiesInventorySearch(openGlobalSearch: OpenGlobalSearch): void {
  openGlobalSearch({ initialScope: 'activities' });
}

type ScrollActiveInventoryToTopOptions = {
  groupingApplied: boolean;
  manualOrderEffective: boolean;
  scrollGrouped: () => void;
  requestManual: () => void;
  scrollStandard: () => void;
};

export function scrollActiveInventoryToTop({
  groupingApplied,
  manualOrderEffective,
  scrollGrouped,
  requestManual,
  scrollStandard,
}: ScrollActiveInventoryToTopOptions): void {
  if (groupingApplied) {
    scrollGrouped();
    return;
  }
  if (manualOrderEffective) {
    requestManual();
    return;
  }
  scrollStandard();
}
