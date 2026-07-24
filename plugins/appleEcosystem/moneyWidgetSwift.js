function getMoneyWidgetSwift(targetName) {
  return `// ---------------------------------------------------------------------------
// Money widget — standalone Kwilt Money meter presentation in the shared target
// ---------------------------------------------------------------------------

@available(iOS 17.0, *)
struct MoneyBudgetSelection: AppEntity {
  static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Budget")
  static var defaultQuery = MoneyBudgetSelectionQuery()
  let id: String
  let name: String
  var displayRepresentation: DisplayRepresentation { DisplayRepresentation(title: "\\(name)") }
}

@available(iOS 17.0, *)
struct MoneyBudgetSelectionQuery: EntityQuery, EntityStringQuery {
  func entities(for identifiers: [MoneyBudgetSelection.ID]) async throws -> [MoneyBudgetSelection] {
    let ids = Set(identifiers)
    return Self.available.filter { ids.contains($0.id) }
  }
  func suggestedEntities() async throws -> [MoneyBudgetSelection] { Self.available }
  func entities(matching string: String) async throws -> [MoneyBudgetSelection] {
    let query = string.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    return query.isEmpty ? Self.available : Self.available.filter { $0.name.lowercased().contains(query) }
  }
  func defaultResult() async -> MoneyBudgetSelection? { Self.available.first }
  private static var available: [MoneyBudgetSelection] {
    (readGlanceableState()?.money?.categories ?? []).map { MoneyBudgetSelection(id: $0.id, name: $0.name) }
  }
}

@available(iOS 17.0, *)
struct SelectMoneyBudgetIntent: WidgetConfigurationIntent {
  static var title: LocalizedStringResource = "Budget"
  static var description = IntentDescription("Choose the budget shown by this widget.")
  static var parameterSummary: some ParameterSummary { Summary("Show \\(\\.$budget)") }
  @Parameter(title: "Budget") var budget: MoneyBudgetSelection?
  @Parameter(title: "Second Budget") var secondBudget: MoneyBudgetSelection?
}

@available(iOS 17.0, *)
struct MoneyEntry: TimelineEntry {
  let date: Date
  let categories: [GlanceableStateV1.MoneyCategory]
  let configuration: SelectMoneyBudgetIntent
}

@available(iOS 17.0, *)
struct MoneyProvider: AppIntentTimelineProvider {
  func placeholder(in context: Context) -> MoneyEntry {
    MoneyEntry(date: Date(), categories: [], configuration: SelectMoneyBudgetIntent())
  }
  func snapshot(for configuration: SelectMoneyBudgetIntent, in context: Context) async -> MoneyEntry {
    MoneyEntry(date: Date(), categories: readGlanceableState()?.money?.categories ?? [], configuration: configuration)
  }
  func timeline(for configuration: SelectMoneyBudgetIntent, in context: Context) async -> Timeline<MoneyEntry> {
    let entry = MoneyEntry(date: Date(), categories: readGlanceableState()?.money?.categories ?? [], configuration: configuration)
    return Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(1800)))
  }
}

@available(iOS 17.0, *)
struct MoneyWidgetView: View {
  @Environment(\\.widgetFamily) private var family
  let entry: MoneyEntry

  var body: some View {
    Group {
      if family == .systemMedium {
        HStack(spacing: 10) {
          ForEach(rowCategories, id: \\.id) { category in
            MoneyCategoryLink(category: category, compact: true)
          }
        }
        .padding(10)
      } else if let category = selectedCategory {
        MoneyCategoryLink(category: category, compact: false).padding(6)
      } else {
        VStack(spacing: 6) {
          Image(systemName: "chart.donut")
          Text("Open Kwilt to sync Money").font(.caption).multilineTextAlignment(.center)
        }.foregroundStyle(.secondary)
      }
    }
    .containerBackground(Color.white, for: .widget)
  }

  private var rowCategories: [GlanceableStateV1.MoneyCategory] {
    var result: [GlanceableStateV1.MoneyCategory] = []
    for selection in [entry.configuration.budget, entry.configuration.secondBudget] {
      if let id = selection?.id, let category = entry.categories.first(where: { $0.id == id }), !result.contains(where: { $0.id == id }) { result.append(category) }
    }
    for category in entry.categories where result.count < 2 && !result.contains(where: { $0.id == category.id }) { result.append(category) }
    return result
  }
  private var selectedCategory: GlanceableStateV1.MoneyCategory? {
    if let id = entry.configuration.budget?.id { return entry.categories.first(where: { $0.id == id }) ?? entry.categories.first }
    return entry.categories.first
  }
}

@available(iOS 17.0, *)
struct MoneyCategoryLink: View {
  let category: GlanceableStateV1.MoneyCategory
  let compact: Bool
  var body: some View {
    if let url = URL(string: category.deepLink) {
      Link(destination: url) { MoneyClockTile(category: category, compact: compact) }
    } else {
      MoneyClockTile(category: category, compact: compact)
    }
  }
}

@available(iOS 17.0, *)
struct MoneyClockTile: View {
  let category: GlanceableStateV1.MoneyCategory
  let compact: Bool
  private let tickCount = 52

  var body: some View {
    GeometryReader { proxy in
      let side = min(proxy.size.width, proxy.size.height)
      let activeTicks = Int((Double(min(max(category.percentUsed, 0), 100)) / 100.0 * Double(tickCount)).rounded())
      let markerTick = Int((Double(min(max(category.periodElapsedPercent, 0), 100)) / 100.0 * Double(tickCount)).rounded())
      ZStack {
        if compact {
          RoundedRectangle(cornerRadius: 18, style: .continuous).fill(Color.white)
          RoundedRectangle(cornerRadius: 18, style: .continuous).stroke(Color(red: 0.91, green: 0.90, blue: 0.89), lineWidth: 1)
        }
        ForEach(0..<tickCount, id: \\.self) { index in
          let active = index < activeTicks
          let marker = index == markerTick
          let width = marker ? max(3.0, overBudgetWidth(percent: category.percentUsed, index: index)) : active ? overBudgetWidth(percent: category.percentUsed, index: index) : 2.0
          let height = marker ? 14.0 : active ? 9.0 : 6.0
          let point = tickPosition(index: index, size: side, tickHeight: height, tickWidth: width)
          Capsule().fill(marker ? Color(red: 0.27, green: 0.25, blue: 0.24) : active ? statusColor : Color(red: 0.08, green: 0.16, blue: 0.13).opacity(0.12))
            .frame(width: width, height: height).rotationEffect(.radians(point.rotation)).position(x: point.x, y: point.y)
        }
        VStack(spacing: 4) {
          HStack(alignment: .firstTextBaseline, spacing: 4) {
            Text("\\(category.percentUsed)").font(.custom("Inter-Black", size: side * 0.31)).monospacedDigit().foregroundStyle(statusTextColor).lineLimit(1).minimumScaleFactor(0.56)
            Text("%").font(.custom("Inter-Black", size: side * 0.132)).foregroundStyle(Color(red: 0.44, green: 0.44, blue: 0.48))
          }
          Text(category.name).font(.custom("Inter-Medium", size: side * 0.103)).foregroundStyle(Color(red: 0.34, green: 0.33, blue: 0.31)).lineLimit(1).minimumScaleFactor(0.7).frame(maxWidth: side * 0.68)
        }
      }
    }.aspectRatio(1, contentMode: .fit)
  }

  private var statusColor: Color {
    if category.paceSentiment == "under" || category.paceSentiment == "on-track" { return Color(red: 0.25, green: 0.50, blue: 0.42) }
    if category.status == "over" { return Color.red }
    if category.status == "near_limit" { return Color(red: 0.66, green: 0.44, blue: 0.13) }
    return Color(red: 0.44, green: 0.65, blue: 0.57)
  }
  private var statusTextColor: Color { category.status == "over" ? .red : Color(red: 0.09, green: 0.09, blue: 0.11) }
  private func overBudgetWidth(percent: Int, index: Int) -> Double {
    let fullLaps = max(0, percent) / 100
    let partial = Int((Double(max(0, percent) % 100) / 100.0 * Double(tickCount)).rounded())
    return min(6.0, 2.0 + Double(max(0, fullLaps + (index < partial ? 1 : 0) - 1)))
  }
  private func tickPosition(index: Int, size: Double, tickHeight: Double, tickWidth: Double) -> (x: Double, y: Double, rotation: Double) {
    let half = size / 2 - 12, radius = min(22.0, half), straight = max(0, half * 2 - radius * 2), arc = Double.pi * radius / 2
    var distance = Double(index) / Double(tickCount) * (straight * 4 + arc * 4), x = 0.0, y = -half
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

@available(iOS 17.0, *)
struct KwiltMoneyWidget: Widget {
  let kind: String = "${targetName}.money"
  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, intent: SelectMoneyBudgetIntent.self, provider: MoneyProvider()) { entry in MoneyWidgetView(entry: entry) }
      .configurationDisplayName("Kwilt Money")
      .description("Keep your budget meters visible.")
      .supportedFamilies([.systemSmall, .systemMedium])
      .contentMarginsDisabled()
  }
}
`;
}

module.exports = { getMoneyWidgetSwift };
