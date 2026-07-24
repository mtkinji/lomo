function getMoneyWidgetSwift(targetName) {
  return `// ---------------------------------------------------------------------------
// Money widget — privacy-aware progress, no amounts or account details
// ---------------------------------------------------------------------------

@available(iOS 17.0, *)
struct MoneyEntry: TimelineEntry {
  let date: Date
  let periodLabel: String?
  let percentUsed: Int
  let needsReviewCount: Int
  let categories: [GlanceableStateV1.MoneyCategory]
}

@available(iOS 17.0, *)
struct MoneyProvider: TimelineProvider {
  typealias Entry = MoneyEntry

  func placeholder(in context: Context) -> MoneyEntry {
    MoneyEntry(date: Date(), periodLabel: "This month", percentUsed: 64, needsReviewCount: 3, categories: [])
  }

  func getSnapshot(in context: Context, completion: @escaping (MoneyEntry) -> Void) {
    completion(entry())
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<MoneyEntry>) -> Void) {
    completion(Timeline(entries: [entry()], policy: .after(Date().addingTimeInterval(15 * 60))))
  }

  private func entry() -> MoneyEntry {
    let money = readGlanceableState()?.money
    return MoneyEntry(
      date: Date(),
      periodLabel: money?.periodLabel,
      percentUsed: money?.percentUsed ?? 0,
      needsReviewCount: money?.needsReviewCount ?? 0,
      categories: money?.categories ?? []
    )
  }
}

@available(iOS 17.0, *)
struct MoneyWidgetView: View {
  let entry: MoneyEntry
  @Environment(\\.widgetFamily) var family

  private var rootURL: URL? { URL(string: "kwilt://money?source=widget") }

  var body: some View {
    widgetContainer {
      VStack(alignment: .leading, spacing: 10) {
        HStack {
          VStack(alignment: .leading, spacing: 1) {
            Text("Money")
              .font(.headline)
              .foregroundStyle(.white)
            Text(entry.periodLabel ?? "Open Kwilt to sync")
              .font(.caption2)
              .foregroundStyle(.white.opacity(0.82))
          }
          Spacer()
          if entry.periodLabel != nil {
            Text("\\(entry.percentUsed)%")
              .font(.headline.monospacedDigit())
              .foregroundStyle(.white)
          }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 11)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(KwiltPalette.pine)
        .clipShape(UnevenRoundedRectangle(cornerRadii: .init(topLeading: 24, topTrailing: 24)))

        if entry.periodLabel == nil {
          Spacer()
          Text("Open Kwilt to sync. Privacy lock keeps Money details hidden.")
            .font(.caption)
            .foregroundStyle(.secondary)
          Spacer()
        } else if family == .systemSmall {
          ProgressView(value: Double(min(entry.percentUsed, 100)), total: 100)
            .tint(entry.percentUsed > 100 ? .orange : KwiltPalette.pine)
          Text(entry.needsReviewCount == 1 ? "1 transaction to review" : "\\(entry.needsReviewCount) transactions to review")
            .font(.caption)
            .foregroundStyle(.secondary)
            .lineLimit(2)
          Spacer()
        } else {
          ForEach(Array(entry.categories.prefix(3)), id: \\.id) { category in
            if let url = URL(string: category.deepLink) {
              Link(destination: url) {
                HStack(spacing: 8) {
                  Image(systemName: category.status == "over" ? "exclamationmark.circle.fill" : "circle.fill")
                    .font(.caption2)
                    .foregroundStyle(category.status == "over" ? .orange : KwiltPalette.pine)
                  Text(category.name)
                    .font(.caption)
                    .foregroundStyle(.primary)
                    .lineLimit(1)
                  Spacer()
                  Text("\\(category.percentUsed)%")
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(.secondary)
                }
              }
            }
          }
          Spacer(minLength: 0)
        }
      }
      .widgetURL(rootURL)
    }
  }
}

@available(iOS 17.0, *)
struct KwiltMoneyWidget: Widget {
  let kind: String = "${targetName}.money"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: MoneyProvider()) { entry in
      MoneyWidgetView(entry: entry)
    }
    .configurationDisplayName("Money")
    .description("See monthly category progress without exposing balances or account details.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}
`;
}

module.exports = { getMoneyWidgetSwift };
