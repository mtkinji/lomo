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
      Link(destination: URL(string: "kwilt://chat?entry=fresh&source=widget")!) {
        VStack(alignment: .leading, spacing: 0) {
          HStack(spacing: 6) {
            if let logo = kwiltLogoImage() {
              logo
                .resizable()
                .scaledToFit()
                .frame(width: 18, height: 18)
            }
            Text("Chat")
              .font(KwiltWidgetTypography.label)
            Spacer()
          }
          .foregroundStyle(.white.opacity(0.82))

          Spacer()

          Text("Ask Kwilt")
            .font(KwiltWidgetTypography.title)
            .minimumScaleFactor(0.8)
            .lineLimit(2)

          Spacer()

          HStack(spacing: 5) {
            Image(systemName: "square.and.pencil")
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
