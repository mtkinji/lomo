function getMoneyWidgetSwift(targetName) {
  return `// ---------------------------------------------------------------------------
// Money widgets
// ---------------------------------------------------------------------------

struct MoneyWidgetPalette {
  static let brand = KwiltPalette.pine
  static let onTrack = Color(red: 111/255, green: 165/255, blue: 146/255)
  static let watch = Color(red: 249/255, green: 115/255, blue: 22/255)
  static let over = Color(red: 220/255, green: 38/255, blue: 38/255)
  static let inactive = Color.secondary.opacity(0.16)

  static func category(_ status: String) -> Color {
    if status == "over" { return over }
    if status == "near_limit" { return watch }
    return onTrack
  }
}

private let moneyTickCount = 52

struct MoneyTickBorder: View {
  let percentUsed: Double
  let periodElapsedPercent: Double?
  let color: Color

  var body: some View {
    GeometryReader { proxy in
      let side = min(proxy.size.width, proxy.size.height)
      let activeTicks = Int((min(max(percentUsed, 0), 100) / 100 * Double(moneyTickCount)).rounded())
      let markerTick = periodElapsedPercent.map {
        Int((min(max($0, 0), 100) / 100 * Double(moneyTickCount)).rounded())
      }

      ZStack {
        ForEach(0..<moneyTickCount, id: \\.self) { index in
          let isActive = index < activeTicks
          let isMarker = index == markerTick
          let activeTickWidth = overBudgetTickWidth(baseWidth: 2, percent: percentUsed, tickIndex: index)
          let tickHeight = isMarker ? 14.0 : isActive ? 9.0 : 6.0
          let tickWidth = isMarker ? max(3.0, activeTickWidth) : isActive ? activeTickWidth : 2.0
          let position = roundedRectTickPosition(
            index: index,
            size: side,
            tickHeight: tickHeight,
            tickWidth: tickWidth,
            padding: 12,
            cornerRadius: 22
          )

          Capsule(style: .continuous)
            .fill(isMarker ? Color(red: 68/255, green: 64/255, blue: 60/255) : isActive ? color : MoneyWidgetPalette.inactive)
            .frame(width: tickWidth, height: tickHeight)
            .rotationEffect(.radians(position.rotation))
            .position(x: position.x, y: position.y)
        }
      }
    }
    .allowsHitTesting(false)
  }

  private func overBudgetTickWidth(baseWidth: Double, percent: Double, tickIndex: Int) -> Double {
    let clampedPercent = max(0, Int(percent.rounded()))
    let fullLapCount = clampedPercent / 100
    let partialLapTickCount = Int((Double(clampedPercent % 100) / 100 * Double(moneyTickCount)).rounded())
    let tickLapCount = fullLapCount + (tickIndex < partialLapTickCount ? 1 : 0)
    let overBudgetLapCount = max(0, tickLapCount - 1)
    guard overBudgetLapCount > 0 else { return baseWidth }
    return min((baseWidth * 3.2).rounded(), baseWidth + Double(overBudgetLapCount))
  }

  private func roundedRectTickPosition(
    index: Int,
    size: Double,
    tickHeight: Double,
    tickWidth: Double,
    padding: Double,
    cornerRadius: Double
  ) -> (x: Double, y: Double, rotation: Double) {
    let half = size / 2 - padding
    let radius = min(cornerRadius, half)
    let straight = max(0, half * 2 - radius * 2)
    let arc = Double.pi * radius / 2
    let perimeter = straight * 4 + arc * 4
    var distance = Double(index) / Double(moneyTickCount) * perimeter
    var x = 0.0
    var y = -half
    let topHalf = straight / 2

    if distance <= topHalf {
      x = distance
    } else {
      distance -= topHalf
      if distance <= arc {
        let angle = -Double.pi / 2 + distance / radius
        x = half - radius + cos(angle) * radius
        y = -half + radius + sin(angle) * radius
      } else {
        distance -= arc
        if distance <= straight {
          x = half
          y = -half + radius + distance
        } else {
          distance -= straight
          if distance <= arc {
            let angle = distance / radius
            x = half - radius + cos(angle) * radius
            y = half - radius + sin(angle) * radius
          } else {
            distance -= arc
            if distance <= straight {
              x = half - radius - distance
              y = half
            } else {
              distance -= straight
              if distance <= arc {
                let angle = Double.pi / 2 + distance / radius
                x = -half + radius + cos(angle) * radius
                y = half - radius + sin(angle) * radius
              } else {
                distance -= arc
                if distance <= straight {
                  x = -half
                  y = half - radius - distance
                } else {
                  distance -= straight
                  if distance <= arc {
                    let angle = Double.pi + distance / radius
                    x = -half + radius + cos(angle) * radius
                    y = -half + radius + sin(angle) * radius
                  } else {
                    distance -= arc
                    x = -topHalf + distance
                  }
                }
              }
            }
          }
        }
      }
    }

    return (size / 2 + x, size / 2 + y, atan2(-y, -x) - Double.pi / 2)
  }
}

func moneyFreshnessLabel(updatedAtMs: Double) -> String? {
  let updated = Date(timeIntervalSince1970: updatedAtMs / 1000.0)
  let age = Date().timeIntervalSince(updated)
  guard age >= 60 * 60 else { return nil }
  guard let relative = formatRelativeLabel(ms: updatedAtMs) else { return nil }
  return "Updated \\(relative)"
}

func moneyURL(_ value: String?, fallback: String = "kwilt://money?source=widget") -> URL? {
  return URL(string: value ?? fallback) ?? URL(string: fallback)
}

func compactBudgetNumber(_ value: Double) -> String {
  let roundedTenths = (value * 10).rounded() / 10
  if roundedTenths == roundedTenths.rounded() {
    return String(Int(roundedTenths))
  }
  return String(format: "%.1f", roundedTenths)
}

func compactBudgetDollarText(cents: Double) -> String {
  let roundedDollars = abs(cents / 100.0).rounded()
  if roundedDollars >= 999_950 {
    return compactBudgetNumber(roundedDollars / 1_000_000.0) + "m"
  }
  if roundedDollars >= 1_000 {
    return compactBudgetNumber(roundedDollars / 1_000.0) + "k"
  }
  return String(Int(roundedDollars))
}

struct FlexibleMoneyEntry: TimelineEntry {
  let date: Date
  let updatedAtMs: Double
  let periodLabel: String
  let hasMoneySnapshot: Bool
  let flexibleMoney: GlanceableStateV1.Money.FlexibleMoney?
}

struct FlexibleMoneyProvider: TimelineProvider {
  func placeholder(in context: Context) -> FlexibleMoneyEntry {
    FlexibleMoneyEntry(
      date: Date(),
      updatedAtMs: Date().timeIntervalSince1970 * 1000,
      periodLabel: "This month",
      hasMoneySnapshot: true,
      flexibleMoney: .init(
        state: "left",
        amountCents: 34320,
        flexibleCapacityCents: 96000,
        countedFlexibleSpendCents: 61680,
        deepLink: "kwilt://money?source=widget"
      )
    )
  }

  func getSnapshot(in context: Context, completion: @escaping (FlexibleMoneyEntry) -> Void) {
    completion(entry())
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<FlexibleMoneyEntry>) -> Void) {
    let current = entry()
    completion(Timeline(entries: [current], policy: .after(Date().addingTimeInterval(15 * 60))))
  }

  private func entry() -> FlexibleMoneyEntry {
    let state = readGlanceableState()
    return FlexibleMoneyEntry(
      date: Date(),
      updatedAtMs: state?.updatedAtMs ?? 0,
      periodLabel: state?.money?.periodLabel ?? "This month",
      hasMoneySnapshot: state?.money != nil,
      flexibleMoney: state?.money?.flexibleMoney
    )
  }
}

struct FlexibleMoneyAnswerCard: View {
  let entry: FlexibleMoneyEntry

  private var tone: Color {
    guard let state = entry.flexibleMoney?.state else { return .primary }
    if state == "over" || state == "plan_over" { return MoneyWidgetPalette.over }
    return .primary
  }

  private var value: String? {
    formatCurrency(cents: entry.flexibleMoney?.amountCents)
  }

  private var meaning: String {
    switch entry.flexibleMoney?.state {
    case "left": return "left this month"
    case "over": return "over this month"
    case "no_room": return "no flexible room"
    case "plan_over": return "plan over its limit"
    default: return ""
    }
  }

  var body: some View {
    ZStack {
      Color(red: 244/255, green: 241/255, blue: 234/255)
      VStack(alignment: .leading, spacing: 4) {
        HStack(spacing: 8) {
          Text("Flexible money")
            .font(KwiltWidgetTypography.label)
            .foregroundStyle(MoneyWidgetPalette.brand)
            .lineLimit(1)
            .minimumScaleFactor(0.78)
          Spacer()
          if let logo = kwiltLogoImage() {
            ZStack {
              RoundedRectangle(cornerRadius: 6, style: .continuous)
                .fill(MoneyWidgetPalette.brand)
              logo
                .resizable()
                .scaledToFit()
                .padding(4)
            }
            .frame(width: 24, height: 24)
          }
        }
        Spacer(minLength: 4)
        if let value = value, entry.flexibleMoney?.state != "unavailable" {
          Text(value)
            .font(KwiltWidgetTypography.value)
            .foregroundStyle(tone)
            .monospacedDigit()
            .lineLimit(1)
            .minimumScaleFactor(0.52)
          Text(meaning)
            .font(KwiltWidgetTypography.body)
            .foregroundStyle(.secondary)
            .lineLimit(1)
        } else {
          Text(entry.hasMoneySnapshot
            ? "Open Kwilt to finish your monthly plan."
            : "Open Kwilt to view Money.")
            .font(KwiltWidgetTypography.emphasis)
            .foregroundStyle(.primary)
            .lineLimit(3)
        }
        Spacer(minLength: 4)
        HStack(spacing: 4) {
          Text(entry.periodLabel)
            .lineLimit(1)
          if let freshness = moneyFreshnessLabel(updatedAtMs: entry.updatedAtMs) {
            Text("•")
            Text(freshness)
              .lineLimit(1)
          }
        }
        .font(KwiltWidgetTypography.meta)
        .foregroundStyle(.secondary)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
      .padding(16)
    }
  }
}

struct FlexibleMoneyWidgetView: View {
  let entry: FlexibleMoneyEntry

  var body: some View {
    widgetContainer {
      FlexibleMoneyAnswerCard(entry: entry)
      .widgetURL(moneyURL(entry.flexibleMoney?.deepLink))
    }
  }
}

@available(iOS 17.0, *)
struct KwiltFlexibleMoneyWidget: Widget {
  let kind = "${targetName}.money.flexible"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: FlexibleMoneyProvider()) { entry in
      FlexibleMoneyWidgetView(entry: entry)
    }
    .configurationDisplayName("Flexible Money")
    .description("See the flexible money left in your monthly plan.")
    .supportedFamilies([.systemSmall])
    .contentMarginsDisabled()
  }
}

@available(iOS 17.0, *)
struct MoneyCategoryOptionsProvider: DynamicOptionsProvider {
  func results() async throws -> IntentItemCollection<String> {
    let items = (readGlanceableState()?.money?.categories ?? []).map { category in
      IntentItem(
        category.id,
        title: LocalizedStringResource(stringLiteral: category.name)
      )
    }
    return IntentItemCollection(sections: [
      IntentItemSection(items: items)
    ])
  }
}

@available(iOS 17.0, *)
enum MoneyCategoryDisplay: String {
  case dollarsLeft
  case percentUsed
}

@available(iOS 17.0, *)
struct MoneyCategoryDisplayOptionsProvider: DynamicOptionsProvider {
  func results() async throws -> IntentItemCollection<String> {
    return IntentItemCollection(sections: [
      IntentItemSection(items: [
        IntentItem("Dollars left", title: "Dollars left"),
        IntentItem("Percent used", title: "Percent used"),
      ])
    ])
  }

  func defaultResult() async -> String? {
    return "Dollars left"
  }
}

@available(iOS 17.0, *)
func moneyCategoryDisplay(from configuredValue: String?) -> MoneyCategoryDisplay {
  switch configuredValue {
  case "Percent used", "percentUsed":
    return .percentUsed
  case "Dollars left", "dollarsLeft":
    return .dollarsLeft
  default:
    return .dollarsLeft
  }
}

@available(iOS 17.0, *)
struct MoneyCategoryWidgetConfigurationIntent: WidgetConfigurationIntent {
  static var title: LocalizedStringResource = "Budget Category"
  static var description = IntentDescription("Choose one category and how to show it.")

  @Parameter(title: "Category", optionsProvider: MoneyCategoryOptionsProvider())
  var categoryId: String?

  @Parameter(title: "Show", optionsProvider: MoneyCategoryDisplayOptionsProvider())
  var display: String?

}

@available(iOS 17.0, *)
struct MoneyCategoryEntry: TimelineEntry {
  let date: Date
  let hasMoneySnapshot: Bool
  let category: GlanceableStateV1.Money.Category?
  let display: MoneyCategoryDisplay
}

@available(iOS 17.0, *)
struct MoneyCategoryWidgetProvider: AppIntentTimelineProvider {
  typealias Intent = MoneyCategoryWidgetConfigurationIntent

  func placeholder(in context: Context) -> MoneyCategoryEntry {
    MoneyCategoryEntry(
      date: Date(),
      hasMoneySnapshot: true,
      category: .init(
        id: "groceries", name: "Groceries", percentUsed: 72,
        periodElapsedPercent: 60, paceSentiment: "on-track", status: "on_track",
        plannedCents: 90000, spentCents: 64800, remainingCents: 25200,
        deepLink: "kwilt://money/category/groceries?source=widget"
      ),
      display: .dollarsLeft
    )
  }

  func snapshot(for configuration: MoneyCategoryWidgetConfigurationIntent, in context: Context) async -> MoneyCategoryEntry {
    entry(configuration: configuration)
  }

  func timeline(for configuration: MoneyCategoryWidgetConfigurationIntent, in context: Context) async -> Timeline<MoneyCategoryEntry> {
    Timeline(entries: [entry(configuration: configuration)], policy: .after(Date().addingTimeInterval(15 * 60)))
  }

  private func entry(configuration: MoneyCategoryWidgetConfigurationIntent) -> MoneyCategoryEntry {
    let state = readGlanceableState()
    let selectedId = configuration.categoryId
    let selected = state?.money?.categories.first(where: { $0.id == selectedId })
    let display = moneyCategoryDisplay(from: configuration.display)
    return MoneyCategoryEntry(
      date: Date(),
      hasMoneySnapshot: state?.money != nil,
      category: selected,
      display: display
    )
  }
}

@available(iOS 17.0, *)
struct MoneyCategoryWidgetView: View {
  let entry: MoneyCategoryEntry

  private var tone: Color {
    guard let category = entry.category else { return MoneyWidgetPalette.onTrack }
    return MoneyWidgetPalette.category(category.status)
  }

  private var valueText: String {
    guard let category = entry.category else { return "" }
    return compactBudgetDollarText(cents: category.remainingCents ?? 0)
  }

  private var percentValueText: String {
    guard let category = entry.category else { return "" }
    return compactBudgetNumber(Double(category.percentUsed))
  }

  private var meaning: String {
    guard let category = entry.category else { return "" }
    if entry.display == .percentUsed { return "used" }
    return (category.remainingCents ?? 0) < 0 ? "over" : "left"
  }

  private var valueTone: Color {
    guard let category = entry.category else { return .primary }
    if category.status == "over" { return MoneyWidgetPalette.over }
    if category.status == "near_limit" { return MoneyWidgetPalette.watch }
    return .primary
  }

  var body: some View {
    widgetContainer {
      ZStack {
        Color.white
        if entry.category != nil {
          MoneyTickBorder(
            percentUsed: Double(entry.category?.percentUsed ?? 0),
            periodElapsedPercent: Double(entry.category?.periodElapsedPercent ?? 0),
            color: tone
          )
        }
        if let category = entry.category {
          VStack(spacing: 0) {
            Spacer(minLength: 0)
            VStack(alignment: .center, spacing: 4) {
              HStack(spacing: 0) {
                Spacer(minLength: 0)
                Text(category.name)
                  .font(KwiltWidgetTypography.label)
                  .foregroundStyle(.secondary)
                  .lineLimit(2)
                  .multilineTextAlignment(.center)
                Spacer(minLength: 0)
              }
              .frame(maxWidth: .infinity, alignment: .center)
              if entry.display == .percentUsed {
                HStack(alignment: .lastTextBaseline, spacing: 1) {
                  Text(percentValueText)
                    .font(KwiltWidgetTypography.categoryValue)
                    .tracking(-0.7)
                    .monospacedDigit()
                  Text("%")
                    .font(KwiltWidgetTypography.currencySymbol)
                }
                .foregroundStyle(valueTone)
                .lineLimit(1)
                .frame(maxWidth: .infinity, alignment: .center)
              } else {
                HStack(alignment: .top, spacing: 1) {
                  Text("$")
                    .font(KwiltWidgetTypography.currencySymbol)
                    .padding(.top, 2)
                  Text(valueText)
                    .font(KwiltWidgetTypography.categoryValue)
                    .tracking(-0.7)
                    .monospacedDigit()
                }
                .foregroundStyle(valueTone)
                .lineLimit(1)
                .frame(maxWidth: .infinity, alignment: .center)
                .padding(.horizontal, 6)
              }
              Text(meaning)
                .font(KwiltWidgetTypography.body)
                .foregroundStyle(.secondary)
                .lineLimit(1)
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity, alignment: .center)
            }
            Spacer(minLength: 0)
          }
          .frame(maxWidth: .infinity, maxHeight: .infinity)
          .padding(14)

        } else {
          VStack(alignment: .center, spacing: 4) {
            Text("Budget Category")
              .font(KwiltWidgetTypography.label)
              .foregroundStyle(.secondary)
            Spacer()
            Text(entry.hasMoneySnapshot ? "Choose a category" : "Open Kwilt to view Money")
              .font(KwiltWidgetTypography.emphasis)
              .foregroundStyle(.primary)
              .lineLimit(2)
            Text(entry.hasMoneySnapshot ? "Edit this widget" : "")
              .font(KwiltWidgetTypography.body)
              .foregroundStyle(.secondary)
            Spacer()
          }
          .frame(maxWidth: .infinity, maxHeight: .infinity)
          .padding(14)
        }
      }
      .widgetURL(moneyURL(entry.category?.deepLink))
    }
  }
}

@available(iOS 17.0, *)
struct KwiltMoneyCategoryWidget: Widget {
  let kind = "${targetName}.money"

  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, intent: MoneyCategoryWidgetConfigurationIntent.self, provider: MoneyCategoryWidgetProvider()) { entry in
      MoneyCategoryWidgetView(entry: entry)
    }
    .configurationDisplayName("Budget Category")
    .description("See dollars left or percent used for one category.")
    .supportedFamilies([.systemSmall])
    .contentMarginsDisabled()
  }
}

// ---------------------------------------------------------------------------
`;
}

module.exports = { getMoneyWidgetSwift };
