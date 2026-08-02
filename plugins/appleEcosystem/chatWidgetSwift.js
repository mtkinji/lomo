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
          HStack {
            if let logo = kwiltLogoImage() {
              logo
                .resizable()
                .scaledToFit()
                .frame(width: 22, height: 22)
            }
            Spacer()
          }

          Spacer()

          Text("Chat")
            .font(.system(size: 25, weight: .bold, design: .rounded))
          Text("Start a thought")
            .font(.caption)
            .foregroundStyle(.white.opacity(0.72))
            .padding(.top, 3)
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
