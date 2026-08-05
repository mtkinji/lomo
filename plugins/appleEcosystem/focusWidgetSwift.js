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
    let now = Date()
    let entry = buildEntry(at: now)

    if
      let focus = entry.focusSession,
      focus.mode == "running",
      let endAtMs = focus.endAtMs
    {
      let end = Date(timeIntervalSince1970: endAtMs / 1000.0)
      if end > now {
        completion(Timeline(
          entries: [entry, FocusWidgetEntry(date: end, focusSession: nil)],
          policy: .after(end.addingTimeInterval(1))
        ))
        return
      }
    }

    completion(Timeline(
      entries: [entry],
      policy: .after(now.addingTimeInterval(15 * 60))
    ))
  }

  private func buildEntry(at date: Date = Date()) -> FocusWidgetEntry {
    let focusSession = readGlanceableState()?.focusSession
    let nowMs = date.timeIntervalSince1970 * 1000.0
    let visibleFocusSession: GlanceableStateV1.FocusSession?

    if
      let focusSession,
      focusSession.mode == "running",
      let endAtMs = focusSession.endAtMs,
      endAtMs <= nowMs
    {
      visibleFocusSession = nil
    } else {
      visibleFocusSession = focusSession
    }

    return FocusWidgetEntry(
      date: date,
      focusSession: visibleFocusSession
    )
  }
}

struct FocusWidgetView: View {
  let entry: FocusWidgetEntry

  @ViewBuilder
  private func activeView(_ focus: GlanceableStateV1.FocusSession) -> some View {
    Link(destination: deepLinkFocusControls(focus)) {
      VStack(alignment: .leading, spacing: 0) {
        HStack(spacing: 6) {
          if let logo = kwiltLogoImage() {
            logo
              .resizable()
              .scaledToFit()
              .frame(width: 18, height: 18)
          }
          Text(focus.mode == "paused" ? "Paused" : "Focus")
            .font(KwiltWidgetTypography.label)
          Spacer()
        }
        .foregroundStyle(.white.opacity(0.82))

        Spacer()

        if focus.mode == "running", let endMs = focus.endAtMs {
          let start = Date(timeIntervalSince1970: focus.startedAtMs / 1000.0)
          let end = Date(timeIntervalSince1970: endMs / 1000.0)
          Text(timerInterval: start...end, countsDown: true)
            .font(KwiltWidgetTypography.value)
            .monospacedDigit()
            .minimumScaleFactor(0.72)
        } else {
          let pausedMinutes = max(1, Int(ceil((focus.remainingMs ?? 0) / 60_000.0)))
          Text("\\(pausedMinutes) min")
            .font(KwiltWidgetTypography.value)
        }

        if focus.activityId != standaloneFocusActivityId {
          Text(focus.title)
            .font(KwiltWidgetTypography.body)
            .foregroundStyle(.white.opacity(0.68))
            .lineLimit(1)
        }
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
            HStack(spacing: 6) {
              if let logo = kwiltLogoImage() {
                logo
                  .resizable()
                  .scaledToFit()
                  .frame(width: 18, height: 18)
              }
              Text("Focus")
                .font(KwiltWidgetTypography.label)
              Spacer()
            }
            .foregroundStyle(.white.opacity(0.82))

            Spacer()

            Text("Start a Focus session")
              .font(KwiltWidgetTypography.title)
              .minimumScaleFactor(0.72)
              .lineLimit(2)

            Spacer()

            HStack(spacing: 5) {
              Image(systemName: "play.fill")
                .font(.caption2.bold())
              Text("Open")
                .font(KwiltWidgetTypography.action)
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
