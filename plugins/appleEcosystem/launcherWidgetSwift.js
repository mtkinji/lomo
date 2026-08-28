function getLauncherWidgetSwift(targetName) {
  return `// ---------------------------------------------------------------------------
// Configurable Kwilt launcher widget
// ---------------------------------------------------------------------------

@available(iOS 17.0, *)
struct LauncherDestination: Identifiable {
  let id: String
  let label: String
  let systemImage: String
  let deepLink: String
}

@available(iOS 17.0, *)
let launcherDestinations: [LauncherDestination] = [
  .init(id: "focus", label: "Focus", systemImage: "timer", deepLink: "kwilt://focus?source=widget"),
  .init(id: "calendar", label: "Calendar", systemImage: "calendar", deepLink: "kwilt://plan?source=widget"),
  .init(id: "todos", label: "To-dos", systemImage: "checklist", deepLink: "kwilt://todos?source=widget"),
  .init(id: "add_todo", label: "Add To-do", systemImage: "plus.circle", deepLink: "kwilt://todos?openQuickAdd=1&source=widget"),
  .init(id: "goals", label: "Goals", systemImage: "target", deepLink: "kwilt://goals?source=widget"),
  .init(id: "arcs", label: "Arcs", systemImage: "safari", deepLink: "kwilt://arcs?source=widget"),
  .init(id: "chapters", label: "Chapters", systemImage: "book.closed", deepLink: "kwilt://chapters?source=widget"),
  .init(id: "meals", label: "Meals", systemImage: "fork.knife", deepLink: "kwilt://food/plan?source=widget"),
  .init(id: "recipes", label: "Recipes", systemImage: "book", deepLink: "kwilt://food?source=widget"),
  .init(id: "groceries", label: "Groceries", systemImage: "cart", deepLink: "kwilt://food/groceries?source=widget"),
  .init(id: "chores", label: "Chores", systemImage: "checkmark.circle", deepLink: "kwilt://chores?source=widget"),
  .init(id: "money", label: "Money", systemImage: "wallet.pass", deepLink: "kwilt://money?source=widget"),
  .init(id: "screen_time", label: "Screen Time", systemImage: "shield", deepLink: "kwilt://settings/screen-time?source=widget"),
  .init(id: "games", label: "Games", systemImage: "gamecontroller", deepLink: "kwilt://games?source=widget"),
  .init(id: "explore", label: "Explore", systemImage: "map", deepLink: "kwilt://explore?source=widget"),
]

@available(iOS 17.0, *)
func launcherDestination(id: String?, fallback: String) -> LauncherDestination {
  let resolvedId = id ?? fallback
  return launcherDestinations.first(where: { $0.id == resolvedId })
    ?? launcherDestinations.first(where: { $0.id == fallback })
    ?? launcherDestinations[0]
}

@available(iOS 17.0, *)
func launcherOptionItems() -> IntentItemCollection<String> {
  IntentItemCollection(sections: [
    IntentItemSection(items: launcherDestinations.map { destination in
      IntentItem(
        destination.id,
        title: LocalizedStringResource(stringLiteral: destination.label)
      )
    })
  ])
}

@available(iOS 17.0, *)
struct LauncherShortcutOneOptionsProvider: DynamicOptionsProvider {
  func results() async throws -> IntentItemCollection<String> { launcherOptionItems() }
  func defaultResult() async -> String? { return "focus" }
}

@available(iOS 17.0, *)
struct LauncherShortcutTwoOptionsProvider: DynamicOptionsProvider {
  func results() async throws -> IntentItemCollection<String> { launcherOptionItems() }
  func defaultResult() async -> String? { return "calendar" }
}

@available(iOS 17.0, *)
struct LauncherShortcutThreeOptionsProvider: DynamicOptionsProvider {
  func results() async throws -> IntentItemCollection<String> { launcherOptionItems() }
  func defaultResult() async -> String? { return "todos" }
}

@available(iOS 17.0, *)
struct LauncherShortcutFourOptionsProvider: DynamicOptionsProvider {
  func results() async throws -> IntentItemCollection<String> { launcherOptionItems() }
  func defaultResult() async -> String? { return "meals" }
}

@available(iOS 17.0, *)
struct LauncherWidgetConfigurationIntent: WidgetConfigurationIntent {
  static var title: LocalizedStringResource = "Kwilt Launcher"
  static var description = IntentDescription("Choose four Kwilt shortcuts.")

  @Parameter(title: "Shortcut 1", optionsProvider: LauncherShortcutOneOptionsProvider())
  var shortcut1: String?

  @Parameter(title: "Shortcut 2", optionsProvider: LauncherShortcutTwoOptionsProvider())
  var shortcut2: String?

  @Parameter(title: "Shortcut 3", optionsProvider: LauncherShortcutThreeOptionsProvider())
  var shortcut3: String?

  @Parameter(title: "Shortcut 4", optionsProvider: LauncherShortcutFourOptionsProvider())
  var shortcut4: String?
}

@available(iOS 17.0, *)
struct LauncherWidgetEntry: TimelineEntry {
  let date: Date
  let destinations: [LauncherDestination]
  let focusSession: GlanceableStateV1.FocusSession?
}

@available(iOS 17.0, *)
struct LauncherWidgetProvider: AppIntentTimelineProvider {
  typealias Intent = LauncherWidgetConfigurationIntent

  func placeholder(in context: Context) -> LauncherWidgetEntry {
    LauncherWidgetEntry(
      date: Date(),
      destinations: defaultDestinations(),
      focusSession: nil
    )
  }

  func snapshot(for configuration: LauncherWidgetConfigurationIntent, in context: Context) async -> LauncherWidgetEntry {
    entry(configuration: configuration)
  }

  func timeline(for configuration: LauncherWidgetConfigurationIntent, in context: Context) async -> Timeline<LauncherWidgetEntry> {
    let now = Date()
    let current = entry(configuration: configuration, at: now)

    if
      let focus = current.focusSession,
      focus.mode == "running",
      let endAtMs = focus.endAtMs
    {
      let end = Date(timeIntervalSince1970: endAtMs / 1000.0)
      if end > now {
        let ended = LauncherWidgetEntry(
          date: end,
          destinations: current.destinations,
          focusSession: nil
        )
        return Timeline(entries: [current, ended], policy: .after(end.addingTimeInterval(1)))
      }
    }

    return Timeline(
      entries: [current],
      policy: .after(now.addingTimeInterval(15 * 60))
    )
  }

  private func defaultDestinations() -> [LauncherDestination] {
    [
      launcherDestination(id: nil, fallback: "focus"),
      launcherDestination(id: nil, fallback: "calendar"),
      launcherDestination(id: nil, fallback: "todos"),
      launcherDestination(id: nil, fallback: "meals"),
    ]
  }

  private func entry(
    configuration: LauncherWidgetConfigurationIntent,
    at date: Date = Date()
  ) -> LauncherWidgetEntry {
    let destinations = [
      launcherDestination(id: configuration.shortcut1, fallback: "focus"),
      launcherDestination(id: configuration.shortcut2, fallback: "calendar"),
      launcherDestination(id: configuration.shortcut3, fallback: "todos"),
      launcherDestination(id: configuration.shortcut4, fallback: "meals"),
    ]

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

    return LauncherWidgetEntry(
      date: date,
      destinations: destinations,
      focusSession: visibleFocusSession
    )
  }
}

@available(iOS 17.0, *)
struct LauncherShortcutView: View {
  let destination: LauncherDestination
  let focusSession: GlanceableStateV1.FocusSession?

  private var destinationURL: URL {
    if destination.id == "focus", let focus = focusSession {
      return deepLinkFocusControls(focus)
    }
    return URL(string: destination.deepLink)!
  }

  var body: some View {
    Link(destination: destinationURL) {
      ZStack {
        Circle()
          .fill(KwiltPalette.shellAlt)

        Circle()
          .strokeBorder(KwiltPalette.gray300, lineWidth: 1.5)

        if destination.id == "focus", let focus = focusSession {
          if focus.mode == "running", let endAtMs = focus.endAtMs {
            let start = Date(timeIntervalSince1970: focus.startedAtMs / 1000.0)
            let end = Date(timeIntervalSince1970: endAtMs / 1000.0)
            Text(timerInterval: start...end, countsDown: true)
              .font(Font.custom("Inter-SemiBold", fixedSize: 12))
              .monospacedDigit()
              .minimumScaleFactor(0.7)
              .lineLimit(1)
              .padding(.horizontal, 7)
          } else {
            let pausedMinutes = max(1, Int(ceil((focus.remainingMs ?? 0) / 60_000.0)))
            Text("\\(pausedMinutes)m")
              .font(Font.custom("Inter-SemiBold", fixedSize: 12))
              .monospacedDigit()
          }
        } else {
          Image(systemName: destination.systemImage)
            .font(.system(size: 23, weight: .semibold))
        }
      }
      .foregroundStyle(KwiltPalette.sumi)
      .frame(width: 58, height: 58)
      .contentShape(Circle())
      .accessibilityElement(children: .combine)
      .accessibilityLabel(destination.label)
      .accessibilityHint("Opens in Kwilt")
    }
    .buttonStyle(.plain)
  }
}

@available(iOS 17.0, *)
struct LauncherWidgetView: View {
  let entry: LauncherWidgetEntry

  var body: some View {
    widgetContainer {
      VStack(spacing: 0) {
        HStack(spacing: 0) {
          ForEach(Array(entry.destinations.enumerated()), id: \\.offset) { index, destination in
            LauncherShortcutView(
              destination: destination,
              focusSession: entry.focusSession
            )

            if index < entry.destinations.count - 1 {
              Spacer(minLength: 0)
            }
          }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)

        Link(destination: URL(string: "kwilt://chat?entry=fresh&mode=conversation&source=widget")!) {
          HStack(spacing: 9) {
            if let logo = kwiltLogoImage() {
              logo
                .resizable()
                .scaledToFit()
                .frame(width: 20, height: 20)
            }

            Text("Ask Kwilt")
              .font(KwiltWidgetTypography.emphasis)

            Spacer()

            Image(systemName: "arrow.right")
              .font(.system(size: 13, weight: .semibold))
          }
          .foregroundStyle(.white)
          .padding(.horizontal, 15)
          .frame(maxWidth: .infinity, minHeight: 48, maxHeight: 48)
          .background(
            KwiltPalette.pine,
            in: Capsule()
          )
          .contentShape(Rectangle())
          .accessibilityElement(children: .combine)
          .accessibilityLabel("Ask Kwilt")
        }
        .buttonStyle(.plain)
      }
      .padding(.horizontal, 12)
      .padding(.bottom, 12)
      .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
  }
}

@available(iOS 17.0, *)
struct KwiltLauncherWidget: Widget {
  let kind: String = "${targetName}.launcher"

  var body: some WidgetConfiguration {
    AppIntentConfiguration(
      kind: kind,
      intent: LauncherWidgetConfigurationIntent.self,
      provider: LauncherWidgetProvider()
    ) { entry in
      LauncherWidgetView(entry: entry)
    }
    .configurationDisplayName("Kwilt Launcher")
    .description("Choose four shortcuts and keep Ask Kwilt one tap away.")
    .supportedFamilies([.systemMedium])
    .contentMarginsDisabled()
  }
}
`;
}

module.exports = { getLauncherWidgetSwift };
