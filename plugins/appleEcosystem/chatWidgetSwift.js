function getChatWidgetSwift(targetName) {
  return `// ---------------------------------------------------------------------------
// Chat widget
// ---------------------------------------------------------------------------

struct ChatWidgetEntry: TimelineEntry {
  let date: Date
}

struct ChatWidgetProvider: TimelineProvider {
  func placeholder(in context: Context) -> ChatWidgetEntry {
    ChatWidgetEntry(date: Date())
  }

  func getSnapshot(in context: Context, completion: @escaping (ChatWidgetEntry) -> Void) {
    completion(ChatWidgetEntry(date: Date()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<ChatWidgetEntry>) -> Void) {
    completion(Timeline(entries: [ChatWidgetEntry(date: Date())], policy: .never))
  }
}

struct ChatWidgetView: View {
  var body: some View {
    widgetContainer {
      Link(destination: URL(string: "kwilt://chat?entry=fresh&mode=conversation&source=widget")!) {
        VStack(alignment: .leading, spacing: 0) {
          HStack {
            if let logo = kwiltLogoImage() {
              logo
                .resizable()
                .scaledToFit()
                .frame(width: 18, height: 18)
            }
            Spacer()
          }
          .foregroundStyle(.white.opacity(0.82))

          Spacer()

          Text("Chat with Kwilt")
            .font(KwiltWidgetTypography.launcherTitle)
            .lineLimit(2)

          Spacer()

          HStack(spacing: 5) {
            Text("Start")
              .font(KwiltWidgetTypography.action)
            Image(systemName: "arrow.right")
              .font(.caption2.bold())
          }
          .frame(maxWidth: .infinity, alignment: .trailing)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .padding(16)
        .foregroundStyle(.white)
        .background(KwiltPalette.pine)
      }
    }
  }
}

struct KwiltChatWidget: Widget {
  let kind: String = "${targetName}.chat"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: ChatWidgetProvider()) { _ in
      ChatWidgetView()
    }
    .configurationDisplayName("Chat")
    .description("Open a fresh Kwilt composer.")
    .supportedFamilies([.systemSmall])
    .contentMarginsDisabled()
  }
}
`;
}

module.exports = { getChatWidgetSwift };
