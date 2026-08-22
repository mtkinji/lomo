import ExpoModulesCore
import UIKit

private let askHouseholdActivityType = UIActivity.ActivityType("app.kwilt.ask-household")

public final class KwiltShareSheetModule: Module {
  private var dismissalObservers: [ObjectIdentifier: ShareSheetDismissalObserver] = [:]

  public func definition() -> ModuleDefinition {
    Name("KwiltShareSheet")
    Events("onDismissStart")

    AsyncFunction("present") { (rawURL: String, subject: String?, askHouseholdTitle: String?, promise: Promise) in
      guard let url = URL(string: rawURL) else {
        promise.reject(InvalidShareURLException(rawURL))
        return
      }
      guard let presenter = self.appContext?.utilities?.currentViewController() else {
        promise.reject(MissingSharePresenterException())
        return
      }

      let applicationActivities: [UIActivity]? = askHouseholdTitle.flatMap { title in
        title.isEmpty ? nil : [AskHouseholdActivity(title: title)]
      }
      let controller = UIActivityViewController(
        activityItems: [url],
        applicationActivities: applicationActivities
      )
      let controllerId = ObjectIdentifier(controller)
      let dismissalObserver = ShareSheetDismissalObserver { [weak self] in
        self?.sendEvent("onDismissStart")
      }
      self.dismissalObservers[controllerId] = dismissalObserver
      controller.presentationController?.delegate = dismissalObserver
      if let subject, !subject.isEmpty {
        controller.setValue(subject, forKey: "subject")
      }
      controller.completionWithItemsHandler = { activityType, completed, _, error in
        self.dismissalObservers[controllerId] = nil
        if let error {
          promise.reject(ShareSheetException(error.localizedDescription))
          return
        }
        if activityType == askHouseholdActivityType, completed {
          promise.resolve([
            "action": "askHousehold",
            "activityType": askHouseholdActivityType.rawValue,
          ])
          return
        }
        promise.resolve([
          "action": completed ? "shared" : "dismissed",
          "activityType": activityType?.rawValue as Any,
        ])
      }

      if UIDevice.current.userInterfaceIdiom == .pad {
        controller.popoverPresentationController?.sourceView = presenter.view
        controller.popoverPresentationController?.sourceRect = CGRect(
          x: presenter.view.bounds.midX,
          y: presenter.view.bounds.maxY,
          width: 0,
          height: 0
        )
      }
      presenter.present(controller, animated: true) {
        controller.presentationController?.delegate = dismissalObserver
      }
    }.runOnQueue(.main)
  }
}

private final class ShareSheetDismissalObserver: NSObject, UIAdaptivePresentationControllerDelegate {
  private var didSignalDismissStart = false
  private let onDismissStart: () -> Void

  init(onDismissStart: @escaping () -> Void) {
    self.onDismissStart = onDismissStart
  }

  func presentationControllerWillDismiss(_ presentationController: UIPresentationController) {
    signalDismissStart()
  }

  func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
    signalDismissStart()
  }

  private func signalDismissStart() {
    guard !didSignalDismissStart else { return }
    didSignalDismissStart = true
    onDismissStart()
  }
}

private final class AskHouseholdActivity: UIActivity {
  private let title: String

  init(title: String) {
    self.title = title
    super.init()
  }

  override class var activityCategory: UIActivity.Category { .action }
  override var activityType: UIActivity.ActivityType? { askHouseholdActivityType }
  override var activityTitle: String? { title }
  override var activityImage: UIImage? { UIImage(systemName: "person.2") }

  override func canPerform(withActivityItems activityItems: [Any]) -> Bool {
    activityItems.contains { $0 is URL }
  }

  override func prepare(withActivityItems activityItems: [Any]) {}

  override func perform() {
    activityDidFinish(true)
  }
}

private final class InvalidShareURLException: GenericException<String>, @unchecked Sendable {
  override var reason: String { "Invalid share URL: \(param)" }
}

private final class MissingSharePresenterException: Exception, @unchecked Sendable {
  override var reason: String { "No active view controller is available to present the share sheet." }
}

private final class ShareSheetException: GenericException<String>, @unchecked Sendable {
  override var reason: String { param }
}
