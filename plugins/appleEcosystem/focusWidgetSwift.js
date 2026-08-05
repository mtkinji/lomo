function getFocusWidgetSwift(targetName) {
  return `// ---------------------------------------------------------------------------
// Focus widget
// ---------------------------------------------------------------------------

struct FocusWidgetEntry: TimelineEntry {
  let date: Date
  let focusSession: GlanceableStateV1.FocusSession?
}

struct FocusWidgetProvider: TimelineProvider {
  func placeholder(in context: Context) -> FocusWidgetEntry {
    FocusWidgetEntry(date: Date(), focusSession: nil)
  }

  func getSnapshot(in context: Context, completion: @escaping (FocusWidgetEntry) -> Void) {
    completion(buildEntry())
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<FocusWidgetEntry>) -> Void) {
    let entry = buildEntry()
    let fallbackRefresh = Date().addingTimeInterval(15 * 60)
    let sessionEnd = entry.focusSession?.endAtMs.map { Date(timeIntervalSince1970: $0 / 1000.0) }
    let refresh = sessionEnd.map { max($0, Date().addingTimeInterval(1)) } ?? fallbackRefresh
    completion(Timeline(entries: [entry], policy: .after(refresh)))
  }

  private func buildEntry() -> FocusWidgetEntry {
    FocusWidgetEntry(
      date: Date(),
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
        Link(destination: deepLinkConfigureStandaloneFocus()) {
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

            Text("Set your session")
              .font(.system(size: 27, weight: .black, design: .rounded))
              .minimumScaleFactor(0.8)
              .lineLimit(2)
            Text("Choose time and audio")
              .font(.caption)
              .foregroundStyle(.white.opacity(0.68))
              .lineLimit(1)

            Spacer()

            HStack(spacing: 5) {
              Image(systemName: "play.fill")
                .font(.caption2.bold())
              Text("Open")
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
    StaticConfiguration(kind: kind, provider: FocusWidgetProvider()) { entry in
      FocusWidgetView(entry: entry)
    }
    .configurationDisplayName("Focus")
    .description("Choose a duration and audio, then start a Kwilt Focus session.")
    .supportedFamilies([.systemSmall])
    .contentMarginsDisabled()
  }
}
`;
}

module.exports = { getFocusWidgetSwift };
