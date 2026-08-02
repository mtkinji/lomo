function getFocusWidgetSwift(targetName) {
  return `// ---------------------------------------------------------------------------
// Focus widget
// ---------------------------------------------------------------------------

@available(iOS 17.0, *)
enum FocusDurationPreset: String, AppEnum {
  case ten = "10"
  case twentyFive = "25"
  case fifty = "50"

  static var typeDisplayRepresentation: TypeDisplayRepresentation = "Focus duration"
  static var caseDisplayRepresentations: [Self: DisplayRepresentation] = [
    .ten: "10 minutes",
    .twentyFive: "25 minutes",
    .fifty: "50 minutes",
  ]

  var minutes: Int { Int(rawValue) ?? 25 }
}

@available(iOS 17.0, *)
struct FocusWidgetConfigurationIntent: WidgetConfigurationIntent {
  static var title: LocalizedStringResource = "Focus"
  static var description = IntentDescription("Choose the duration one tap will start.")

  @Parameter(title: "Duration", default: .twentyFive)
  var duration: FocusDurationPreset
}

struct FocusWidgetEntry: TimelineEntry {
  let date: Date
  let minutes: Int
  let focusSession: GlanceableStateV1.FocusSession?
}

@available(iOS 17.0, *)
struct FocusWidgetProvider: AppIntentTimelineProvider {
  typealias Intent = FocusWidgetConfigurationIntent

  func placeholder(in context: Context) -> FocusWidgetEntry {
    FocusWidgetEntry(date: Date(), minutes: 25, focusSession: nil)
  }

  func snapshot(for configuration: FocusWidgetConfigurationIntent, in context: Context) async -> FocusWidgetEntry {
    buildEntry(configuration: configuration)
  }

  func timeline(for configuration: FocusWidgetConfigurationIntent, in context: Context) async -> Timeline<FocusWidgetEntry> {
    let entry = buildEntry(configuration: configuration)
    let fallbackRefresh = Date().addingTimeInterval(15 * 60)
    let sessionEnd = entry.focusSession?.endAtMs.map { Date(timeIntervalSince1970: $0 / 1000.0) }
    let refresh = sessionEnd.map { max($0, Date().addingTimeInterval(1)) } ?? fallbackRefresh
    return Timeline(entries: [entry], policy: .after(refresh))
  }

  private func buildEntry(configuration: FocusWidgetConfigurationIntent) -> FocusWidgetEntry {
    FocusWidgetEntry(
      date: Date(),
      minutes: configuration.duration.minutes,
      focusSession: readGlanceableState()?.focusSession
    )
  }
}

struct FocusWidgetView: View {
  let entry: FocusWidgetEntry

  @ViewBuilder
  private func activeView(_ focus: GlanceableStateV1.FocusSession) -> some View {
    Link(destination: deepLinkFocusControls(focus)) {
      VStack(alignment: .leading, spacing: 0) {
        HStack {
          Image(systemName: focus.mode == "paused" ? "pause.fill" : "timer")
            .font(.caption.bold())
          Text(focus.mode == "paused" ? "Paused" : "Focus")
            .font(.caption.weight(.semibold))
          Spacer()
        }
        .foregroundStyle(.white.opacity(0.82))

        Spacer()

        if focus.mode == "running", let endMs = focus.endAtMs {
          let start = Date(timeIntervalSince1970: focus.startedAtMs / 1000.0)
          let end = Date(timeIntervalSince1970: endMs / 1000.0)
          Text(timerInterval: start...end, countsDown: true)
            .font(.system(size: 31, weight: .black, design: .rounded))
            .monospacedDigit()
            .minimumScaleFactor(0.72)
        } else {
          let pausedMinutes = max(1, Int(ceil((focus.remainingMs ?? 0) / 60_000.0)))
          Text("\\(pausedMinutes) min")
            .font(.system(size: 31, weight: .black, design: .rounded))
        }

        Text(focus.activityId == standaloneFocusActivityId ? "Unlinked session" : focus.title)
          .font(.caption)
          .foregroundStyle(.white.opacity(0.68))
          .lineLimit(1)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
      .padding(16)
      .foregroundStyle(.white)
      .background(KwiltPalette.pine)
    }
  }

  var body: some View {
    widgetContainer {
      if let focus = entry.focusSession {
        activeView(focus)
      } else {
        Link(destination: deepLinkStartStandaloneFocus(minutes: entry.minutes)) {
          VStack(alignment: .leading, spacing: 0) {
            HStack {
              Image(systemName: "timer")
                .font(.caption.bold())
              Text("Focus")
                .font(.caption.weight(.semibold))
              Spacer()
            }
            .foregroundStyle(.white.opacity(0.82))

            Spacer()

            Text("\\(entry.minutes)")
              .font(.system(size: 42, weight: .black, design: .rounded))
              .monospacedDigit()
            Text("minutes")
              .font(.caption)
              .foregroundStyle(.white.opacity(0.68))

            Spacer()

            HStack(spacing: 5) {
              Image(systemName: "play.fill")
                .font(.caption2.bold())
              Text("Start")
                .font(.caption.weight(.bold))
            }
          }
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
          .padding(16)
          .foregroundStyle(.white)
          .background(KwiltPalette.pine)
        }
      }
    }
  }
}

@available(iOS 17.0, *)
struct KwiltFocusWidget: Widget {
  let kind: String = "${targetName}.focus"

  var body: some WidgetConfiguration {
    AppIntentConfiguration(
      kind: kind,
      intent: FocusWidgetConfigurationIntent.self,
      provider: FocusWidgetProvider()
    ) { entry in
      FocusWidgetView(entry: entry)
    }
    .configurationDisplayName("Focus")
    .description("Start a Kwilt Focus session in one tap.")
    .supportedFamilies([.systemSmall])
    .contentMarginsDisabled()
  }
}
`;
}

module.exports = { getFocusWidgetSwift };
